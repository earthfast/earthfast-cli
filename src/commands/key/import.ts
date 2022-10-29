import inquirer from "inquirer";
import { Argv } from "yargs";
import { loadWallet, saveWallet } from "../../keystore";

export const command = "key-import";
export const desc = "Save a private key for signing transactions";

export const builder = function (argv: Argv) {
  return argv;
};

export const handler = async function () {
  const responses = await inquirer.prompt([
    {
      name: "privateKey",
      message: "Enter the wallet private key to import",
      type: "password",
    },
    {
      name: "password",
      message: "Enter the password to encrypt the key",
      type: "password",
    },
  ]);

  const filename = await saveWallet(responses.privateKey, responses.password);
  const wallet = await loadWallet(filename, responses.password);
  console.log(`Account ${wallet.address} imported`);
};
