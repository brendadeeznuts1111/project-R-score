// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
import { describe, expect, test } from 'bun:test';
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
} from '../lib/docs/bun-source-links.ts';
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
    expect(out).toContain('Development:');
    expect(out).toContain('Debugging:');
    // Headings are Title Case (catalog SSOT in portal-cli-bun-flags)
    expect(out).toContain('Environment & Config:');
    expect(out).toContain('Output Control:');
    expect(out).toContain('Performance:');
    expect(out).toContain('Dependency Resolution:');
    // Flag presence (examples are short-form; catalog may change arg order)
    expect(out).toContain('bun --watch tools/portal-cli.ts ...');
    expect(out).toContain('bun --hot tools/portal-cli.ts ...');
    expect(out).toContain('bun --no-clear-screen tools/portal-cli.ts ...');
    expect(out).toContain('bun --inspect-wait tools/portal-cli.ts ...');
    expect(out).toContain('bun --inspect-brk tools/portal-cli.ts ...');
    expect(out).toContain('bun --cwd tools/portal-cli.ts ...');
    expect(out).toContain('bun --config tools/portal-cli.ts ...');
    expect(out).toContain('bun --define tools/portal-cli.ts ...');
    expect(out).toContain('bun --conditions tools/portal-cli.ts ...');
    expect(out).toContain('bun --silent tools/portal-cli.ts ...');
    expect(out).toContain('bun --inspect tools/portal-cli.ts ...');
    expect(out).toContain('bun --smol tools/portal-cli.ts ...');
    expect(out).toContain('bun --prefer-offline tools/portal-cli.ts ...');
    expect(out).toContain('bun --install=fallback tools/portal-cli.ts ...');
    expect(out).toContain('Canonical Bun sources:');
    expect(out).toContain(`API reference: ${BUN_API_REFERENCE_URL}`);
    expect(out).toContain(`Type declarations: ${BUN_TYPES_SOURCE_URL}`);
    expect(out).toContain(`Repository: ${BUN_REPOSITORY_URL}`);
    expect(out).not.toContain('bun --verbose');
    expect(out).toContain(
      'See all options: https://bun.com/docs/runtime/index#general-execution-options'
    );
  });
});
