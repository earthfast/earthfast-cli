import fs from "fs";
import os from "os";
import path from "path";
import { encryptKeystore } from "@ethersproject/json-wallets";
import { Wallet } from "ethers";
import { parseHash } from "./helpers";
import KeytarClient from "./keytarClient";

const homedir = os.homedir();
const keyStoreFolderPath = path.join(homedir, ".earthfast/keystore");

export async function saveWallet(privateKey: string, password: string, description: string): Promise<string> {
  privateKey = parseHash(privateKey);
  const wallet = new Wallet(privateKey);
  const address = wallet.address;
  const text = await encryptKeystore({ address, privateKey }, password);
  const json = { ...JSON.parse(text), description };
  const filename = `${address}.json`;
  if (!fs.existsSync(keyStoreFolderPath)) {
    fs.mkdirSync(keyStoreFolderPath, { recursive: true });
  }

  fs.writeFileSync(path.join(keyStoreFolderPath, filename), JSON.stringify(json, null, "  "));

  const keytar = await KeytarClient.getKeytar();
  const setPassword = keytar.setPassword;
  setPassword("earthfast-cli", address, password);
  return address;
}

export async function loadWallet(address: string, password: string): Promise<Wallet> {
  const filename = `${address}.json`;
  const text = fs.readFileSync(path.join(keyStoreFolderPath, filename), "utf8");
  const wallet = await Wallet.fromEncryptedJson(text, password);
  return wallet;
}

export async function readWallet(address: string): Promise<{ description: string }> {
  const filename = `${address}.json`;
  const text = fs.readFileSync(path.join(keyStoreFolderPath, filename), "utf8");
  return JSON.parse(text);
}

export async function deleteWallet(address: string): Promise<void> {
  const filename = `${address}.json`;
  fs.unlinkSync(path.join(keyStoreFolderPath, filename));
}

export async function updateWallet(address: string, description: string): Promise<void> {
  const filename = `${address}.json`;
  const pathname = path.join(keyStoreFolderPath, filename);
  const text = fs.readFileSync(pathname, "utf8");
  const json = { ...JSON.parse(text), description };
  fs.writeFileSync(pathname, JSON.stringify(json, null, "  "));
}

export async function listWallets(): Promise<{ address: string; description: string }[]> {
  if (!fs.existsSync(keyStoreFolderPath)) {
    return [];
  }

  const wallets: { address: string; description: string }[] = [];
  const files = fs.readdirSync(keyStoreFolderPath);
  for (const filename of files) {
    if (!filename.match(/.*\.json/)) {
      continue;
    }

    const text = fs.readFileSync(path.join(keyStoreFolderPath, filename), "utf8");
    const json = JSON.parse(text);
    wallets.push({ address: filename.split(".")[0], description: json.description });
  }

  return wallets;
}

/**
 * Save a Dynamic-authenticated wallet to the keystore
 * @param address The smart wallet address
 * @param description A description for this wallet
 * @param dynamicAuthData Additional data needed for Dynamic authentication
 * @returns The wallet address
 */
export async function saveDynamicWallet(
  address: string,
  description: string,
  dynamicAuthData: any = {}
): Promise<string> {
  // Normalize the address
  address = address.toLowerCase();
  
  // Create the keystore directory if it doesn't exist
  const keystoreDir = getKeystoreDir();
  if (!fs.existsSync(keystoreDir)) {
    fs.mkdirSync(keystoreDir, { recursive: true });
  }
  
  // Create the wallet data
  const walletData = {
    address,
    description,
    type: "dynamic",
    dynamicAuthData,
    createdAt: new Date().toISOString(),
  };
  
  // Save the wallet data to a JSON file
  const walletPath = path.join(keystoreDir, `${address}.json`);
  fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
  
  console.log(`Dynamic-authenticated wallet saved to ${walletPath}`);
  
  return address;
}

/**
 * Load a Dynamic-authenticated wallet from the keystore
 * @param address The wallet address
 * @returns The wallet data
 */
export async function loadDynamicWallet(address: string): Promise<any> {
  // Normalize the address
  address = address.toLowerCase();
  
  // Get the wallet path
  const keystoreDir = getKeystoreDir();
  const walletPath = path.join(keystoreDir, `${address}.json`);
  
  // Check if the wallet file exists
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found: ${address}`);
  }
  
  // Read the wallet data
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  
  // Verify that this is a Dynamic-authenticated wallet
  if (walletData.type !== "dynamic") {
    throw new Error(`Wallet is not a Dynamic-authenticated wallet: ${address}`);
  }
  
  return walletData;
}
