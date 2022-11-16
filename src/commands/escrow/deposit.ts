import { type TypedDataSigner } from "@ethersproject/abstract-signer";
import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { ethers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import {
  decodeEvent,
  getContract,
  getProvider,
  getSigner,
  getTxUrl,
  normalizeHash,
  normalizeRecord,
  Permit,
} from "../../helpers";

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
    const provider = await getProvider(flags.network, flags.rpc);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    const tokens = parseUnits(args.TOKENS, 18);

    CliUx.ux.action.start("- Requesting signature");
    const address = await signer.getAddress();
    const chainId = (await provider.getNetwork()).chainId;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const nonces = await token.nonces(address);
    const domain = { name: await token.name(), version: "1", chainId, verifyingContract: token.address };
    const values = { owner: address, spender: projects.address, value: tokens, nonce: nonces, deadline };
    const signature = await (signer as unknown as TypedDataSigner)._signTypedData(domain, Permit, values);
    const sig = ethers.utils.splitSignature(signature);
    CliUx.ux.action.stop("done");

    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.depositProjectEscrow(projectId, tokens, deadline, sig.v, sig.r, sig.s);
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
