import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import glob from "glob-promise";

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using a local IPFS node.";
  static examples = [
    "<%= config.bin %> <%= command.id %> ./dist",
    "<%= config.bin %> <%= command.id %> ./dist --host=your-ec2-ip --port=5001",
  ];
  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;
  static args: Arg[] = [{ name: "DIR", description: "Relative path to the directory to publish.", required: true }];
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
    gateway: Flags.string({
      description: "IPFS gateway URL for accessing the content",
      default: "http://localhost:8080",
      env: "IPFS_GATEWAY",
    }),
    "verify-gateway": Flags.boolean({
      description: "Verify the uploaded content is accessible via gateway",
      default: true,
    }),
  };

  private async callIpfsApi(endpoint: string, method = "post", data: any = null, isFormData = false) {
    const { flags } = await this.parse(IpfsPublish);
    const baseUrl = `${flags.protocol}://${flags.host}:${flags.port}/api/v0`;
    const url = `${baseUrl}/${endpoint}`;

    const options: any = {
      method,
      url,
      maxBodyLength: Infinity,
    };

    if (isFormData && data) {
      options.data = data;
      options.headers = data.getHeaders();
    } else if (data) {
      options.data = data;
    }

    try {
      const response = await axios(options);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`IPFS API error: ${error.response.status} ${error.response.statusText}`);
      }
      throw error;
    }
  }

  private async verifyGatewayAccess(gatewayUrl: string): Promise<boolean> {
    try {
      this.log(`Verifying gateway access at ${gatewayUrl}...`);
      const response = await axios.get(gatewayUrl, {
        timeout: 10000,
        maxRedirects: 5, // Important: follow redirects for CIDv0->CIDv1
        validateStatus: (status) => status === 200,
      });

      if (response.status === 200) {
        this.log(`✓ Gateway verified: content is accessible`);
        return true;
      }
      return false;
    } catch (error: any) {
      this.log(`✗ Gateway verification failed: ${error.message}`);
      this.log(`Note: Content is still on IPFS, but might not be accessible via this gateway yet.`);
      return false;
    }
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(IpfsPublish);
    const resolvedDir = path.resolve(args.DIR);

    if (!fs.existsSync(resolvedDir)) {
      this.error(`Error: Directory '${args.DIR}' does not exist`);
    }

    try {
      // Check IPFS node connection
      try {
        const nodeInfo = await this.callIpfsApi("id", "post");
        this.log(`Connected to IPFS node: ${nodeInfo.ID}`);

        // Log peering info
        const swarmResponse = await this.callIpfsApi("swarm/peers", "post");
        const peerCount = swarmResponse.Peers ? swarmResponse.Peers.length : 0;
        this.log(`Node is connected to ${peerCount} peers`);
      } catch (error: any) {
        this.error(`Unable to connect to IPFS node: ${error.message}`);
      }

      // Get all files in the directory
      const files = await glob("**/*", {
        cwd: resolvedDir,
        nodir: true,
        dot: true,
      });

      if (files.length === 0) {
        this.error("Directory is empty, nothing to upload");
      }

      this.log(`Found ${files.length} files to upload to IPFS...`);

      // Upload files recursively
      this.log("Uploading to IPFS via local node...");
      const startTime = Date.now();

      // Create form data with all files in their correct paths
      const formData = new FormData();

      // Add each file to form data
      for (const filePath of files) {
        const fullPath = path.join(resolvedDir, filePath);
        const fileContent = await fs.readFile(fullPath);
        formData.append("file", fileContent, { filename: filePath });
      }

      // Set IPFS add parameters
      formData.append("pin", "true");
      formData.append("wrap-with-directory", "true");
      formData.append("cid-version", "1");

      // Upload all files at once
      const addResults = await this.callIpfsApi("add?stream-channels=true&progress=false", "post", formData, true);

      // Parse the response - IPFS API returns one JSON object per line
      const results = addResults
        .trim()
        .split("\n")
        .map((line: string) => JSON.parse(line));

      // The last result is the root directory
      const rootResult = results[results.length - 1];
      const rootCid = rootResult.Hash;

      const uploadDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.log(`Upload completed in ${uploadDuration} seconds`);

      // Generate gateway URLs
      const localGatewayUrl = `${flags.gateway}/ipfs/${rootCid}/`;
      const ipfsIoUrl = `https://ipfs.io/ipfs/${rootCid}/`;
      const dweb = `ipfs://${rootCid}/`;
      const ethLimoUrl = `https://${rootCid}.ipfs.eth.limo/`;

      this.log(`\nSuccessfully uploaded ${files.length} files to IPFS`);
      this.log(`\nIPFS CID: ${rootCid}`);
      this.log(`Local Gateway: ${localGatewayUrl}`);
      this.log(`IPFS.io Gateway: ${ipfsIoUrl}`);
      this.log(`ETH.limo: ${ethLimoUrl}`);
      this.log(`IPFS URI: ${dweb}`);

      // Verify gateway access if requested
      if (flags["verify-gateway"]) {
        await this.verifyGatewayAccess(localGatewayUrl);
      }

      // Display hints for IPFS content
      this.log(`\nHints:`);
      this.log(`- Content should be immediately available on your local gateway`);
      this.log(`- Public gateways may take a few minutes to discover the content`);
      this.log(`- Content will remain available as long as it's pinned on your node`);

      return {
        cid: rootCid,
        localGatewayUrl,
        ipfsIoUrl,
        ethLimoUrl,
        dweb,
        filesCount: files.length,
        uploadDurationSeconds: parseFloat(uploadDuration),
      };
    } catch (error: any) {
      this.error(`Failed to upload to IPFS: ${error.message}`);
    }
  }
}
