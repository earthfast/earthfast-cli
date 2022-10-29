import yargs, { Arguments } from "yargs";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export const command = "project-create <name> <email> [bundle-url] [bundle-sha]";
export const desc = "Register a new project";

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
    .positional("bundle-url", {
      describe: "The public URL to fetch the bundle",
      type: "string",
      default: "",
    })
    .positional("bundle-sha", {
      describe: "The SHA-256 checksum of the bundle",
      type: "string",
      default: "",
    });
};

export const handler = async function (argv: Arguments) {
  const signer = await getSigner(argv);
  const projects = await getContract(argv, "projects", signer);
  const address = await signer.getAddress();
  const bundleSha = normalizeHex(argv.bundleSha as string);
  const tx = await projects.createProject([address, argv.name, argv.email, argv.bundleUrl, bundleSha]);
  console.log(`Transaction ${tx.hash}...`);
  const receipt = await tx.wait();
  const events = await decodeEvent(receipt, projects, "ProjectCreated");
  console.log(events);
  console.log("OK");
};
