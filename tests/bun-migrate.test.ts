import { describe, expect, test } from 'bun:test';
import { scanUsageInventory } from '../scripts/bun-migrate.ts';
import { resolvePath } from '../lib/path-bun.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');

describe('bun-migrate inventory paths', () => {
  test('relative roots produce repository-relative hit paths', async () => {
    const report = await scanUsageInventory({ roots: ['scripts'] });

    expect(report.hits.length).toBeGreaterThan(0);
    for (const hit of report.hits) {
      expect(hit.file.startsWith('scripts/')).toBe(true);
      expect(await Bun.file(resolvePath(REPO_ROOT, hit.file)).exists()).toBe(true);
    }
  });
});
