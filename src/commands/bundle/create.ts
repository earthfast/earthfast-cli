import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import tar from "tar";
import { hashRegistry } from "../../hash-registry";
import { generateManifest } from "../../manifest";

export default class BundleCreate extends Command {
  static summary = "Bundle an application for use on the EarthFast Network.";
  static examples = ["<%= config.bin %> <%= command.id %> my-site-v1.0.0 ./dist"];
  static usage = "<%= command.id %> NAME DIR";
  static enableJsonFlag = true;
  static args: Arg[] = [
    { name: "NAME", description: "The name of the bundle to create (e.g. my-site-v1.0.0).", required: true },
    { name: "DIR", description: "Relative path to the app's build directory (e.g. ./dist).", required: true },
  ];
  static flags = {
    "hash-function": Flags.string({
      char: "h",
      description: "Hash function to use (sha256, ipfs-cid-v1)",
      default: "sha256",
      options: hashRegistry.listAvailable(),
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(BundleCreate);

    const resolvedDir = path.resolve(args.DIR);
    const cwd = process.cwd();
    if (resolvedDir === cwd || !resolvedDir.startsWith(cwd)) {
      this.error("Error: Output directory must be a subdirectory of the current working directory");
    }

    const hashFunction = flags["hash-function"];
    if (!hashRegistry.get(hashFunction)) {
      this.error(`Error: Hash function "${hashFunction}" not supported`);
    }

    this.log(`Generating manifest using hash function: ${hashFunction}`);
    const manifestPath = await generateManifest(args.DIR, hashFunction);
    const bundleName = normalizeBundleExtension(args.NAME);
    await compress(bundleName, args.DIR);
    this.log(`Bundle created: ${bundleName}`);
    this.log(`Manifest created at: ${manifestPath}`);
    return {
      bundleName,
      manifestPath,
      hashFunction,
    };
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
