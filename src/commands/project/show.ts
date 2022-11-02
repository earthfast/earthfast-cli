import { Arg } from "@oclif/core/lib/interfaces";
import { BlockchainCommand } from "../../base";
import { getContract, getProvider, normalizeHex } from "../../helpers";

export default class ProjectShow extends BlockchainCommand {
  static description = "Shows details of an Armada Network project.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project to show.", required: true }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectShow);
    const provider = await getProvider(flags.network);
    const projects = await getContract(flags.network, "projects", provider);
    const projectId = normalizeHex(args.ID);
    const data = await projects.getProject(projectId);
    console.log(data);
  }
}
