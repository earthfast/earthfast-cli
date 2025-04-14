import { sha256File, computeCIDv1 } from "./checksum";

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

  // List all available hash functions
  listAvailable(): string[] {
    return Array.from(this.hashFunctions.keys());
  }
}

// Singleton instance
export const hashRegistry = new HashRegistry();
