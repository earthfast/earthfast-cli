import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { parseUnits } from "ethers/lib/utils";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, normalizeHash, pretty, run } from "../../helpers";

export default class ReservationCreate extends TransactionCommand {
  static summary = "Reserve content nodes for a project.";
  static description =
    "Spot reservations are effective immediately, but expire at the end of the epoch. " +
    "Renewal reservations are effective from the next epoch on, and will auto-renew. " +
    "Specify both spot+renew reservation to reserve immediately and with auto-renewal. " +
    "Spot reservations can't be unreserved until at least the end of the current epoch.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc... 0x456def... --spot --renew"];
  static usage = "<%= command.id %> ID IDS... [--spot] [--renew]";
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to reserve the nodes.", required: true },
    { name: "IDS", description: "The comma separated IDs of the nodes to reserve.", required: true },
  ];
  static flags = {
    spot: Flags.boolean({ description: "Reserve in the current epoch only (can't unreserve until end of the epoch!)" }),
    renew: Flags.boolean({ description: "Reserve from the next epoch and on (can unreserve before next epoch start)" }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ReservationCreate);
    if (!flags.spot && !flags.renew) {
      this.error("Must provide at least one of --spot and/or --renew.");
    }

    const nodeIds = args.IDS.split(",").map((id: string) => normalizeHash(id));
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const reservations = await getContract(flags.network, flags.abi, "ArmadaReservations", signer);
    const projectId = normalizeHash(args.ID);
    const prices = nodeIds.map(() => parseUnits("1", 18));
    const slot = { last: !!flags.spot, next: !!flags.renew };
    const tx = await reservations.populateTransaction.createReservations(projectId, nodeIds, prices, slot);
    const output = await run(tx, signer, [reservations]);
    this.log(pretty(output));
    return output;
  }
}
