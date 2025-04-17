/* ipfsFolderHash.ts */
import { promises as fs } from "fs";
import path from "path";
import { encode, prepare } from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

// Define our own type for a DAG-PB Link
export interface PBLink {
  Name: string;
  Tsize: number;
  Hash: CID;
}

// Helper: create a DAG-PB node from a UnixFS node and an array of links.
async function createDagNode(unixFs: UnixFS, links: PBLink[]): Promise<{ cid: CID; size: number; buf: Uint8Array }> {
  // Prepare the DAG-PB node with the UnixFS marshaled data and links list.
  const node = prepare({ Data: unixFs.marshal(), Links: links });
  const buf = encode(node);
  const hash = await sha256.digest(buf);
  // Use CID version 1 and the dag-pb codec code (0x70)
  const cid = CID.create(1, 0x70, hash);
  return { cid, size: buf.length, buf };
}

// Compute the file CID using a UnixFS file node.
export async function computeFileCid(filePath: string): Promise<{ cid: CID; size: number }> {
  const data = await fs.readFile(filePath);
  // Create a UnixFS file node with file type and data.
  const fileUnixFs = new UnixFS({ type: "file", data });
  // For a leaf node, there are no links.
  const links: PBLink[] = [];
  return createDagNode(fileUnixFs, links);
}

// Compute the directory CID recursively using a UnixFS directory node.
export async function computeDirCid(dirPath: string): Promise<{ cid: CID; size: number }> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const links: PBLink[] = [];

  // Process each directory entry.
  for (const entry of entries) {
    // Optionally skip hidden files or specific files (like a manifest)
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);
    let childInfo: { cid: CID; size: number };
    if (entry.isDirectory()) {
      childInfo = await computeDirCid(fullPath);
    } else if (entry.isFile()) {
      childInfo = await computeFileCid(fullPath);
    } else {
      // Skip non-file, non-directory entries (or add additional handling)
      continue;
    }
    // Create a link for this entry
    links.push({
      Name: entry.name,
      Tsize: childInfo.size,
      Hash: childInfo.cid,
    });
  }

  // Sort links by name to ensure deterministic ordering.
  links.sort((a, b) => a.Name.localeCompare(b.Name));

  // Create the UnixFS node for a directory.
  const dirUnixFs = new UnixFS({ type: "directory" });
  return createDagNode(dirUnixFs, links);
}
