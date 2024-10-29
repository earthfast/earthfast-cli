import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class ProjectDelete extends TransactionCommand {
  static summary = "Delete a project from the EarthFast Network.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project to delete.", required: true }];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectDelete);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);
    const projectId = parseHash(args.ID);
    const tx = await projects.populateTransaction.deleteProject(projectId);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
