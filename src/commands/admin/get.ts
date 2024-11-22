import { BlockchainCommand } from "../../base";
import { getContract, getProvider, pretty } from "../../helpers";

export default class Get extends BlockchainCommand {
  static description = "Make GET calls to EarthFast contracts";
  static examples = ["<%= config.bin %> EarthfastRegistry getUSDC"];
  static args = [
    {
      name: "contract",
      required: true,
      description: "Name of the contract to call eg 'EarthfastRegistry' or 'EarthfastNodes'",
    },
    {
      name: "functionName",
      required: true,
      description: "Name of the registry function to call",
    },
    {
      name: "params",
      required: false,
      description: "Comma-separated parameters for the function call",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Get);

    const params = args.params ? args.params.split(",") : [];
    const functionName = args.functionName;
    const contractName = args.contract;

    const provider = await getProvider(flags.network, flags.rpc);
    const contract = await getContract(flags.network, flags.abi, contractName, provider);

    const output = await contract[functionName](...params);
    this.log(pretty(output));
    return output;
  }
}
