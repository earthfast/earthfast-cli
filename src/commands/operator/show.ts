import { Arg } from "@oclif/core/lib/interfaces";
import { BlockchainCommand } from "../../base";
import { formatOperator, getContract, getProvider, parseHash, pretty } from "../../helpers";

export default class OperatorShow extends BlockchainCommand {
  static summary = "Show details of an EarthFast Network operator.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the operator to show.", required: true }];

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(OperatorShow);
    const provider = await getProvider(flags.network, flags.rpc);
    const operators = await getContract(flags.network, flags.abi, "EarthfastOperators", provider);
    const operatorId = parseHash(args.ID);
    const record = await operators.getOperator(operatorId);
    const output = formatOperator(record);
    this.log(pretty(output));
    return output;
  }
}
