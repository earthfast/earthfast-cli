import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, normalizeHash, normalizeRecord, pretty, run } from "../../helpers";

export default class ProjectWithdraw extends TransactionCommand {
  static summary = "Withdraw Armada tokens from project escrow.";
  static description =
    "The tokens are sent to the project owner. Only the part of tokens not needed to reserve " +
    "the nodes can be withdrawn. In order to withdraw more, reservations can be deleted.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to withdraw escrow from.", required: true },
    { name: "TOKENS", description: "The Armada token amount to withdraw (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectWithdraw);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const address = await signer.getAddress();
    const projectId = normalizeHash(args.ID);
    const tokens = parseUnits(args.TOKENS, 18);
    if (tokens.lte(0)) this.error("A positive amount required.");
    const oldBalance = await token.balanceOf(address);
    const tx = await projects.populateTransaction.withdrawProjectEscrow(projectId, tokens, address);
    const output = await run(tx, signer, [projects]);
    const newBalance = await token.balanceOf(address);
    this.log(pretty(output));
    this.log(pretty(normalizeRecord({ address, oldBalance, newBalance })));
    return output;
  }
}
