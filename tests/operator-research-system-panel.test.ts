import { afterEach, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import {
  getSystemInfo,
  globSearch,
  hashPassword,
  inspectValue,
  listDirectory,
  readProjectFile,
  resolveUnderProject,
  setDeskEnv,
  verifyPassword,
  writeProjectFile,
} from '../lib/operator-research/system-panel.ts';

const smokeFile = 'data/exports/system-panel-smoke.json';

afterEach(async () => {
  await rm(smokeFile, { force: true });
});

describe('system-panel Bun native APIs', () => {
  test('resolveUnderProject blocks escape', () => {
    expect(resolveUnderProject('.').ok).toBe(true);
    expect(resolveUnderProject('package.json').ok).toBe(true);
    expect(resolveUnderProject('../../../../etc/passwd').ok).toBe(false);
  });

  test('getSystemInfo exposes Bun.version / which / colors', async () => {
    const info = await getSystemInfo();
    expect(info.bun.version).toBe(Bun.version);
    expect(info.which.bun).toBeTruthy();
    expect(info.colors.length).toBeGreaterThan(0);
  });

  test('listDirectory lists project files with mime', async () => {
    const listing = await listDirectory('lib/operator-research');
    expect(listing.entries.some(e => e.name === 'system-panel.ts')).toBe(true);
    const file = listing.entries.find(e => e.name === 'system-panel.ts');
    expect(file?.mime).toMatch(/javascript|typescript|plain/);
  });

  test('readProjectFile returns content + mime', async () => {
    const file = await readProjectFile('package.json');
    expect(file.mime).toContain('json');
    expect(file.content).toContain('"name"');
  });

  test('writeProjectFile allowlist + glob search', async () => {
    await writeProjectFile(smokeFile, JSON.stringify({ ok: true, t: Date.now() }));
    const read = await readProjectFile(smokeFile);
    expect(read.content).toContain('"ok":true');

    await expect(writeProjectFile('lib/operator-research/system-panel.ts', 'nope')).rejects.toThrow(
      /forbidden/i
    );

    const hits = await globSearch(smokeFile);
    expect(hits.results.some(r => r.includes('system-panel-smoke'))).toBe(true);
  });

  test('password hash/verify + inspect + desk env', async () => {
    const { hashed } = await hashPassword('desk-test-secret');
    expect(hashed.length).toBeGreaterThan(20);
    expect((await verifyPassword('desk-test-secret', hashed)).valid).toBe(true);
    expect((await verifyPassword('wrong', hashed)).valid).toBe(false);

    const inspected = inspectValue({ a: 1, b: { c: 'bun' } }, 3);
    expect(inspected.inspected).toContain('bun');

    const set = setDeskEnv('DESK_SMOKE', '1');
    expect(set.key).toBe('DESK_SMOKE');
    expect(Bun.env.DESK_SMOKE).toBe('1');
    expect(() => setDeskEnv('PATH', '/tmp')).toThrow();
  });
});
