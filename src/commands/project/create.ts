import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseAddress, parseHash, pretty, run } from "../../helpers";

interface ProjectMetadata {
  type: "static" | "nextjs";
  port?: number;
  startCommand?: string;
  bundleUrl?: string;
}

export default class ProjectCreate extends TransactionCommand {
  static summary = "Register a new project on the EarthFast Network.";
  static examples = ['<%= config.bin %> <%= command.id %> "My Project" notify@myproject.com'];
  static usage = "<%= command.id %> [--owner ADDR] [--type TYPE] NAME EMAIL [URL] [SHA] [METADATA]";

  static args: Arg[] = [
    { name: "NAME", description: "The human readable name of the new project.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
    { name: "METADATA", description: "JSON metadata to attach to this project.", default: "" },
  ];

  static flags = {
    ...TransactionCommand.flags,
    owner: Flags.string({
      description: "[default: caller] The owner for the new project.",
      helpValue: "ADDR",
    }),
    type: Flags.string({
      description: "Project type (static or nextjs)",
      options: ["static", "nextjs"] as const,
      default: "static",
    }),
    port: Flags.integer({
      description: "Port for Next.js server",
      default: 3000,
    }),
    startCommand: Flags.string({
      description: "Start command for Next.js server",
      default: "node server.js",
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

    // Handle metadata
    let metadata: ProjectMetadata = {
      type: flags.type as "static" | "nextjs",
    };

    // Parse existing metadata if provided
    if (args.METADATA) {
      try {
        const parsedMetadata = JSON.parse(args.METADATA);
        metadata = { ...metadata, ...parsedMetadata };
      } catch (e) {
        this.error("METADATA must be valid JSON.");
      }
    }

    // Add Next.js specific metadata
    if (flags.type === "nextjs") {
      metadata = {
        ...metadata,
        port: flags.port,
        startCommand: flags.startCommand,
        bundleUrl: args.URL,
      };
    }

    const tx = await projects.populateTransaction.createProject([
      owner,
      args.NAME,
      args.EMAIL,
      args.URL,
      bundleSha,
      JSON.stringify(metadata),
    ]);

    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
