/**
 * Proof claim kinds for harness “done” checklists.
 * @see ../../docs/harness/PROOF.md
 */

export type ProofKind = 'unit' | 'boundary' | 'journey' | 'deployed';

export type ProofPath = {
  id: string; // brand-ok — opaque proof-path catalog key
  claim: string;
  kinds: ProofKind[];
  evidence: string[];
};

/** Start set of named critical paths (expand carefully). */
export const CRITICAL_PROOF_PATHS: readonly ProofPath[] = [
  {
    id: 'branded-ids',
    claim: 'New domain IDs are branded after the boundary',
    kinds: ['boundary', 'unit'],
    evidence: ['bun tools/branded-id-check.ts --staged --strict', 'bun run check:brands:types'],
  },
  {
    id: 'install-verify',
    claim: 'Root Bun install layout is healthy',
    kinds: ['deployed'],
    evidence: ['bun run install:verify'],
  },
  {
    id: 'search-governance',
    claim: 'Search bench gate policy holds in CI',
    kinds: ['journey'],
    evidence: ['.github/workflows/search-governance.yml'],
  },
  {
    id: 'path-bun',
    claim: 'Spine lib/ does not import path/node:path',
    kinds: ['boundary'],
    evidence: ['bun run check:path-bun'],
  },
  {
    id: 'bun-env',
    claim: 'Spine lib/ + scripts/ do not read environment via the Node process object',
    kinds: ['boundary'],
    evidence: ['bun run check:bun-env'],
  },
] as const;

export function proofPathById(id: string): ProofPath | undefined {
  // brand-ok — opaque catalog key
  return CRITICAL_PROOF_PATHS.find(p => p.id === id);
}
