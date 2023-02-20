import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class ProjectProps extends TransactionCommand {
  static summary = "Change detailed properties of a project.";
  static examples = ['<%= config.bin %> <%= command.id %> 0x123abc... "My Project" notify@myproject.com'];
  static usage = "<%= command.id %> ID NAME EMAIL";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to change properties.", required: true },
    { name: "NAME", description: "The new human readable name of the project.", required: true },
    { name: "EMAIL", description: "The new email for admin notifications.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectProps);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = parseHash(args.ID);
    const tx = await projects.populateTransaction.setProjectProps(projectId, args.NAME, args.EMAIL);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
