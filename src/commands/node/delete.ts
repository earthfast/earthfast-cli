import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getSigner, parseHash, pretty } from "../../helpers";

export default class NodeDelete extends TransactionCommand {
  static summary = "Delete content nodes from the Armada Network.";
  static description =
    "Only unreserved nodes can be deleted. To force unreserve " +
    "nodes, disable them and wait for the current epoch to end.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> IDS...";
  static args: Arg[] = [
    { name: "IDS", description: "The comma separated IDs of the nodes to delete.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(NodeDelete);
    const nodeIds = args.IDS.split(",").map((id: string) => parseHash(id));
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const sdk = await this.initializeSDK(flags.network);
    const output = await sdk.node.delete(signer, nodeIds);
    this.log(pretty(output));
    return output;
  }
}
