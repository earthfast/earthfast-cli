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
    for (let i = flags.skip; results.length < flags.size; ) {
      const records = await projects.getProjects(i, flags.page, { blockTag });
      i += records.length;
      if (flags.owner) {
        results.push(
          ...records
            .filter((value: { owner: string }) => value.owner.toLowerCase() === owner.toLowerCase())
            .slice(0, flags.size - results.length)
        );
      } else {
        results.push(...records.slice(0, flags.size - results.length));
      }
      if (records.length !== flags.page) {
        break;
      }
    }
    console.log(normalizeRecords(results));
  }
}
