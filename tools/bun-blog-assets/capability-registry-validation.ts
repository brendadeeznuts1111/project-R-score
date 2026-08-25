import { validateCapability } from './capability-validation.ts';
import {
  BUN_14_BREAKING_CHANGES_URL,
  BUN_14_PUBLISHED_AT,
  BUN_14_SOURCE_URL,
  BUN_14_UPGRADE_GUIDE_URL,
  CAPABILITY_SCHEMA_VERSION,
} from './constants.ts';
import { fail, parseRecord } from './errors.ts';
import { parseReleaseChapters } from './release-chapters.ts';
import type { AssetManifest, Bun14Capability, Bun14CapabilityRegistry } from './types.ts';

export function parseCapabilityRegistry(
  value: unknown,
  manifest: AssetManifest,
  label: string
): Bun14CapabilityRegistry {
  const record = parseRecord(value);
  if (!record) fail(`${label}: expected a JSON object`);
  if (record.schemaVersion !== CAPABILITY_SCHEMA_VERSION) {
    fail(`${label}: schemaVersion must be ${CAPABILITY_SCHEMA_VERSION}`);
  }
  if (
    record.release !== 'Bun 1.4' ||
    record.version !== '1.4.0' ||
    record.sourcePage !== BUN_14_SOURCE_URL ||
    record.publishedAt !== BUN_14_PUBLISHED_AT ||
    record.relationModel !== 'capability-references-assets'
  ) {
    fail(`${label}: release identity or relation model is invalid`);
  }
  const migration = parseRecord(record.migration);
  if (
    !migration ||
    migration.breakingChangesUrl !== BUN_14_BREAKING_CHANGES_URL ||
    migration.upgradeGuideUrl !== BUN_14_UPGRADE_GUIDE_URL ||
    migration.reconciledTag !== 'bun-v1.4.0' ||
    migration.underConsiderationShipped !== false
  ) {
    fail(`${label}: Bun 1.4 migration sources or shipped-state boundary is invalid`);
  }
  if (record.generatedAt !== manifest.generatedAt) {
    fail(`${label}: generatedAt must match the asset manifest`);
  }
  if (!Array.isArray(record.capabilities) || !record.capabilities.length) {
    fail(`${label}: capabilities must be a non-empty array`);
  }
  const chapters = parseReleaseChapters(record.chapters, label);
  const chapterIds = new Set(chapters.map(chapter => chapter.id));
  const assetIds = new Set(manifest.assets.map(asset => asset.id));
  const seenIds = new Set<string>();
  const linkedAssets = new Set<string>();
  for (const item of record.capabilities as Bun14Capability[]) {
    validateCapability(item, assetIds, seenIds, chapterIds);
    item.assetIds.forEach(id => linkedAssets.add(id));
  }
  for (const chapterId of chapterIds) {
    if (!(record.capabilities as Bun14Capability[]).some(item => item.chapterId === chapterId)) {
      fail(`${label}: chapter ${chapterId} has no capability relations`);
    }
  }
  for (const assetId of assetIds) {
    if (!linkedAssets.has(assetId)) fail(`${label}: asset ${assetId} has no capability relation`);
  }
  return value as Bun14CapabilityRegistry;
}
