import { Command, Flags } from "@oclif/core";
import { CommandError } from "@oclif/core/lib/interfaces";
import { SignerType, SignerTypes } from "./helpers";
import { NetworkName, NetworkNames } from "./networks";

type TxError = { error: { reason: string } };

export abstract class BlockchainCommand extends Command {
  static globalFlags = {
    network: Flags.enum<NetworkName>({
      description: "The network to use.",
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
    }),
    signer: Flags.enum<SignerType>({
      description: "The method for signing transactions.",
      options: SignerTypes,
      default: "keystore",
    }),
  };

  async catch(error: CommandError | TxError): Promise<void> {
    if ("error" in error && "reason" in error.error) {
      this.error(error.error.reason);
    } else {
      throw error;
    }
  }
}
