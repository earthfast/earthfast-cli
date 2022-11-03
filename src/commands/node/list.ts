import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { getAll, getContract, getProvider, normalizeHex, normalizeRecords } from "../../helpers";

export default class NodeList extends BlockchainCommand {
  static description = "Lists content nodes on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--topology] [--operator ID] [--skip N] [--size N] [--page N]";
  static flags = {
    topology: Flags.boolean({ description: "List topology nodes instead." }),
    operator: Flags.string({ description: "Filter by operator ID.", helpValue: "ID" }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(NodeList);

    const provider = await getProvider(flags.network);
    const nodes = await getContract(flags.network, "nodes", provider);
    const operatorId = normalizeHex(flags.operator);
    const blockTag = await provider.getBlockNumber();
    const results: Result[] = await getAll(flags.page, async (i, n) => {
      return await nodes.getNodes(operatorId, flags.topology, i, n, { blockTag });
    });
    const records = results.slice(flags.skip, flags.skip + flags.size);

    const output = normalizeRecords(records);
    if (!flags.json) console.log(output);
    return output;
  }
}
