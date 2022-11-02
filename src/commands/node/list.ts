import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { getContract, getProvider, normalizeHex, normalizeRecords } from "../../helpers";

export default class NodeList extends BlockchainCommand {
  static description = "Lists content nodes on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--topology] [--operator ID] [--skip N] [--size N]";
  static flags = {
    topology: Flags.boolean({ description: "List topology nodes instead." }),
    operator: Flags.string({ description: "Filter by operator ID.", helpValue: "ID" }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(NodeList);
    const provider = await getProvider(flags.network);
    const nodes = await getContract(flags.network, "nodes", provider);
    const operatorId = normalizeHex(flags.operator);
    const blockTag = await provider.getBlockNumber();
    const results: Result[] = [];
    for (let i = flags.skip; results.length < flags.size; ) {
      const records: Result[] = await nodes.getNodes(operatorId, flags.topology, i, flags.page, { blockTag });
      i += records.length;
      results.push(...records.slice(0, flags.size - results.length));
      if (records.length !== flags.page) {
        break;
      }
    }
    console.log(normalizeRecords(results));
  }
}
