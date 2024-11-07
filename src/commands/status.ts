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

    const lastEpochStart = new Date();
    lastEpochStart.setUTCHours(0, 0, 0, 0);
    lastEpochStart.setUTCDate(lastEpochStart.getUTCDate() - lastEpochStart.getUTCDay());

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
