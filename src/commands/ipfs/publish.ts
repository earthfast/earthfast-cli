import fs from "fs";
import path from "path";
import { Command, Flags } from "@oclif/core";
import axios, { AxiosError, isAxiosError } from "axios";
import FormData from "form-data";

export default class IpfsPublish extends Command {
  static description = "Publish content to IPFS";

  static examples = [
    "<%= config.bin %> <%= command.id %> ./my-site",
    '<%= config.bin %> <%= command.id %> ./my-file.txt --name "My Important File"',
    "<%= config.bin %> <%= command.id %> ./my-directory --quiet",
  ];

  static flags = {
    apiKey: Flags.string({
      description: "IPFS service API Key",
      env: "IPFS_API_KEY",
      required: true,
    }),
    secretKey: Flags.string({
      description: "IPFS service Secret Key",
      env: "IPFS_SECRET_KEY",
      required: true,
    }),
    name: Flags.string({
      description: "Name for the pinned content",
      default: "",
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
        this.log(`Publishing to IPFS: ${args.path}`);
      }

      // Create form data
      const formData = new FormData();

      // Handle files or directories
      const stats = fs.statSync(args.path);
      if (stats.isDirectory()) {
        // Add all files from the directory
        const files = this.walkDirectory(args.path);

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

      // Add optional metadata - using generic approach
      if (flags.name) {
        const metadata = JSON.stringify({
          name: flags.name,
          keyvalues: {
            source: "earthfast-cli",
          },
        });
        formData.append("pinataMetadata", metadata); // Service-specific field name
      }

      // SERVICE-SPECIFIC CONFIG - EASY TO SWAP
      const uploadUrl = "https://api.pinata.cloud/pinning/pinFileToIPFS";
      const headers = {
        "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
        pinata_api_key: flags.apiKey,
        pinata_secret_api_key: flags.secretKey,
      };

      // Make API request
      const response = await axios.post(uploadUrl, formData, {
        maxBodyLength: Infinity,
        headers: headers,
      });

      // SERVICE-SPECIFIC RESPONSE HANDLING
      const cid = response.data.IpfsHash;

      if (!flags.quiet) {
        this.log(`\nSuccessfully published to IPFS with CID: ${cid}`);

        // Generic gateway URLs
        this.log(`View on IPFS.io: https://ipfs.io/ipfs/${cid}`);
        this.log(`View on Cloudflare: https://cloudflare-ipfs.com/ipfs/${cid}`);

        // Service-specific URLs
        this.log(`View on Pinata: https://gateway.pinata.cloud/ipfs/${cid}`);
      }

      // Output just the CID
      this.log(cid);

      return cid;
    } catch (error) {
      // Proper error handling with type checking
      if (isAxiosError(error)) {
        // Handle Axios-specific errors
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          this.error(`IPFS upload failed: ${axiosError.response.status} - ${axiosError.response.statusText}`);
        } else if (axiosError.request) {
          this.error(`IPFS upload failed: No response received`);
        } else {
          this.error(`IPFS upload failed: ${axiosError.message}`);
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
