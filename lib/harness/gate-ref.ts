// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/guides/read-file/exists — Bun.file().exists()
/**
 * Validate ProofPath.gateRef against gateClass wiring rules.
 * @see ./proof.ts
 * @see ../../docs/harness/PROOF.md — Gate class
 */
import { joinPath } from '../path-bun';
import type { ProofGateClass, ProofPath } from './proof';

export const CONTINUOUS_GATE_REFS = ['pre-commit-harness', 'ci:harness', 'ci:core'] as const;

/** Failures for gateClass ↔ gateRef rules (empty = ok). */
export async function assertGateRefs(
  paths: readonly ProofPath[],
  root: string = process.cwd()
): Promise<string[]> {
  const missing: string[] = [];
  const continuous = new Set<string>(CONTINUOUS_GATE_REFS);

  for (const p of paths) {
    const ref = p.gateRef;
    if (p.gateClass === 'continuous') {
      if (!continuous.has(ref)) {
        missing.push(
          `${p.id}: continuous gateRef must be pre-commit-harness|ci:harness|ci:core (got ${ref})`
        );
      }
      continue;
    }
    if (p.gateClass === 'workflow') {
      if (!ref.endsWith('.yml') && !ref.endsWith('.yaml')) {
        missing.push(`${p.id}: workflow gateRef must be a workflow filename (got ${ref})`);
        continue;
      }
      const abs = joinPath(root, '.github/workflows', ref);
      if (!(await Bun.file(abs).exists())) {
        missing.push(`${p.id}: workflow gateRef missing at .github/workflows/${ref}`);
      }
      continue;
    }
    if (p.gateClass === 'human-only') {
      if (ref !== 'none') {
        missing.push(`${p.id}: human-only gateRef must be 'none' (got ${ref})`);
      }
    }
  }
  return missing;
}

export function gateClassAllowsRef(gateClass: ProofGateClass, gateRef: string): boolean {
  if (gateClass === 'continuous') {
    return (CONTINUOUS_GATE_REFS as readonly string[]).includes(gateRef);
  }
  if (gateClass === 'workflow') return gateRef.endsWith('.yml') || gateRef.endsWith('.yaml');
  return gateRef === 'none';
}
