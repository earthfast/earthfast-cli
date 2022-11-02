import { CliUx, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHex, normalizeRecord } from "../../helpers";

export default class ProjectCreate extends TransactionCommand {
  static description = "Registers a new project on the Armada Network.";
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

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectCreate);
    if (!!args.URL !== !!args.SHA) {
      this.error("URL and SHA must be specified together");
    }

    const signer = await getSigner(flags.network, flags.address, flags.signer);
    const projects = await getContract(flags.network, "projects", signer);
    const owner = flags.owner ? normalizeHex(flags.owner) : await signer.getAddress();
    const bundleSha = normalizeHex(args.SHA);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.createProject([owner, args.NAME, args.EMAIL, args.URL, bundleSha]);
    CliUx.ux.action.stop("done");
    console.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectCreated");
    console.log(normalizeRecord(event));
  }
}
