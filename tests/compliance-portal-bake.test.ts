// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');

describe('compliance portal bake', () => {
  test('registry artifacts exist and board schema is v1', async () => {
    // Ensure fresh bake when missing (CI without prior bake step)
    const boardPath = joinPath(ROOT, 'public/registry/compliance-board.json');
    if (!(await Bun.file(boardPath).exists())) {
      const proc = Bun.spawn(['bun', 'tools/bake-compliance-portal.ts'], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(await proc.exited).toBe(0);
    }
    const board = await Bun.file(boardPath).json();
    expect(board.schemaVersion).toBe(1);
    expect(board.enhancements?.passed).toBe(board.enhancements?.total);
    expect(board.shadow?.summary?.mismatches).toBe(0);
    expect(board.links?.portal).toBe('/portal/compliance/');
    expect(board.proton?.inject).toContain('proton:inject');
  });

  test('portal page has embed slot', async () => {
    const html = await Bun.file(
      joinPath(ROOT, 'public/portal/compliance/index.html')
    ).text();
    expect(html).toContain('id="compliance-board-embed"');
    expect(html).toContain('compliance-dashboard.js');
  });
});
