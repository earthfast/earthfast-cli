import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { approve, getContract, getSigner, parseHash, parseTokens, pretty, run } from "../../helpers";

export default class OperatorStake extends TransactionCommand {
  static summary = "Deposit Armada tokens to operator stake.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to deposit stake for.", required: true },
    { name: "TOKENS", description: "The Armada token amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorStake);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const id = parseHash(args.ID);
    const amount = parseTokens(args.TOKENS);

    const output = [];
    const { tx: approveTx, deadline, sig } = await approve(signer, token, operators, amount);
    if (approveTx) output.push(await run(approveTx, signer, [token]));
    const tx = await operators.populateTransaction.depositOperatorStake(id, amount, deadline, sig.v, sig.r, sig.s);
    output.push(await run(tx, signer, [operators]));
    this.log(pretty(output));
    return output;
  }
}
