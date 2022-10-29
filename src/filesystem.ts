// Adapted from https://github.com/angular/angular/blob/59aa2c06d1bee5c671a4c0ba3a2d98f0cc8bffd6/packages/service-worker/cli/filesystem.ts

import * as fs from "fs";
import * as path from "path";

export class NodeFilesystem {
  constructor(readonly base: string) {}

  async list(path_: string): Promise<string[]> {
    const dir = this.canonical(path_);
    const entries = fs.readdirSync(dir).map((entry) => ({ entry, stats: fs.statSync(path.join(dir, entry)) }));
    const files = entries
      .filter((entry) => !entry.stats.isDirectory())
      .map((entry) => path.posix.join(path_, entry.entry));

    return entries
      .filter((entry) => entry.stats.isDirectory())
      .map((entry) => path.posix.join(path_, entry.entry))
      .reduce(
        async (list: Promise<string[]>, subdir: string) => (await list).concat(await this.list(subdir)),
        Promise.resolve(files)
      );
  }

  read(path_: string): string {
    const file = this.canonical(path_);
    return fs.readFileSync(file).toString();
  }

  write(path_: string, contents: string): void {
    const file = this.canonical(path_);
    fs.writeFileSync(file, contents);
  }

  canonical(path_: string): string {
    return path.posix.join(this.base, path_);
  }
}
