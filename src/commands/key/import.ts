import { Command } from "@oclif/core";
import inquirer from "inquirer";
import { loadWallet, saveWallet } from "../../keystore";

export default class KeyImport extends Command {
  static description = "Saves a private key for signing transactions.\nThe keys are stored in an encrypted keystore.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";

  public async run(): Promise<void> {
    await this.parse(KeyImport);
    const responses = await inquirer.prompt([
      { name: "privateKey", message: "Paste the private key to import:", type: "password", mask: "*" },
      { name: "password", message: "Enter a key encryption password:", type: "password", mask: "*" },
    ]);

    const address = await saveWallet(responses.privateKey, responses.password);
    await loadWallet(address, responses.password);
    console.log(`Account ${address} imported`);
  }
}
