import fs from "fs";
import os from "os";
import path from "path";
import { encryptKeystore } from "@ethersproject/json-wallets";
import { Wallet } from "ethers";
import keytar from "keytar";
import { normalizeHash } from "./helpers";

const homedir = os.homedir();
const keyStoreFolderPath = path.join(homedir, ".armada/keystore");

export async function saveWallet(privateKey: string, password: string, description: string): Promise<string> {
  privateKey = normalizeHash(privateKey);
  const wallet = new Wallet(privateKey);
  const address = wallet.address;
  const text = await encryptKeystore({ address, privateKey }, password);
  const json = { ...JSON.parse(text), description };
  const filename = `${address}.json`;
  if (!fs.existsSync(keyStoreFolderPath)) {
    fs.mkdirSync(keyStoreFolderPath);
  }

  fs.writeFileSync(path.join(keyStoreFolderPath, filename), JSON.stringify(json, null, "  "));
  keytar.setPassword("armada-cli", address, password);
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
