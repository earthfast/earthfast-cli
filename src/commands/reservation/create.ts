import { CliUx, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { decodeEvents, getContract, getSigner, getTxUrl, normalizeHex, normalizeRecords } from "../../helpers";

export default class ReservationCreate extends TransactionCommand {
  static description = `Reserves content nodes for a project.
    By default, new reservations begin at the start of the next epoch.`;
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID IDS... [--spot] [--norenew]";
  static strict = false;
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to reserve the nodes.", required: true },
    { name: "IDS", description: "The IDs of the nodes to reserve for the project.", required: true },
  ];
  static flags = {
    spot: Flags.boolean({ description: "Reserve in the current epoch (can't release!)" }),
    norenew: Flags.boolean({ description: "Don't renew these reservations in next epoch." }),
  };

  public async run(): Promise<void> {
    const { args, flags, raw } = await this.parse(ReservationCreate);
    if (!flags.spot && !!flags.norenew) {
      this.error("--norenew requires --spot");
    }
    // Parse vararg IDS
    const nodeIds = raw
      .filter((arg) => arg.type == "arg")
      .map((arg) => arg.input)
      .slice(1) // Skip ID
      .map((id) => normalizeHex(id));

    const signer = await getSigner(flags.network, flags.address, flags.signer);
    const reservations = await getContract(flags.network, "reservations", signer);
    const projectId = normalizeHex(args.ID);
    const prices = nodeIds.map(() => parseUnits("1", 18));
    CliUx.ux.action.start("- Submitting transaction");
    const slot = { last: !!flags.spot, next: !flags.norenew };
    console.log([projectId, nodeIds, prices, slot]);
    const tx = await reservations.createReservations(projectId, nodeIds, prices, slot);
    CliUx.ux.action.stop("done");
    console.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const events = await decodeEvents(receipt, reservations, "ReservationCreated");
    console.log(normalizeRecords(events));
  }
}
