# armada-cli

A command line tool for working with the Armada Network.

> Note: For now, projects must be whitelisted to run on Armada testnet. Once a project is admitted, it gets a `project-id` that can be used in the commands below.

## Installation

```sh
npm install armada-cli
```

## Creating a Bundle

Once a site has been built and is ready for bundling, run the following command to generate an Armada-compatible archive. This can be done manually, or by a CI system:

```sh
npx armada bundle <name> <build-dir>
```

Example: `npx armada bundle my-site-v1.0.0 ./dist`

## Publishing a Bundle

Once the bundle has been made available on a publicly accessible URL, such as Github Releases or S3, it can be published on the Armada Network. This can be done by a DAO vote, for example through Tally, or manually like this:

```sh
npx armada project-content <project-id> <bundle-url> <bundle-sha>
```

Example: `npx armada publish 0x0123... https://.../my-site-v1.0.0.tgz 0xabcd...`
