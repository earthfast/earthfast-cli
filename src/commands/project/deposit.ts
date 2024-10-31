import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { approve, getContract, getSigner, parseHash, parseUSDC, permit, pretty, run } from "../../helpers";

export default class ProjectDeposit extends TransactionCommand {
  static summary = "Deposit Earthfast tokens to project escrow.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to deposit escrow for.", required: true },
    { name: "USDC", description: "The USDC amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectDeposit);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);
    const id = parseHash(args.ID);
    const amount = parseUSDC(args.USDC);

    const output = [];
    const { tx: approveTx, deadline, sig } = await approve(signer, usdc, projects, amount);
    if (approveTx) output.push(await run(approveTx, signer, [usdc]));
    const tx = await projects.populateTransaction.depositProjectEscrow(id, amount, deadline, sig.v, sig.r, sig.s);
    output.push(await run(tx, signer, [projects]));
    this.log(pretty(output));
    return output;
  }
}
