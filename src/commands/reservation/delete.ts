import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvents, getContract, getSigner, getTxUrl, normalizeHex, normalizeRecords } from "../../helpers";

export default class ReservationDelete extends TransactionCommand {
  static description = `Releases content nodes from a project.
    The reservations will be deleted starting from the next epoch.`;
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID IDS...";
  static strict = false;
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to release the nodes.", required: true },
    { name: "IDS", description: "The IDs of the nodes to release from the project.", required: true },
  ];

  public async run(): Promise<Record<string, unknown>[]> {
    const { args, flags, raw } = await this.parse(ReservationDelete);
    // Parse vararg IDS
    const nodeIds = raw
      .filter((arg) => arg.type == "arg")
      .map((arg) => arg.input)
      .slice(1) // Skip ID
      .map((id) => normalizeHex(id));

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer);
    const reservations = await getContract(flags.network, flags.abi, "ArmadaReservations", signer);
    const projectId = normalizeHex(args.ID);
    CliUx.ux.action.start("- Submitting transaction");
    const slot = { last: false, next: true };
    const tx = await reservations.deleteReservations(projectId, nodeIds, slot);
    CliUx.ux.action.stop("done");
    this.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const events = await decodeEvents(receipt, reservations, "ReservationDeleted");
    const output = normalizeRecords(events);
    if (!flags.json) console.log(output);
    return output;
  }
}
