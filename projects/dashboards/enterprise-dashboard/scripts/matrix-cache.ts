#!/usr/bin/env bun
/**
 * Zstd-backed matrix analysis cache (Bun.zstdCompressSync / zstdDecompressSync).
 */

import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CACHE_DIR = join(ROOT, ".matrix-cache");

export type CachedMatrixResult = Record<string, unknown>[];

export async function cacheAnalysisResults(
  pattern: string,
  results: CachedMatrixResult,
): Promise<string> {
  const hash = Bun.hash.crc32(pattern).toString(16);
  const path = join(CACHE_DIR, `${hash}.zst`);

  const json = JSON.stringify(results);
  const compressed = Bun.zstdCompressSync(Buffer.from(json, "utf8"), { level: 3 });

  await Bun.write(path, compressed);
  return path;
}

export async function loadCachedResults(pattern: string): Promise<CachedMatrixResult | null> {
  const hash = Bun.hash.crc32(pattern).toString(16);
  const path = join(CACHE_DIR, `${hash}.zst`);

  const file = Bun.file(path);
  if (!(await file.exists())) return null;

  const buf = await file.arrayBuffer();
  const decompressed = Bun.zstdDecompressSync(new Uint8Array(buf));
  return JSON.parse(new TextDecoder().decode(decompressed)) as CachedMatrixResult;
}
