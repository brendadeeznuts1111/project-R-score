import { extnamePath as extname } from '../../lib/path-bun';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from './constants.ts';
import { fail } from './errors.ts';
import {
  assertVendorSafeAsset,
  inspectRasterImage,
  inspectSvgDimensions,
  isSvgAsset,
  validateMp4Container,
} from './media-validation.ts';
import { fetchRemoteAssetBytes } from './remote-asset.ts';
import type { AssetDraft, AssetRecord, CliOptions } from './types.ts';
import type { FetchedAsset } from './inspection-types.ts';

function expectedMimeType(asset: AssetDraft): string | null {
  if (asset.kind === 'embed') return null;
  const extension = extname(asset.path ?? '').toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.mp4') return 'video/mp4';
  return null;
}

function normalizedMimeType(value: string | null): string | null {
  return value?.split(';', 1)[0]?.trim().toLowerCase() || null;
}

// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
export function sha256(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(bytes);
  return hasher.digest('hex') as string;
}

function extensionFormat(path: string | undefined): string | null {
  const extension = extname(path ?? '').toLowerCase();
  return extension ? extension.slice(1) : null;
}

export async function inspectRemoteAsset(
  asset: AssetDraft,
  timeoutMs: number,
  mode: CliOptions['mode'] = 'external',
  fetcher: typeof fetch = fetch
): Promise<FetchedAsset> {
  assertVendorSafeAsset(asset, mode);
  if (asset.kind === 'embed') {
    return {
      asset,
      bytes: null,
      mimeType: null,
      byteSize: null,
      sha256: null,
      format: null,
      metadataSource: 'not-fetched',
      rangeProbe: null,
    };
  }
  const fetched = await fetchRemoteAssetBytes(
    asset,
    asset.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
    timeoutMs,
    fetcher
  );
  const { bytes, rangeProbe } = fetched;
  const mimeType = normalizedMimeType(fetched.contentType);
  const expected = expectedMimeType(asset);
  if (expected && mimeType !== expected) {
    fail(`asset ${asset.id} content type ${mimeType ?? 'missing'} does not match ${expected}`);
  }
  let width = asset.width;
  let height = asset.height;
  let format: string | null = extensionFormat(asset.path);
  let metadataSource: AssetRecord['metadataSource'] = 'remote-bytes';
  if (asset.kind === 'image') {
    if (isSvgAsset(asset)) {
      const dimensions = inspectSvgDimensions(asset, bytes);
      if (asset.width !== null && dimensions.width !== null && asset.width !== dimensions.width) {
        fail(`asset ${asset.id} width ${dimensions.width} does not match source ${asset.width}`);
      }
      if (
        asset.height !== null &&
        dimensions.height !== null &&
        asset.height !== dimensions.height
      ) {
        fail(`asset ${asset.id} height ${dimensions.height} does not match source ${asset.height}`);
      }
      width ??= dimensions.width;
      height ??= dimensions.height;
      format = 'svg';
    } else {
      const metadata = await inspectRasterImage(asset, bytes, mimeType);
      if (asset.width !== null && asset.width !== metadata.width) {
        fail(`asset ${asset.id} width ${metadata.width} does not match source ${asset.width}`);
      }
      if (asset.height !== null && asset.height !== metadata.height) {
        fail(`asset ${asset.id} height ${metadata.height} does not match source ${asset.height}`);
      }
      width = metadata.width;
      height = metadata.height;
      format = metadata.format;
    }
    if (!(width && height)) fail(`asset ${asset.id} is missing image dimensions`);
  }
  if (asset.kind === 'video' && (!(width && height) || !asset.posterId)) {
    fail(`video ${asset.id} is missing source dimensions or posterId`);
  }
  if (asset.kind === 'video') {
    validateMp4Container(asset, bytes);
    metadataSource = 'source-attributes';
    format = 'mp4';
  }
  return {
    asset: { ...asset, width, height },
    bytes,
    mimeType,
    byteSize: bytes.byteLength,
    sha256: sha256(bytes),
    format,
    metadataSource,
    rangeProbe,
  };
}

export async function inspectAllAssets(
  assets: AssetDraft[],
  timeoutMs: number,
  mode: CliOptions['mode'] = 'external',
  fetcher: typeof fetch = fetch
): Promise<FetchedAsset[]> {
  for (const asset of assets) assertVendorSafeAsset(asset, mode);
  const inspected: FetchedAsset[] = [];
  for (const asset of assets) {
    inspected.push(await inspectRemoteAsset(asset, timeoutMs, mode, fetcher));
  }
  return inspected;
}
