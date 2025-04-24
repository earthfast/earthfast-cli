import fs from "fs";
import path from "path";
import { Command, Flags } from "@oclif/core";
import axios, { isAxiosError } from "axios";
import FormData from "form-data";

export default class IpfsPublish extends Command {
  static description = "Publish content to IPFS using Filebase";

  static examples = [
    "<%= config.bin %> <%= command.id %> ./my-site",
    '<%= config.bin %> <%= command.id %> ./my-file.txt --name "My Important File"',
    "<%= config.bin %> <%= command.id %> ./my-directory --quiet",
    "<%= config.bin %> <%= command.id %> ./my-bundle.tgz --endpoint https://api.filebase.io/v1/ipfs/add",
  ];

  static flags = {
    apiKey: Flags.string({
      description: "Filebase API Key/Token",
      env: "FILEBASE_API_KEY",
      required: true,
    }),
    endpoint: Flags.string({
      description: "IPFS API endpoint",
      env: "IPFS_API_ENDPOINT",
      default: "https://api.filebase.io/v1/ipfs/add",
    }),
    name: Flags.string({
      description: "Name for the pinned content",
      default: "",
    }),
    pin: Flags.boolean({
      description: "Pin the content to Filebase",
      default: true,
    }),
    quiet: Flags.boolean({
      char: "q",
      description: "Only output the resulting CID",
      default: false,
    }),
  };

  static args = [
    {
      name: "path",
      description: "Path to file or directory to publish",
      required: true,
    },
  ];

  async run() {
    const { args, flags } = await this.parse(IpfsPublish);

    if (!fs.existsSync(args.path)) {
      this.error(`Path not found: ${args.path}`);
    }

    try {
      if (!flags.quiet) {
        this.log(`Publishing to Filebase IPFS: ${args.path}`);
      }

      // Create form data
      const formData = new FormData();

      // Add common parameters for Filebase
      if (flags.pin) {
        formData.append("pin", "true");
      }

      if (flags.name) {
        formData.append("name", flags.name);
      }

      // Handle files or directories
      const stats = fs.statSync(args.path);
      if (stats.isDirectory()) {
        // Add all files from the directory
        const files = this.walkDirectory(args.path);

        if (!flags.quiet) {
          this.log(`Found ${files.length} files in directory`);
        }

        for (const file of files) {
          const relativePath = path.relative(args.path, file);
          const readStream = fs.createReadStream(file);
          formData.append("file", readStream, { filepath: relativePath });
        }
      } else {
        // Add a single file
        const readStream = fs.createReadStream(args.path);
        formData.append("file", readStream);
      }

      // Make API request to Filebase with token-based authentication
      const response = await axios.post(flags.endpoint, formData, {
        maxBodyLength: Infinity,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
          Authorization: `Bearer ${flags.apiKey}`,
        },
      });

      // Parse the response based on Filebase's format
      const cid = response.data.cid || response.data.ipfs_cid || response.data.Hash;

      if (!cid) {
        this.error(`Failed to get CID from response: ${JSON.stringify(response.data)}`);
      }

      if (!flags.quiet) {
        this.log(`\nSuccessfully published to IPFS with CID: ${cid}`);
        this.log(`View on IPFS.io: https://ipfs.io/ipfs/${cid}`);
        this.log(`View on Cloudflare: https://cloudflare-ipfs.com/ipfs/${cid}`);
        this.log(`View on Filebase: https://ipfs.filebase.io/ipfs/${cid}`);
      }

      // Output just the CID (for piping to other commands)
      this.log(cid);

      return cid;
    } catch (error) {
      if (isAxiosError(error)) {
        // Handle Axios-specific errors
        if (error.response) {
          this.error(`IPFS upload failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          this.error(`IPFS upload failed: No response received`);
        } else {
          this.error(`IPFS upload failed: ${error.message}`);
        }
      } else {
        // Handle generic errors
        this.error(`Failed to publish to IPFS: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Helper method to walk directories recursively
  walkDirectory(dir: string, filelist: string[] = []): string[] {
    fs.readdirSync(dir).forEach((file) => {
      const filepath = path.join(dir, file);
      if (fs.statSync(filepath).isDirectory()) {
        filelist = this.walkDirectory(filepath, filelist);
      } else {
        filelist.push(filepath);
      }
    });
    return filelist;
  }
}
