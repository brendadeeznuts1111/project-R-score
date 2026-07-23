#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Generate portal tenant icons — SVG copy + Bun.Image WebP sizes (no WebView).
 *
 * Masters: assets/portal-icons/{id}.svg (+ .png mark with letter).
 * Output: public/icons/{id}/mark.svg, mark.png, mark-{16,32,64}.webp, optional thumbhash.
 *
 * Raster order: rsvg-convert (letter SVG) → checked-in PNG → letterMarkPng (CI-safe).
 *
 * @see https://bun.com/docs/runtime/image#input — Bun.Image
 * @see https://bun.com/docs/runtime/image#resize — resize()
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 * PNG IDAT uses node:zlib deflate (zlib-wrapped) — Bun.deflateSync is not accepted by Bun.Image decode.
 */
/* eslint-disable no-restricted-imports -- PNG IDAT needs zlib-wrapped deflate; Bun.deflateSync rejected by Bun.Image decode */
import { mkdir } from 'node:fs/promises';
import { joinPath } from '../lib/path-bun.ts';
import { deflateSync } from 'node:zlib';
/* eslint-enable no-restricted-imports */

const ROOT = joinPath(import.meta.dir, '..');
const ASSETS = joinPath(ROOT, 'assets/portal-icons');
const OUT = joinPath(ROOT, 'public/icons');
const TENANT_MANIFEST = joinPath(ROOT, 'public/tenants/manifest.json');

const SIZES = [16, 32, 64] as const;

export type PortalTenantIcon = {
  id: string; // brand-ok — tenant slug key (factory|science|tennis)
  name: string;
  color: string; // #rrggbb
  letter: string;
};

/** Portal UI tenants (aligned with public/tenants/manifest.json). */
export const PORTAL_ICON_TENANTS: readonly PortalTenantIcon[] = [
  { id: 'factory', name: 'Factory Registry', color: '#3b82f6', letter: 'F' },
  { id: 'science', name: 'Science Lab', color: '#10b981', letter: 'S' },
  { id: 'tennis', name: 'Kalshi Tennis', color: '#f59e0b', letter: 'T' },
];

/** 5×7 bitmap glyphs (rows of 5 bits, MSB left). */
const GLYPHS: Record<string, readonly number[]> = {
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
};

function parseHex(color: string): [number, number, number] {
  const h = color.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function encodeRgbaPng(raw: Buffer, size: number): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const compressed = deflateSync(raw);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPixel(
  raw: Buffer,
  size: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255
): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = y * (size * 4 + 1) + 1 + x * 4;
  raw[i] = r;
  raw[i + 1] = g;
  raw[i + 2] = b;
  raw[i + 3] = a;
}

function fillRoundedRect(
  raw: Buffer,
  size: number,
  r: number,
  g: number,
  b: number,
  radius: number
): void {
  const rr = radius * radius;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter
    for (let x = 0; x < size; x++) {
      let inside = true;
      if (x < radius && y < radius) {
        const dx = radius - 1 - x;
        const dy = radius - 1 - y;
        inside = dx * dx + dy * dy <= rr;
      } else if (x >= size - radius && y < radius) {
        const dx = x - (size - radius);
        const dy = radius - 1 - y;
        inside = dx * dx + dy * dy <= rr;
      } else if (x < radius && y >= size - radius) {
        const dx = radius - 1 - x;
        const dy = y - (size - radius);
        inside = dx * dx + dy * dy <= rr;
      } else if (x >= size - radius && y >= size - radius) {
        const dx = x - (size - radius);
        const dy = y - (size - radius);
        inside = dx * dx + dy * dy <= rr;
      }
      if (inside) setPixel(raw, size, x, y, r, g, b);
      else setPixel(raw, size, x, y, 0, 0, 0, 0);
    }
  }
}

/** Solid fill PNG (no letter) — kept for tests / probes. */
export function solidPng(r: number, g: number, b: number, size = 128): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }
  return encodeRgbaPng(raw, size);
}

/**
 * Rounded mark + 5×7 bitmap letter (white). CI-safe without rsvg.
 */
