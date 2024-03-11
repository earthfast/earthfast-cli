import { Arg } from "@oclif/core/lib/interfaces";
import inquirer from "inquirer";
import { BlockchainCommand } from "../../base";
import { formatETH, formatTokens, formatUSDC, getContract, getProvider, pretty } from "../../helpers";
import { listWallets } from "../../keystore";

export default class KeyBalance extends BlockchainCommand {
  static summary = "Shows token balance for an address.";
  static examples = ["<%= config.bin %> <%= command.id %> 0x123abc..."];
  static usage = "<%= command.id %>";
  static args: Arg[] = [{ name: "ADDR", description: "The address to show balance." }];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(KeyBalance);
    if (!args.ADDR) {
      const wallets = await listWallets();
      if (!wallets.length) {
        throw Error("Error: No private keys found.");
      }

      const res = await inquirer.prompt({
        name: "address",
        message: "Pick the account to show balance:",
        type: "list",
        choices: wallets.map((w) => ({
          value: w.address,
          name: w.description ? `${w.address} - ${w.description}` : w.address,
        })),
      });

      args.ADDR = res.address;
    }

    const address = args.ADDR;
    const provider = await getProvider(flags.network, flags.rpc);
    const sdk = await this.initializeSDK(flags.network);
    const balances = await sdk.key.balance(provider, address);
    this.log(pretty({ address, balances }));
    return { address, balances };
  }
}
