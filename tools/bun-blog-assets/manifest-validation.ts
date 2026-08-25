import {
  BUN_14_MARKDOWN_URL,
  BUN_14_PUBLISHED_AT,
  BUN_14_SOURCE_URL,
  EXPECTED_ASSET_COUNT,
  MANIFEST_SCHEMA_VERSION,
} from './constants.ts';
import { fail, parseRecord } from './errors.ts';
import type { AssetManifest } from './types.ts';

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isSvgRecord(asset: Record<string, unknown>): boolean {
  if (typeof asset.path === 'string' && asset.path.toLowerCase().endsWith('.svg')) return true;
  if (typeof asset.sourceUrl !== 'string') return false;
  try {
    return new URL(asset.sourceUrl).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return false;
  }
}

export function parseManifestShape(manifest: unknown, label: string): AssetManifest {
  const record = parseRecord(manifest);
  if (!record) fail(`${label}: expected a JSON object`);
  if (record.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    fail(`${label}: schemaVersion must be ${MANIFEST_SCHEMA_VERSION}`);
  }
  if (record.release !== 'Bun 1.4' || record.version !== '1.4.0') {
    fail(`${label}: release/version must be Bun 1.4 / 1.4.0`);
  }
  if (record.sourcePage !== BUN_14_SOURCE_URL || record.sourceMarkdown !== BUN_14_MARKDOWN_URL) {
    fail(`${label}: source URLs must point to the official Bun 1.4 page`);
  }
  if (record.publishedAt !== BUN_14_PUBLISHED_AT) {
    fail(`${label}: publishedAt must match the official Bun RSS publication time`);
  }
  if (!isIsoTimestamp(record.generatedAt)) fail(`${label}: generatedAt is not ISO-8601`);
  if (record.rightsStatus !== 'pending' && record.rightsStatus !== 'approved') {
    fail(`${label}: rightsStatus must be pending or approved`);
  }
  if (!Array.isArray(record.assets) || record.assets.length !== EXPECTED_ASSET_COUNT) {
    fail(`${label}: assets must contain exactly ${EXPECTED_ASSET_COUNT} records`);
  }
  const assets = record.assets as unknown[];
  const counts = parseRecord(record.counts);
  if (
    !counts ||
    counts.total !== EXPECTED_ASSET_COUNT ||
    counts.image !== 21 ||
    counts.video !== 4 ||
    counts.embed !== 1
  ) {
    fail(`${label}: counts must be total=26, image=21, video=4, embed=1`);
  }
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const [index, value] of assets.entries()) {
    const asset = parseRecord(value);
    if (!asset) fail(`${label}: assets[${index}] is not an object`);
    for (const field of ['id', 'kind', 'sourceUrl', 'publicUrl', 'mimeType', 'metadataSource']) {
      if (typeof asset[field] !== 'string' && asset[field] !== null) {
        fail(`${label}: assets[${index}].${field} must be a string or null`);
      }
    }
    if (typeof asset.id !== 'string' || ids.has(asset.id)) fail(`${label}: duplicate asset id`);
    if (typeof asset.sourceUrl !== 'string' || urls.has(asset.sourceUrl)) {
      fail(`${label}: duplicate or missing sourceUrl at assets[${index}]`);
    }
    ids.add(asset.id);
    urls.add(asset.sourceUrl);
    if (!['image', 'video', 'embed'].includes(String(asset.kind))) {
      fail(`${label}: invalid kind at assets[${index}]`);
    }
    if (typeof asset.width !== 'number' && asset.width !== null) {
      fail(`${label}: invalid width at assets[${index}]`);
    }
    if (typeof asset.height !== 'number' && asset.height !== null) {
      fail(`${label}: invalid height at assets[${index}]`);
    }
    if (typeof asset.byteSize !== 'number' && asset.byteSize !== null) {
      fail(`${label}: invalid byteSize at assets[${index}]`);
    }
    if (
      asset.sha256 !== null &&
      (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256))
    ) {
      fail(`${label}: invalid sha256 at assets[${index}]`);
    }
    if (record.rightsStatus === 'pending' && asset.localUrl !== null) {
      fail(`${label}: pending rights cannot contain localUrl (${asset.id})`);
    }
    if (record.rightsStatus === 'pending' && asset.publicUrl !== asset.sourceUrl) {
      fail(`${label}: pending rights must use source publicUrl (${asset.id})`);
    }
    if (isSvgRecord(asset)) {
      if (
        asset.kind !== 'image' ||
        asset.mimeType !== 'image/svg+xml' ||
        asset.format !== 'svg' ||
        asset.metadataSource !== 'remote-bytes'
      ) {
        fail(`${label}: SVG ${asset.id} requires the explicit remote-byte SVG metadata path`);
      }
      if (
        !Number.isSafeInteger(asset.byteSize) ||
        !(Number(asset.byteSize) > 0) ||
        typeof asset.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(asset.sha256) ||
        typeof asset.width !== 'number' ||
        !Number.isFinite(asset.width) ||
        asset.width <= 0 ||
        typeof asset.height !== 'number' ||
        !Number.isFinite(asset.height) ||
        asset.height <= 0
      ) {
        fail(`${label}: SVG ${asset.id} requires dimensions, byte size, and SHA-256`);
      }
    }
  }
  return manifest as AssetManifest;
}

export function compareManifestToInspection(expected: AssetManifest, actual: AssetManifest): void {
  if (expected.assets.length !== actual.assets.length) fail('manifest asset count changed');
  const actualById = new Map(actual.assets.map(asset => [asset.id, asset]));
  for (const expectedAsset of expected.assets) {
    const actualAsset = actualById.get(expectedAsset.id);
    if (!actualAsset) fail(`manifest is missing discovered asset ${expectedAsset.id}`);
    for (const field of [
      'kind',
      'sourceUrl',
      'mimeType',
      'byteSize',
      'sha256',
      'width',
      'height',
      'posterId',
    ] as const) {
      if (expectedAsset[field] !== actualAsset[field]) {
        fail(
          `manifest drift for ${expectedAsset.id}: ${field} ` +
            `${JSON.stringify(expectedAsset[field])} !== ${JSON.stringify(actualAsset[field])}`
        );
      }
    }
  }
  if (expected.publishedAt !== actual.publishedAt) fail('manifest publication time changed');
}
