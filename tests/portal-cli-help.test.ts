// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli help', () => {
  test('documents Bun runtime execution options at the bottom', async () => {
    const proc = Bun.spawn(['bun', CLI, 'help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = (await new Response(proc.stdout).text()).trimEnd();

    expect(code).toBe(0);
    expect(out).toContain('Runtime options (via bun):');
    expect(out).toContain('bun --watch tools/portal-cli.ts ...');
    expect(out).toContain('bun --hot tools/portal-cli.ts ...');
    expect(out).toContain('bun --cwd /path tools/portal-cli.ts ...');
    expect(out).toContain('bun --silent tools/portal-cli.ts ...');
    expect(out).toContain('bun --inspect tools/portal-cli.ts ...');
    expect(out).toEndWith('See: https://bun.com/docs/runtime/index#general-execution-options');
  });
});
