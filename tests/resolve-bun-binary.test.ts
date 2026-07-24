// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
import { describe, expect, test } from 'bun:test';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';
import {
  clearVerificationBunBinaryCache,
  formatSpawnedBunNote,
  resolveVerificationBunBinary,
} from '../lib/verification/resolve-bun-binary.ts';
import { resolveInstallAspectCanonical } from '../lib/verification/canonical-coverage.ts';

describe('lib/verification/resolve-bun-binary', () => {
  test('resolveVerificationBunBinary returns absolute path with version metadata', () => {
    clearVerificationBunBinaryCache();
    const resolved = resolveVerificationBunBinary({ fresh: true });
    expect(resolved.path.length).toBeGreaterThan(0);
    expect(resolved.path.startsWith('/')).toBe(true);
    expect(resolved.runtimeVersion).toBe(Bun.version);
    expect(resolved.spawnedVersion).toBeDefined();
    expect(resolved.matchesRuntime).toBe(true);
    expect(['runtime', 'which', 'bun-install']).toContain(resolved.source);
  });

  test('formatSpawnedBunNote includes source and runtime version', () => {
    const resolved = resolveVerificationBunBinary({ fresh: true });
    const note = formatSpawnedBunNote(resolved);
    expect(note).toContain('spawned=');
    expect(note).toContain(`source=${resolved.source}`);
    expect(note).toContain(`runtime=${Bun.version}`);
  });

  test('bun-binary-resolved aspect maps to Bun.which canonical ref', () => {
    const row = resolveInstallAspectCanonical('bun-binary-resolved');
    expect(row.canonicalKey).toBe('Bun.which');
    expect(row.canonical).toBe(CANONICAL_REFS['Bun.which']);
  });
});
