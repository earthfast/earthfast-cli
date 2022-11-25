import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, normalizeHash, pretty, run } from "../../helpers";

export default class ReservationDelete extends TransactionCommand {
  static summary = "Unreserve content nodes from a project.";
  static description = "The reservations are deleted immediately, effective in the next epoch.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID IDS...";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to unreserve the nodes.", required: true },
    { name: "IDS", description: "The comma separated IDs of the nodes to unreserve.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ReservationDelete);
    const nodeIds = args.IDS.split(",").map((id: string) => normalizeHash(id));
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const reservations = await getContract(flags.network, flags.abi, "ArmadaReservations", signer);
    const projectId = normalizeHash(args.ID);
    const slot = { last: false, next: true };
    const tx = await reservations.populateTransaction.deleteReservations(projectId, nodeIds, slot);
    const output = await run(tx, signer, [reservations]);
    this.log(pretty(output));
    return output;
  }
}
