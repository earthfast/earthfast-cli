import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, normalizeHash, pretty, run } from "../../helpers";

export default class OperatorOwner extends TransactionCommand {
  static summary = "Transfer ownership of am operator.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID ADDR";
  static aliases = ["operator:owner", "operator:transfer"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to change owner.", required: true },
    { name: "ADDR", description: "The address of the new operator owner.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorOwner);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const operatorId = normalizeHash(args.ID);
    const tx = await operators.populateTransaction.setOperatorOwner(operatorId, args.ADDR);
    const output = await run(tx, signer, [operators]);
    this.log(pretty(output));
    return output;
  }
}
