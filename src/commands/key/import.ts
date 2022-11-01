import { Command } from "@oclif/core";
import inquirer from "inquirer";
import { loadWallet, saveWallet } from "../../keystore";

export default class KeyImport extends Command {
  static description = "Saves a private key for signing transactions.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "key import";

  public async run(): Promise<void> {
    await this.parse(KeyImport);
    const responses = await inquirer.prompt([
      { name: "privateKey", message: "Enter the private key to import", type: "password" },
      { name: "password", message: "Enter the password to encrypt the key", type: "password" },
    ]);

    const filename = await saveWallet(responses.privateKey, responses.password);
    const wallet = await loadWallet(filename, responses.password);
    console.log(`Account ${wallet.address} imported`);
  }
}
