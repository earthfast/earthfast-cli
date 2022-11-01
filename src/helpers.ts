import type { Provider, TransactionReceipt } from "@ethersproject/abstract-provider";
import { Contract, ethers, Signer } from "ethers";
import { Result } from "ethers/lib/utils";
import inquirer from "inquirer";
import keytar from "keytar";
import { listWallets, loadWallet } from "./keystore";
import { LedgerSigner } from "./ledger";
import { ContractName, Contracts, NetworkName, Networks } from "./networks";

export function normalizeHex(s: string | undefined): string {
  if (!s?.length) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  } else {
    return s.startsWith("0x") ? s : "0x" + s;
  }
}

export async function getProvider(network: NetworkName): Promise<Provider> {
  const url = Networks[network].url;
  const provider = new ethers.providers.JsonRpcProvider(url);
  return provider;
}

export async function getSigner(network: NetworkName, ledger: boolean): Promise<Signer> {
  const url = Networks[network].url;
  const provider = new ethers.providers.JsonRpcProvider(url);

  let signer: Signer;
  if (ledger) {
    console.log("Make sure the Ledger wallet is unlocked and the Ethereum application is open");
    signer = new LedgerSigner(provider);
    const address = await signer.getAddress();
    console.log("Using Ledger wallet. Wallet address: ", address);
  } else {
    const addresses = await listWallets();
    if (!addresses.length) {
      throw Error("Error: No private keys found. Use key import command.");
    }

    const res = await inquirer.prompt({
      name: "address",
      message: "Pick the wallet to sign the transaction:",
      type: "list",
      choices: addresses,
    });

    const address = res.address;
    let password = await keytar.getPassword("armada-cli", address);
    if (!password) {
      const res = await inquirer.prompt({
        name: "password",
        message: "Enter the wallet password:",
        type: "password",
      });
      password = res.password as string;
    }

    signer = await loadWallet(address, password);
    signer = signer.connect(provider);
  }

  return signer;
}

export async function getContract(
  network: NetworkName,
  contract: ContractName,
  signerOrProvider: Signer | ethers.providers.Provider
): Promise<Contract> {
  const abi = Contracts[network][contract];
  if (signerOrProvider instanceof Signer) {
    const signer = signerOrProvider;
    const contract = new Contract(abi.address, abi.abi, signer.provider);
    const contractWithSigner = contract.connect(signer);
    return contractWithSigner;
  } else {
    const provider = signerOrProvider;
    const contract = new Contract(abi.address, abi.abi, provider);
    return contract;
  }
}

export async function decodeEvent(
  receipt: TransactionReceipt,
  contract: Contract,
  event: string
): Promise<Result | Result[]> {
  const results = [];
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    try {
      const args = contract.interface.decodeEventLog(event, log.data, log.topics);
      if (args) {
        results.push(args);
      }
    } catch {
      continue;
    }
  }
  return results.length === 1 ? results[0] : results;
}
