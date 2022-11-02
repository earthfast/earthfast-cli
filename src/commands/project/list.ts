import { Flags } from "@oclif/core";
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
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ProjectList);
    const provider = await getProvider(flags.network);
    const projects = await getContract(flags.network, "projects", provider);
    let records = await projects.getProjects(flags.skip, flags.size);
    if (flags.owner) {
      const owner = normalizeHex(flags.owner);
      records = records.filter((value: { owner: string }) => value.owner.toLowerCase() === owner.toLowerCase());
    }
    console.log(normalizeRecords(records));
  }
}
