import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { formatRecord, formatTokens, getContract, getSigner, parseHash, parseTokens, pretty, run } from "../../helpers";

export default class OperatorUnstake extends TransactionCommand {
  static summary = "Withdraw Armada tokens from operator stake.";
  static description =
    "The tokens are sent to the operator owner. Only the part of tokens not needed to " +
    "stake the nodes can be withdrawn. In order to withdraw more, nodes can be deleted.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to withdraw stake from.", required: true },
    { name: "TOKENS", description: "The Armada token amount to withdraw (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorUnstake);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const address = await signer.getAddress();
    const operatorId = parseHash(args.ID);
    const amount = parseTokens(args.TOKENS);
    if (amount.lte(0)) this.error("A positive amount required.");
    const oldBalance = await token.balanceOf(address);
    const tx = await operators.populateTransaction.withdrawOperatorStake(operatorId, amount, address);
    const output = await run(tx, signer, [operators]);
    const newBalance = await token.balanceOf(address);
    this.log(pretty(output));
    this.log(
      pretty(formatRecord({ address, oldBalance: formatTokens(oldBalance), newBalance: formatTokens(newBalance) }))
    );
    return output;
  }
}
