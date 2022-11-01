import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export default class ProjectContent extends TransactionCommand {
  static summary = "Publishes the provided bundle on the network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %> ID URL SHA";
  static aliases = ["project:content", "project:publish"];
  static args = [
    { name: "ID", description: "The ID of the project to publish to.", required: true },
    { name: "URL", description: "The public URL to fetch the bundle.", required: true },
    { name: "SHA", description: "The SHA-256 checksum of the bundle.", required: true },
  ];

  public async run(): Promise<void> {
    const { args } = await this.parse(ProjectContent);
    const signer = await getSigner(args);
    const projects = await getContract(args, "projects", signer);
    const projectId = normalizeHex(args.ID);
    const bundleSha = normalizeHex(args.SHA);
    const tx = await projects.setProjectContent(projectId, args.URL, bundleSha);
    console.log(`Transaction ${tx.hash}...`);
    const receipt = await tx.wait();
    const events = await decodeEvent(receipt, projects, "ProjectContentChanged");
    console.log(events);
    console.log("OK");
  }
}
