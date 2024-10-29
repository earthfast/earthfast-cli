import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseAddress, parseHash, parseTokens, pretty, run } from "../../helpers";

export default class OperatorUnstake extends TransactionCommand {
  static summary = "Withdraw Earthfast tokens from operator stake.";
  static description =
    "The tokens are sent to the operator owner. Only the part of tokens not needed to " +
    "stake the nodes can be withdrawn. In order to withdraw more, nodes can be deleted.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to withdraw stake from.", required: true },
    { name: "TOKENS", description: "The Earthfast token amount to withdraw (e.g. 1.0).", required: true },
  ];
  static flags = {
    recipient: Flags.string({ description: "[default: caller] The recipient address for tokens.", helpValue: "ADDR" }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorUnstake);
    if (flags.signer === "raw" && parseAddress(flags.recipient) === AddressZero) {
      this.error("Must specify --recipient when using raw signer.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const operators = await getContract(flags.network, flags.abi, "EarthfastOperators", signer);
    const recipient = flags.recipient ? parseAddress(flags.recipient) : await signer.getAddress();
    const operatorId = parseHash(args.ID);
    const amount = parseTokens(args.TOKENS);
    if (amount.lte(0)) this.error("A positive amount required.");
    const tx = await operators.populateTransaction.withdrawOperatorStake(operatorId, amount, recipient);
    const output = await run(tx, signer, [operators]);
    this.log(pretty(output));
    return output;
  }
}
