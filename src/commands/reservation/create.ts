import { CliUx, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { decodeEvents, getContract, getSigner, getTxUrl, normalizeHash, normalizeRecords } from "../../helpers";

export default class ReservationCreate extends TransactionCommand {
  static description = `Reserve content nodes for a project.
    By default, new reservations begin at the start of the next epoch.`;
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def..."];
  static usage = "<%= command.id %> ID IDS... [--spot] [--renew]";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to reserve the nodes.", required: true },
    { name: "IDS", description: "The comma separated IDs of the nodes to reserve.", required: true },
  ];
  static flags = {
    spot: Flags.boolean({ description: "Reserve in the current epoch (can't release!)" }),
    renew: Flags.boolean({ description: "Reserve from the next epoch with auto-renew." }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { args, flags } = await this.parse(ReservationCreate);
    if (!flags.spot && !flags.renew) {
      // TODO: Fetch this from the registry
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - date.getUTCDay());
      this.error(`At least one of --spot and/or --renew must be provided:

  --spot reserves immediately, but does NOT turn on auto-renewal;
  --renew reserves from the NEXT epoch, AND turns on auto-renewal;

  Specify both flags to reserve immediately AND with auto-renewal.

  NOTE: If you specify --spot, you CANNOT cancel until it expires.
        You are committing Armada tokens until at least epoch end.

  This epoch will end and the next one will begin on:
        ${date}`);
    }

    const nodeIds = args.IDS.split(",").map((id: string) => normalizeHash(id));
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key);
    const reservations = await getContract(flags.network, flags.abi, "ArmadaReservations", signer);
    const projectId = normalizeHash(args.ID);
    const prices = nodeIds.map(() => parseUnits("1", 18));
    CliUx.ux.action.start("- Submitting transaction");
    const slot = { last: !!flags.spot, next: !!flags.renew };
    const tx = await reservations.createReservations(projectId, nodeIds, prices, slot);
    CliUx.ux.action.stop("done");
    this.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const events = await decodeEvents(receipt, reservations, "ReservationCreated");
    const output = normalizeRecords(events);
    if (!flags.json) console.log(output);
    return output;
  }
}
