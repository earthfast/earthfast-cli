import { exec } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";

const execAsync = promisify(exec);

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
    "<%= config.bin %> <%= command.id %> ./website --use-docker=false",
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
    "use-docker": Flags.boolean({
      description: "Use Docker exec for upload (most reliable method)",
      default: true,
      env: "IPFS_USE_DOCKER",
    }),
    "container-name": Flags.string({
      description: "Docker container name for IPFS",
      default: "ipfs",
      env: "IPFS_CONTAINER_NAME",
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
      const response = await axios.post(
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

  private async checkDockerAvailability(containerName: string): Promise<boolean> {
    try {
      await execAsync(`docker ps -q -f "name=${containerName}"`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async uploadDirectoryWithDockerExec(
    sourceDir: string,
    flags: any
  ): Promise<{ cid: string; duration: number }> {
    const startTime = Date.now();
    const containerName = flags["container-name"];

    // Verify Docker container is available
    const isDockerAvailable = await this.checkDockerAvailability(containerName);
    if (!isDockerAvailable) {
      throw new Error(`Docker container "${containerName}" not found or Docker is not running`);
    }

    // Create a temporary directory with a unique name
    const uploadId = Date.now();
    const tempDir = path.join(os.tmpdir(), `ipfs-upload-${uploadId}`);
    const containerDir = `/tmp/upload-${uploadId}`;

    try {
      // Copy content to temp directory
      await fs.copy(sourceDir, tempDir);

      if (flags.verbose) {
        this.log(`Copying files to Docker container ${containerName}...`);
      }

      // Copy directory to Docker container
      await execAsync(`docker cp "${tempDir}/." ${containerName}:${containerDir}`);

      if (flags.verbose) {
        this.log(`Running ipfs add inside container...`);
      }

      // Use ipfs add command directly inside the container
      const { stdout } = await execAsync(
        `docker exec ${containerName} ipfs add -r --cid-version=1 --progress=false "${containerDir}"`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large directories
      );

      // Parse the results to find the root CID
      const lines = stdout.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      // Format is typically: "added <cid> <name>"
      const parts = lastLine.split(" ");
      if (parts.length < 2) {
        throw new Error(`Unexpected output format from ipfs add: ${lastLine}`);
      }

      const cid = parts[1];

      // Clean up inside container
      await execAsync(`docker exec ${containerName} rm -rf "${containerDir}"`);

      return {
        cid,
        duration: (Date.now() - startTime) / 1000,
      };
    } finally {
      // Clean up the temp directory
      await fs.remove(tempDir);
    }
  }

  private async uploadDirectoryWithCurl(sourceDir: string, flags: any): Promise<{ cid: string; duration: number }> {
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
      const lines = Array.isArray(responseData) ? responseData : responseData.trim().split("\n");

      const results = lines.map((line: any) => {
        if (typeof line === "string") {
          try {
            return JSON.parse(line);
          } catch (e) {
            return { Name: line, Hash: line };
          }
        }
        return line;
      });

      // Find the root directory entry (usually the last one or with empty name)
      const rootEntry = results.find((entry: any) => !entry.Name || entry.Name === "") || results[results.length - 1];

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
        const peersResponse = await axios.post(`${apiUrl}/swarm/peers`);
        const peerCount = peersResponse.data.Peers?.length || 0;
        this.log(`Node is connected to ${peerCount} peers`);
      } catch (error) {
        this.log("Could not get peer information");
      }

      this.log(`Found ${items.length} items in directory`);
      this.log("Uploading to IPFS...");

      // Choose upload method based on flags
      let uploadResult;
      if (flags["use-docker"] && (await this.checkDockerAvailability(flags["container-name"]))) {
        uploadResult = await this.uploadDirectoryWithDockerExec(sourceDir, flags);
      } else {
        if (flags["use-docker"]) {
          this.log("Docker not available, falling back to HTTP API");
        }
        uploadResult = await this.uploadDirectoryWithCurl(sourceDir, flags);
      }

      const { cid, duration } = uploadResult;

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

        this.log(`\nTo check if the content is pinned:`);
        this.log(`curl -X POST "${this.getApiUrl(flags)}/pin/ls?arg=${cid}"`);
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
