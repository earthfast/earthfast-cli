import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, parseUSDC, pretty, run } from "../../helpers";

export default class NodeCreate extends TransactionCommand {
  static summary = `Register content nodes on the EarthFast Network.`;
  static description = "Node prices (PRICE) are expressed in USDC.";
  static examples = [
    "<%= config.bin %> <%= command.id %> 0x123abc... host1.com:na,host2.com:eu",
    "<%= config.bin %> <%= command.id %> 0x123abc... host1.com,host2.com na:true:1.5",
  ];
  static usage = "<%= command.id %> ID VALUES [DEFAULTS]";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to own the nodes.", required: true },
    {
      name: "VALUES",
      description: "The comma separated nodes data: HOST:REGION?:ENABLED?:PRICE?,...",
      required: true,
    },
    {
      name: "DEFAULTS",
      description: "The defaults, if omitted in the values: REGION?:ENABLED?:PRICE?",
      required: false,
    },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(NodeCreate);
    const operatorId = parseHash(args.ID);
    const values: string[] = args.VALUES.split(",");
    const defaults: string[] = (args.DEFAULTS ?? "").split(":");
    if (defaults.length > 3) {
      this.error(`Too many fields for defaults: ${args.DEFAULTS}.`);
    }
    const [defaultRegion, defaultEnabled, defaultPrice] = defaults;
    if (defaultEnabled && !["true", "false"].includes(defaultEnabled)) {
      this.error(`Must specify true, false, or empty: ${args.DEFAULTS}.`);
    }

    const records = await Promise.all(
      values.map(async (input) => {
        const fields = input.split(":");
        if (fields.length > 4) {
          this.error(`Too many fields for a node: ${input}.`);
        }

        const [host, region, enabled, price] = fields;
        if (!host) {
          this.error(`Must specify node host: ${input}.`);
        }
        if (!region && !defaultRegion) {
          this.error(`Must specify region: ${input}.`);
        }
        if (enabled && !["true", "false"].includes(enabled)) {
          this.error(`Must specify true, false, or empty: ${input}.`);
        }

        return {
          host,
          region: region || defaultRegion,
          topology: false,
          disabled: enabled === "false" || (!enabled && defaultEnabled !== "true"),
          price: parseUSDC(price || defaultPrice || "0"),
        };
      })
    );

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const nodes = await getContract(flags.network, flags.abi, "EarthfastNodes", signer);
    const tx = await nodes.populateTransaction.createNodes(operatorId, false, records);
    const output = await run(tx, signer, [nodes]);
    this.log(pretty(output));
    return output;
  }
}
