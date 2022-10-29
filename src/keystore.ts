import { encryptKeystore } from "@ethersproject/json-wallets";
import fs from "fs";
import { Wallet } from "ethers";
import path from "path";
import os from "os";
import keytar from "keytar";
import { normalizeHex } from "./helpers";

const homedir = os.homedir();
const keyStoreFolderPath = path.join(homedir, ".armada");

export async function saveWallet(privateKey: string, password: string): Promise<string> {
  privateKey = normalizeHex(privateKey);
  const wallet = new Wallet(privateKey);
  const address = wallet.address;
  const json = await encryptKeystore({ address, privateKey }, password);
  const filename = `keystore_${address}.json`;

  if (!fs.existsSync(keyStoreFolderPath)) {
    fs.mkdirSync(keyStoreFolderPath);
  }

  fs.writeFileSync(path.join(keyStoreFolderPath, filename), json);
  keytar.setPassword("armada-cli", address, password);
  return filename;
}

export async function loadWallet(filename: string, password: string): Promise<Wallet> {
  const json = fs.readFileSync(path.join(keyStoreFolderPath, filename), "utf8");
  const wallet = await Wallet.fromEncryptedJson(json, password);
  return wallet;
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
