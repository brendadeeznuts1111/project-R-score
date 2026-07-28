#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Bake portal chrome catalog → public/registry/portal-chrome.json
 *
 *   bun run portal:chrome:bake
 *   bun tools/portal-apply-chrome.ts   # apply nav/footer shells
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  buildPortalChromeCatalog,
  PORTAL_CHROME_REGISTRY_REL,
} from '../lib/portal/chrome-catalog.ts';
import { buildPortalWeavePayload } from '../lib/http/portal-weave.ts';

const root = joinPath(import.meta.dir, '..');
const catalog = buildPortalChromeCatalog();
const out = joinPath(root, PORTAL_CHROME_REGISTRY_REL);
await Bun.write(out, JSON.stringify(catalog, null, 2) + '\n');

// Keep weave in sync with surfaces + monorepo-health artifact
const weave = buildPortalWeavePayload();
await Bun.write(
  joinPath(root, 'public/registry/portal-weave.json'),
  JSON.stringify(weave, null, 2) + '\n'
);

console.info(
  `[portal-chrome] bake → /registry/portal-chrome.json · priority ${catalog.priorityNav.length} · overflow ${catalog.overflowNav.length} · components ${catalog.components.length}`
);
