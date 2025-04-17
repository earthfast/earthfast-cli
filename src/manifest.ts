import { NodeFilesystem } from "./filesystem";
import { hashRegistry } from "./hash-registry";
import { computeDirCid, computeFileCid } from "./ipfsFolderHash";

const MANIFEST_FILENAME = "earthfast.json";
const MANIFEST_PATH = "/" + MANIFEST_FILENAME;

interface AssetGroupConfig {
  name: string;
  installMode: "prefetch" | "lazy";
  updateMode: "prefetch" | "lazy";
  urls: string[];
  patterns: string[];
  cacheQueryOptions?: any;
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
  cacheQueryOptions?: any;
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
  // When using IPFS style hashing we can store the overall folder CID.
  folderCid?: string;
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

// When using the ipfs-cid-v1 mode, we want to use our ipfsFolderHash functions.
export async function generateManifest(buildDir: string, hashFunction = "sha256"): Promise<string> {
  const manifest = newManifest(hashFunction);
  const fs = new NodeFilesystem(buildDir);

  if (hashFunction === "ipfs-cid-v1") {
    // List files (excluding the manifest file itself)
    const files = (await fs.list("/")).filter((val: string) => val !== MANIFEST_PATH);

    // Compute per-file IPFS CIDs
    for (const fPath of files) {
      const canonicalPath = fs.canonical(fPath);
      // Map the filesystem path to an OS path relative to buildDir.
      // (Adjust this mapping as needed for your NodeFilesystem implementation.)
      const fullPath = buildDir + canonicalPath;
      const { cid } = await computeFileCid(fullPath);
      const url: string = encodeURI(fPath);
      manifest.hashTable[url] = cid.toString();
      manifest.assetGroups[0].urls.push(url);
    }

    // Optionally, compute the overall directory CID so that it matches ipfs add of the folder.
    const { cid: dirCid } = await computeDirCid(buildDir);
    manifest.folderCid = dirCid.toString();
  } else {
    // Otherwise, use the hash function from the hashRegistry as before.
    const hashFn = hashRegistry.get(hashFunction);
    if (!hashFn) {
      throw new Error(`Hash function "${hashFunction}" not found`);
    }
    // List files—excluding the manifest file itself
    const files = (await fs.list("/")).filter((val: string) => val !== MANIFEST_PATH);
    for (const fPath of files) {
      const canonicalPath = fs.canonical(fPath);
      const url: string = encodeURI(fPath);
      const hash = await hashFn.compute(canonicalPath);
      manifest.hashTable[url] = hash;
      manifest.assetGroups[0].urls.push(url);
    }
  }

  fs.write(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
  return fs.canonical(MANIFEST_FILENAME);
}
