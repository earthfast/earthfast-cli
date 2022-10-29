import { Arguments, Argv } from "yargs";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export const command = ["project-content <project-id> <bundle-url> <bundle-sha>", "publish"];
export const desc = "Publish content on the network";

export const builder = function (argv: Argv) {
  return argv
    .positional("project-id", {
      describe: "The ID of the project",
      type: "string",
    })
    .positional("bundle-url", {
      describe: "The public URL to fetch the bundle",
      type: "string",
    })
    .positional("bundle-sha", {
      describe: "The SHA-256 checksum of the bundle",
      type: "string",
    });
};

export const handler = async function (args: Arguments) {
  if ((args.bundleUrl != "") !== (args.bundleSha != "")) {
    console.error("Error: bundleUrl and bundleSha must be specified together");
    process.exit(1);
  }
  const signer = await getSigner(args);
  const projects = await getContract(args, "projects", signer);
  const projectId = normalizeHex(args.projectId as string);
  const bundleSha = normalizeHex(args.bundleSha as string);
  const tx = await projects.setProjectContent(projectId, args.bundleUrl, bundleSha);
  console.log(`Transaction ${tx.hash}...`);
  const receipt = await tx.wait();
  const events = await decodeEvent(receipt, projects, "ProjectContentChanged");
  console.log(events);
  console.log("OK");
};
