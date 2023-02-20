import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import {
  formatRecord,
  formatUSDC,
  getContract,
  getSigner,
  parseHash,
  parseTokens,
  permit,
  pretty,
  run,
} from "../../helpers";

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
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const address = await signer.getAddress();
    const id = parseHash(args.ID);
    const amount = parseTokens(args.USDC);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await permit(signer, usdc, operators, amount, deadline);
    const oldBalance = await usdc.balanceOf(address);
    const tx = await operators.populateTransaction.depositOperatorBalance(id, amount, deadline, sig.v, sig.r, sig.s);
    const output = await run(tx, signer, [operators]);
    const newBalance = await usdc.balanceOf(address);
    this.log(pretty(output));
    this.log(pretty(formatRecord({ address, oldBalance: formatUSDC(oldBalance), newBalance: formatUSDC(newBalance) })));
    return output;
  }
}
