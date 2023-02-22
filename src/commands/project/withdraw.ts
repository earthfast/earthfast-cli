import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { formatRecord, formatUSDC, getContract, getSigner, parseHash, parseUSDC, pretty, run } from "../../helpers";

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

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectWithdraw);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const address = await signer.getAddress();
    const projectId = parseHash(args.ID);
    const amount = parseUSDC(args.USDC);
    if (amount.lte(0)) this.error("A positive amount required.");
    const oldEscrow = await usdc.balanceOf(address);
    const tx = await projects.populateTransaction.withdrawProjectEscrow(projectId, amount, address);
    const output = await run(tx, signer, [projects]);
    const newEscrow = await usdc.balanceOf(address);
    this.log(pretty(output));
    this.log(pretty(formatRecord({ address, oldEscrow: formatUSDC(oldEscrow), newEscrow: formatUSDC(newEscrow) })));
    return output;
  }
}
