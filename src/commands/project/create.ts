import fs from "fs";
import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { create as ipfsCreate } from "ipfs-http-client";
import { TransactionCommand } from "../../base";
import { computeCIDv1 } from "../../checksum";
import { getContract, getSigner, parseAddress, parseHash, pretty, run } from "../../helpers";

export default class ProjectCreate extends TransactionCommand {
  static summary = "Register a new project on the EarthFast Network.";
  static examples = [
    '<%= config.bin %> <%= command.id %> "My Project" notify@myproject.com --bundle ./path/to/file --ens myproject.eth --publish',
  ];
  static usage =
    "<%= command.id %> [--owner ADDR] [--type TYPE] [--bundle PATH] [--ens NAME] [--publish] NAME EMAIL [URL] [SHA] [METADATA]";
  static args: Arg[] = [
    {
      name: "NAME",
      description: "The human readable name of the new project.",
      required: true,
    },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
    {
      name: "METADATA",
      description: "JSON metadata to attach to this project.",
      default: "",
    },
  ];
  static flags = {
    ...TransactionCommand.flags,
    owner: Flags.string({
      description: "[default: caller] The owner for the new project.",
      helpValue: "ADDR",
    }),
    type: Flags.string({
      description: "Project type (static or nextjs)",
      options: ["static", "nextjs"],
      default: "static",
    }),
    bundle: Flags.string({
      description: "Path to the local content bundle file to generate and add IPFS CID",
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
    const { args, flags } = await this.parse(ProjectCreate);

    if (!!args.URL !== !!args.SHA) {
      this.error("Can only specify URL and SHA together.");
    }
    if (flags.signer === "raw" && parseAddress(flags.owner) === AddressZero) {
      this.error("Must specify --owner when using raw signer.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);
    const owner = flags.owner ? parseAddress(flags.owner) : await signer.getAddress();
    const bundleSha = parseHash(args.SHA);

    // Build initial metadata object with the project type
    let metadataObj: any = {};
    if (args.METADATA === "") {
      metadataObj = { type: flags.type };
    } else {
      try {
        metadataObj = JSON.parse(args.METADATA);
        // Overwrite or set the project type
        metadataObj.type = flags.type;
      } catch (e) {
        this.error("METADATA must be valid JSON.");
      }
    }

    // If a bundle file is provided, compute its IPFS CID and merge it into metadata
    if (flags.bundle) {
      try {
        const cid = await computeCIDv1(flags.bundle);
        metadataObj.ipfsCID = cid;
        this.log(`Computed CID for bundle: ${cid}`);

        // Optionally publish the file to IPFS if the --publish flag is provided
        if (flags.publish) {
          const ipfs = ipfsCreate({ url: "https://ipfs.io:5001" });
          const fileBuffer = fs.readFileSync(flags.bundle);
          const result = await ipfs.add(fileBuffer);
          this.log(`File published to IPFS with CID: ${result.cid.toString()}`);
        }
      } catch (e) {
        this.error(`Failed to process bundle file: ${e}`);
      }
    }

    // If an ENS domain is provided, attach it in metadata
    if (flags.ens) {
      metadataObj.ens = flags.ens;
    }

    const metadata = JSON.stringify(metadataObj);

    const tx = await projects.populateTransaction.createProject([
      owner,
      args.NAME,
      args.EMAIL,
      args.URL,
      bundleSha,
      metadata,
    ]);

    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
