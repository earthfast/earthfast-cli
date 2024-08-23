import { Flags } from "@oclif/core";
import { Result } from "ethers/lib/utils";
import { BlockchainCommand } from "../../base";
import { formatProject, getAll, getContract, getProvider, parseAddress, pretty } from "../../helpers";

export default class ProjectList extends BlockchainCommand {
  static summary = "List projects on the EarthFast Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> [--owner ADDR] [--skip N] [--size N] [--page N]";
  static flags = {
    owner: Flags.string({ description: "Filter by owner address.", helpValue: "ADDR" }),
    skip: Flags.integer({ description: "The number of results to skip.", helpValue: "N", default: 0 }),
    size: Flags.integer({ description: "The number of results to list.", helpValue: "N", default: 100 }),
    page: Flags.integer({ description: "The contract call paging size.", helpValue: "N", default: 100 }),
  };

  public async run(): Promise<Record<string, unknown>[]> {
    const { flags } = await this.parse(ProjectList);
    const provider = await getProvider(flags.network, flags.rpc);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", provider);
    const owner = parseAddress(flags.owner);
    const blockTag = await provider.getBlockNumber();
    let results: Result[] = await getAll(flags.page, async (i, n) => {
      return await projects.getProjects(i, n, { blockTag });
    });
    if (flags.owner) {
      results = results.filter((v) => v.owner.toLowerCase() === owner.toLowerCase());
    }

    const records = results.slice(flags.skip, flags.skip + flags.size);
    const output = records.map((r) => formatProject(r));
    this.log(pretty(output));
    return output;
  }
}
