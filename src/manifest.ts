import { NodeFilesystem } from "./filesystem";
import { hashRegistry } from "./hash-registry";

const MANIFEST_FILENAME = "earthfast.json";
const MANIFEST_PATH = "/" + MANIFEST_FILENAME;

interface AssetGroupConfig {
  name: string;
  installMode: "prefetch" | "lazy";
  updateMode: "prefetch" | "lazy";
  urls: string[];
  patterns: string[];
  cacheQueryOptions?: CacheQueryOptions;
}

interface DataGroupConfig {
  name: string;
  version: number;
  strategy: "freshness" | "performance";
  patterns: string[];
  maxSize: number;
  maxAge: number;
  timeoutMs?: number;
  refreshAheadMs?: number;
  cacheOpaqueResponses?: boolean;
  cacheQueryOptions?: CacheQueryOptions;
}

interface Manifest {
  configVersion: number;
  timestamp: number;
  appData?: { [key: string]: string };
  index: string;
  assetGroups: AssetGroupConfig[];
  dataGroups?: DataGroupConfig[];
  navigationUrls: { positive: boolean; regex: string }[];
  navigationRequestStrategy: "freshness" | "performance";
  hashTable: { [url: string]: string };
  hashFunction: string; // e.g., "sha256", "ipfs-cid-v1"
}

function newManifest(hashFunction = "sha256"): Manifest {
  return {
    configVersion: 1,
    timestamp: Date.now(),
    index: "/index.html",
    assetGroups: [
      {
        name: "main",
        installMode: "lazy",
        updateMode: "lazy",
        cacheQueryOptions: { ignoreVary: true },
        urls: [],
        patterns: [],
      },
    ],
    dataGroups: [],
    hashTable: {},
    hashFunction,
    navigationUrls: [
      { positive: true, regex: "^\\/.*$" },
      { positive: false, regex: "^\\/(?:.+\\/)?[^/]*\\.[^/]*$" },
      { positive: false, regex: "^\\/(?:.+\\/)?[^/]*__[^/]*$" },
      { positive: false, regex: "^\\/(?:.+\\/)?[^/]*__[^/]*\\/.*$" },
    ],
    navigationRequestStrategy: "performance",
  };
}

export async function generateManifest(buildDir: string, hashFunction = "sha256"): Promise<string> {
  // Create a manifest with the specified hash function
  const manifest = newManifest(hashFunction);
  const fs = new NodeFilesystem(buildDir);

  // Get the hash function from the registry
  const hashFn = hashRegistry.get(hashFunction);
  if (!hashFn) {
    throw new Error(`Hash function "${hashFunction}" not found`);
  }

  const files = (await fs.list("/")).filter((val: string) => val != MANIFEST_PATH);

  // Compute hashes for all files
  for (const fPath of files) {
    const canonicalPath = fs.canonical(fPath);
    const url: string = encodeURI(fPath);

    // Compute hash using the specified function
    const hash = await hashFn.compute(canonicalPath);
    manifest.hashTable[url] = hash;

    manifest.assetGroups[0].urls.push(url);
  }

  fs.write(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
  return fs.canonical(MANIFEST_FILENAME);
}
