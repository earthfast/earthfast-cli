import { Flags } from "@oclif/core";
import { BlockchainCommand } from "../../base";
import { getContract, getProvider, normalizeHex } from "../../helpers";

export default class NodeList extends BlockchainCommand {
  static description = "Lists content nodes on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--topology] [--operator ID] [--skip N] [--size N]";
  static flags = {
    topology: Flags.boolean({ description: "List topology nodes instead." }),
    operator: Flags.string({ description: "Filter by operator ID.", helpValue: "ID" }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(NodeList);
    const provider = await getProvider(flags.network);
    const nodes = await getContract(flags.network, "nodes", provider);
    const operator = normalizeHex(flags.operator);
    const data = await nodes.getNodes(operator, flags.topology, flags.skip, flags.size);
    console.log(data);
  }
}
