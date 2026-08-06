import { describe, expect, test } from 'bun:test';

const source = await Bun.file(new URL('../scripts/ci-harness.ts', import.meta.url)).text();

describe('ci-harness changed-test scheduling', () => {
  test('serializes the main-head lane without slowing the dirty-tree lane', () => {
    expect(source).toContain(
      "? ['bun', 'run', 'test:changed', '--', '--main-head', '--serial']"
    );
    expect(source).toContain(": ['bun', 'run', 'test:changed']");
    expect(source).toContain('shared repository files');
  });
});
