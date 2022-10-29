import yargs, { Arguments } from "yargs";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export const command = ["project-content <project-id> <bundle-url> <bundle-sha>", "publish"];
export const desc = "Publish content on the network";

export const builder = function (yargs: yargs.Argv) {
  return yargs
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

export const handler = async function (argv: Arguments) {
  const signer = await getSigner(argv);
  const projects = await getContract(argv, "projects", signer);
  const projectId = normalizeHex(argv.projectId as string);
  const bundleSha = normalizeHex(argv.bundleSha as string);
  const tx = await projects.setProjectContent(projectId, argv.bundleUrl, bundleSha);
  console.log(`Transaction ${tx.hash}...`);
  const receipt = await tx.wait();
  const events = await decodeEvent(receipt, projects, "ProjectContentChanged");
  console.log(events);
  console.log("OK");
};
