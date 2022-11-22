import { Command } from "@oclif/core";
import { listWallets } from "../../keystore";

export default class KeyList extends Command {
  static description = "Lists keys saved in the encrypted keystore.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    await this.parse(KeyList);
    const wallets = await listWallets();
    for (let i = 0; i < wallets.length; ++i) {
      const w = wallets[i];
      this.log(w.description ? `${w.address} - ${w.description}` : w.address);
    }
    return wallets;
  }
}
