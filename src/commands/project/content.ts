import { CliUx } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { decodeEvent, getContract, getSigner, getTxUrl, normalizeHash, normalizeRecord } from "../../helpers";

export default class ProjectContent extends TransactionCommand {
  static description = "Publishes the provided bundle on the network.";
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

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectContent);
    if (args.URL === undefined || args.SHA === undefined) {
      this.error("URL and SHA must be specified");
    }

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer);
    const projects = await getContract(flags.network, flags.abi, "ArmadaProjects", signer);
    const projectId = normalizeHash(args.ID);
    const bundleSha = normalizeHash(args.SHA);
    CliUx.ux.action.start("- Submitting transaction");
    const tx = await projects.setProjectContent(projectId, args.URL, bundleSha);
    CliUx.ux.action.stop("done");
    console.log(`> ${getTxUrl(tx)}`);
    CliUx.ux.action.start("- Processing transaction");
    const receipt = await tx.wait();
    CliUx.ux.action.stop("done");
    const event = await decodeEvent(receipt, projects, "ProjectContentChanged");
    console.log(normalizeRecord(event));
  }
}
