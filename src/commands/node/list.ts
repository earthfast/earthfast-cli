import yargs, { Arguments } from "yargs";
import { getContract, getProvider, normalizeHex } from "../../helpers";

export const command = "node-list";
export const desc = "List network content nodes";

export const builder = function (yargs: yargs.Argv) {
  return yargs
    .option("skip", {
      describe: "The number of results to skip",
      default: 0,
      type: "number",
    })
    .option("size", {
      describe: "The number of results to list",
      default: 100,
      type: "number",
    })
    .option("operator", {
      describe: "The operator ID to filter by",
      default: "",
      type: "string",
    })
    .option("topology", {
      describe: "List topology nodes instead",
      type: "boolean",
      default: false,
    });
};

export const handler = async function (argv: Arguments) {
  const provider = await getProvider(argv);
  const nodes = await getContract(argv, "nodes", provider);
  const operator = normalizeHex(argv.operator as string);
  const data = await nodes.getNodes(operator, argv.topology, argv.skip, argv.size);
  console.log(data);
  console.log("OK");
};
