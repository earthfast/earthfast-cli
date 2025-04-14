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
