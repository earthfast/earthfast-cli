import { type TypedDataSigner } from "@ethersproject/abstract-signer";
import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { ethers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { getContract, getProvider, getSigner, normalizeHash, Permit, pretty, run } from "../../helpers";

export default class EscrowDeposit extends TransactionCommand {
  static description = "Deposit Armada tokens to project escrow.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static aliases = ["escrow:deposit", "project:deposit"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to deposit escrow for.", required: true },
    { name: "TOKENS", description: "The Armada token amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(EscrowDeposit);
    const provider = await getProvider(flags.network, flags.rpc);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const id = normalizeHash(args.ID);
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

    const tx = await projects.populateTransaction.depositProjectEscrow(id, tokens, deadline, sig.v, sig.r, sig.s);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
