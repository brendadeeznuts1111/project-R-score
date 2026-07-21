// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-level (primary)
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Ratchet: cron contract docs keep Bun's hierarchy (OS-persistent primary).
 *
 *   bun run test:cron
 */
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun';
import { parseCron, scheduleInProcess } from '../lib/harness/cron';

const ROOT = joinPath(import.meta.dir, '..');
const CONTRACT = joinPath(ROOT, 'docs/harness/cron.md');

describe('cron contract (claim / evidence)', () => {
  test('docs/harness/cron.md leads with OS-persistent as primary', async () => {
    const md = await Bun.file(CONTRACT).text();
    expect(md).toContain('OS-persistent is primary');
    expect(md).toContain('Bun.cron(path, schedule, title)');
    expect(md).toMatch(/in-process is the complement/i);
    expect(md).toContain('bun run test:cron');
    expect(md).toContain('bun run test:cron-os');
    expect(md).toContain('cron-os-persistent');
    // Must not claim in-process is the only / primary Bun.cron form
    expect(md).not.toMatch(/in-process is the primary/i);
  });

  test('lib/harness/cron parseCron + scheduleInProcess (complement)', () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const next = parseCron('0 9 * * *', from);
    expect(next?.getUTCHours()).toBe(9);
    {
      using job = scheduleInProcess('@hourly', () => {});
      expect(job.cron).toBe('@hourly');
    }
  });
});
