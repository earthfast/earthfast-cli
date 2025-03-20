import { Arg } from "@oclif/core/lib/interfaces";
import axios from "axios";
import { TransactionCommand } from "../../base";
import { getContract, getSigner, parseHash, pretty, run } from "../../helpers";

export default class ProjectContent extends TransactionCommand {
  static summary = "Publish the provided bundle on the network.";
  static examples = [
    "<%= config.bin %> <%= command.id %> 0x123abc... https://.../my-site-v1.0.0.tgz 0x456def...",
    "<%= config.bin %> <%= command.id %> 0x123abc... '' '' # Unpublishes the project content",
  ];
  static usage = "<%= command.id %> ID URL SHA";
  static aliases = ["project:content", "project:publish"];
  static args: Arg[] = [
    { name: "ID", description: "The ID of the project to publish to.", required: true },
    { name: "URL", description: "The public URL to fetch the bundle." },
    { name: "SHA", description: "The SHA-256 checksum of the bundle." },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectContent);
    if (args.URL === undefined || args.SHA === undefined) {
      this.error("Must specify both URL and SHA.");
    }

    // Check if the URL exists
    try {
      await axios.get(args.URL);
    } catch (error) {
      this.error(`The URL ${args.URL} does not exist or is not publicly accessible.`);
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);
    const projectId = parseHash(args.ID);
    const bundleSha = parseHash(args.SHA);
    const tx = await projects.populateTransaction.setProjectContent(projectId, args.URL, bundleSha);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
