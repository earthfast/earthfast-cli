import { Arg } from "@oclif/core/lib/interfaces";
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
      this.error("Must provide both URL and SHA.");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = parseHash(args.ID);
    const bundleSha = parseHash(args.SHA);
    const tx = await projects.populateTransaction.setProjectContent(projectId, args.URL, bundleSha);
    const output = await run(tx, signer, [projects]);
    this.log(pretty(output));
    return output;
  }
}
