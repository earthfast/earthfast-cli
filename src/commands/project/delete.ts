import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, normalizeHash, pretty, run } from "../../helpers";

export default class ProjectDelete extends TransactionCommand {
  static description = "Delete a project from the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project to delete.", required: true }];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectDelete);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    const tx = await projects.populateTransaction.deleteProject(projectId);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
