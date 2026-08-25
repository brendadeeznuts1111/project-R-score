// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
import {
  BUN_14_BREAKING_CHANGES_URL,
  BUN_14_PUBLISHED_AT,
  BUN_14_SOURCE_URL,
  BUN_14_UPGRADE_GUIDE_URL,
  CAPABILITY_SCHEMA_VERSION,
  DEFAULT_CAPABILITIES_PATH,
} from './constants.ts';
import { BUN_14_RUNTIME_CAPABILITIES } from './capability-catalog-runtime.ts';
import { BUN_14_NETWORK_CAPABILITIES } from './capability-catalog-network.ts';
import { BUN_14_TOOLING_CAPABILITIES } from './capability-catalog-tooling.ts';
import { BUN_14_CLAIM_CAPABILITIES } from './capability-catalog-claims.ts';
import { BUN_14_BUILTIN_CAPABILITIES } from './capability-catalog-builtins.ts';
import { BUN_14_BUILTIN_WEB_CAPABILITIES } from './capability-catalog-builtins-web.ts';
import { BUN_14_DEV_NETWORK_CAPABILITIES } from './capability-catalog-dev-network.ts';
import { parseCapabilityRegistry } from './capability-registry-validation.ts';
import { attachReleaseChapters, BUN_14_RELEASE_CHAPTERS } from './release-chapters.ts';
import { fail } from './errors.ts';
import { atomicWriteJson } from './storage.ts';
import type { AssetManifest, Bun14Capability, Bun14CapabilityRegistry } from './types.ts';

export { parseCapabilityRegistry } from './capability-registry-validation.ts';

export function buildBun14CapabilityRegistry(manifest: AssetManifest): Bun14CapabilityRegistry {
  const registry: Bun14CapabilityRegistry = {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    release: 'Bun 1.4',
    version: '1.4.0',
    sourcePage: BUN_14_SOURCE_URL,
    publishedAt: BUN_14_PUBLISHED_AT,
    generatedAt: manifest.generatedAt,
    relationModel: 'capability-references-assets',
    migration: {
      breakingChangesUrl: BUN_14_BREAKING_CHANGES_URL,
      upgradeGuideUrl: BUN_14_UPGRADE_GUIDE_URL,
      reconciledTag: 'bun-v1.4.0',
      underConsiderationShipped: false,
    },
    chapters: BUN_14_RELEASE_CHAPTERS,
    capabilities: attachReleaseChapters([
      ...BUN_14_RUNTIME_CAPABILITIES,
      ...BUN_14_NETWORK_CAPABILITIES,
      ...BUN_14_TOOLING_CAPABILITIES,
      ...BUN_14_CLAIM_CAPABILITIES,
      ...BUN_14_DEV_NETWORK_CAPABILITIES,
      ...BUN_14_BUILTIN_CAPABILITIES,
      ...BUN_14_BUILTIN_WEB_CAPABILITIES,
    ]),
  };
  return parseCapabilityRegistry(registry, manifest, 'generated capability registry');
}

export function validateCapabilityAnchors(
  registry: Bun14CapabilityRegistry,
  officialHtml: string
): void {
  const htmlIds = new Set(
    [...officialHtml.matchAll(/\sid=(?:"([^"]+)"|'([^']+)')/g)].map(match => match[1] ?? match[2])
  );
  for (const capability of registry.capabilities) {
    const url = new URL(capability.releaseUrl);
    if (url.origin !== 'https://bun.com' || url.pathname !== '/blog/bun-v1.4') {
      fail(`capability ${capability.id} does not reference the Bun 1.4 release`);
    }
    if (url.hash && !htmlIds.has(decodeURIComponent(url.hash.slice(1)))) {
      fail(`capability ${capability.id} references missing release anchor ${url.hash}`);
    }
  }
  for (const chapter of registry.chapters) {
    const url = new URL(chapter.releaseUrl);
    if (!htmlIds.has(decodeURIComponent(url.hash.slice(1)))) {
      fail(`Bun 1.4 chapter references missing release anchor ${url.hash}`);
    }
  }
}

export async function readCapabilityRegistry(
  manifest: AssetManifest,
  path = DEFAULT_CAPABILITIES_PATH
): Promise<Bun14CapabilityRegistry> {
  try {
    return parseCapabilityRegistry(await Bun.file(path).json(), manifest, path);
  } catch (error) {
    if (error instanceof SyntaxError) fail(`${path}: invalid JSON`);
    throw error;
  }
}

export async function syncBun14CapabilityRegistry(
  registry: Bun14CapabilityRegistry,
  check: boolean,
  path = DEFAULT_CAPABILITIES_PATH
): Promise<void> {
  if (check) {
    const existing = await Bun.file(path).text();
    const expected = `${JSON.stringify(registry, null, 2)}\n`;
    if (existing !== expected) fail(`Bun 1.4 capability registry drift: ${path}`);
    return;
  }
  await atomicWriteJson(path, registry);
}

export function capabilitiesByAsset(
  registry: Bun14CapabilityRegistry
): ReadonlyMap<string, Bun14Capability[]> {
  const result = new Map<string, Bun14Capability[]>();
  for (const capability of registry.capabilities) {
    for (const assetId of capability.assetIds) {
      const related = result.get(assetId) ?? [];
      related.push(capability);
      result.set(assetId, related);
    }
  }
  return result;
}
