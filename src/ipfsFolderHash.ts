/* ipfsFolderHash.ts */
import { promises as fs } from "fs";
import path from "path";
import * as dagPB from "@ipld/dag-pb";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { UnixFS } from "ipfs-unixfs";

// Helper: create a DAG-PB node from a UnixFS node and links.
async function createDagNode(unixFs: UnixFS, links: dagPB.Link[]): Promise<{ cid: CID; size: number; buf: Uint8Array }> {
  // Create the DAG-PB Node with the UnixFS marshaled data and array of links.
  const node = dagPB.create({ Data: unixFs.marshal(), Links: links });
  const buf = dagPB.encode(node);
  const hash = await sha256.digest(buf);
  // Use CID version 1 and the dag-pb codec (0x70)
  const cid = CID.create(1, dagPB.code, hash);
  // The "tsize" is typically defined as the block's size plus the sizes of the linked blocks.
  // Here we simply use our block size.
  return { cid, size: buf.length, buf };
}

// Compute the file CID using a UnixFS file node.
export async function computeFileCid(filePath: string): Promise<{ cid: CID; size: number }> {
  const data = await fs.readFile(filePath);
  // Create a UnixFS file node.
  const fileUnixFs = new UnixFS({ type: "file", data });
  // There are no links on a leaf file.
  const links: dagPB.Link[] = [];
  return createDagNode(fileUnixFs, links);
}

// Compute the directory CID recursively using a UnixFS directory node.
export async function computeDirCid(dirPath: string): Promise<{ cid: CID; size: number }> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  // For each entry, compute its CID.
  const links = [];

  // Process each directory entry.
  for (const entry of entries) {
    // Skip hidden files or any file you want to exclude (such as a manifest)
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);
    let childInfo: { cid: CID; size: number };
    if (entry.isDirectory()) {
      childInfo = await computeDirCid(fullPath);
    } else if (entry.isFile()) {
      childInfo = await computeFileCid(fullPath);
    } else {
      // Ignore symlinks etc., or you can add logic to follow them.
      continue;
    }
    // Each link in DAG-PB carries a name, the CID, and the cumulative size of the linked object.
    links.push({
      Name: entry.name,
      Tsize: childInfo.size,
      Hash: childInfo.cid,
    });
  }

  // Sort links by name (this is important so that the computed hash is deterministic).
  links.sort((a, b) => a.Name.localeCompare(b.Name));

  // Create a UnixFS directory node.
  const dirUnixFs = new UnixFS({ type: "directory" });
  const { cid, size } = await createDagNode(dirUnixFs, links);
  return { cid, size };
}
