#!/usr/bin/env node

import * as path from 'path';
import * as tar from 'tar';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { sha256File } from './checksum.js';
import { generateManifest } from './manifest.js';

yargs(hideBin(process.argv))
    .command(
        'bundle <name> <build-dir>',
        'Bundle an application for use on the Armada Network',
        (yargs) => {
            return yargs
                .positional('name', {
                    describe: 'The name of the bundle to create (e.g. my-site-v1.0.0)',
                })
                .positional('build-dir', {
                    describe: 'Relative path to the application\'s build directory (e.g. ./dist)',
                })
        },
        async (argv) => {
            await generateManifest(argv.buildDir);
            const bundleName = normalizeBundleExtension(argv.name);
            await compress(bundleName, argv.buildDir);
            console.log(bundleName);
        }
    )
    .command(
        'checksum <file>',
        'Prints the SHA256 checksum of the provided file',
        (yargs) => {
            return yargs
                .positional('file', {
                    describe: 'The file to checksum',
                })
        },
        async (argv) => {
            console.log(await sha256File(argv.file));
        }
    )
    .command(
        'generate-manifest <build-dir>',
        'Generate a new site manifest',
        (yargs) => {
            return yargs
                .positional('build-dir', {
                    describe: 'Relative path to the build directory (e.g. ./dist)',
                })
        },
        async (argv) => {
            const manifestPath = await generateManifest(argv.buildDir);
            console.log(manifestPath);
        }
    )
    .demandCommand(1)
    .parse();

function normalizeBundleExtension(name) {
    if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) {
        return name;
    }
    return name += '.tgz';
}

async function compress(archive, buildDir) {
    return tar.c(
        {
            gzip: true,
            file: archive,

            // Always change directories to the immediate parent of buildDir before
            // archiving so that the final file structure is one level deep.
            C: path.join(buildDir, '..'),

            // Follow symlinks, the network will only serve regular files.
            follow: true,
        },
        [
            // Due to the `C` flag used above, only specify the final path component.
            path.basename(buildDir)
        ]
    );
}
