// @see https://bun.com/docs/runtime/image#input — Blob.image
// @verified Blob.image · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/image#input
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @verified bun:test · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { join } from 'node:path';
import { rmSync, mkdirSync } from 'node:fs';
import {
  parseSize,
  processOne,
  templateDims,
  listImages,
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
