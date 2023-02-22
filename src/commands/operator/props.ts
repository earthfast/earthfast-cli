import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class OperatorProps extends TransactionCommand {
  static summary = "Change detailed properties of an operator.";
  static examples = ['<%= config.bin %> <%= command.id %> 0x123abc... "My Operator" notify@myoperator.com'];
  static usage = "<%= command.id %> ID NAME EMAIL";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to change properties.", required: true },
    { name: "NAME", description: "The new human readable name of the operator.", required: true },
    { name: "EMAIL", description: "The new email for admin notifications.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorProps);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const operatorId = parseHash(args.ID);
    const tx = await operators.populateTransaction.setOperatorProps(operatorId, args.NAME, args.EMAIL);
    const output = await run(tx, signer, [operators]);
    this.log(pretty(output));
    return output;
  }
}
