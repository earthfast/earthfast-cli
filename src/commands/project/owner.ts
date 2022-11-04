import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHash, normalizeRecord } from "../../helpers";

export default class ProjectOwner extends TransactionCommand {
  static description = "Transfer ownership of a project.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID ADDR";
  static aliases = ["project:owner", "project:transfer"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to change owner.", required: true },
    { name: "ADDR", description: "The address of the new project owner.", required: true },
  ];

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(ProjectOwner);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.setProjectOwner(projectId, args.ADDR);
    CliUx.ux.action.stop("done");
    this.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectOwnerChanged");
    const output = normalizeRecord(event);
    if (!flags.json) console.log(output);
    return output;
  }
}
