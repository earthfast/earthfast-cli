import crypto from "crypto";
import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import AWS from "aws-sdk";
import fs from "fs-extra";
import glob from "glob-promise";

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using Filebase.";
  static examples = [
    "<%= config.bin %> <%= command.id %> ./dist",
    "<%= config.bin %> <%= command.id %> ./dist --name=my-project",
  ];
  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;
  static args: Arg[] = [{ name: "DIR", description: "Relative path to the directory to publish.", required: true }];
  static flags = {
    "filebase-key": Flags.string({
      description: "Filebase API key",
      env: "FILEBASE_API_KEY",
      required: true,
    }),
    "filebase-secret": Flags.string({
      description: "Filebase API secret",
      env: "FILEBASE_API_SECRET",
      required: true,
    }),
    "filebase-bucket": Flags.string({
      description: "Filebase bucket name",
      env: "FILEBASE_BUCKET",
      required: true,
    }),
    name: Flags.string({
      char: "n",
      description: "Optional folder name prefix in IPFS",
      required: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(IpfsPublish);

    const resolvedDir = path.resolve(args.DIR);

    if (!fs.existsSync(resolvedDir)) {
      this.error(`Error: Directory '${args.DIR}' does not exist`);
    }

    // Setup S3 Client for Filebase
    const s3 = new AWS.S3({
      endpoint: "https://s3.filebase.com",
      accessKeyId: flags["filebase-key"],
      secretAccessKey: flags["filebase-secret"],
      region: "us-east-1",
      s3ForcePathStyle: true,
    });

    const bucketName = flags["filebase-bucket"];
    const folderPrefix = flags.name || path.basename(resolvedDir);

    try {
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

      this.log(`Successfully uploaded ${files.length} files to IPFS via Filebase`);
      this.log(`Folder prefix in bucket: ${folderPrefix}/`);
      this.log(`Folder URL: https://${bucketName}.s3.filebase.com/${folderPrefix}/`);

      return {
        bucket: bucketName,
        folderPrefix: folderPrefix,
        filesCount: files.length,
        url: `https://${bucketName}.s3.filebase.com/${folderPrefix}/`,
        message: "Files uploaded to IPFS. Use the URL with project:publish.",
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
