import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { getContract, getProvider, normalizeHex, normalizeRecords } from "../../helpers";

export default class ProjectList extends BlockchainCommand {
  static description = "Lists projects on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--owner ADDR] [--skip N] [--size N]";
  static flags = {
    owner: Flags.string({ description: "Filter by owner address.", helpValue: "ADDR" }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ProjectList);
    const provider = await getProvider(flags.network);
    const projects = await getContract(flags.network, "projects", provider);
    const owner = normalizeHex(flags.owner);
    const blockTag = await provider.getBlockNumber();
    const results: Result[] = [];
    for (let i = flags.skip; i != Number.MAX_VALUE && results.length < flags.size; ) {
      let records: Result[] = await projects.getProjects(i, flags.page, { blockTag });
      // Advance to the next page or signal early exit if exhausted all records
      i = records.length !== flags.page ? Number.MAX_VALUE : i + records.length;
      // Apply filters
      if (flags.owner) {
        records = records.filter((value) => value.owner.toLowerCase() === owner.toLowerCase());
      }
      // Append as many results as requested, but no more than that
      results.push(...records.slice(0, flags.size - results.length));
    }
    console.log(normalizeRecords(results));
  }
}
