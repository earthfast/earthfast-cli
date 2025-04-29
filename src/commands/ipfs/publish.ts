import { exec } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import axios from "axios";
import fs from "fs-extra";

const execAsync = promisify(exec);

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using an IPFS node";
  static examples = [
    "<%= config.bin %> <%= command.id %> ./dist",
    "<%= config.bin %> <%= command.id %> ./dist --host=your-ipfs-node-ip",
  ];
  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;
  static args: Arg[] = [{ name: "DIR", description: "Directory to publish to IPFS", required: true }];
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
      description: "IPFS Gateway host",
      default: "",
      env: "IPFS_GATEWAY_HOST",
    }),
    "gateway-port": Flags.integer({
      description: "IPFS Gateway port",
      default: 8080,
      env: "IPFS_GATEWAY_PORT",
    }),
    "use-curl": Flags.boolean({
      description: "Use curl for uploading (more reliable for directories)",
      default: true,
      env: "IPFS_USE_CURL",
    }),
  };

  private getGatewayHost(flags: any): string {
    return flags["gateway-host"] || flags.host;
  }

  private getGatewayUrl(flags: any): string {
    const host = this.getGatewayHost(flags);
    return `${flags.protocol}://${host}:${flags["gateway-port"]}`;
  }

  private getApiUrl(flags: any): string {
    return `${flags.protocol}://${flags.host}:${flags.port}/api/v0`;
  }

  private async checkNodeConnection(flags: any): Promise<string> {
    try {
      const apiUrl = this.getApiUrl(flags);
      const response = await axios.post(`${apiUrl}/id`);
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

  private async uploadDirectoryWithCurl(sourceDir: string, flags: any): Promise<{ cid: string; duration: number }> {
    const startTime = Date.now();
    const apiUrl = this.getApiUrl(flags);

    // Create a temporary directory for the upload
    const tempDir = path.join(os.tmpdir(), `ipfs-upload-${Date.now()}`);
    await fs.ensureDir(tempDir);

    try {
      // Copy content to temp directory to ensure clean paths
      await fs.copy(sourceDir, tempDir);

      // Create a more reliable curl command that preserves filenames
      // We'll use a tar approach which works better with IPFS
      const tarPath = `${tempDir}.tar`;
      await execAsync(`tar -cf "${tarPath}" -C "${tempDir}" .`);

      // Upload using tar which preserves directory structure better
      const curlCmd = `curl -X POST "${apiUrl}/add?wrap-with-directory=true&pin=true&cid-version=1" -F file=@"${tarPath}"`;

      const { stdout } = await execAsync(curlCmd);

      // Parse output to find root CID
      const lines = stdout.trim().split("\n");
      const results = lines.map((line) => JSON.parse(line));

      // The root directory is typically the last result
      const rootEntry = results[results.length - 1];
      const cid = rootEntry.Hash;

      return {
        cid,
        duration: (Date.now() - startTime) / 1000,
      };
    } finally {
      // Clean up temp directory and tar file
      const tarPath = `${tempDir}.tar`;
      await fs.remove(tempDir);
      if (await fs.pathExists(tarPath)) {
        await fs.remove(tarPath);
      }
    }
  }

  public async run(): Promise<any> {
    const { args, flags } = await this.parse(IpfsPublish);
    const sourceDir = path.resolve(args.DIR);

    // Verify directory exists
    if (!fs.existsSync(sourceDir)) {
      this.error(`Directory does not exist: ${sourceDir}`);
    }

    // Verify directory is not empty
    const files = await fs.readdir(sourceDir);
    if (files.length === 0) {
      this.error("Directory is empty, nothing to upload");
    }

    try {
      // Check IPFS node connection
      const nodeId = await this.checkNodeConnection(flags);
      this.log(`Connected to IPFS node: ${nodeId}`);

      // Get peer count
      try {
        const apiUrl = this.getApiUrl(flags);
        const peersResponse = await axios.post(`${apiUrl}/swarm/peers`);
        const peerCount = peersResponse.data.Peers?.length || 0;
        this.log(`Node is connected to ${peerCount} peers`);
      } catch (error) {
        this.log("Could not get peer information");
      }

      this.log(`Found ${files.length} items in directory`);
      this.log("Uploading to IPFS...");

      // Upload directory
      const { cid, duration } = await this.uploadDirectoryWithCurl(sourceDir, flags);

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
