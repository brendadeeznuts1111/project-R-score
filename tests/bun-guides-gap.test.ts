// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { BUN_GUIDES, guideUrl, spineGuides } from '../lib/docs/bun-guides-inventory.ts';

describe('bun-guides-inventory', () => {
  test('inventory has unique paths', () => {
    const paths = BUN_GUIDES.map(g => g.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('spine set is non-empty and all priority spine', () => {
    const spine = spineGuides();
    expect(spine.length).toBeGreaterThan(10);
    expect(spine.every(g => g.priority === 'spine')).toBe(true);
  });

  test('guideUrl builds bun.com/docs/guides path', () => {
    expect(guideUrl('install/add')).toBe('https://bun.com/docs/guides/install/add');
  });

  test('includes install workspaces and process spawn', () => {
    const paths = new Set(BUN_GUIDES.map(g => g.path));
    expect(paths.has('install/workspaces')).toBe(true);
    expect(paths.has('process/spawn')).toBe(true);
    expect(paths.has('runtime/read-env')).toBe(true);
  });
});
