// Adapted from https://github.com/angular/angular/blob/59aa2c06d1bee5c671a4c0ba3a2d98f0cc8bffd6/packages/service-worker/cli/filesystem.ts
// @ts-nocheck

import * as fs from "fs";
import * as path from "path";

export class NodeFilesystem {
  constructor(base: any) {
    this.base = base;
  }

  async list(_path: string) {
    const dir = this.canonical(_path);
    const entries = fs.readdirSync(dir).map((entry) => ({ entry, stats: fs.statSync(path.join(dir, entry)) }));
    const files = entries
      .filter((entry) => !entry.stats.isDirectory())
      .map((entry) => path.posix.join(_path, entry.entry));

    return entries
      .filter((entry) => entry.stats.isDirectory())
      .map((entry) => path.posix.join(_path, entry.entry))
      .reduce(
        async (list: string, subdir: string) => (await list).concat(await this.list(subdir)),
        Promise.resolve(files)
      );
  }

  async read(_path) {
    const file = this.canonical(_path);
    return fs.readFileSync(file).toString();
  }

  async write(_path, contents) {
    const file = this.canonical(_path);
    fs.writeFileSync(file, contents);
  }

  canonical(_path) {
    return path.posix.join(this.base, _path);
  }
}
