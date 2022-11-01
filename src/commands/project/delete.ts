import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export default class ProjectDelete extends TransactionCommand {
  static summary = "Deletes a project from the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "project delete ID";
  static args = [{ name: "ID", description: "The ID of the project to delete.", required: true }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectDelete);
    const signer = await getSigner(flags.network, flags.ledger);
    const projects = await getContract(flags.network, "projects", signer);
    const projectId = normalizeHex(args.ID);
    const tx = await projects.deleteProject(projectId);
    console.log(`Transaction ${tx.hash}...`);
    const receipt = await tx.wait();
    const events = await decodeEvent(receipt, projects, "ProjectDeleted");
    console.log(events);
    console.log("OK");
  }
}
