import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHash, normalizeRecord } from "../../helpers";

export default class EscrowWithdraw extends TransactionCommand {
  static description = "Withdraw Armada tokens from project escrow.\nThe tokens are sent to the project owner.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static aliases = ["escrow:withdraw", "project:escrow:withdraw"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to withdraw escrow from.", required: true },
    { name: "TOKENS", description: "The Armada token amount to withdraw (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(EscrowWithdraw);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    const tokens = parseUnits(args.TOKENS, 18);
    if (tokens.lte(0)) this.error("Positive amount required.");
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.withdrawProjectEscrow(projectId, tokens);
    CliUx.ux.action.stop("done");
    this.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectEscrowChanged");
    const output = normalizeRecord(event);
    if (!flags.json) console.log(output);
    return output;
  }
}
