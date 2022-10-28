import { encryptKeystore } from "@ethersproject/json-wallets";
import fs from "fs";
import { ethers } from "ethers";
import path from "path";
import os from "os";
import keytar from "keytar";

const homedir = os.homedir();
const keyStoreFolderPath = path.join(homedir, ".armada");

export async function generateKeyStore(privateKey: string, passw: string) {
  privateKey = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
  const address = new ethers.Wallet(privateKey).address;
  const wallet = { address, privateKey };

  const keyStore = await encryptKeystore(wallet, passw);
  const filename = `keystore_${wallet.address}.json`;

  if (!fs.existsSync(keyStoreFolderPath)) {
    fs.mkdirSync(keyStoreFolderPath);
  }

  fs.writeFileSync(path.join(keyStoreFolderPath, filename), keyStore);
  keytar.setPassword("armada-cli", wallet.address, passw);
  return filename;
}

export async function openKeyStoreFile(filename: string, passw: any) {
  const keyStore = fs.readFileSync(path.join(keyStoreFolderPath, filename), "utf8");
  const wallet = await openKeyStore(keyStore, passw);
  return wallet;
}

export async function openKeyStore(keyStore: string, passw: string) {
  return await ethers.Wallet.fromEncryptedJson(keyStore, passw);
}

function getWalletAddressFromKeystoreFilename(filename: string) {
  return filename.split("_")[1].split(".")[0];
}

export async function getWallets() {
  const wallets = [];
  const files = fs.readdirSync(keyStoreFolderPath);
  for (const file of files) {
    if (file.includes(".DS_Store")) {
      continue;
    }

    wallets.push({
      name: getWalletAddressFromKeystoreFilename(file),
    });
  }
  return wallets;
}
