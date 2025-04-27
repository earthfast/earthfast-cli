import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import fs from "fs-extra";

const execAsync = promisify(exec);

export default class IpfsPublish extends Command {
  static summary = "Publish a directory to IPFS using Storacha via w3cli.";
  static examples = ["<%= config.bin %> <%= command.id %> ./dist"];
  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;
  static args: Arg[] = [{ name: "DIR", description: "Relative path to the directory to publish.", required: true }];

  public async run(): Promise<unknown> {
    const { args } = await this.parse(IpfsPublish);
    const resolvedDir = path.resolve(args.DIR);

    if (!fs.existsSync(resolvedDir)) {
      this.error(`Error: Directory '${args.DIR}' does not exist`);
    }

    try {
      // Check if w3 is installed
      try {
        await execAsync("w3 --version");
      } catch (error) {
        this.error("w3cli is not installed. Please run: npm i -g @web3-storage/w3cli");
      }

      // Upload using w3 command
      this.log(`Uploading directory to IPFS via Storacha...`);
      const { stdout } = await execAsync(`w3 up "${resolvedDir}"`);

      // Extract CID from stdout
      const cidMatch = stdout.match(/([a-z0-9]{59})/i);
      if (!cidMatch) {
        this.error("Failed to get CID from upload output");
      }

      const cid = cidMatch[0];

      // Generate IPFS gateway URLs
      const ipfsUrl = `https://w3s.link/ipfs/${cid}/`;
      const ethLimoUrl = `https://${cid}.ipfs.eth.limo/`;

      this.log(`\nSuccessfully uploaded to IPFS via Storacha`);
      this.log(`\nIPFS URL: ${ipfsUrl}`);
      this.log(`ETH Limo URL: ${ethLimoUrl}`);
      this.log(`IPFS CID: ${cid}`);

      return {
        ipfsUrl,
        ethLimoUrl,
        cid,
      };
    } catch (error: any) {
      this.error(`Failed to upload to IPFS: ${error.message}`);
    }
  }
}
