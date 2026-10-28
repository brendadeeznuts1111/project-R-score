// @see https://github.com/oven-sh/bun/pull/35122
import { expect, test } from 'bun:test';

const TARGET_VERSION = '1.4.0';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

type CronParseV14 = (
  expression: string,
  relativeDate?: Date | number,
  options?: { tz?: string }
) => Date | null;

releaseTest('Bun 1.4.0 cron parsing accepts an explicit IANA time zone', () => {
  const parse = Bun.cron.parse as CronParseV14;
  const next = parse('0 9 * * *', new Date('2026-06-15T00:00:00Z'), {
    tz: 'America/New_York',
  });
  expect(next?.toISOString()).toBe('2026-06-15T13:00:00.000Z');
});

releaseTest('stopped in-process cron jobs release a standalone CLI event loop', async () => {
  const proc = Bun.spawn(
    [
      process.execPath,
      '-e',
      `const job = Bun.cron('* * * * *', () => {}); job.stop(); console.log('stopped');`,
    ],
    { stdout: 'pipe', stderr: 'pipe' }
  );
  const code = await Promise.race([proc.exited, Bun.sleep(3_000).then(() => -1)]);
  if (code === -1) proc.kill();
  expect(code).toBe(0);
  expect((await new Response(proc.stdout).text()).trim()).toBe('stopped');
});
