import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseAddress, parseHash, pretty, run } from "../../helpers";

export default class ProjectCreate extends TransactionCommand {
  static summary = "Register a new project on the EarthFast Network.";
  static examples = ['<%= config.bin %> <%= command.id %> "My Project" notify@myproject.com'];
  static usage = "<%= command.id %> [--owner ADDR] NAME EMAIL [URL] [SHA] [METADATA]";
  static args: Arg[] = [
    { name: "NAME", description: "The human readable name of the new project.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
    { name: "METADATA", description: "JSON metadata to attach to this project.", default: "" },
  ];
  static flags = {
    owner: Flags.string({ description: "[default: caller] The owner for the new project.", helpValue: "ADDR" }),
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
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const owner = flags.owner ? parseAddress(flags.owner) : await signer.getAddress();
    const bundleSha = parseHash(args.SHA);
    if (args.METADATA !== "") {
      try {
        JSON.parse(args.METADATA);
      } catch (e) {
        this.error("METADATA must be valid JSON.");
      }
    }
    const tx = await projects.populateTransaction.createProject([
      owner,
      args.NAME,
      args.EMAIL,
      args.URL,
      bundleSha,
      args.METADATA,
    ]);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
