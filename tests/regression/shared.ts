// Shared helpers for Bun release regression probes under tests/regression/.
import { afterAll, test } from 'bun:test';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function bunAtLeast(min: string): boolean {
  const parse = (v: string) => v.split('.').map(n => Number.parseInt(n, 10));
  const [a = 0, b = 0, c = 0] = parse(Bun.version);
  const [x = 0, y = 0, z = 0] = parse(min);
  return a > x || (a === x && (b > y || (b === y && c >= z)));
}

/** `test` when runtime ≥ min, else `test.skip`. */
export function releaseTest(minVersion: string) {
  const onRelease = bunAtLeast(minVersion);
  return {
    onRelease,
    test: onRelease ? test : test.skip,
    skipIf: (condition: boolean) => (onRelease ? test.skipIf(condition) : test.skip),
  };
}

const scratchRoots: string[] = [];

afterAll(() => {
  for (const root of scratchRoots) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});

export function tempRoot(prefix: string): string {
  const root = fs.mkdtempSync(join(tmpdir(), `bun-regression-${prefix}-`));
  scratchRoots.push(root);
  return root;
}

/** Short `/tmp` root for unix socket path-length probes (macOS sun_path). */
export function shortTempRoot(prefix: string): string {
  const root = fs.mkdtempSync(`/tmp/${prefix}-`);
  scratchRoots.push(root);
  return root;
}
