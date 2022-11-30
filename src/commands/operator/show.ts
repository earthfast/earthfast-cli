import { Arg } from "@oclif/core/lib/interfaces";
import { BlockchainCommand } from "../../base";
import { getContract, getProvider, normalizeHash, normalizeRecord, pretty } from "../../helpers";

export default class OperatorShow extends BlockchainCommand {
  static summary = "Show details of an Armada Network operator.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %> ID";
  static args: Arg[] = [{ name: "ID", description: "The ID of the operator to show.", required: true }];

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(OperatorShow);
    const provider = await getProvider(flags.network, flags.rpc);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", provider);
    const operatorId = normalizeHash(args.ID);
    const record = await operators.getOperator(operatorId);
    const output = normalizeRecord(record);
    this.log(pretty(output));
    return output;
  }
}
