import crypto from "crypto";
import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import AWS from "aws-sdk";
import axios from "axios";
import fs from "fs-extra";
import glob from "glob-promise";

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using Filebase S3 API.";
  static examples = [
    "<%= config.bin %> <%= command.id %> ./dist",
    "<%= config.bin %> <%= command.id %> ./dist --name=my-project",
  ];
  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;
  static args: Arg[] = [{ name: "DIR", description: "Relative path to the directory to publish.", required: true }];
  static flags = {
    "api-key": Flags.string({
      description: "Filebase API key",
      env: "FILEBASE_API_KEY",
      required: true,
    }),
    "api-secret": Flags.string({
      description: "Filebase API secret",
      env: "FILEBASE_API_SECRET",
      required: true,
    }),
    bucket: Flags.string({
      description: "Override the auto-detected Filebase bucket name",
      required: false,
    }),
    name: Flags.string({
      char: "n",
      description: "Optional folder name prefix in IPFS",
      required: false,
    }),
    network: Flags.string({
      description: "Network (development, testnet-sepolia, testnet-sepolia-staging)",
      default: process.env.NODE_ENV || "development",
    }),
  };

  /**
   * Get the appropriate bucket name based on the network
   */
  private getBucketName(network: string, overrideBucket?: string): string {
    if (overrideBucket) {
      return overrideBucket;
    }

    // Map network to bucket name
    const bucketMap: Record<string, string> = {
      development: "ef-development",
      "testnet-sepolia-staging": "ef-staging",
      "testnet-sepolia": "ef-testnet",
    };

    const bucket = bucketMap[network];
    if (!bucket) {
      throw new Error(`Unknown network: ${network}. Please specify a bucket with --bucket flag.`);
    }

    return bucket;
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(IpfsPublish);

    const resolvedDir = path.resolve(args.DIR);

    if (!fs.existsSync(resolvedDir)) {
      this.error(`Error: Directory '${args.DIR}' does not exist`);
    }

    // Get the appropriate bucket name based on network
    const bucketName = this.getBucketName(flags.network, flags.bucket);
    this.log(`Using bucket for ${flags.network} environment: ${bucketName}`);

    // Setup S3 Client for Filebase
    const s3 = new AWS.S3({
      endpoint: "https://s3.filebase.com",
      accessKeyId: flags["api-key"],
      secretAccessKey: flags["api-secret"],
      region: "us-east-1",
      s3ForcePathStyle: true,
    });

    const folderPrefix = flags.name || path.basename(resolvedDir);

    try {
      // Ensure bucket exists
      try {
        await s3.headBucket({ Bucket: bucketName }).promise();
        this.log(`Bucket exists: ${bucketName}`);
      } catch (bucketErr) {
        this.error(
          `Bucket '${bucketName}' not found or not accessible. Please check your credentials and bucket name.`
        );
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

      // Upload each file to Filebase
      for (const file of files) {
        const filePath = path.join(resolvedDir, file);
        const fileKey = path.join(folderPrefix, file).replace(/\\/g, "/");
        const fileContent = await fs.readFile(filePath);

        this.log(`Uploading: ${file}`);

        await s3
          .putObject({
            Bucket: bucketName,
            Key: fileKey,
            Body: fileContent,
            ContentType: this.getContentType(file),
          })
          .promise();
      }

      // Calculate SHA-256 for bundle publishing
      const sha256 = await this.calculateDirectorySha256(resolvedDir);

      // S3 folder URL
      const s3Url = `https://${bucketName}.s3.filebase.com/${folderPrefix}/`;

      this.log(`\nSuccessfully uploaded ${files.length} files to IPFS via Filebase`);
      this.log(`\nS3 Access URL: ${s3Url}`);
      this.log(`SHA-256 (for project:publish): ${sha256}`);

      // Try to retrieve CID but don't throw if it fails
      try {
        this.log("\nAttempting to retrieve IPFS CID...");
        const indexUrl = `${s3Url}index.html`;
        const response = await axios.get(indexUrl);
        this.log(`${response}`);
      } catch (cidError: any) {
        this.log(`Note: Automatic CID retrieval not available (${cidError.message})`);
      }

      // Manually guide the user
      this.log("\nTo get the IPFS CID for eth.limo:");
      this.log("1. Log into Filebase console: https://console.filebase.com/");
      this.log(`2. Navigate to bucket: ${bucketName}`);
      this.log(`3. Find your folder: ${folderPrefix}/`);
      this.log("4. Copy the CID from the object details");
      this.log("5. Access via eth.limo: https://YOUR_CID.eth.limo/");

      // Usage instructions for project:publish
      this.log("\nTo publish with earthfast-cli:");
      this.log(`earthfast-cli project:publish YOUR_PROJECT_ID ${s3Url} ${sha256}\n`);

      return {
        s3Url,
        sha256,
        folderPrefix,
        bucketName,
        filesCount: files.length,
      };
    } catch (error: any) {
      this.error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".txt": "text/plain",
    };

    return contentTypes[ext] || "application/octet-stream";
  }

  private async calculateDirectorySha256(dirPath: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    const files = await glob("**/*", { cwd: dirPath, nodir: true, dot: true });

    // Sort files for consistent hashing
    files.sort();

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileContent = await fs.readFile(filePath);
      hash.update(fileContent);
    }

    return hash.digest("hex");
  }
}
