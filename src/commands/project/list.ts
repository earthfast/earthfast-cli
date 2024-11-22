import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { formatNode, formatProject, getAll, getContract, getProvider, parseAddress, pretty } from "../../helpers";

export default class ProjectList extends BlockchainCommand {
  static summary = "List projects on the EarthFast Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--owner ADDR] [--skip N] [--size N] [--page N] [--active] [--reservations]";
  static flags = {
    owner: Flags.string({ description: "Filter by owner address.", helpValue: "ADDR" }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
    reservations: Flags.boolean({ description: "Show reservations for each project", default: false }),
    active: Flags.boolean({
      description: "Filter projects to only show projects with active reservations",
      default: false,
    }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(ProjectList);
    const provider = await getProvider(flags.network, flags.rpc);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", provider);
    const reservations = await getContract(flags.network, flags.abi, "EarthfastReservations", provider);
    const owner = parseAddress(flags.owner);
    const blockTag = await provider.getBlockNumber();
    let results: Result[] = await getAll(flags.page, async (i, n) => {
      return await projects.getProjects(i, n, { blockTag });
    });
    if (flags.owner) {
      results = results.filter((v) => v.owner.toLowerCase() === owner.toLowerCase());
    }

    // If active is true, then reservations must also be true
    if (flags.active && !flags.reservations) {
      flags.reservations = true;
    }

    const records = results.slice(flags.skip, flags.skip + flags.size);
    let output = await Promise.all(
      records.map(async (r) => {
        const project = formatProject(r);
        if (flags.reservations) {
          const reservationResults: Result[] = await reservations.getReservations(r.id, 0, 1000, { blockTag });
          project.reservations = reservationResults.map((r) => formatNode(r));
        }
        return project;
      })
    );

    if (flags.active) {
      output = output.filter((v) => (v.reservations as Result[]).length > 0);
    }

    this.log(pretty(output));
    return output;
  }
}
