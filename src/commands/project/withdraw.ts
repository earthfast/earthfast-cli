import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseAddress, parseHash, parseUSDC, pretty, run } from "../../helpers";

export default class ProjectWithdraw extends TransactionCommand {
  static summary = "Withdraw USDC from project escrow.";
  static description =
    "The tokens are sent to the project owner. Only the part of tokens not needed to reserve " +
    "the nodes can be withdrawn. In order to withdraw more, reservations can be deleted.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID USDC";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to withdraw escrow from.", required: true },
    { name: "USDC", description: "The USDC amount to withdraw (e.g. 1.0).", required: true },
  ];
  static flags = {
    recipient: Flags.string({ description: "[default: caller] The recipient address for tokens.", helpValue: "ADDR" }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectWithdraw);
    if (flags.signer === "raw" && parseAddress(flags.recipient) === AddressZero) {
      this.error("Must specify --recipient when using raw signer.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const recipient = flags.recipient ? parseAddress(flags.recipient) : await signer.getAddress();
    const projectId = parseHash(args.ID);
    const amount = parseUSDC(args.USDC);
    if (amount.lte(0)) this.error("A positive amount required.");
    const tx = await projects.populateTransaction.withdrawProjectEscrow(projectId, amount, recipient);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
