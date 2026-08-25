#!/usr/bin/env bun
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
/** Fail closed when portal consumers bypass the shared color-token system. */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  countPortalStyleRawColors,
  findPortalConsumerRawColors,
  PORTAL_STYLE_RAW_COLOR_MAX,
} from '../lib/portal/raw-color-policy.ts';

export async function main(): Promise<void> {
  const violations = await findPortalConsumerRawColors();
  const legacyCount = await countPortalStyleRawColors();
  if (violations.length === 0 && legacyCount <= PORTAL_STYLE_RAW_COLOR_MAX) {
    console.log(
      `OK portal consumers use shared color tokens; stylesheet legacy colors ${legacyCount}/${PORTAL_STYLE_RAW_COLOR_MAX}`
    );
    return;
  }

  console.error('Raw color literals are not allowed in portal consumers:');
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line} ${violation.literal}`);
  }
  if (legacyCount > PORTAL_STYLE_RAW_COLOR_MAX) {
    console.error(
      `public/portal/style.css has ${legacyCount} raw color literals; maximum is ${PORTAL_STYLE_RAW_COLOR_MAX}`
    );
  }
  process.exit(1);
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
