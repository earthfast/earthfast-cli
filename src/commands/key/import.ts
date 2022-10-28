import inquirer from "inquirer";
import { generateKeyStore, openKeyStoreFile } from "../../keystore";

export const command = "key-import";
export const desc =
  "Imports a wallet into armada cli for signing txs. An encrypted keystore is generated from private key and stored on your local computer. The private key itself is not stored.";

export const builder = function (yargs: any) {
  return yargs;
};

export const handler = async function () {
  let responses = await inquirer.prompt([
    {
      name: "privateKey",
      message: "Enter the privateKey of the wallet to import",
      type: "string",
    },
    {
      name: "password",
      message: "Enter the password to encrypt the keystore",
      type: "string",
    },
  ]);

  console.log(`Importing wallet`);
  console.log(`Keystore encryption password: ${responses.password}`);

  const filename = await generateKeyStore(responses.privateKey, responses.password);
  const wallet = await openKeyStoreFile(filename, responses.password);

  console.log(`Keystore generated for: ${wallet.address}`);
};
