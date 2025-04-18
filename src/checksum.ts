import { createHash } from "crypto";
import fs from "fs";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

export async function sha256File(path: string): Promise<string> {
  return hashFile("sha256", path);
}

async function hashFile(algorithm: string, path: fs.PathLike): Promise<string> {
  const hash = createHash(algorithm);
  hash.setEncoding("hex");

  return new Promise((resolve, reject) => {
    const fd = fs.createReadStream(path);
    fd.on("end", () => {
      hash.end();
      resolve(hash.read());
    });
    fd.on("error", reject);
    fd.pipe(hash);
  });
}

export async function computeCIDv1(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = await sha256.digest(fileBuffer);
  const cid = CID.create(1, 0x70, hash); // 0x70 is the codec for raw
  return cid.toString();
}

// Interface for hash functions
export interface HashFunction {
  name: string;
  compute: (filePath: string) => Promise<string>;
}

// Registry of available hash functions
class HashRegistry {
  private hashFunctions: Map<string, HashFunction> = new Map();

  constructor() {
    // Register built-in hash functions
    this.register({
      name: "sha256",
      compute: sha256File,
    });

    this.register({
      name: "ipfs-cid-v1",
      compute: computeCIDv1,
    });
  }

  // Register a new hash function
  register(hashFn: HashFunction): void {
    this.hashFunctions.set(hashFn.name, hashFn);
  }

  // Get a hash function by name
  get(name: string): HashFunction | undefined {
    return this.hashFunctions.get(name);
  }
}

// Singleton instance
export const hashRegistry = new HashRegistry();
