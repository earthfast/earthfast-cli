# armada-cli

A command line tool for working with the Armada Network.

## Installation

To install in an npm project 
```
npm install armada-cli
```

This can also be used standalone in a command line like
```
npx armada-cli
```

## Usage

For all available commands and options run `npx armada-cli --help`. For help on individual commands append `--help` to a command, for example `npx armada-cli project create` --help`

## Creating a Bundle and Checksum

Once the static assets for a site have been built and are ready for bundling, run the following command to generate an Armada-compatible archive. This can be done manually, or by a CI system:

Bundle archive:
```sh
npx armada-cli bundle create <name> <build-dir>
# Example: `npx armada-cli bundle create my-site-v1.0.0 ./dist`
```

Bundle Checksum:
```sh
npx armada-cli bundle checksum <bundle-zip-file>
# Example: `npx armada-cli bundle checksum my-site-v1.0.0.zip`
```

## Publishing a Bundle

Once the bundle has been made available on a publicly accessible URL, such as Github Releases or S3, it can be published on the Armada Network. This can be done by a DAO vote, for example through Tally, or manually like this:

```sh
npx armada-cli project publish <project-id> <bundle-url> <bundle-checksum>
```

Example: `npx armada-cli project publish 0x123abc... https://.../my-site-v1.0.0.tgz 0x456def...`
