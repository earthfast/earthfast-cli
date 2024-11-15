import { version } from "../../package.json";
import { BlockchainCommand } from "../base";
import { getContract, getProvider, pretty } from "../helpers";

export default class Status extends BlockchainCommand {
  static summary = "Shows the current epoch status.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(Status);
    const provider = await getProvider(flags.network, flags.rpc);
    const registry = await getContract(flags.network, flags.abi, "EarthfastRegistry", provider);
    const netVersion = await registry.getVersion();
    const cliVersion = version;

    // Round epoch start to Wednesday at 16:00 UTC
    const lastEpochStart = new Date();
    lastEpochStart.setUTCHours(16, 0, 0, 0);
    // Get current day (0 = Sunday, 3 = Wednesday)
    const currentDay = lastEpochStart.getUTCDay();
    // Calculate days to subtract to reach previous Wednesday
    const daysToSubtract = (currentDay - 3 + 7) % 7 || 7; // If result is 0, subtract 7 days
    lastEpochStart.setUTCDate(lastEpochStart.getUTCDate() - daysToSubtract);

    const nextEpochStart = new Date(lastEpochStart);
    nextEpochStart.setUTCDate(nextEpochStart.getUTCDate() + 7);

    const output = {
      netVersion,
      cliVersion,
      epochDuration: "7 days",
      lastEpochStart: `${lastEpochStart}`,
      nextEpochStart: `${nextEpochStart}`,
      gracePeriod: "24 hours before the end of an epoch",
    };

    this.log(pretty(output));
    return output;
  }
}
