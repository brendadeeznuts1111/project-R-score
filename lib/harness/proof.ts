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

/** Named critical paths (expand carefully). */
export const CRITICAL_PROOF_PATHS: readonly ProofPath[] = [
  {
    id: 'branded-ids',
    claim: 'New domain IDs are branded after the boundary',
    kinds: ['boundary', 'unit'],
    evidence: ['bun tools/branded-id-check.ts --staged --strict', 'bun run check:brands:types'],
  },
  {
    id: 'install-verify',
    claim: 'Factory install produces a working Bun workspace',
    kinds: ['journey', 'deployed'],
    evidence: [
      'bun run proof:install',
      'bun run install:verify',
      '.github/workflows/repo-hygiene.yml',
    ],
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
  {
    id: 'unknown-param',
    claim: 'Bare unknown function params stay at parse*/FromUnknown edges',
    kinds: ['boundary'],
    evidence: ['bun eslint --config eslint.bun-native.config.ts --quiet'],
  },
  {
    id: 'day-loop-typecheck',
    claim: 'Advertised type-check covers spine agent edit surfaces',
    kinds: ['journey'],
    evidence: ['bun run type-check', 'tsconfig.check.json'],
  },
  {
    id: 'test-changed',
    claim: 'Day-loop test:changed runs import-graph-affected bun tests',
    kinds: ['journey'],
    evidence: [
      'bun run test:changed',
      'bun run test:changed -- HEAD~1',
      'bun run test:changed -- main',
      'bun scripts/bun-test-changed.ts',
    ],
  },
] as const;

export function proofPathById(id: string): ProofPath | undefined {
  // brand-ok — opaque catalog key
  return CRITICAL_PROOF_PATHS.find(p => p.id === id);
}