export function letterMarkPng(r: number, g: number, b: number, letter: string, size = 128): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const radius = Math.round(size * 0.22);
  fillRoundedRect(raw, size, r, g, b, radius);

  const glyph = GLYPHS[letter.toUpperCase()] ?? GLYPHS.F!;
  const cell = Math.floor(size / 11);
  const gw = 5 * cell;
  const gh = 7 * cell;
  const ox = Math.floor((size - gw) / 2);
  const oy = Math.floor((size - gh) / 2);
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row]!;
    for (let col = 0; col < 5; col++) {
      if ((bits >> (4 - col)) & 1) {
        for (let dy = 0; dy < cell; dy++) {
          for (let dx = 0; dx < cell; dx++) {
            setPixel(raw, size, ox + col * cell + dx, oy + row * cell + dy, 255, 255, 255);
          }
        }
      }
    }
  }
  return encodeRgbaPng(raw, size);
}

/** Prefer rsvg-convert for letter SVG → PNG when available. */
async function rasterizeSvgToPng(svgPath: string, outPng: string, size = 128): Promise<boolean> {
  const rsvg = Bun.which('rsvg-convert');
  if (!rsvg) return false;
  const proc = Bun.spawn([rsvg, '-w', String(size), '-h', String(size), '-o', outPng, svgPath], {
    stdout: 'ignore',
    stderr: 'pipe',
  });
  const code = await proc.exited;
  return code === 0 && (await Bun.file(outPng).exists());
}

