import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import inquirer from "inquirer";
import keytar from "keytar";
import { deleteWallet, listWallets } from "../../keystore";

export default class KeyDelete extends Command {
  static description = "Deletes a private key from the keystore.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %>";
  static args: Arg[] = [{ name: "ADDR", description: "The address of the key to delete." }];

  public async run(): Promise<void> {
    const { args } = await this.parse(KeyDelete);
    if (!args.ADDR) {
      const addresses = await listWallets();
      if (!addresses.length) {
        throw Error("Error: No private keys found.");
      }

      const res = await inquirer.prompt({
        name: "address",
        message: "Pick the account to delete:",
        type: "list",
        choices: addresses,
      });

      args.ADDR = res.address;
    }

    const address = args.ADDR;
    await deleteWallet(address);
    await keytar.deletePassword("armada-cli", address);
    console.log(`Account ${address} deleted`);
  }
}
