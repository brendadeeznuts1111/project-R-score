// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.png
// @released Bun.Image.png · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.write
// @released Bun.Image.write · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/Image/Format — Bun.Image.Format
// @released Bun.Image.Format · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#input — Blob.image
// @verified Blob.image · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/image#input
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @verified bun:test · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
import { describe, expect, expectTypeOf, test, beforeAll, afterAll } from 'bun:test';
import { join } from 'node:path';
import { rmSync, mkdirSync } from 'node:fs';
import {
  parseSize,
  processOne,
  templateDims,
  listImages,
  isOutputFormat,
  parseArgs,
  type OutFormat,
} from '../scripts/images-generate.ts';

const FIX = join(import.meta.dir, 'fixtures/images/sample.png');
const OUT = join(import.meta.dir, '.tmp-images-out');

describe('images-generate (Bun.Image)', () => {
  beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
  });
  afterAll(() => {
    try {
      rmSync(OUT, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  test('parseSize', () => {
    expect(parseSize('128x128')).toEqual({ w: 128, h: 128 });
    expect(() => parseSize('nope')).toThrow();
  });

  test('output formats are an encoder-only subset of Bun.Image.Format', () => {
    expectTypeOf<OutFormat>().toMatchTypeOf<Bun.Image.Format>();
    expect(isOutputFormat('avif')).toBe(true);
    expect(isOutputFormat('gif')).toBe(false);
    expect(() => parseArgs(['--format=gif'])).toThrow(/Invalid --format/);
  });

  test('parses current Bun.Image encoder and geometry controls strictly', () => {
    const jpeg = parseArgs([
      '--format=jpeg',
      '--progressive',
      '--without-enlargement',
      '--backend=bun',
      '--quality=90',
    ]);
    expect(jpeg).toMatchObject({
      format: 'jpeg',
      progressive: true,
      withoutEnlargement: true,
      backend: 'bun',
      quality: 90,
    });

    const png = parseArgs(['--format=png', '--palette=64', '--dither']);
    expect(png).toMatchObject({ format: 'png', paletteColors: 64, dither: true });
    expect(() => parseArgs(['--format=webp', '--progressive'])).toThrow(/requires --format=jpeg/);
    expect(() => parseArgs(['--format=webp', '--palette'])).toThrow(/requires --format=png/);
    expect(() => parseArgs(['--format=png', '--dither'])).toThrow(/requires --palette/);
    expect(() => parseArgs(['--quality=101'])).toThrow(/integer 1-100/);
    expect(() => parseArgs(['--fit=outside'])).toThrow(/fill\|inside\|cover/);
    expect(() => parseArgs(['--backend=auto'])).toThrow(/bun\|system/);
    expect(() => parseArgs([], { template: 'legacy' as never })).toThrow(/Invalid --template/);
    expect(() => parseArgs([], { format: 'jpg' as never })).toThrow(/Invalid --format/);
  });

  test('explicit CLI values override an injected TOML baseline', () => {
    const fromToml = parseArgs([], { quality: 72, format: 'jpeg', progressive: true });
    expect(fromToml).toMatchObject({ quality: 72, format: 'jpeg', progressive: true });
    const overridden = parseArgs(['--quality=91'], {
      quality: 72,
      format: 'jpeg',
      progressive: true,
    });
    expect(overridden.quality).toBe(91);
  });

  test('templateDims', () => {
    expect(templateDims('hero', '1x1')).toEqual({ w: 1200, h: 630 });
    expect(templateDims('match', '1x1')).toEqual({ w: 400, h: 400 });
    expect(templateDims('avatar', '64x64')).toEqual({ w: 64, h: 64 });
  });

  test('listImages finds fixture', async () => {
    const files = await listImages(join(import.meta.dir, 'fixtures/images'));
    expect(files.some(f => f.endsWith('sample.png'))).toBe(true);
  });

  test('processOne avatar webp', async () => {
    const dest = join(OUT, 'demo.webp');
    const r = await processOne(FIX, dest, {
      w: 64,
      h: 64,
      fit: 'fill',
      format: 'webp',
      quality: 80,
      maxPixels: 4096 * 4096,
      dryRun: false,
      template: 'avatar',
    });
    expect(r.ok).toBe(true);
    expect(await Bun.file(dest).exists()).toBe(true);
    expect(r.bytes).toBeGreaterThan(50);
    const meta = await Bun.file(dest).image().metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
    expect(meta.format).toBe('webp');
  });

  test('processOne hero inside', async () => {
    const dest = join(OUT, 'hero.webp');
    const r = await processOne(FIX, dest, {
      w: 1200,
      h: 630,
      fit: 'inside',
      format: 'webp',
      quality: 85,
      maxPixels: 4096 * 4096,
      dryRun: false,
      template: 'hero',
    });
    expect(r.ok).toBe(true);
    const meta = await Bun.file(dest).image().metadata();
    expect(meta.width).toBeLessThanOrEqual(1200);
    expect(meta.height).toBeLessThanOrEqual(630);
  });

  test('processOne emits progressive JPEG and indexed/dithered PNG', async () => {
    const jpegDest = join(OUT, 'progressive.jpg');
    const jpeg = await processOne(FIX, jpegDest, {
      w: 0,
      h: 0,
      fit: 'inside',
      format: 'jpeg',
      quality: 82,
      progressive: true,
      maxPixels: 4096 * 4096,
      dryRun: false,
      template: 'convert',
    });
    expect(jpeg.ok).toBe(true);
    const jpegBytes = new Uint8Array(await Bun.file(jpegDest).arrayBuffer());
    expect(jpegBytes.some((byte, index) => byte === 0xff && jpegBytes[index + 1] === 0xc2)).toBe(
      true
    );

    const pngDest = join(OUT, 'indexed.png');
    const png = await processOne(FIX, pngDest, {
      w: 0,
      h: 0,
      fit: 'inside',
      format: 'png',
      quality: 80,
      paletteColors: 16,
      dither: true,
      maxPixels: 4096 * 4096,
      dryRun: false,
      template: 'convert',
    });
    expect(png.ok).toBe(true);
    const pngBytes = new Uint8Array(await Bun.file(pngDest).arrayBuffer());
    expect(pngBytes[25]).toBe(3); // PNG IHDR indexed-colour type
  });

  test('processOne honors native withoutEnlargement geometry', async () => {
    const smallSource = join(OUT, 'small-source.png');
    await Bun.file(FIX).image().resize(10, 10).png().write(smallSource);
    const dest = join(OUT, 'no-upscale.png');
    const result = await processOne(smallSource, dest, {
      w: 64,
      h: 64,
      fit: 'inside',
      format: 'png',
      quality: 80,
      withoutEnlargement: true,
      maxPixels: 4096 * 4096,
      dryRun: false,
      template: 'convert',
    });
    expect(result.ok).toBe(true);
    const metadata = await Bun.file(dest).image().metadata();
    expect([metadata.width, metadata.height]).toEqual([10, 10]);
  });

  test('placeholder writes data url', async () => {
    const dest = join(OUT, 'ph.txt');
    const r = await processOne(FIX, dest, {
      w: 0,
      h: 0,
      fit: 'fill',
      format: 'webp',
      quality: 80,
      maxPixels: 4096 * 4096,
      dryRun: false,
      template: 'placeholder',
    });
    expect(r.ok).toBe(true);
    const text = await Bun.file(r.dest).text();
    expect(text.startsWith('data:image/')).toBe(true);
  });
});
