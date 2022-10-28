import { ethers } from "ethers";
import yargs, { Arguments } from "yargs";
import { defaultNetworks, getArmadaAbi, getNetworkRpcUrl, supportedNetworks } from "../../networks";

export const command = "node-list";
export const desc = "List all armada nodes";

export const builder = function (yargs: yargs.Argv) {
  return yargs
    .option("skip", {
      describe: "The number of nodes to skip. Example: 0",
      default: 0,
      type: "number",
    })
    .option("size", {
      describe: "The number of nodes to return. Example: 100",
      default: 100,
      type: "number",
    })
    .option("operator", {
      describe: "The operator id to filter by.",
      default: "0x0000000000000000000000000000000000000000000000000000000000000000",
      type: "string",
    })
    .option("topology", {
      describe: "Return topology nodes.",
      type: "boolean",
      default: false,
    })
    .option("network", {
      describe: `The network to use. Default is testnet. Options: ${Object.keys(defaultNetworks).join(", ")}`,
      type: "string",
      default: false,
    })
};

export const handler = async function (argv: Arguments) {
  console.log(`Listing all nodes.`);

  const url = getNetworkRpcUrl(argv.network as supportedNetworks);
  const provider = new ethers.providers.JsonRpcProvider(url);
  let { address: armadaNodesAddress, abi: armadaNodesAbi } = getArmadaAbi(argv.network as supportedNetworks, "nodes");

  const contract = new ethers.Contract(armadaNodesAddress, armadaNodesAbi, provider);
  const nodes = await contract.getNodes(argv.operator, argv.topology, argv.skip, argv.size);
  console.log(nodes);
};
