import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseAddress, parseHash, pretty, run } from "../../helpers";

export default class ProjectCreate extends TransactionCommand {
  static summary = "Register a new project on the Armada Network.";
  static examples = ['<%= config.bin %> <%= command.id %> "My Project" notify@myproject.com'];
  static usage = "<%= command.id %> [--owner ADDR] NAME EMAIL [URL] [SHA]";
  static args: Arg[] = [
    { name: "NAME", description: "The human readable name of the new project.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
  ];
  static flags = {
    owner: Flags.string({ description: "[default: caller] The owner for the new project.", helpValue: "ADDR" }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectCreate);
    if (!!args.URL !== !!args.SHA) {
      this.error("Can only specify URL and SHA together.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const owner = flags.owner ? parseAddress(flags.owner) : await signer.getAddress();
    const bundleSha = parseHash(args.SHA);
    const tx = await projects.populateTransaction.createProject([owner, args.NAME, args.EMAIL, args.URL, bundleSha]);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
