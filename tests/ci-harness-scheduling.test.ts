import { describe, expect, test } from 'bun:test';

const source = await Bun.file(new URL('../scripts/ci-harness.ts', import.meta.url)).text();
const precommitSource = await Bun.file(
  new URL('../scripts/pre-commit-harness.ts', import.meta.url)
).text();

describe('ci-harness changed-test scheduling', () => {
  test('bounds main-head parallelism without slowing the dirty-tree lane', () => {
    expect(source).toContain(
      "? ['bun', 'run', 'test:changed', '--', '--main-head', '--parallel=4', '--exclude-ci-reserved']"
    );
    expect(source).toContain(": ['bun', 'run', 'test:changed', '--', '--exclude-ci-reserved']");
    expect(source).toContain("Bun 1.4's timing cache");
    expect(source).toContain('--parallel/--serial');
  });
});

describe('Bun API drift enforcement', () => {
  test('runs the complete active-tree ratchet in the cheap CI envelope', () => {
    expect(source).toContain("name: 'bun-api-drift'");
    expect(source).toContain("cmd: ['bun', 'run', 'bun:api-drift:check']");
  });

  test('checks only staged project source during pre-commit', () => {
    expect(precommitSource).toContain("'projects-bun-api-drift'");
    expect(precommitSource).toContain(
      "['bun', 'tools/bun-api-drift.ts', '--max=0', ...projectSourceFiles]"
    );
  });
});
