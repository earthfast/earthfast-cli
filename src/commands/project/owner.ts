import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHex, normalizeRecord } from "../../helpers";

export default class ProjectOwner extends TransactionCommand {
  static description = "Changes detailed properties of a project.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID ADDR";
  static aliases = ["project:owner", "project:transfer"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to change properties.", required: true },
    { name: "ADDR", description: "The address of the new owner of the project.", required: true },
  ];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectOwner);
    const signer = await getSigner(flags.network, flags.address, flags.signer);
    const projects = await getContract(flags.network, "projects", signer);
    const projectId = normalizeHex(args.ID);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.setProjectOwner(projectId, args.ADDR);
    CliUx.ux.action.stop("done");
    console.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectOwnerChanged");
    console.log(normalizeRecord(event));
  }
}
