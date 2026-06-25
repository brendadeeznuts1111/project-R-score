import { mkdtempSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function bunExe(): string {
  return process.execPath;
}

export function tempDirWithFiles(prefix: string, files: Record<string, string>): string {
  const path = realpathSync(mkdtempSync(join(tmpdir(), `${prefix}-`)));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(path, name), content, "utf-8");
  }
  return path;
}
