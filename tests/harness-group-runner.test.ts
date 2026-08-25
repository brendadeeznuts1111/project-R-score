import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGroupCommand } from '../scripts/lib/harness-group-runner.ts';

describe('harness group runner', () => {
  test('captures output and writes a stable local log in quiet mode', async () => {
    const reportDir = await mkdtemp(join(tmpdir(), 'harness-group-runner-'));
    try {
      const result = await runGroupCommand(['bun', '-e', 'console.log("green output")'], {
        cwd: import.meta.dir,
        reportDir,
        logId: 'source / lint',
      });
      expect(result.code).toBe(0);
      expect(result.out).toContain('green output');
      expect(result.logPath).toBe(`${reportDir}/source-lint.log`);
      expect(existsSync(result.logPath!)).toBe(true);
      expect(await Bun.file(result.logPath!).text()).toContain('green output');
    } finally {
      await rm(reportDir, { recursive: true, force: true });
    }
  });

  test('preserves stdout and stderr for a failing group', async () => {
    const result = await runGroupCommand(
      ['bun', '-e', 'console.log("stdout"); console.error("stderr"); process.exit(3)'],
      { cwd: import.meta.dir }
    );
    expect(result.code).toBe(3);
    expect(result.out).toContain('stdout');
    expect(result.out).toContain('stderr');
  });
});
