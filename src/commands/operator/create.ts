import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, pretty, run } from "../../helpers";

export default class OperatorCreate extends TransactionCommand {
  static summary = "Create an operator.";
  static examples = ["<%= config.bin %> 0x123abc... 0x456def... earthfast hello@earthfast.co"];
  static usage = "<%= command.id %> ADDR NAME EMAIL";
  static args: Arg[] = [
    { name: "ADDR", description: "The address of the operator.", required: true },
    { name: "NAME", description: "The name of the operator.", required: true },
    { name: "EMAIL", description: "The email of the operator.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorCreate);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const operators = await getContract(flags.network, flags.abi, "EarthfastOperators", signer);
    const tx = await operators.populateTransaction.createOperator(args.ADDR, args.NAME, args.EMAIL);
    const output = await run(tx, signer, [operators]);
    this.log(pretty(output));
    return output;
  }
}
