import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { formatNode, formatProject, getContract, getProvider, parseHash, pretty } from "../../helpers";

export default class ProjectShow extends BlockchainCommand {
  static summary = "Show details of an EarthFast Network project.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project to show.", required: true }];
  static flags = {
    reservations: Flags.boolean({ description: "Show reservations for the project", default: false }),
  };

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(ProjectShow);
    const provider = await getProvider(flags.network, flags.rpc);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", provider);
    const reservations = await getContract(flags.network, flags.abi, "EarthfastReservations", provider);
    const projectId = parseHash(args.ID);
    const record = await projects.getProject(projectId);
    const output = formatProject(record);

    if (flags.reservations) {
      const reservationResults: Result[] = await reservations.getReservations(projectId, 0, 1000);
      output.reservations = reservationResults.map((r) => formatNode(r));
    }

    this.log(pretty(output));
    return output;
  }
}
