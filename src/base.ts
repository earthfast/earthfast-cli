import { Command, Flags } from "@oclif/core";
import { NetworkName, NetworkNames } from "./networks";

export abstract class BlockchainCommand extends Command {
  static globalFlags = {
    network: Flags.enum<NetworkName>({
      description: "The network to use",
      options: NetworkNames,
      default: "testnet",
    }),
  };
}

export abstract class TransactionCommand extends BlockchainCommand {
  static globalFlags = {
    ...super.globalFlags,
    address: Flags.string({
      description: "The account address to use.",
      exclusive: ["ledger"],
    }),
    ledger: Flags.boolean({
      description: "Use Ledger wallet to sign transactions",
      exclusive: ["address"],
    }),
  };
}
