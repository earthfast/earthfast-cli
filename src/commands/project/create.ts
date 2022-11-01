import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export default class ProjectCreate extends TransactionCommand {
  static description = "Registers a new project on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "project create NAME EMAIL [URL] [SHA]";
  static args: Arg[] = [
    { name: "NAME", description: "The name of the project to create.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
  ];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectCreate);
    if (!!args.URL !== !!args.SHA) {
      this.error("URL and SHA must be specified together");
    }

    const signer = await getSigner(flags.network, flags.ledger);
    const projects = await getContract(flags.network, "projects", signer);
    const address = await signer.getAddress();
    const bundleSha = normalizeHex(args.SHA);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.createProject([address, args.NAME, args.EMAIL, args.URL, bundleSha]);
    CliUx.ux.action.stop("done");
    console.log(`- Transaction ${tx.hash}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const events = await decodeEvent(receipt, projects, "ProjectCreated");
    console.log(events);
  }
}
