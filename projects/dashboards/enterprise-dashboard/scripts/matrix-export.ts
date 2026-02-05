#!/usr/bin/env bun
/**
 * Compressed matrix report export (Bun.gzipSync) and load (Bun.gunzipSync).
 */

import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

export interface MatrixReportRow {
  pattern: string;
  opsPerSec?: number;
  colorTier?: string;
  riskScore?: number;
  [k: string]: unknown;
}

export function exportCompressedReport(
  results: MatrixReportRow[],
  outDir?: string,
): string {
  const json = JSON.stringify(results, null, 2);
  const compressed = Bun.gzipSync(
    new TextEncoder().encode(json),
    { level: 9, memLevel: 9 },
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = outDir ?? ROOT;
  const filename = `matrix-report-${timestamp}.json.gz`;
  const path = join(dir, filename);

  Bun.write(path, compressed);

  const ratio = ((compressed.length / json.length) * 100).toFixed(1);
  console.log(`📦 Exported ${results.length} rows to ${path}`);
  console.log(`   Original: ${json.length} bytes, Compressed: ${compressed.length} bytes`);
  console.log(`   Ratio: ${ratio}%`);

  return path;
}

export async function loadCompressedReport(path: string): Promise<MatrixReportRow[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${path}`);
  }
  const buf = await file.arrayBuffer();
  const decompressed = Bun.gunzipSync(new Uint8Array(buf));
  return JSON.parse(new TextDecoder().decode(decompressed)) as MatrixReportRow[];
}