function sha256Hex(bytes: Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

export type GeneratedTenantIcons = {
  id: string; // brand-ok — tenant slug key
  color: string;
  svg: string;
  png: string;
  webp: Record<string, string>;
  srcset: string;
  thumbhash?: string;
  hashes: Record<string, string>;
  source: 'rsvg' | 'asset-png' | 'letter-mark';
};

function webpSrcset(id: string, webp: Record<string, string>): string {
  // brand-ok — tenant slug
  return SIZES.map(s => `${webp[String(s)]} ${s}w`).join(', ');
}

export async function generateTenantIcons(
  tenant: PortalTenantIcon,
  opts?: { outRoot?: string; assetsRoot?: string }
): Promise<GeneratedTenantIcons> {
  const outRoot = opts?.outRoot ?? OUT;
  const assetsRoot = opts?.assetsRoot ?? ASSETS;
  const dir = joinPath(outRoot, tenant.id);
  await mkdir(dir, { recursive: true });
  await mkdir(assetsRoot, { recursive: true });

  const svgSrc = joinPath(assetsRoot, `${tenant.id}.svg`);
  const svgText = (await Bun.file(svgSrc).exists())
    ? await Bun.file(svgSrc).text()
    : `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${tenant.color}"/><text x="64" y="86" font-family="system-ui,sans-serif" font-size="72" font-weight="700" fill="#fff" text-anchor="middle">${tenant.letter}</text></svg>\n`;
  if (!(await Bun.file(svgSrc).exists())) {
    await Bun.write(svgSrc, svgText);
  }

  const assetPng = joinPath(assetsRoot, `${tenant.id}.png`);
  const markPngPath = joinPath(dir, 'mark.png');
  let png: Buffer;
  let source: GeneratedTenantIcons['source'];

  if (await rasterizeSvgToPng(svgSrc, markPngPath, 128)) {
    png = Buffer.from(await Bun.file(markPngPath).bytes());
    await Bun.write(assetPng, png);
    source = 'rsvg';
  } else {
    const [r, g, b] = parseHex(tenant.color);
    // Always refresh letter-mark when rsvg absent so CI stays lettered
    png = letterMarkPng(r, g, b, tenant.letter, 128);
    await Bun.write(assetPng, png);
    await Bun.write(markPngPath, png);
    source = 'letter-mark';
  }

  const svgRel = `icons/${tenant.id}/mark.svg`;
  const pngRel = `icons/${tenant.id}/mark.png`;
  await Bun.write(joinPath(dir, 'mark.svg'), svgText);

  const hashes: Record<string, string> = {
    'mark.svg': sha256Hex(Buffer.from(svgText)),
    'mark.png': sha256Hex(png),
  };

  const webp: Record<string, string> = {};
  for (const size of SIZES) {
    const bytes = await new Bun.Image(png)
      .resize(size, size, { fit: 'inside' })
      .webp({ quality: 85 })
      .bytes();
    const name = `mark-${size}.webp`;
    await Bun.write(joinPath(dir, name), bytes);
    webp[String(size)] = `/icons/${tenant.id}/${name}`;
    hashes[name] = sha256Hex(bytes);
  }

  let thumbhash: string | undefined;
  try {
    const ph = await new Bun.Image(png).placeholder();
    thumbhash = String(ph);
    await Bun.write(joinPath(dir, 'mark.thumbhash.txt'), thumbhash);
    hashes['mark.thumbhash.txt'] = sha256Hex(Buffer.from(thumbhash));
  } catch {
    /* placeholder optional */
  }

  return {
    id: tenant.id,
    color: tenant.color,
    svg: `/${svgRel}`,
    png: `/${pngRel}`,
    webp,
    srcset: webpSrcset(tenant.id, webp),
    thumbhash,
    hashes,
    source,
  };
}

export async function generateAllPortalIcons(opts?: {
  outRoot?: string;
  assetsRoot?: string;
  updateTenantManifest?: boolean;
}): Promise<{
  bun: string;
  generated: string;
  sizes: readonly number[];
  tenants: GeneratedTenantIcons[];
}> {
  const tenants: GeneratedTenantIcons[] = [];
  for (const t of PORTAL_ICON_TENANTS) {
    tenants.push(await generateTenantIcons(t, opts));
  }

  const manifest = {
    schema: 'factorywager/portal-icons/v1',
    bun: Bun.version,
    generated: new Date().toISOString(),
    sizes: SIZES,
    tenants: Object.fromEntries(
      tenants.map(t => [
        t.id,
        {
          color: t.color,
          svg: t.svg,
          png: t.png,
          webp: t.webp,
          srcset: t.srcset,
          source: t.source,
          thumbhash: t.thumbhash ?? null,
          hashes: t.hashes,
        },
      ])
    ),
  };

  const outRoot = opts?.outRoot ?? OUT;
  await Bun.write(joinPath(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  if (opts?.updateTenantManifest !== false) {
    await patchTenantManifest(tenants);
  }

  return {
    bun: Bun.version,
    generated: manifest.generated,
    sizes: SIZES,
    tenants,
  };
}

async function patchTenantManifest(icons: GeneratedTenantIcons[]): Promise<void> {
  if (!(await Bun.file(TENANT_MANIFEST).exists())) return;
  const data = (await Bun.file(TENANT_MANIFEST).json()) as {
    tenants: Array<Record<string, unknown>>;
  };
  const byId = new Map(icons.map(i => [i.id, i]));
  for (const t of data.tenants) {
    const id = String(t.id);
    const icon = byId.get(id);
    if (!icon) continue;
    t.icon = id;
    t.color = icon.color;
    t.iconSrc = icon.webp['32'] ?? icon.png;
    t.iconSvg = icon.svg;
    t.iconSrcset = icon.srcset;
  }
  await Bun.write(TENANT_MANIFEST, `${JSON.stringify(data, null, 2)}\n`);
}

/** Verify on-disk WebP/SVG hashes match icons/manifest.json. */
export async function verifyPortalIcons(outRoot: string = OUT): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const manPath = joinPath(outRoot, 'manifest.json');
  if (!(await Bun.file(manPath).exists())) {
    return { ok: false, errors: [`missing ${manPath}`] };
  }
  const man = (await Bun.file(manPath).json()) as {
    tenants: Record<string, { hashes?: Record<string, string> }>;
  };
  for (const [id, t] of Object.entries(man.tenants ?? {})) {
    for (const [name, expect] of Object.entries(t.hashes ?? {})) {
      if (name.endsWith('.txt')) continue; // thumbhash optional drift
      const path = joinPath(outRoot, id, name);
      if (!(await Bun.file(path).exists())) {
        errors.push(`missing ${path}`);
        continue;
      }
      const got = sha256Hex(await Bun.file(path).bytes());
      if (got !== expect) errors.push(`hash mismatch ${id}/${name}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.includes('--verify')) {
    const { ok, errors } = await verifyPortalIcons();
    if (!ok) {
      console.error('portal icons verify FAIL');
      for (const e of errors) console.error(`  ${e}`);
      process.exit(1);
    }
    console.log('portal icons verify OK');
    process.exit(0);
  }

  const result = await generateAllPortalIcons();
  console.log(
    `portal icons · bun ${result.bun} · ${result.tenants.length} tenants · sizes ${result.sizes.join(',')}`
  );
  for (const t of result.tenants) {
    console.log(`  ${t.id}  ${t.webp['32']}  src=${t.source}  svg=${t.svg}`);
  }
  console.log(`wrote ${join(OUT, 'manifest.json')} + patched tenants/manifest.json`);

  if (args.includes('--check')) {
    const { ok, errors } = await verifyPortalIcons();
    if (!ok) {
      console.error('verify after generate failed', errors);
      process.exit(1);
    }
  }
}
