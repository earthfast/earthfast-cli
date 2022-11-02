import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export default class ProjectDelete extends TransactionCommand {
  static description = "Deletes a project from the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project to delete.", required: true }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectDelete);
    const signer = await getSigner(flags.network, flags.address, flags.ledger);
    const projects = await getContract(flags.network, "projects", signer);
    const projectId = normalizeHex(args.ID);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.deleteProject(projectId);
    CliUx.ux.action.stop("done");
    console.log(`> Transaction ${tx.hash}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const events = await decodeEvent(receipt, projects, "ProjectDeleted");
    console.log(events);
  }
}
