import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import inquirer from "inquirer";
import { deleteWallet, listWallets } from "../../keystore";

export default class KeyDelete extends Command {
  static summary = "Deletes a private key from the keystore.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %>";
  static args: Arg[] = [{ name: "ADDR", description: "The address of the key to delete." }];
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    const { args } = await this.parse(KeyDelete);
    if (!args.ADDR) {
      const wallets = await listWallets();
      if (!wallets.length) {
        throw Error("Error: No private keys found.");
      }

      const res = await inquirer.prompt({
        name: "address",
        message: "Pick the account to delete:",
        type: "list",
        choices: wallets.map((w) => ({
          value: w.address,
          name: w.description ? `${w.address} - ${w.description}` : w.address,
        })),
      });

      args.ADDR = res.address;
    }

    const address = args.ADDR;
    await deleteWallet(address);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { keytar } = import("keytar");
    await keytar.deletePassword("armada-cli", address);
    this.log(`Account ${address} deleted`);
    return address;
  }
}
