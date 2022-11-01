import { Command } from "@oclif/core";
import { listWallets } from "../../keystore";

export default class KeyList extends Command {
  static description = "Lists keys saved in the encrypted keystore.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";

  public async run(): Promise<void> {
    await this.parse(KeyList);
    const keys = await listWallets();
    for (let i = 0; i < keys.length; ++i) {
      console.log(keys[i]);
    }
  }
}
