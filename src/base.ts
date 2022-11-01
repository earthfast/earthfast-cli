import { Command, Flags } from "@oclif/core";
import { defaultNetworks } from "./networks";

export abstract class BlockchainCommand extends Command {
  static globalFlags = {
    network: Flags.enum({
      description: "The network to use",
      options: Object.keys(defaultNetworks),
      default: "testnet",
    }),
  };
}

export abstract class TransactionCommand extends BlockchainCommand {
  static globalFlags = {
    ...super.globalFlags,
    ledger: Flags.boolean({
      description: "Use Ledger wallet to sign transactions",
    }),
  };
}
