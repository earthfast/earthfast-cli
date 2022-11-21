import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { sha256File } from "../../checksum";

export default class BundleChecksum extends Command {
  static description = "Print the SHA256 checksum of the provided file.";
  static examples = ["<%= config.bin %> <%= command.id %> my-site-v1.0.0.tgz"];
  static usage = "<%= command.id %> FILE";
  static args: Arg[] = [{ name: "FILE", description: "The file to checksum.", required: true }];
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    const { args } = await this.parse(BundleChecksum);
    const sha = await sha256File(args.FILE);
    this.log(sha);
    return sha;
  }
}
