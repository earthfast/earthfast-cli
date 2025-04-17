import path from "path";
import { Command, Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { sha256File } from "../../checksum";
import { computeDirCid } from "../../ipfsFolderHash";

export default class BundleChecksum extends Command {
  static summary = "Print the checksum of the provided file or directory using the specified hash function.";
  static examples = [
    "<%= config.bin %> <%= command.id %> my-site-v1.0.0.tgz",
    "<%= config.bin %> <%= command.id %> ./dist --hash-function=ipfs-cid-v1",
  ];
  static usage = "<FILE|DIR>";
  static args: Arg[] = [
    {
      name: "target",
      description: "The file (for sha256) or directory (for ipfs-cid-v1) to checksum.",
      required: true,
    },
  ];
  static flags = {
    "hash-function": Flags.string({
      char: "h",
      description: "Hash function to use (sha256 for file checksum, ipfs-cid-v1 for directory CID)",
      default: "sha256",
      options: ["sha256", "ipfs-cid-v1"],
    }),
    json: Flags.boolean({
      description: "Output in JSON format.",
      allowNo: false,
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(BundleChecksum);
    const hashFunction = flags["hash-function"];

    let checksum: string;

    if (hashFunction === "ipfs-cid-v1") {
      // When using ipfs-cid-v1, the target is expected to be a folder.
      // computeDirCid will recursively process the folder and generate an IPFS-compatible CID.
      const targetPath = path.resolve(args.target);
      const { cid } = await computeDirCid(targetPath);
      checksum = cid.toString();
    } else {
      // Otherwise, assume a file and compute its SHA256 checksum.
      checksum = await sha256File(args.target);
    }

    this.log(checksum);
    return checksum;
  }
}
