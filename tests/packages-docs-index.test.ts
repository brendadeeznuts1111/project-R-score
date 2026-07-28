// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('packages-docs-index', () => {
  test('docs-index.json has docs with required fields', async () => {
    const index = await Bun.file(resolvePath(ROOT, 'docs/packages/docs-index.json')).json();
    expect(Array.isArray(index.docs)).toBe(true);
    expect(index.docs.length).toBeGreaterThan(0);
    for (const d of index.docs) {
      expect(d.id).toBeTruthy();
      expect(d.href).toBeTruthy();
      expect(d.type).toBeTruthy();
      expect(d.status).toBeTruthy();
      expect(d.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(d.groundedCapabilities)).toBe(true);
      expect(Array.isArray(d.relatedCommands)).toBe(true);
    }
  });

  test('README contains generator markers and is in sync', async () => {
    const readme = await Bun.file(resolvePath(ROOT, 'docs/packages/README.md')).text();
    expect(readme).toContain('<!-- packages-docs-index:start -->');
    expect(readme).toContain('<!-- packages-docs-index:end -->');
    expect(readme).toContain('## Documentation index (decision table)');

    const proc = Bun.spawn(['bun', 'run', 'scripts/packages-docs-index.ts', '--check'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const err = await new Response(proc.stderr).text();
    expect(code).toBe(0);
    expect(err).toBe('');
  });
});
