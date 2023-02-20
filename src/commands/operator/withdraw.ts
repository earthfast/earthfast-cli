import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { formatRecord, formatUSDC, getContract, getSigner, parseHash, parseTokens, pretty, run } from "../../helpers";

export default class OperatorWithdraw extends TransactionCommand {
  static summary = "Withdraw USDC from operator earned balance.";
  static description = "The tokens are sent to the operator owner.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID USDC";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to withdraw balance from.", required: true },
    { name: "USDC", description: "The USDC amount to withdraw (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorWithdraw);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const address = await signer.getAddress();
    const operatorId = parseHash(args.ID);
    const amount = parseTokens(args.USDC);
    if (amount.lte(0)) this.error("A positive amount required.");
    const oldBalance = await usdc.balanceOf(address);
    const tx = await operators.populateTransaction.withdrawOperatorBalance(operatorId, amount, address);
    const output = await run(tx, signer, [operators]);
    const newBalance = await usdc.balanceOf(address);
    this.log(pretty(output));
    this.log(pretty(formatRecord({ address, oldBalance: formatUSDC(oldBalance), newBalance: formatUSDC(newBalance) })));
    return output;
  }
}
