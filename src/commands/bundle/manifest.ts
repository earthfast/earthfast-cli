import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { generateManifest } from "../../manifest";

export default class BundleManifest extends Command {
  static summary = "Generate a new site manifest.";
  static examples = ["<%= config.bin %> <%= command.id %> ./dist"];
  static usage = "<%= command.id %> DIR";
  static enableJsonFlag = true;
  static hidden = true;
  static args: Arg[] = [
    { name: "DIR", description: "Relative path to the app's build directory (e.g. ./dist).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args } = await this.parse(BundleManifest);
    const manifestPath = await generateManifest(args.DIR);
    this.log(manifestPath);
    return manifestPath;
  }
}
