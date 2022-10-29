#!/usr/bin/env node

import path from "path";
import tar from "tar";
import yargs, { CommandModule } from "yargs";
import { hideBin } from "yargs/helpers";
import { sha256File } from "./checksum";
import { commands as keyCommands } from "./commands/key";
import { commands as nodeCommands } from "./commands/node";
import { commands as projectCommands } from "./commands/project";
import { generateManifest } from "./manifest";
import { defaultNetworks } from "./networks";

yargs(hideBin(process.argv))
  .command(keyCommands as unknown as CommandModule<unknown, unknown>)
  .command(nodeCommands as unknown as CommandModule<unknown, unknown>)
  .command(projectCommands as unknown as CommandModule<unknown, unknown>)
  .command(
    "bundle <name> <build-dir>",
    "Bundle an application for use on the Armada Network",
    (yargs) => {
      return yargs
        .positional("name", {
          describe: "The name of the bundle to create (e.g. my-site-v1.0.0)",
        })
        .positional("build-dir", {
          describe: "Relative path to the application's build directory (e.g. ./dist)",
        });
    },
    async (argv) => {
      await generateManifest(argv.buildDir as string);
      const bundleName = normalizeBundleExtension(argv.name as string);
      await compress(bundleName, argv.buildDir as string);
      console.log(bundleName);
    }
  )
  .command(
    "checksum <file>",
    "Prints the SHA256 checksum of the provided file",
    (yargs) => {
      return yargs.positional("file", {
        describe: "The file to checksum",
      });
    },
    async (argv) => {
      console.log(await sha256File(argv.file as string));
    }
  )
  .command(
    "generate-manifest <build-dir>",
    "Generate a new site manifest",
    (yargs) => {
      return yargs.positional("build-dir", {
        describe: "Relative path to the build directory (e.g. ./dist)",
      });
    },
    async (argv) => {
      const manifestPath = await generateManifest(argv.buildDir as string);
      console.log(manifestPath);
    }
  )
  .option("network", {
    describe: "The network to use.",
    type: "string",
    choices: Object.keys(defaultNetworks),
    default: "testnet",
  })
  .option("ledger", {
    describe: "Use Ledger hardware wallet",
    type: "boolean",
    default: false,
  })
  .demandCommand(1)
  .parse();

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
