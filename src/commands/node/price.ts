import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, parseUSDC, pretty, run } from "../../helpers";

export default class NodePrice extends TransactionCommand {
  static summary = "Change prices of content nodes.";
  static description =
    "Spot prices can only be changed for currently unreserved nodes. " +
    "Renewal prices can only be changed outside of the grace period, " +
    "and a node will be automatically unreserved at the current epoch end " +
    "if the reserving project escrow is no longer enough for the new price.";
  static examples = [
    "<%= config.bin %> <%= command.id %> 0x123...:1.5,0x234...:1.5 --renew",
    "<%= config.bin %> <%= command.id %> 0x123...,0x234... 1.5 --renew",
  ];
  static usage = "<%= command.id %> ID[:PRICE?],... [DEFAULT_PRICE] [--spot] [--renew]";
  static aliases = ["node:price", "node:prices"];
  static args: Arg[] = [
    { name: "ID:PRICE", description: "The comma separated USDC price values for the nodes.", required: true },
    { name: "DEFAULT_PRICE", description: "The default USDC price, if omitted in the values.", required: false },
  ];
  static flags = {
    spot: Flags.boolean({ description: "Change price in the current epoch only (nodes must not be reserved)." }),
    renew: Flags.boolean({ description: "Change price from the next epoch and on (must not be in grace period)." }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(NodePrice);
    if (!flags.spot && !flags.renew) {
      this.error("Must provide at least one of --spot and/or --renew.");
    }

    const values: string[] = args["ID:PRICE"].split(",");
    const defaultPrice: string = args["DEFAULT_PRICE"];
    const records = await Promise.all(
      values.map(async (input) => {
        const fields = input.split(":");
        if (fields.length > 2) {
          this.error(`Too many fields for a node: ${input}.`);
        }

        const [nodeId, price] = fields;
        if (!nodeId) {
          this.error(`Must provide node ID: ${input}.`);
        }
        if (!price && !defaultPrice) {
          this.error(`Must provide price: ${input}.`);
        }

        return {
          nodeId: parseHash(nodeId),
          price: parseUSDC(price || defaultPrice),
        };
      })
    );

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const nodes = await getContract(flags.network, flags.abi, "ArmadaNodes", signer);
    const nodeIds = records.map((r) => r.nodeId);
    const prices = records.map((r) => r.price);
    const operatorId = (await nodes.getNode(nodeIds[0])).operatorId;
    const slot = { last: !!flags.spot, next: !!flags.renew };
    const tx = await nodes.populateTransaction.setNodePrices(operatorId, nodeIds, prices, slot);
    const output = await run(tx, signer, [nodes]);
    this.log(pretty(output));
    return output;
  }
}
