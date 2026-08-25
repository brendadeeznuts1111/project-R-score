// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @released Bun.Image · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/Image/Format — Bun.Image.Format
// @released Bun.Image.Format · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.Metadata
// @released Bun.Image.Metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
import { extnamePath as extname } from '../../lib/path-bun';
import { MAX_IMAGE_PIXELS, MAX_MP4_FTYP_BYTES } from './constants.ts';
import { fail } from './errors.ts';
import { parseAttributes, sourceDimensions } from './html.ts';
import type { AssetDraft, CliOptions } from './types.ts';

const IMAGE_MIME_BY_FORMAT: Record<Bun.Image.Format, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  avif: 'image/avif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  gif: 'image/gif',
};

export const MAX_SVG_BYTES = 1024 * 1024;

const UNSAFE_SVG_ELEMENT =
  /<\s*(?:a|animate|animatecolor|animatemotion|animatetransform|audio|discard|embed|feimage|foreignobject|handler|iframe|image|object|script|set|style|use|video)\b/i;
const UNSAFE_SVG_ATTRIBUTE = /\s(?:href|on[a-z0-9_.:-]+|style|xlink:href)\s*=/i;
const UNSAFE_SVG_CSS = /(?:@import|url\s*\()/i;

export function isSvgAsset(asset: AssetDraft): boolean {
  if (extname(asset.path ?? '').toLowerCase() === '.svg') return true;
  try {
    return extname(new URL(asset.sourceUrl).pathname).toLowerCase() === '.svg';
  } catch {
    return false;
  }
}

export function assertVendorSafeAsset(asset: AssetDraft, mode: CliOptions['mode']): void {
  if (mode !== 'vendor' || !isSvgAsset(asset)) return;
  if (asset.kind !== 'image') fail(`vendor SVG ${asset.id} must use image kind`);
  const declaredExtension = extname(asset.path ?? '').toLowerCase();
  if (declaredExtension && declaredExtension !== '.svg') {
    fail(`vendor SVG ${asset.id} has conflicting declared path ${asset.path}`);
  }
}

function decodeSvg(asset: AssetDraft, bytes: Uint8Array): string {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SVG_BYTES) {
    fail(`asset ${asset.id} SVG byte size must be 1..${MAX_SVG_BYTES}`);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch (error) {
    fail(`asset ${asset.id} SVG must be valid UTF-8: ${String(error)}`);
  }
}

function assertSvgSafeForBrowser(asset: AssetDraft, text: string): void {
  const declaration = text.match(/^\s*<\?xml\b([^?]*)\?>/i)?.[1];
  const encoding = declaration?.match(/\bencoding\s*=\s*["']([^"']+)["']/i)?.[1];
  if (encoding && !/^(?:utf-8|us-ascii)$/i.test(encoding)) {
    fail(`asset ${asset.id} SVG declares unsupported encoding ${encoding}`);
  }
  if (/<!DOCTYPE\b|<!ENTITY\b/i.test(text)) {
    fail(`asset ${asset.id} SVG must not contain a DTD or entity declaration`);
  }
  if (UNSAFE_SVG_ELEMENT.test(text)) {
    fail(`asset ${asset.id} SVG contains an active or externally addressable element`);
  }
  if (UNSAFE_SVG_ATTRIBUTE.test(text)) {
    fail(`asset ${asset.id} SVG contains an active, style, or link attribute`);
  }
  if (UNSAFE_SVG_CSS.test(text)) {
    fail(`asset ${asset.id} SVG contains an external-resource CSS expression`);
  }
  try {
    const parsed: unknown = Bun.XML.parse(text);
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      !Object.hasOwn(parsed, 'svg')
    ) {
      fail(`asset ${asset.id} must contain exactly one SVG document root`);
    }
  } catch (error) {
    fail(`asset ${asset.id} is not well-formed SVG XML: ${String(error)}`);
  }
}

export function inspectSvgDimensions(
  asset: AssetDraft,
  bytes: Uint8Array
): { width: number; height: number } {
  const text = decodeSvg(asset, bytes);
  assertSvgSafeForBrowser(asset, text);
  const root = text.match(/<svg\b([^>]*)>/i)?.[1];
  if (!root) fail(`asset ${asset.id} does not contain an SVG root element`);
  const attrs = parseAttributes(root);
  if (attrs.xmlns !== 'http://www.w3.org/2000/svg') {
    fail(`asset ${asset.id} SVG root must declare the SVG namespace`);
  }
  const direct = sourceDimensions(attrs);
  const viewBox = attrs.viewbox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const dimensions =
    direct.width && direct.height
      ? direct
      : viewBox?.length === 4 && viewBox.every(Number.isFinite)
        ? { width: viewBox[2] ?? null, height: viewBox[3] ?? null }
        : { width: null, height: null };
  if (
    !Number.isFinite(dimensions.width) ||
    !Number.isFinite(dimensions.height) ||
    !(dimensions.width! > 0) ||
    !(dimensions.height! > 0) ||
    dimensions.width! * dimensions.height! > MAX_IMAGE_PIXELS
  ) {
    fail(`asset ${asset.id} is missing SVG dimensions`);
  }
  return { width: dimensions.width, height: dimensions.height };
}

export async function inspectRasterImage(
  asset: AssetDraft,
  bytes: Uint8Array,
  mimeType: string | null
): Promise<Bun.Image.Metadata> {
  const metadata = await new Bun.Image(bytes, { maxPixels: MAX_IMAGE_PIXELS })
    .metadata()
    .catch(error => fail(`Bun.Image.metadata failed for ${asset.id}: ${String(error)}`));
  if (!(metadata.width > 0) || !(metadata.height > 0)) {
    fail(`asset ${asset.id} has invalid image dimensions ${metadata.width}×${metadata.height}`);
  }
  const sniffedMime = IMAGE_MIME_BY_FORMAT[metadata.format];
  if (mimeType !== sniffedMime) {
    fail(
      `asset ${asset.id} content type ${mimeType ?? 'missing'} does not match ` +
        `Bun.Image-sniffed ${sniffedMime} (${metadata.format})`
    );
  }
  return metadata;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

export function validateMp4Container(asset: AssetDraft, bytes: Uint8Array): void {
  if (bytes.byteLength < 16 || ascii(bytes, 4, 4) !== 'ftyp') {
    fail(`asset ${asset.id} is not an MP4 ftyp container`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size32 = view.getUint32(0);
  const extended = size32 === 1;
  const headerBytes = extended ? 16 : 8;
  const boxSize = extended ? Number(view.getBigUint64(8)) : size32;
  const minimumSize = headerBytes + 8;
  if (
    !Number.isSafeInteger(boxSize) ||
    boxSize < minimumSize ||
    boxSize > MAX_MP4_FTYP_BYTES ||
    boxSize > bytes.byteLength ||
    (boxSize - minimumSize) % 4 !== 0
  ) {
    fail(`asset ${asset.id} has an invalid or oversized MP4 ftyp box`);
  }
  const majorBrand = ascii(bytes, headerBytes, 4);
  if (!/^[\x20-\x7e]{4}$/.test(majorBrand)) {
    fail(`asset ${asset.id} has an invalid MP4 major brand`);
  }
}
