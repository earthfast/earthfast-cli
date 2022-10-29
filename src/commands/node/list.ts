import { Arguments, Argv } from "yargs";
import { getContract, getProvider, normalizeHex } from "../../helpers";

export const command = "node-list";
export const desc = "List network content nodes";

export const builder = function (argv: Argv) {
  return argv
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

export const handler = async function (args: Arguments) {
  const provider = await getProvider(args);
  const nodes = await getContract(args, "nodes", provider);
  const operator = normalizeHex(args.operator as string);
  const data = await nodes.getNodes(operator, args.topology, args.skip, args.size);
  console.log(data);
  console.log("OK");
};
