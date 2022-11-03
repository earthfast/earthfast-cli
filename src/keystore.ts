import fs from "fs";
import os from "os";
import path from "path";
import { encryptKeystore } from "@ethersproject/json-wallets";
import { Wallet } from "ethers";
import keytar from "keytar";
import { normalizeHash } from "./helpers";

const homedir = os.homedir();
const keyStoreFolderPath = path.join(homedir, ".armada");

export async function saveWallet(privateKey: string, password: string): Promise<string> {
  privateKey = normalizeHash(privateKey);
  const wallet = new Wallet(privateKey);
  const address = wallet.address;
  const json = await encryptKeystore({ address, privateKey }, password);
  const filename = `keystore_${address}.json`;

  if (!fs.existsSync(keyStoreFolderPath)) {
    fs.mkdirSync(keyStoreFolderPath);
  }

  fs.writeFileSync(path.join(keyStoreFolderPath, filename), json);
  keytar.setPassword("armada-cli", address, password);
  return address;
}

export async function loadWallet(address: string, password: string): Promise<Wallet> {
  const filename = `keystore_${address}.json`;
  const json = fs.readFileSync(path.join(keyStoreFolderPath, filename), "utf8");
  const wallet = await Wallet.fromEncryptedJson(json, password);
  return wallet;
}

export async function deleteWallet(address: string): Promise<void> {
  const filename = `keystore_${address}.json`;
  fs.unlinkSync(path.join(keyStoreFolderPath, filename));
}

export async function listWallets(): Promise<string[]> {
  if (!fs.existsSync(keyStoreFolderPath)) {
    return [];
  }

  const wallets: string[] = [];
  const files = fs.readdirSync(keyStoreFolderPath);
  for (const filename of files) {
    if (!filename.match(/keystore_.*\.json/)) {
      continue;
    }

    wallets.push(filename.split("_")[1].split(".")[0]);
  }

  return wallets;
}
