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
    const usdc = await getContract(flags.network, flags.abi, "USDC", provider);
    const token = await getContract(flags.network, flags.abi, "ArmadaToken", provider);
    const ETH = await provider.getBalance(address);
    const USDC = await usdc.balanceOf(address);
    const ARMADA = await token.balanceOf(address);
    const output = { ETH: formatETH(ETH), USDC: formatUSDC(USDC), ARMADA: formatTokens(ARMADA) };
    this.log(pretty(output));
    return output;
  }
}
