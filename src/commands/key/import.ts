import { Command } from "@oclif/core";
import inquirer from "inquirer";
import { loadWallet, saveWallet } from "../../keystore";

export default class KeyImport extends Command {
  static description = "Saves a private key for signing transactions.\nThe keys are stored in an encrypted keystore.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    await this.parse(KeyImport);
    const responses = await inquirer.prompt([
      { name: "privateKey", message: "Paste the private key to import:", type: "password", mask: "*" },
      { name: "password", message: "Create a key encryption password:", type: "password", mask: "*" },
      { name: "description", message: "Enter an optional key description:" },
    ]);

    const address = await saveWallet(responses.privateKey, responses.password, responses.description);
    await loadWallet(address, responses.password);
    this.log(`Account ${address} imported`);
    return address;
  }
}
