import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import {
  formatRecord,
  formatUSDC,
  getContract,
  getSigner,
  parseHash,
  parseUSDC,
  permit,
  pretty,
  run,
} from "../../helpers";

export default class ProjectDeposit extends TransactionCommand {
  static summary = "Deposit Armada tokens to project escrow.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to deposit escrow for.", required: true },
    { name: "USDC", description: "The USDC amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectDeposit);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const address = await signer.getAddress();
    const id = parseHash(args.ID);
    const amount = parseUSDC(args.USDC);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await permit(signer, usdc, projects, amount, deadline);
    const oldBalance = await usdc.balanceOf(address);
    const tx = await projects.populateTransaction.depositProjectEscrow(id, amount, deadline, sig.v, sig.r, sig.s);
    const output = await run(tx, signer, [projects]);
    const newBalance = await usdc.balanceOf(address);
    this.log(pretty(output));
    this.log(pretty(formatRecord({ address, oldBalance: formatUSDC(oldBalance), newBalance: formatUSDC(newBalance) })));
    return output;
  }
}
