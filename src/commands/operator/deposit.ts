import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, normalizeHash, normalizeRecord, permit, pretty, run } from "../../helpers";

export default class OperatorDeposit extends TransactionCommand {
  static summary = "Deposit Armada tokens to operator escrow.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 1.0"];
  static usage = "<%= command.id %> ID TOKENS";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the operator to deposit escrow for.", required: true },
    { name: "TOKENS", description: "The Armada token amount to deposit (e.g. 1.0).", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(OperatorDeposit);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", signer);
    const operators = await getContract(flags.network, flags.abi, "ArmadaOperators", signer);
    const address = await signer.getAddress();
    const id = normalizeHash(args.ID);
    const amount = parseUnits(args.TOKENS, 18);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await permit(signer, token, operators, amount, deadline);
    const oldBalance = await token.balanceOf(address);
    const tx = await operators.populateTransaction.depositOperatorStake(id, amount, deadline, sig.v, sig.r, sig.s);
    const output = await run(tx, signer, [operators]);
    const newBalance = await token.balanceOf(address);
    this.log(pretty(output));
    this.log(pretty(normalizeRecord({ address, oldBalance, newBalance })));
    return output;
  }
}
