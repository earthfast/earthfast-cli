import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHash, normalizeRecord } from "../../helpers";

export default class EscrowDeposit extends TransactionCommand {
  static description = "Deposit Armada tokens to project escrow.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static aliases = ["escrow:deposit", "project:deposit"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to deposit escrow for.", required: true },
    { name: "TOKENS", description: "The Armada token amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<Record<string, unknown>> {
    const { args, flags } = await this.parse(EscrowDeposit);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    const tokens = parseUnits(args.TOKENS, 18);

    CliUx.ux.action.start("- Submitting transaction: approve");
    const tx1 = await token.approve(projects.address, tokens);
    CliUx.ux.action.stop("done");
    this.log(`> ${getTxUrl(tx1)}`);
    CliUx.ux.action.start("- Processing transaction: approve");
    const receipt1 = await tx1.wait();
    CliUx.ux.action.stop("done");
    const event1 = await decodeEvent(receipt1, token, "Approval");
    if (!flags.json) console.log(normalizeRecord(event1));

    CliUx.ux.action.start("- Submitting transaction: deposit");
    const tx2 = await projects.depositProjectEscrow(projectId, tokens);
    CliUx.ux.action.stop("done");
    this.log(`> ${getTxUrl(tx2)}`);
    CliUx.ux.action.start("- Processing transaction: deposit");
    const receipt2 = await tx2.wait();
    CliUx.ux.action.stop("done");
    const event2 = await decodeEvent(receipt2, projects, "ProjectEscrowChanged");
    const output = normalizeRecord(event2);
    if (!flags.json) console.log(output);
    return output;
  }
}
