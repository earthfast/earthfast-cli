import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import inquirer from "inquirer";
import { listWallets, updateWallet } from "../../keystore";

export default class KeyEdit extends Command {
  static description = "Changes the optional key description.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static args: Arg[] = [
    { name: "ADDR", description: "The address of the key to describe." },
    { name: "DESC", description: "The new description for the key." },
  ];

  public async run(): Promise<void> {
    const { args } = await this.parse(KeyEdit);
    if (!!args.ADDR !== !!args.DESC) {
      this.error("ADDR and DESC must be specified together");
    }

    if (!args.ADDR) {
      const wallets = await listWallets();
      if (!wallets.length) {
        throw Error("Error: No private keys found.");
      }

      const res = await inquirer.prompt([
        {
          name: "address",
          message: "Pick the account to describe:",
          type: "list",
          choices: wallets.map((w) => ({
            value: w.address,
            name: w.description ? `${w.address} - ${w.description}` : w.address,
          })),
        },
        {
          name: "description",
          message: "Enter the key description:",
        },
      ]);

      args.ADDR = res.address;
      args.DESC = res.description;
    }

    const address = args.ADDR;
    await updateWallet(address, args.DESC);
    console.log(`Account ${address} updated`);
  }
}
