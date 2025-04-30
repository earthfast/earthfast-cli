import os from "os";
import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";

// Define types for IPFS API responses
interface IpfsIdResponse {
  ID: string;
  Addresses: string[];
  AgentVersion: string;
  ProtocolVersion: string;
  Protocols: string[];
}

interface IpfsSwarmPeersResponse {
  Peers: Array<{
    Addr: string;
    Peer: string;
    Latency: string;
  }> | null;
}

interface IpfsFileEntry {
  Name: string;
  Hash: string;
  Size?: number;
  Type?: number;
}

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using an IPFS node";
  static description = `
  Publishes a directory to IPFS through a running IPFS node.
  The directory structure is preserved in the upload.
  Returns a CID that can be used to access the content via IPFS gateways.
  `;

  static examples = [
    "<%= config.bin %> <%= command.id %> ./dist",
    "<%= config.bin %> <%= command.id %> ./dist --host=52.21.60.134",
  ];

  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;

  static args: Arg[] = [
    {
      name: "DIR",
      description: "Directory to publish to IPFS",
      required: true,
    },
  ];

  static flags = {
    host: Flags.string({
      description: "IPFS API host",
      default: "localhost",
      env: "IPFS_HOST",
    }),
    port: Flags.integer({
      description: "IPFS API port",
      default: 5001,
      env: "IPFS_PORT",
    }),
    protocol: Flags.string({
      description: "IPFS API protocol",
      default: "http",
      env: "IPFS_PROTOCOL",
    }),
    "gateway-host": Flags.string({
      description: "IPFS Gateway host (defaults to API host if not specified)",
      default: "",
      env: "IPFS_GATEWAY_HOST",
    }),
    "gateway-port": Flags.integer({
      description: "IPFS Gateway port",
      default: 8080,
      env: "IPFS_GATEWAY_PORT",
    }),
    timeout: Flags.integer({
      description: "Timeout for IPFS operations in milliseconds",
      default: 120000, // 2 minutes
      env: "IPFS_TIMEOUT",
    }),
    verbose: Flags.boolean({
      description: "Show verbose output",
      default: false,
      char: "v",
    }),
  };

  private getGatewayHost(flags: Record<string, any>): string {
    return flags["gateway-host"] || flags.host;
  }

  private getGatewayUrl(flags: Record<string, any>): string {
    const host = this.getGatewayHost(flags);
    return `${flags.protocol}://${host}:${flags["gateway-port"]}`;
  }

  private getApiUrl(flags: Record<string, any>): string {
    return `${flags.protocol}://${flags.host}:${flags.port}/api/v0`;
  }

  private async checkNodeConnection(flags: Record<string, any>): Promise<string> {
    try {
      const apiUrl = this.getApiUrl(flags);
      const response = await axios.post<IpfsIdResponse>(
        `${apiUrl}/id`,
        {},
        {
          timeout: flags.timeout,
        }
      );
      return response.data.ID;
    } catch (error: any) {
      throw new Error(`Unable to connect to IPFS node: ${error.message}`);
    }
  }

  private async verifyGatewayAccess(gatewayUrl: string, cid: string): Promise<boolean> {
    try {
      const response = await axios.get(`${gatewayUrl}/ipfs/${cid}`, {
        timeout: 10000,
        maxRedirects: 5,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? this.getAllFiles(res) : res;
      })
    );
    return Array.prototype.concat(...files);
  }

  private async uploadDirectory(
    sourceDir: string,
    flags: Record<string, any>
  ): Promise<{ cid: string; duration: number }> {
    const startTime = Date.now();
    const apiUrl = this.getApiUrl(flags);

    // Create a temporary directory
    const tempDir = path.join(os.tmpdir(), `ipfs-upload-${Date.now()}`);
    await fs.ensureDir(tempDir);

    try {
      // Copy content to temp directory
      await fs.copy(sourceDir, tempDir);

      // Get file list
      const fileList = await this.getAllFiles(tempDir);

      if (flags.verbose) {
        this.log(`Found ${fileList.length} files to upload`);
      }

      // Create form data for the upload
      const formData = new FormData();

      // Add each file to form data with correct path
      for (const file of fileList) {
        const relativePath = path.relative(tempDir, file);
        const content = await fs.readFile(file);

        if (flags.verbose) {
          this.log(`Adding file: ${relativePath}`);
        }

        formData.append("file", content, {
          filename: relativePath,
          filepath: relativePath, // Important for structure preservation
        });
      }

      if (flags.verbose) {
        this.log(`Uploading files to IPFS node...`);
      }

      // Upload to IPFS
      const response = await axios.post(
        `${apiUrl}/add?wrap-with-directory=true&pin=true&cid-version=1&recursive=true`,
        formData,
        {
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: flags.timeout,
          headers: formData.getHeaders(),
        }
      );

      // Parse response
      const responseData = response.data;
      const lines: string[] = Array.isArray(responseData) ? responseData : responseData.trim().split("\n");

      const results: IpfsFileEntry[] = lines.map((line: string | IpfsFileEntry) => {
        if (typeof line === "string") {
          try {
            return JSON.parse(line) as IpfsFileEntry;
          } catch (e) {
            return { Name: line, Hash: line };
          }
        }
        return line as IpfsFileEntry;
      });

      // Find the root directory entry (usually the last one or with empty name)
      const rootEntry =
        results.find((entry: IpfsFileEntry) => !entry.Name || entry.Name === "") || results[results.length - 1];

      if (!rootEntry || !rootEntry.Hash) {
        throw new Error(`Could not find root directory CID in IPFS response`);
      }

      const cid = rootEntry.Hash;

      return {
        cid,
        duration: (Date.now() - startTime) / 1000,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`IPFS API error: ${error.response.status} - ${error.response.data}`);
      }
      throw error;
    } finally {
      // Clean up temp directory
      await fs.remove(tempDir);
    }
  }

  public async run(): Promise<any> {
    const { args, flags } = await this.parse(IpfsPublish);
    const sourceDir = path.resolve(args.DIR);

    // Verify directory exists
    if (!fs.existsSync(sourceDir)) {
      this.error(`Directory does not exist: ${sourceDir}`);
    }

    // Check if directory is empty
    const items = await fs.readdir(sourceDir);
    if (items.length === 0) {
      this.error("Directory is empty, nothing to upload");
    }

    try {
      // Check IPFS node connection
      const nodeId = await this.checkNodeConnection(flags);
      this.log(`Connected to IPFS node: ${nodeId}`);

      // Get peer count
      try {
        const apiUrl = this.getApiUrl(flags);
        const peersResponse = await axios.post<IpfsSwarmPeersResponse>(`${apiUrl}/swarm/peers`);
        const peerCount = peersResponse.data.Peers?.length || 0;
        this.log(`Node is connected to ${peerCount} peers`);
      } catch (error) {
        this.log("Could not get peer information");
      }

      this.log(`Found ${items.length} items in directory`);
      this.log("Uploading to IPFS...");

      // Upload the directory
      const { cid, duration } = await this.uploadDirectory(sourceDir, flags);

      this.log(`Upload completed in ${duration.toFixed(2)} seconds`);

      // Gateway URLs
      const gatewayUrl = this.getGatewayUrl(flags);
      const localGatewayUrl = `${gatewayUrl}/ipfs/${cid}/`;
      const ipfsIoUrl = `https://ipfs.io/ipfs/${cid}/`;
      const ethLimoUrl = `https://${cid}.ipfs.eth.limo/`;
      const dwebUrl = `ipfs://${cid}/`;

      this.log(`\nSuccessfully uploaded to IPFS with CID: ${cid}`);
      this.log(`\nAccess URLs:`);
      this.log(`Local Gateway: ${localGatewayUrl}`);
      this.log(`IPFS.io: ${ipfsIoUrl}`);
      this.log(`ETH.limo: ${ethLimoUrl}`);
      this.log(`IPFS URI: ${dwebUrl}`);

      // Verify gateway access
      this.log(`\nVerifying gateway access...`);
      const isAccessible = await this.verifyGatewayAccess(gatewayUrl, cid);
      if (isAccessible) {
        this.log("✓ Content is accessible via gateway");
      } else {
        this.log("⚠ Could not verify gateway access yet (this is normal for new uploads)");
        this.log("  Try accessing the content directly in your browser");
      }

      // Show additional information if verbose is enabled
      if (flags.verbose) {
        this.log(`\nTo verify the content structure:`);
        this.log(`curl -X POST "${this.getApiUrl(flags)}/ls?arg=${cid}"`);
      }

      return {
        cid,
        localGatewayUrl,
        ipfsIoUrl,
        ethLimoUrl,
        dwebUrl,
        duration,
      };
    } catch (error: any) {
      this.error(`IPFS publishing failed: ${error.message}`);
    }
  }
}
