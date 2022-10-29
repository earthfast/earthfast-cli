import { createHash } from "crypto";
import { createReadStream, PathLike } from "fs";

export async function sha256File(path: string): Promise<string> {
  return hashFile("sha256", path);
}

async function hashFile(algorithm: string, path: PathLike): Promise<string> {
  const hash = createHash(algorithm);
  hash.setEncoding("hex");

  return new Promise((resolve, reject) => {
    const fd = createReadStream(path);
    fd.on("end", () => {
      hash.end();
      resolve(hash.read());
    });
    fd.on("error", reject);
    fd.pipe(hash);
  });
}
