import { sha256File } from "./checksum";
import { computeCIDv1 } from "./cid";
import { NodeFilesystem } from "./filesystem";

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
  cidTable: { [url: string]: string };
}

function newManifest(): Manifest {
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
    cidTable: {},
    navigationUrls: [
      { positive: true, regex: "^\\/.*$" },
      { positive: false, regex: "^\\/(?:.+\\/)?[^/]*\\.[^/]*$" },
      { positive: false, regex: "^\\/(?:.+\\/)?[^/]*__[^/]*$" },
      { positive: false, regex: "^\\/(?:.+\\/)?[^/]*__[^/]*\\/.*$" },
    ],
    navigationRequestStrategy: "performance",
  };
}

export async function generateManifest(buildDir: string) {
  const manifest = newManifest();
  const fs = new NodeFilesystem(buildDir);

  const files = (await fs.list("/")).filter((val: string) => val != MANIFEST_PATH);

  for (const fPath of files) {
    const canonicalPath = fs.canonical(fPath);
    const hash: string = await sha256File(canonicalPath);
    const cid: string = await computeCIDv1(canonicalPath);

    const url: string = encodeURI(fPath);
    manifest.assetGroups[0].urls.push(url);
    manifest.hashTable[url] = hash;
    manifest.cidTable[url] = cid;
  }

  fs.write(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
  return fs.canonical(MANIFEST_FILENAME);
}
