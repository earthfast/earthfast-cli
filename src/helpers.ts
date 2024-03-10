import { AddressZero } from "@ethersproject/constants";
import { ledger } from "armada-sdk";
import { ethers, Signer, VoidSigner, Wallet } from "./ethers";
import inquirer from "inquirer";
import { listWallets, loadWallet } from "./keystore";
import KeytarClient from "./keytarClient";
import { NetworkName, Networks } from "./networks";

const { LedgerSigner } = ledger;

// bit of magic to re-export everything from armada-sdk helpers
// so it can be used natively in armada-cli
// can't export * from an object, needs to be a file that's why
// we have to directly export src/helpers
export * from "armada-sdk/dist/src/helpers";

export type SignerType = "keystore" | "ledger" | "raw";
export const SignerTypes: SignerType[] = ["keystore", "ledger", "raw"];

export async function getSigner(
  network: NetworkName,
  rpcUrl: string | undefined,
  address: string | undefined,
  signer: SignerType,
  privateKey: string | undefined,
  account: string | undefined
): Promise<Signer> {
  const url = rpcUrl ?? Networks[network].url;
  const provider = new ethers.providers.JsonRpcProvider(url);

  let wallet: Signer;
  if (signer === "raw") {
    wallet = new VoidSigner(AddressZero, provider);
  } else if (signer === "ledger") {
    // Use stderr to not interfere with --json flag
    console.warn("> Make sure that Ledger is unlocked and the Ethereum app is open");
    wallet = new LedgerSigner(provider, "default", account ?? "0");
    const address = await wallet.getAddress();
    // Use stderr to not interfere with --json flag
    console.warn(`> Using Ledger wallet ${address}`);
  } else if (privateKey) {
    wallet = new Wallet(privateKey);
    wallet = wallet.connect(provider);
  } else {
    if (!address) {
      const wallets = await listWallets();
      if (!wallets.length) {
        throw Error("Error: No private keys found. Use key import command.");
      }

      const res = await inquirer.prompt({
        name: "address",
        message: "Pick the wallet to sign the transaction:",
        type: "list",
        choices: wallets.map((w) => ({
          value: w.address,
          name: w.description ? `${w.address} - ${w.description}` : w.address,
        })),
      });

      address = res.address as string;
    } else {
      const wallets = await listWallets();
      if (!wallets.find((w) => w.address === address)) {
        throw Error(`No saved key for address ${address}`);
      }
    }

    const keytar = await KeytarClient.getKeytar();
    const getPassword = keytar.getPassword;
    let password = await getPassword("armada-cli", address);
    if (!password) {
      const res = await inquirer.prompt({
        name: "password",
        message: "Enter the wallet password:",
        type: "password",
      });
      password = res.password as string;
    }

    wallet = await loadWallet(address, password);
    wallet = wallet.connect(provider);
  }

  return wallet;
}
