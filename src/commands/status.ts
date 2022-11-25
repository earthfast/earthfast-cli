import { Command } from "@oclif/core";
import { pretty } from "../helpers";

export default class Status extends Command {
  static summary = "Shows the current epoch status.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    await this.parse(Status);

    const lastEpochStart = new Date();
    lastEpochStart.setUTCHours(0, 0, 0, 0);
    lastEpochStart.setUTCDate(lastEpochStart.getUTCDate() - lastEpochStart.getUTCDay());

    const nextEpochStart = new Date(lastEpochStart);
    nextEpochStart.setUTCDate(nextEpochStart.getUTCDate() + 7);

    const output = {
      epochDuration: "7 days",
      lastEpochStart: `${lastEpochStart}`,
      nextEpochStart: `${nextEpochStart}`,
      gracePeriod: "24 hours before the end of an epoch",
    };

    this.log(pretty(output));
    return output;
  }
}
