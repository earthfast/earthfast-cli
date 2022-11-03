import path from "path";
import type { Provider, TransactionReceipt } from "@ethersproject/abstract-provider";
import { BigNumber, Contract, ethers, Signer, type Transaction } from "ethers";
import { formatUnits, Result } from "ethers/lib/utils";
import inquirer from "inquirer";
import keytar from "keytar";
import { ContractName, loadAbi } from "./contracts";
import { listWallets, loadWallet } from "./keystore";
import { LedgerSigner } from "./ledger";
import { NetworkName, Networks } from "./networks";

export type SignerType = "keystore" | "ledger";
export const SignerTypes: SignerType[] = ["keystore", "ledger"];

const Chains: Record<number, string> = {
  0: "mainnet",
  5: "goerli",
};

export function getTxUrl(tx: Transaction): string {
  const chain = Chains[tx.chainId];
  const prefix = chain === "mainnet" ? "" : chain + ".";
  return `https://${prefix}etherscan.io/tx/${tx.hash}`;
}

// Converts union objects returned by ethers to plain objects.
export function normalizeRecord(r: Record<string, unknown> | Result): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(r)
      .filter((k) => isNaN(Number(k)))
      .map((k) => {
        if (r[k] instanceof BigNumber) {
          return [k, normalizeBigNumber(r[k])];
        }
        return [k, r[k]];
      })
  );
}

export function normalizeRecords(rs: (Record<string, unknown> | Result)[]): Record<string, unknown>[] {
  return rs.map((r) => normalizeRecord(r));
}

// Prepends 0x, and replaces undefined and empty with 256-bit zero hash.
export function normalizeHex(s: string | undefined): string {
  if (!s?.length) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  } else {
    return s.startsWith("0x") ? s : "0x" + s;
  }
}

function normalizeBigNumber(n: BigNumber): string {
  try {
    return n.toNumber().toString();
  } catch {
    return formatUnits(n, 18);
  }
}

export async function getProvider(network: NetworkName, rpcUrl: string | undefined): Promise<Provider> {
  const url = rpcUrl ?? Networks[network].url;
  const provider = new ethers.providers.JsonRpcProvider(url);
  return provider;
}

export async function getSigner(
  network: NetworkName,
  rpcUrl: string | undefined,
  address: string | undefined,
  signer: SignerType
): Promise<Signer> {
  const url = rpcUrl ?? Networks[network].url;
  const provider = new ethers.providers.JsonRpcProvider(url);

  let wallet: Signer;
  if (signer === "ledger") {
    console.log("Make sure the Ledger wallet is unlocked and the Ethereum application is open");
    wallet = new LedgerSigner(provider);
    const address = await wallet.getAddress();
    console.log("Using Ledger wallet. Wallet address: ", address);
  } else {
    if (!address) {
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

      address = res.address as string;
    } else {
      const addresses = await listWallets();
      if (!addresses.includes(address)) {
        throw Error(`No saved key for address ${address}`);
      }
    }

    let password = await keytar.getPassword("armada-cli", address);
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

export async function getContract(
  network: NetworkName,
  abiDir: string | undefined,
  contract: ContractName,
  signerOrProvider: Signer | ethers.providers.Provider
): Promise<Contract> {
  const dir = abiDir ?? Networks[network].abi;
  const file = path.join(dir, network, contract + ".json");
  const abi = await loadAbi(file);
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

export async function decodeEvents(receipt: TransactionReceipt, contract: Contract, event: string): Promise<Result[]> {
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
  return results;
}

export async function decodeEvent(receipt: TransactionReceipt, contract: Contract, event: string): Promise<Result> {
  return (await decodeEvents(receipt, contract, event))[0];
}

// Returns all results of a paged function call (a function that accepts skip and size parameters).
export async function getAll(page: number, call: (skip: number, size: number) => Promise<Result[]>): Promise<Result[]> {
  const results: Result[] = [];
  while (page > 0) {
    const records = await call(results.length, page);
    results.push(...records);
    if (records.length !== page) {
      break;
    }
  }
  return results;
}
