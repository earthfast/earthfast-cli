import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHash, normalizeRecord } from "../../helpers";

export default class ProjectProps extends TransactionCommand {
  static description = "Change detailed properties of a project.";
  static examples = ['<%= config.bin %> <%= command.id %> 0x123abc... "My Project" notify@myproject.com'];
  static usage = "<%= command.id %> ID NAME EMAIL";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to change properties.", required: true },
    { name: "NAME", description: "The new human readable name of the project.", required: true },
    { name: "EMAIL", description: "The new email for admin notifications.", required: true },
  ];

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(ProjectProps);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.setProjectProps(projectId, args.NAME, args.EMAIL);
    CliUx.ux.action.stop("done");
    console.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectPropsChanged");
    const output = normalizeRecord(event);
    if (!flags.json) console.log(output);
    return output;
  }
}
