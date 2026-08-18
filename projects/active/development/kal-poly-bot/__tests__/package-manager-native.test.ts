import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BunPackEnforcer } from '../infrastructure/v1-3-3-package-manager';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))
  );
});

function tarEntryNames(tarball: Uint8Array): string[] {
  const compressed = new ArrayBuffer(tarball.byteLength);
  new Uint8Array(compressed).set(tarball);
  const archive = Bun.gunzipSync(compressed);
  const decoder = new TextDecoder();
  const names: string[] = [];

  for (let offset = 0; offset + 512 <= archive.length;) {
    const name = decoder.decode(archive.subarray(offset, offset + 100)).replace(/\0.*$/, '');
    if (!name) break;

    const sizeText = decoder
      .decode(archive.subarray(offset + 124, offset + 136))
      .replace(/\0.*$/, '')
      .trim();
    const size = Number.parseInt(sizeText || '0', 8);

    names.push(name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return names;
}

describe('BunPackEnforcer', () => {
  test('returns the archive produced by bun pm pack, including package bins', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'kal-pack-fixture-'));
    temporaryDirectories.push(fixture);
    await mkdir(join(fixture, 'bin'));

    await Bun.write(
      join(fixture, 'package.json'),
      JSON.stringify({
        name: 'kal-pack-fixture',
        version: '1.0.0',
        files: ['bin'],
        bin: { 'kal-pack-fixture': 'bin/cli.js' },
      })
    );
    await Bun.write(join(fixture, 'bin/cli.js'), '#!/usr/bin/env bun\n');

    const tarball = await BunPackEnforcer.pack(join(fixture, 'package.json'));

    expect(tarball[0]).toBe(0x1f);
    expect(tarball[1]).toBe(0x8b);
    expect(tarEntryNames(tarball)).toContain('package/bin/cli.js');
  });

  test("rejects the fictional option to disable Bun's bin rules", async () => {
    await expect(BunPackEnforcer.pack('package.json', { includeBin: false })).rejects.toThrow(
      'bun pm pack always applies package.json bin inclusion rules'
    );
  });
});
