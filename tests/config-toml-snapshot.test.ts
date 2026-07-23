/**
 * @see ../tools/config-toml-snapshot.ts
 */
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildConfigTomlSnapshot,
  writeConfigTomlSnapshot,
} from '../tools/config-toml-snapshot.ts';
import { tomlStringify } from '../lib/toml-stringify.ts';

describe('config-toml-snapshot', () => {
  test('single-pass sha256 + shallow data table', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cfg-snap-'));
    try {
      const src = join(dir, 'config.json');
      await Bun.write(src, JSON.stringify({ a: 1, b: 'x', c: true }));
      const snap = await buildConfigTomlSnapshot(src);
      expect(snap.algorithm).toBe('sha256');
      expect(snap.bun).toBe(Bun.version);
      expect(snap.bytes).toBeGreaterThan(0);
      expect(snap.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(snap.data).toEqual({ a: 1, b: 'x', c: true });
      expect(snap.data_json).toBeUndefined();

      const expected = new Bun.CryptoHasher('sha256')
        .update(await Bun.file(src).bytes())
        .digest('hex');
      expect(snap.hash).toBe(expected);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('nested auto → data_json; sha3-256', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cfg-snap-'));
    try {
      const src = join(dir, 'config.json');
      const payload = { nest: { x: [1, 2] } };
      await Bun.write(src, JSON.stringify(payload));
      const snap = await buildConfigTomlSnapshot(src, {
        algorithm: 'sha3-256',
        embed: 'auto',
      });
      expect(snap.algorithm).toBe('sha3-256');
      expect(snap.data).toBeUndefined();
      expect(snap.data_json).toBe(JSON.stringify(payload));
      expect(snap.hash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('write TOML round-trip parse', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cfg-snap-'));
    try {
      const src = join(dir, 'config.json');
      const out = join(dir, 'snapshot.toml');
      await Bun.write(src, '{"k":"v"}');
      const { body } = await writeConfigTomlSnapshot({ source: src, out });
      expect(body).toContain('algorithm = "sha256"');
      expect(body).toContain('hash = "');
      const parsed = Bun.TOML.parse(await Bun.file(out).text()) as {
        hash: string;
        data?: { k: string };
      };
      expect(parsed.data?.k).toBe('v');
      expect(parsed.hash).toHaveLength(64);
      // stringify helper matches runtime
      expect(tomlStringify({ a: 1 })).toContain('a = 1');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
