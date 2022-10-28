import { ethers } from "ethers";
import inquirer from "inquirer";
import keytar from "keytar";
import yargs, { Arguments } from "yargs";
import { decodeEvent, waitTx } from "../../helpers";
import { getWallets, openKeyStoreFile } from "../../keystore";
import { defaultNetworks, getArmadaAbi, getNetworkRpcUrl, supportedNetworks } from "../../networks";
import { LedgerSigner } from "../../ledger";

export const command = "project-create <name> <email>";
export const desc = "Create a new project";

export const builder = function (yargs: yargs.Argv) {
  return yargs
    .positional("name", {
      describe: "The name of the project",
      type: "string",
    })
    .positional("email", {
      describe: "The email of the project",
      type: "string",
    })
    .option("network", {
      describe: `The network to use. Default is testnet. Options: ${Object.keys(defaultNetworks).join(", ")}`,
      type: "string",
      default: false,
    })
    .option("content", {
      describe: "The content of the project",
      type: "string",
      default: "",
    })
    .option("checksum", {
      describe: "The checksum of the project",
      type: "string",
      default: "0x0000000000000000000000000000000000000000000000000000000000000000",
    })
    .option("ledger", {
      describe: "Use a ledger wallet",
      type: "boolean",
      default: false,
    });
};

export const handler = async function (argv: Arguments) {
  const { address: armadaProjectsAddress, abi: armadaProjectsAbi } = getArmadaAbi(argv.network as supportedNetworks, "projects");
  const url = getNetworkRpcUrl(argv.network as supportedNetworks);
  const provider = new ethers.providers.JsonRpcProvider(url);

  let wallet;
  let address;
  if (argv.ledger) {
    console.log(
      "Creating project using Ledger wallet. Make sure Ledger walet is unlocked and the ethereum application is open"
    );

    wallet = new LedgerSigner(provider);
    address = await wallet.getAddress();

    console.log("Using Ledger wallet. Wallet address: ", address);
  } else {
    let res = await inquirer.prompt([
      {
        name: "address",
        message: "Which wallet do you want to use to sign the transaction?",
        type: "list",
        choices: await getWallets(),
      },
    ]);
    address = res.address;

    let password = await keytar.getPassword("armada-cli", address);
    if (!password) {
      let res = await inquirer.prompt([
        {
          name: "password",
          message: "Enter the password of the wallet.",
          type: "string",
        },
      ]);
      password = res.password;
    }

    wallet = await openKeyStoreFile(`keystore_${address}.json`, password);
    wallet = wallet.connect(provider);
  }

  console.log(`Creating project: ${argv.name}. May take up to a minute to complete...`);

  const projectContract = new ethers.Contract(armadaProjectsAddress, armadaProjectsAbi, provider);
  const projectContractWithSigner = projectContract.connect(wallet);
  const createProject = await waitTx(
    projectContractWithSigner.createProject([address, argv.name, argv.email, argv.content, argv.checksum])
  );
  const events = await decodeEvent(createProject, projectContract, "ProjectCreated");

  console.log("Project created! Details: ");
  console.log(events);
};
