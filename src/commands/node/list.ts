import { HashZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { formatNode, getAll, getContract, getProvider, parseHash, pretty } from "../../helpers";

export default class NodeList extends BlockchainCommand {
  static summary = "List content nodes on the EarthFast Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--topology] [--operator ID] [--skip N] [--size N] [--page N] [--enabled]";
  static flags = {
    topology: Flags.boolean({ description: "[DEPRECATED]List topology nodes instead.", default: false, hidden: true }),
    operator: Flags.string({ description: "Filter by operator ID.", helpValue: "ID" }),
    onlyEnabled: Flags.boolean({ description: "Show only enabled nodes (disabled = false).", default: false }),
    vacant: Flags.boolean({ description: "List only nodes that have vacancy in current or next epoch." }),
    spot: Flags.boolean({ description: "List only vacant nodes available in current epoch.", dependsOn: ["vacant"] }),
    renew: Flags.boolean({ description: "List only vacant nodes available from next epoch.", dependsOn: ["vacant"] }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(NodeList);
    const provider = await getProvider(flags.network, flags.rpc);
    const nodes = await getContract(flags.network, flags.abi, "EarthfastNodes", provider);
    const operatorId = parseHash(flags.operator);
    const blockTag = await provider.getBlockNumber();
    let results: Result[] = await getAll(flags.page, async (i, n) => {
      return await nodes.getNodes(operatorId, flags.topology, i, n, { blockTag });
    });
    results = results.filter((v) => {
      // Filter out disabled nodes if onlyEnabled flag is true
      if (flags.onlyEnabled && v.disabled) return false;

      if (flags.vacant) {
        const vacantCurrentEpoch = v.projectIds[0] === HashZero;
        const vacantNextEpoch = v.projectIds[1] === HashZero;

        // List only nodes vacant either in this epoch or after this epoch
        if (!flags.spot && !flags.renew) return vacantCurrentEpoch || vacantNextEpoch;
        // List only nodes vacant both in this epoch and after this epoch
        if (flags.spot && flags.renew) return vacantCurrentEpoch && vacantNextEpoch;
        // List only nodes vacant after this epoch
        if (!flags.spot && flags.renew) return vacantNextEpoch;
        // List only nodes vacant in this epoch
        if (flags.spot && !flags.renew) return vacantCurrentEpoch;
      }
      // List all nodes (vacant and reserved)
      return true;
    });

    const records = results.slice(flags.skip, flags.skip + flags.size);
    const output = records.map((r) => formatNode(r));
    this.log(pretty(output));
    return output;
  }
}
