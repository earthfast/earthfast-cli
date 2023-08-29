import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class ProjectMetadata extends TransactionCommand {
  static summary = "Set metadata property on a project.";
  static examples = ['<%= config.bin %> <%= command.id %> \'{"property": "value"}\''];
  static usage = "<%= command.id %> ID METADATA";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to change metadata.", required: true },
    {
      name: "METADATA",
      description: "New JSON metadata string to attach to the project. Previous metadata will be overwritten.",
      required: true,
    },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectMetadata);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = parseHash(args.ID);

    try {
      JSON.parse(args.METADATA);
    } catch (e) {
      this.error("METADATA must be valid JSON.");
    }
    const tx = await projects.populateTransaction.setProjectMetadata(projectId, args.METADATA);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
