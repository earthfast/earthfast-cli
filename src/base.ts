import dotenv from "dotenv";
import path from "path";

// need to check both the ../ and ../../ for .env file
// this is because src/base.ts is one level below .env and dist/src/base.js is two levels below .env
dotenv.config({ path: [path.resolve(__dirname, "..", ".env"), path.resolve(__dirname, "../../", ".env")] });

import { Command, Flags } from "@oclif/core";
import { CommandError, FlagOutput, Input, ParserOutput } from "@oclif/core/lib/interfaces";
import { version } from "../package.json";
import { getContract, getProvider, SignerType, SignerTypes } from "./helpers";
import { NetworkName, NetworkNames } from "./networks";

type TxError = { error: { reason: string } };

function printCurrentNetwork(network: NetworkName) {
  console.warn(`> Current Network: ${network}\n`);
}

export abstract class BlockchainCommand extends Command {
  static enableJsonFlag = true;

  static globalFlags = {
    network: Flags.enum<NetworkName>({
      helpGroup: "BASE",
      description: "The network to use.",
      options: NetworkNames,
      default: "testnet-sepolia",
    }),
    abi: Flags.string({
      helpGroup: "BASE",
      description: "The ABI base directory.",
      helpValue: "DIR",
    }),
    rpc: Flags.string({
      helpGroup: "BASE",
      description: "Ethereum node endpoint.",
      helpValue: "URL",
    }),
  };

  public async checkVersion(flags: {
    network: NetworkName;
    abi: string | undefined;
    rpc: string | undefined;
  }): Promise<void> {
    const provider = await getProvider(flags.network, flags.rpc);
    const registry = await getContract(flags.network, flags.abi, "EarthfastRegistry", provider);
    const netVersion = await registry.getVersion();
    if (!netVersion) {
      // Use stderr to not interfere with --json flag
      console.warn("> Skipping CLI version check");
      return;
    }
    const netVersionStar = netVersion.split(".", 2).join(".") + ".*";
    const cliVersion = version;
    const cliVersionStar = cliVersion.split(".", 2).join(".") + ".*";
    if (netVersionStar !== cliVersionStar) {
      this.error(`Please use CLI version "${netVersionStar}"`);
    }
  }

  protected async parse<
    F extends FlagOutput,
    G extends FlagOutput,
    A extends { [name: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  >(options?: Input<F, G>, argv?: string[]): Promise<ParserOutput<F, G, A>> {
    const parsed = await super.parse(options, argv);
    // printCurrentNetwork(parsed.flags.network);
    this.checkVersion(parsed.flags as never);
    return parsed as ParserOutput<F, G, A>;
  }
}

export abstract class TransactionCommand extends BlockchainCommand {
  static globalFlags = {
    ...super.globalFlags,
    address: Flags.string({
      helpGroup: "BASE",
      description: "The account address to use (keystore only).",
      helpValue: "ADDR",
      exclusive: ["signer", "key"],
    }),
    signer: Flags.enum<SignerType>({
      helpGroup: "BASE",
      description: "The method for signing transactions.",
      options: SignerTypes,
      default: "keystore",
      exclusive: ["address", "key"],
    }),
    account: Flags.string({
      helpGroup: "BASE",
      description: "Account derivation number if using Ledger, starts at 0.",
      helpValue: "N",
      exclusive: ["address", "key"],
      default: "0",
      relationships: [
        { type: "all", flags: [{ name: "signer", when: async (flags) => flags["signer"] === "ledger" }] },
      ],
    }),
    key: Flags.string({
      helpGroup: "BASE",
      description: "The private key for transactions (danger).",
      helpValue: "KEY",
      exclusive: ["address", "signer"],
    }),
  };

  async catch(error: CommandError | TxError): Promise<void> {
    if (!process.env.DEBUG && "error" in error && "reason" in error.error) {
      this.error(error.error.reason);
    } else {
      throw error;
    }
  }
}
