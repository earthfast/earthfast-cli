import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseAddress, parseHash, parseUSDC, pretty, run } from "../../helpers";

export default class OperatorWithdraw extends TransactionCommand {
  static summary = "Withdraw USDC from operator earned balance.";
  static description = "The tokens are sent to the operator owner.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID USDC";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to withdraw balance from.", required: true },
    { name: "USDC", description: "The USDC amount to withdraw (e.g. 1.0).", required: true },
  ];
  static flags = {
    recipient: Flags.string({ description: "[default: caller] The recipient address for tokens.", helpValue: "ADDR" }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorWithdraw);
    if (flags.signer === "raw" && parseAddress(flags.recipient) === AddressZero) {
      this.error("Must specify --recipient when using raw signer.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const recipient = flags.recipient ? parseAddress(flags.recipient) : await signer.getAddress();
    const operatorId = parseHash(args.ID);
    const amount = parseUSDC(args.USDC);
    if (amount.lte(0)) this.error("A positive amount required.");
    const tx = await operators.populateTransaction.withdrawOperatorBalance(operatorId, amount, recipient);
    const output = await run(tx, signer, [operators]);
    this.log(pretty(output));
    return output;
  }
}
