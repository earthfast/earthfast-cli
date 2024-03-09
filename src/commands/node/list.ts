import { Flags } from "@oclif/core";
import { BlockchainCommand } from "../../base";
import { getProvider, parseHash, pretty } from "../../helpers";

export default class NodeList extends BlockchainCommand {
  static summary = "List content nodes on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--topology] [--operator ID] [--skip N] [--size N] [--page N]";
  static flags = {
    topology: Flags.boolean({ description: "List topology nodes instead." }),
    operator: Flags.string({ description: "Filter by operator ID.", helpValue: "ID" }),
    vacant: Flags.boolean({ description: "List only vacant nodes in this or next epoch." }),
    spot: Flags.boolean({ description: "List only vacant nodes available in this epoch.", dependsOn: ["vacant"] }),
    renew: Flags.boolean({ description: "List only vacant nodes available from next epoch.", dependsOn: ["vacant"] }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(NodeList);
    const sdk = await this.initializeSDK(flags.network);
    const provider = await getProvider(flags.network, flags.rpc);

    const operatorId = parseHash(flags.operator);
    const output = await sdk.node.list(provider, operatorId, {
      topology: flags.topology,
      vacant: flags.vacant,
      spot: flags.spot,
      renew: flags.renew,
      skip: flags.skip,
      size: flags.size,
      page: flags.page,
    });

    this.log(pretty(output));
    return output;
  }
}
