import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { formatOperator, getAll, getContract, getProvider, pretty } from "../../helpers";

export default class OperatorList extends BlockchainCommand {
  static summary = "List operators on the EarthFast Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--skip N] [--size N] [--page N]";
  static flags = {
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(OperatorList);
    const provider = await getProvider(flags.network, flags.rpc);
    const operators = await getContract(flags.network, flags.abi, "EarthfastOperators", provider);
    const blockTag = await provider.getBlockNumber();
    const results: Result[] = await getAll(flags.page, async (i, n) => {
      return await operators.getOperators(i, n, { blockTag });
    });

    const records = results.slice(flags.skip, flags.skip + flags.size);
    const output = records.map((r) => formatOperator(r));
    this.log(pretty(output));
    return output;
  }
}
