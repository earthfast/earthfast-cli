import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getProvider, getSigner, parseHash, pretty, run } from "../../helpers";

export default class NodeHost extends TransactionCommand {
  static summary = "Change hosts and regions of content nodes.";
  static description =
    "Values can only be changed for currently unreserved nodes. " +
    "Values can be partially omitted to keep the old values.";
  static examples = [
    "<%= config.bin %> <%= command.id %> 0x123...:host1.com:na,0x234...:host2.com:eu",
    "<%= config.bin %> <%= command.id %> 0x123...:host1.com,0x234...:host2.com",
    "<%= config.bin %> <%= command.id %> 0x123...::na,0x234...::eu",
    "<%= config.bin %> <%= command.id %> 0x123...,0x234... na",
  ];
  static usage = "<%= command.id %> ID[:HOST?:REGION?],... [DEFAULT_REGION]";
  static aliases = ["node:host", "node:hosts"];
  static args: Arg[] = [
    { name: "ID:HOST:REGION", description: "The comma separated values for the nodes.", required: true },
    { name: "DEFAULT_REGION", description: "The default region, if omitted in the values.", required: false },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(NodeHost);
    const provider = await getProvider(flags.network, flags.rpc);
    const nodesView = await getContract(flags.network, flags.abi, "ArmadaNodes", provider);
    const values: string[] = args["ID:HOST:REGION"].split(",");
    const defaultRegion: string = args["DEFAULT_REGION"];
    const records = await Promise.all(
      values.map(async (input) => {
        const fields = input.split(":");
        if (fields.length > 3) {
          this.error(`Too many fields for a node: ${input}.`);
        }

        const [nodeId, host, region] = fields;
        if (!nodeId) {
          this.error(`Must provide node ID: ${input}.`);
        }
        if (!host && !region && !defaultRegion) {
          this.error(`Must provide host or region: ${input}.`);
        }

        const fetchOldValues = !host || (!region && !defaultRegion);
        const node = fetchOldValues ? await nodesView.getNode(nodeId) : undefined;

        return {
          nodeId: parseHash(nodeId),
          host: host || node.host,
          region: region || defaultRegion || node.region,
        };
      })
    );

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const nodes = await getContract(flags.network, flags.abi, "ArmadaNodes", signer);
    const nodeIds = records.map((r) => r.nodeId);
    const hosts = records.map((r) => r.host);
    const regions = records.map((r) => r.region);
    const operatorId = (await nodesView.getNode(nodeIds[0])).operatorId;
    const tx = await nodes.populateTransaction.setNodeHosts(operatorId, nodeIds, hosts, regions);
    const output = await run(tx, signer, [nodes]);
    this.log(pretty(output));
    return output;
  }
}
