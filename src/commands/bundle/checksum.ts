import { Command } from "@oclif/core";
import { sha256File } from "../../checksum";

export default class BundleChecksum extends Command {
  static summary = "Prints the SHA256 checksum of the provided file.";
  static examples = ["<%= config.bin %> <%= command.id %> my-site-v1.0.0.tgz"];
  static usage = "bundle checksum FILE";
  static args = [{ name: "FILE", description: "The file to checksum.", required: true }];

  public async run(): Promise<void> {
    const { args } = await this.parse(BundleChecksum);
    console.log(await sha256File(args.FILE));
  }
}
