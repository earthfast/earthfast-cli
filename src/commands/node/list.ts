import { HashZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { getAll, getContract, getProvider, normalizeHash, normalizeRecords } from "../../helpers";

export default class NodeList extends BlockchainCommand {
  static description = "List content nodes on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--topology] [--operator ID] [--skip N] [--size N] [--page N]";
  static flags = {
    topology: Flags.boolean({ description: "List topology nodes instead." }),
    operator: Flags.string({ description: "Filter by operator ID.", helpValue: "ID" }),
    vacant: Flags.boolean({ description: "List only vacant nodes (see --spot, --renew)." }),
    spot: Flags.boolean({ description: "List only vacant nodes available in this epoch.", dependsOn: ["vacant"] }),
    renew: Flags.boolean({ description: "List only vacant nodes available from next epoch.", dependsOn: ["vacant"] }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(NodeList);
    if (flags.vacant && !flags.spot && !flags.renew) {
      throw Error("At least one of --spot and/or --renew must be provided.");
    }

    const provider = await getProvider(flags.network, flags.rpc);
    const nodes = await getContract(flags.network, flags.abi, "ArmadaNodes", provider);
    const operatorId = normalizeHash(flags.operator);
    const blockTag = await provider.getBlockNumber();
    let results: Result[] = await getAll(flags.page, async (i, n) => {
      return await nodes.getNodes(operatorId, flags.topology, i, n, { blockTag });
    });
    results = results.filter((v) =>
      (!flags.spot || v.projectIds[0] === HashZero) &&
      (!flags.renew || v.projectIds[1] === HashZero)
    ); // prettier-ignore

    const records = results.slice(flags.skip, flags.skip + flags.size);
    const output = normalizeRecords(records);
    if (!flags.json) console.log(output);
    return output;
  }
}
