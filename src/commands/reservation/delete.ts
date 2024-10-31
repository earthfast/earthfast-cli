import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class ReservationDelete extends TransactionCommand {
  static summary = "Unreserve content nodes from a project.";
  static description = "The reservations are deleted immediately, effective in the next epoch.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID IDS...";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to unreserve the nodes.", required: true },
    { name: "IDS", description: "The comma separated IDs of the nodes to unreserve.", required: true },
  ];
  static flags = {
    lastSlot: Flags.boolean({
      description: "[admin only] Delete the reservation from the current epoch instead of the next one.",
      default: false,
    }),
    nextSlotFalse: Flags.boolean({
      description:
        "[admin only] If a user has deleted a reservation from next slot but needs admin to run delete for last slot, set this flag so it doesn't encounter node not reserved error.",
      default: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ReservationDelete);
    const nodeIds = args.IDS.split(",").map((id: string) => parseHash(id));
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const reservations = await getContract(flags.network, flags.abi, "EarthfastReservations", signer);
    const projectId = parseHash(args.ID);
    const slot = { last: flags.lastSlot, next: !flags.nextSlotFalse };
    const tx = await reservations.populateTransaction.deleteReservations(projectId, nodeIds, slot);
    const output = await run(tx, signer, [reservations]);
    this.log(pretty(output));
    return output;
  }
}
