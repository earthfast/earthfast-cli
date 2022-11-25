import { Command } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import inquirer from "inquirer";
import { listWallets, readWallet, updateWallet } from "../../keystore";

export default class KeyEdit extends Command {
  static summary = "Changes the optional key description.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static enableJsonFlag = true;
  static args: Arg[] = [
    { name: "ADDR", description: "The address of the key to describe." },
    { name: "DESC", description: "The new description for the key." },
  ];

  public async run(): Promise<unknown> {
    const { args } = await this.parse(KeyEdit);
    if (!!args.ADDR !== !!args.DESC) {
      this.error("Can only specify ADDR and DESC together.");
    }

    if (!args.ADDR) {
      const wallets = await listWallets();
      if (!wallets.length) {
        throw Error("Error: No private keys found.");
      }

      const res1 = await inquirer.prompt({
        name: "address",
        message: "Pick the account to describe:",
        type: "list",
        choices: wallets.map((w) => ({
          value: w.address,
          name: w.description ? `${w.address} - ${w.description}` : w.address,
        })),
      });

      const json = await readWallet(res1.address);
      const res2 = await inquirer.prompt({
        name: "description",
        message: "Enter the key description:",
        default: json.description,
      });

      args.ADDR = res1.address;
      args.DESC = res2.description;
    }

    const address = args.ADDR;
    await updateWallet(address, args.DESC);
    this.log(`Account ${address} updated`);
    return address;
  }
}
