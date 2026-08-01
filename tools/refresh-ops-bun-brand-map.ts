#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Refresh only the derived Bun-brand slice in an existing ops summary.
 *
 * The full ops snapshot owns every other field and may reseed local fixtures.
 * This focused join is used when bun-brand-map.json is the sole changed input.
 */
import {
  loadBunBrandMapSummarySliceSync,
  toBunBrandMapOpsSlice,
} from '../lib/monitoring/bun-brand-map-slice.ts';

const DEFAULT_PATH = 'public/registry/ops-summary.json';

export async function refreshOpsSummaryBunBrandMap(
  path = DEFAULT_PATH
): Promise<Record<string, unknown>> {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`${path} is missing; run bun run ops:snapshot`);
  const value = (await file.json()) as unknown;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must contain an ops summary object`);
  }
  const payload = value as Record<string, unknown>;
  payload.bunBrandMap = toBunBrandMapOpsSlice(loadBunBrandMapSummarySliceSync());
  await Bun.write(path, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (import.meta.main) {
  const path = process.argv[2] ?? DEFAULT_PATH;
  const payload = await refreshOpsSummaryBunBrandMap(path);
  const slice = payload.bunBrandMap as {
    ok?: boolean;
    warnings?: number;
    errors?: number;
    stale?: boolean;
  };
  console.log(
    `[ops-summary] bun-brand-map → ok=${slice.ok === true} warnings=${slice.warnings ?? 0} errors=${slice.errors ?? 0} stale=${slice.stale === true}`
  );
}
