import { Arguments, Argv } from "yargs";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export const command = "project-create <name> <email> [bundle-url] [bundle-sha]";
export const desc = "Register a new project";

export const builder = function (argv: Argv) {
  return argv
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

export const handler = async function (args: Arguments) {
  if ((args.bundleUrl != "") !== (args.bundleSha != "")) {
    console.error("Error: bundleUrl and bundleSha must be specified together");
    process.exit(1);
  }
  const signer = await getSigner(args);
  const projects = await getContract(args, "projects", signer);
  const address = await signer.getAddress();
  const bundleSha = normalizeHex(args.bundleSha as string);
  const tx = await projects.createProject([address, args.name, args.email, args.bundleUrl, bundleSha]);
  console.log(`Transaction ${tx.hash}...`);
  const receipt = await tx.wait();
  const events = await decodeEvent(receipt, projects, "ProjectCreated");
  console.log(events);
  console.log("OK");
};
