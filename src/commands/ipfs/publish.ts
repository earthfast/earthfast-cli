import fs, { createReadStream } from "fs";
import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import axios, { isAxiosError } from "axios";
import FormData from "form-data";
import glob from "glob-promise";

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using Filebase for direct gateway access.";
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
      description: "Optional name prefix for the Filebase pin (defaults to directory name)",
      required: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(IpfsPublish);

    const resolvedDir = path.resolve(args.DIR);
    const cwd = process.cwd();

    if (resolvedDir === cwd || !resolvedDir.startsWith(cwd)) {
      this.error("Error: Directory must be a subdirectory of the current working directory");
    }

    if (!fs.existsSync(resolvedDir)) {
      this.error(`Error: Directory '${args.DIR}' does not exist`);
    }

    // Determine the pin name
    const directoryName = path.basename(resolvedDir);
    const pinName = flags.name || `${directoryName}-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    this.log(`Publishing directory '${directoryName}' to IPFS via Filebase...`);

    try {
      // Upload directory to Filebase
      const result = await this.uploadDirectoryToFilebase(
        resolvedDir,
        pinName,
        flags["filebase-key"],
        flags["filebase-secret"],
        flags["filebase-bucket"]
      );

      // Display results
      this.log(`Upload successful!`);
      this.log(`IPFS CID: ${result.cid}`);
      this.log(`Gateway URLs:`);
      this.log(`- https://ipfs.filebase.io/ipfs/${result.cid}/`);
      this.log(`- https://${result.cid}.ipfs.dweb.link/`);
      this.log(`- https://${result.cid}.ipfs.cf-ipfs.com/`);
      this.log(`- https://${result.cid}.eth.limo/`);

      return {
        cid: result.cid,
        url: `https://ipfs.filebase.io/ipfs/${result.cid}/`,
        ethLimoUrl: `https://${result.cid}.eth.limo/`,
        name: pinName,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to upload to IPFS: ${error.message}`);
      } else {
        this.error(`Failed to upload to IPFS: Unknown error`);
      }
    }
  }

  private async uploadDirectoryToFilebase(
    directoryPath: string,
    name: string,
    apiKey: string,
    apiSecret: string,
    bucket: string
  ): Promise<{ cid: string }> {
    const formData = new FormData();
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    // Use Filebase's folder upload API
    // First, get all files in the directory
    const files = await glob("**/*", {
      cwd: directoryPath,
      nodir: true,
      dot: true,
    });

    if (files.length === 0) {
      throw new Error("Directory is empty, nothing to upload");
    }

    // Add each file to the form data
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        // Use the relative path as the form field name to preserve directory structure
        formData.append(file, createReadStream(filePath));
      }
    }

    try {
      // Use Filebase's directory upload endpoint
      const response = await axios.post(`https://api.filebase.io/v1/ipfs/pins/${name}`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${auth}`,
          "X-Bucket": bucket,
          "X-Folder": "true", // This header tells Filebase to create a directory structure
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 300000, // 5 minutes timeout for larger uploads
      });

      return { cid: response.data.cid };
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        throw new Error(`Filebase API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
