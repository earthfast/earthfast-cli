import { Command } from "@oclif/core";
import { generateManifest } from "../../manifest";

export default class BundleManifest extends Command {
  static summary = "Generates a new site manifest.";
  static examples = ["<%= config.bin %> <%= command.id %> ./dist"];
  static usage = "<%= command.id %> DIR";
  static aliases = ["bundle:manifest", "manifest"];
  static hidden = true;
  static args = [
    { name: "DIR", description: "Relative path to the app's build directory (e.g. ./dist).", required: true },
  ];

  public async run(): Promise<void> {
    const { args } = await this.parse(BundleManifest);
    const manifestPath = await generateManifest(args.DIR);
    console.log(manifestPath);
  }
}
