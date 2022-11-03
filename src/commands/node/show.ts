import { Arg } from "@oclif/core/lib/interfaces";
import { BlockchainCommand } from "../../base";
import { getContract, getProvider, normalizeHash, normalizeRecord } from "../../helpers";

export default class NodeShow extends BlockchainCommand {
  static description = "Show details of an Armada Network node.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the node to show.", required: true }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(NodeShow);
    const provider = await getProvider(flags.network, flags.rpc);
    const nodes = await getContract(flags.network, flags.abi, "ArmadaNodes", provider);
    const nodeId = normalizeHash(args.ID);
    const record = await nodes.getNode(nodeId);
    console.log(normalizeRecord(record));
  }
}
