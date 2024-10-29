import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { formatNode, getAll, getContract, getProvider, parseHash, pretty } from "../../helpers";

export default class ReservationList extends BlockchainCommand {
  static summary = "List node reservations by a project.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--skip N] [--size N] [--page N]";
  static args: Arg[] = [{ name: "ID", description: "The ID of the project.", required: true }];
  static flags = {
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { args, flags } = await this.parse(ReservationList);
    const provider = await getProvider(flags.network, flags.rpc);
    const reservations = await getContract(flags.network, flags.abi, "EarthfastReservations", provider);
    const projectId = parseHash(args.ID);
    const blockTag = await provider.getBlockNumber();
    const results: Result[] = await getAll(flags.page, async (i, n) => {
      return await reservations.getReservations(projectId, i, n, { blockTag });
    });

    const records = results.slice(flags.skip, flags.skip + flags.size);
    const output = records.map((r) => formatNode(r));
    this.log(pretty(output));
    return output;
  }
}
