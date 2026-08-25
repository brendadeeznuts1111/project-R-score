#!/usr/bin/env bun
/**
 * Discover, verify, and optionally stage the Bun 1.4 blog media inventory.
 *
 *   bun tools/bun-blog-assets.ts
 *   bun tools/bun-blog-assets.ts --check
 *   bun tools/bun-blog-assets.ts --vendor --confirm-rights
 *   bun tools/bun-blog-assets.ts --vendor --confirm-rights --vendor-dir /tmp/bun-1.4
 *   bun tools/bun-blog-assets.ts --help
 */
import { parseCliOptions } from './bun-blog-assets/cli.ts';
import { run } from './bun-blog-assets/run.ts';

export {
  BUN_14_MARKDOWN_URL,
  BUN_14_SOURCE_URL,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_VENDOR_DIR,
  EXPECTED_ASSET_COUNT,
  MANIFEST_SCHEMA_VERSION,
} from './bun-blog-assets/constants.ts';
export type {
  AssetDraft,
  AssetManifest,
  AssetRecord,
  Attribution,
} from './bun-blog-assets/types.ts';
export { run };

if (import.meta.main) {
  try {
    await run(parseCliOptions());
  } catch (error) {
    console.error(error instanceof Error ? error.message : `bun-blog-assets: ${String(error)}`);
    process.exit(1);
  }
}
