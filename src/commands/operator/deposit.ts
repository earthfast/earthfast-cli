import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { approve, getContract, getSigner, parseHash, parseTokens, permit, pretty, run } from "../../helpers";

export default class OperatorDeposit extends TransactionCommand {
  static summary = "Deposit USDC to operator earned balance.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID USDC";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to deposit balance for.", required: true },
    { name: "USDC", description: "The USDC amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorDeposit);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const id = parseHash(args.ID);
    const amount = parseTokens(args.USDC);

    const output = [];
    const { tx: approveTx, deadline, sig } = await approve(signer, usdc, operators, amount);
    if (approveTx) output.push(await run(approveTx, signer, [usdc]));
    const tx = await operators.populateTransaction.depositOperatorBalance(id, amount, deadline, sig.v, sig.r, sig.s);
    output.push(await run(tx, signer, [operators]));
    this.log(pretty(output));
    return output;
  }
}
