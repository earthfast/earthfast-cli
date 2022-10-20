# armada-cli

A command line tool for working with the Armada Network.

## Installation

```sh
npm install armada-cli
```

## Usage

### Creating a Bundle

Once a site has been built and is ready for bundling, run the following command to generate an Armada Network compatible tarball:

```sh
npx armada bundle <archive> <build-dir>
```

Example: `npx armada bundle mysite.tgz ./dist`

Note that running `bundle` will also print the SHA256 checksum of the archive, which is needed for publishing the site to the Armada Network.
