// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.jpeg
// @released Bun.Image.jpeg · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#input — Bun.Image
/**
 * Partner package-group forum icon — factory Bot API lane (no MTProto).
 */
import { letterMarkPng } from '../../tools/generate-portal-icons.ts';
import { TOC_OPS_BRAND_RGB } from './branding.ts';

export async function generatePackageGroupIconJpeg(partnerCode: string): Promise<Uint8Array> {
  const letter = partnerCode.trim().toUpperCase().slice(0, 1) || 'P';
  const png = letterMarkPng(
    TOC_OPS_BRAND_RGB.r,
    TOC_OPS_BRAND_RGB.g,
    TOC_OPS_BRAND_RGB.b,
    letter,
    512
  );
  return new Bun.Image(png).jpeg({ quality: 90 }).bytes();
}
