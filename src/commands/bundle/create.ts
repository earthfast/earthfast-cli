import path from "path";
import { Command } from "@oclif/core";
import tar from "tar";
import { generateManifest } from "../../manifest";

export default class BundleCreate extends Command {
  static description = "Bundles an application for use on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %> my-site-v1.0.0 ./dist"];
  static usage = "bundle create NAME DIR";
  static args = [
    { name: "NAME", description: "The name of the bundle to create (e.g. my-site-v1.0.0).", required: true },
    { name: "DIR", description: "Relative path to the app's build directory (e.g. ./dist).", required: true },
  ];

  public async run(): Promise<void> {
    const { args } = await this.parse(BundleCreate);
    await generateManifest(args.DIR);
    const bundleName = normalizeBundleExtension(args.NAME);
    await compress(bundleName, args.DIR);
    console.log(bundleName);
  }
}

function normalizeBundleExtension(name: string) {
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) {
    return name;
  }
  return name + ".tgz";
}

async function compress(archive: string, buildDir: string) {
  return tar.c(
    {
      gzip: true,
      file: archive,

      // Always change directories to the immediate parent of buildDir before
      // archiving so that the final file structure is one level deep.
      C: path.join(buildDir, ".."),

      // Follow symlinks, the network will only serve regular files.
      follow: true,
    },
    [
      // Due to the `C` flag used above, only specify the final path component.
      path.basename(buildDir),
    ]
  );
}
