import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { getAll, getContract, getProvider, normalizeHash, normalizeRecords, pretty } from "../../helpers";

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
    const reservations = await getContract(flags.network, flags.abi, "ArmadaReservations", provider);
    const projectId = normalizeHash(args.ID);
    const blockTag = await provider.getBlockNumber();
    const results: Result[] = await getAll(flags.page, async (i, n) => {
      return await reservations.getReservations(projectId, i, n, { blockTag });
    });

    const output = normalizeRecords(results.slice(flags.skip, flags.skip + flags.size));
    this.log(pretty(output));
    return output;
  }
}
