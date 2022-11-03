import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHex, normalizeRecord } from "../../helpers";

export default class ProjectDelete extends TransactionCommand {
  static description = "Deletes a project from the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project to delete.", required: true }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectDelete);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHex(args.ID);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.deleteProject(projectId);
    CliUx.ux.action.stop("done");
    console.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectDeleted");
    console.log(normalizeRecord(event));
  }
}
