import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, normalizeHex } from "../../helpers";

export default class ProjectCreate extends TransactionCommand {
  static summary = "Registers a new project on the Armada Network.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "project create NAME EMAIL [URL SHA]";
  static args = [
    { name: "NAME", description: "The name of the project to create.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle." },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle." },
  ];

  public async run(): Promise<void> {
    const { args } = await this.parse(ProjectCreate);
    if (!!args.URL !== !!args.SHA) {
      this.error("URL and SHA must be specified together");
    }

    const signer = await getSigner(args);
    const projects = await getContract(args, "projects", signer);
    const address = await signer.getAddress();
    const bundleSha = normalizeHex(args.SHA);
    const tx = await projects.createProject([address, args.NAME, args.EMAIL, args.URL, bundleSha]);
    console.log(`Transaction ${tx.hash}...`);
    const receipt = await tx.wait();
    const events = await decodeEvent(receipt, projects, "ProjectCreated");
    console.log(events);
    console.log("OK");
  }
}
