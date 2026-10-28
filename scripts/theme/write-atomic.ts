import { rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Atomic write: write to temp then rename.
export async function writeAtomic(path: string, content: string): Promise<void> {
  const tmp = join(tmpdir(), `theme-${Date.now()}.tmp`);
  await Bun.write(tmp, content);
  await rename(tmp, path);
}