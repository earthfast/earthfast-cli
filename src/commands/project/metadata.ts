import fs from "fs";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { create as ipfsCreate } from "ipfs-http-client";
import { TransactionCommand } from "../../base";
import { computeCIDv1 } from "../../checksum";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class ProjectMetadata extends TransactionCommand {
  static summary = "Set metadata property on a project.";
  static examples = [
    // The basic example below overwrites metadata:
    '<%= config.bin %> <%= command.id %> 0x123abc... \'{"property": "value"}\'',
    // Example with ENS and new bundle file update:
    '<%= config.bin %> <%= command.id %> 0x123abc... \'{"other": "info"}\' --ens newname.eth --bundle ./new/path/to/file --publish',
  ];
  static usage = "<%= command.id %> ID METADATA [--bundle PATH] [--ens NAME] [--publish]";
  static args: Arg[] = [
    {
      name: "ID",
      description: "The ID of the project to change metadata.",
      required: true,
    },
    {
      name: "METADATA",
      description: "New JSON metadata. Previous metadata will be overwritten.",
      required: true,
    },
  ];
  static flags = {
    ...TransactionCommand.flags,
    bundle: Flags.string({
      description: "Path to the local content bundle file to generate and update IPFS CID",
      default: "",
    }),
    ens: Flags.string({
      description: "ENS domain to attach to the project",
      default: "",
    }),
    publish: Flags.boolean({
      description: "If provided along with --bundle, publish the file to IPFS.",
      default: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectMetadata);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);
    const projectId = parseHash(args.ID);

    let metadataObj: any;
    try {
      metadataObj = JSON.parse(args.METADATA);
    } catch (e) {
      this.error("METADATA must be valid JSON.");
    }

    // Update metadata with a new IPFS CID if a bundle file is provided
    if (flags.bundle) {
      try {
        const cid = await computeCIDv1(flags.bundle);
        metadataObj.ipfsCID = cid;
        this.log(`Computed new CID for bundle: ${cid}`);
        if (flags.publish) {
          const ipfs = ipfsCreate({ url: "https://ipfs.io:5001" });
          const fileBuffer = fs.readFileSync(flags.bundle);
          const result = await ipfs.add(fileBuffer);
          this.log(`New file published to IPFS with CID: ${result.cid.toString()}`);
        }
      } catch (e) {
        this.error(`Failed to process bundle file: ${e}`);
      }
    }

    // If an ENS domain is provided, update metadata accordingly.
    if (flags.ens) {
      metadataObj.ens = flags.ens;
    }

    const newMetadata = JSON.stringify(metadataObj);
    const tx = await projects.populateTransaction.setProjectMetadata(projectId, newMetadata);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
