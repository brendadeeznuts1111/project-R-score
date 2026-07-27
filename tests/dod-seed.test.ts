// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import { isDodQueueEmpty, seedDodDemo } from '../lib/operations/dod-seed.ts';
import { DODVerifier } from '../lib/dod/verifier.ts';

function freshScratch(): string {
  return joinPath(import.meta.dir, `../.tmp/dod-seed-test-${Bun.randomUUIDv7()}`);
}

describe('dod demo seed', () => {
  test('seeds mixed-status queue', async () => {
    const SCRATCH = freshScratch();
    await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
    try {
      const dbPath = `${SCRATCH}/operations.db`;

      expect(isDodQueueEmpty(dbPath)).toBe(true);

      const result = await seedDodDemo({ dbPath, ifEmpty: true });
      expect(result.seeded).toBe(true);
      expect(result.inserted).toBe(6);
      expect(result.byStatus?.flagged).toBe(2);
      expect(result.byStatus?.pending).toBe(2);
      expect(result.byStatus?.verified).toBe(1);
      expect(result.byStatus?.rejected).toBe(1);

      expect(isDodQueueEmpty(dbPath)).toBe(false);
      const again = await seedDodDemo({ dbPath, ifEmpty: true });
      expect(again.seeded).toBe(false);

      using v = new DODVerifier(dbPath);
      const listed = v.list('all') as Array<{ status: string; device_model: string }>;
      expect(listed.length).toBe(6);
      expect(listed.filter(r => r.status === 'flagged').length).toBe(2);
      expect(listed.some(r => r.device_model === 'iPhone 15 Pro')).toBe(true);
    } finally {
      await Bun.$`rm -rf ${SCRATCH}`.quiet();
    }
  });

  test('force adds another batch', async () => {
    const SCRATCH = freshScratch();
    await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
    try {
      const dbPath = `${SCRATCH}/operations.db`;
      await seedDodDemo({ dbPath });
      const forced = await seedDodDemo({ dbPath, force: true });
      expect(forced.seeded).toBe(true);
      expect(forced.inserted).toBe(6);

      using v = new DODVerifier(dbPath);
      expect(v.list('all').length).toBe(12);
    } finally {
      await Bun.$`rm -rf ${SCRATCH}`.quiet();
    }
  });
});
