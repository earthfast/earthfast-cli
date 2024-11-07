import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class NodeEnable extends TransactionCommand {
  static summary = "Change enabled state of content nodes.";
  static description =
    "The nodes are enabled immediately, or disabled starting from the next epoch. " +
    "Disabled nodes are unreserved immediately, effective from the next epoch.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... true"];
  static usage = "<%= command.id %> IDS BOOL";
  static args: Arg[] = [
    { name: "IDS", description: "The comma separated IDs of the nodes.", required: true },
    { name: "BOOL", description: "The new enabled state for the nodes.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(NodeEnable);
    if (!["true", "false"].includes(args.BOOL)) {
      this.error("Must specify a true or false.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const nodes = await getContract(flags.network, flags.abi, "EarthfastNodes", signer);
    const nodeIds = args.IDS.split(",").map((id: string) => parseHash(id));
    const disables = nodeIds.map(() => args.BOOL !== "true");
    const operatorId = (await nodes.getNode(nodeIds[0])).operatorId;
    const tx = await nodes.populateTransaction.setNodeDisabled(operatorId, nodeIds, disables);
    const output = await run(tx, signer, [nodes]);
    this.log(pretty(output));
    return output;
  }
}
