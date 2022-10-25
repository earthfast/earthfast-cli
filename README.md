# armada-cli

A command line tool for working with the Armada Network.

## Installation

```sh
npm install armada-cli
```

## Usage

### Creating a Bundle

Once a site has been built and is ready for bundling, run the following command to generate an Armada-compatible archive:

```sh
npx armada bundle <name> <build-dir>
```

Example: `npx armada bundle my-site-v1.0.0 ./dist`
