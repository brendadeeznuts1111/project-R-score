import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyDecisionEvidence } from '../scripts/decision-evidence-verify';
import type { DecisionEvidence } from '../scripts/lib/decision-evidence-types';

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

function stableSort(value: JsonLike): JsonLike {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    const sorted: Record<string, JsonLike> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = stableSort((value as Record<string, JsonLike>)[key] as JsonLike);
    }
    return sorted;
  }
  return value;
}

function digestFor(evidence: DecisionEvidence): string {
  const payload = { ...evidence, evidence_digest: '' };
  const hash = createHash('sha256').update(JSON.stringify(stableSort(payload as unknown as JsonLike))).digest('hex');
  return `sha256:${hash}`;
}

describe('decision evidence verify', () => {
  test('passes for valid approved decision with T1+T2 and matching digest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'decision-evidence-'));
    const decisionDir = join(root, 'BUN-UPGRADE-2024-003');
    await mkdir(decisionDir, { recursive: true });

    const evidence: DecisionEvidence = {
      decision_id: 'BUN-UPGRADE-2024-003',
      title: 'Bun v1.3.9 Production Upgrade',
      timestamp: '2024-03-15T14:30:00Z',
      expiry: '2030-01-01T00:00:00Z',
      status: 'APPROVED',
      evidence_score: 0.96,
      evidence_digest: '',
      sources: [
        { tier: 'T1', reference: 'official', verified: true, verification_method: 'release docs' },
        { tier: 'T2', reference: 'telemetry', verified: true, verification_method: 'canary metrics' },
      ],
      benchmarks: [],
      risks: [],
      mitigations: [],
      rollback_plan: { summary: 'rollback' },
    };
    evidence.evidence_digest = digestFor(evidence);

    await Bun.write(join(decisionDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await writeFile(
      join(root, 'index.json'),
      JSON.stringify(
        {
          decisions: [
            {
              decision_id: evidence.decision_id,
              evidence_path: 'BUN-UPGRADE-2024-003/evidence.json',
              status: 'APPROVED',
              evidence_digest: evidence.evidence_digest,
            },
          ],
        },
        null,
        2
      )
    );

    const result = await verifyDecisionEvidence({ root, json: true });
    expect(result.ok).toBe(true);
    expect(Bun.deepEquals(
      {
        valid: result.results[0]?.valid,
        hasT1: result.results[0]?.hasT1,
        hasT2: result.results[0]?.hasT2,
        statusDeclared: result.results[0]?.statusDeclared,
        statusExpected: result.results[0]?.statusExpected,
      },
      {
        valid: true,
        hasT1: true,
        hasT2: true,
        statusDeclared: 'APPROVED',
        statusExpected: 'APPROVED',
      },
      true
    )).toBe(true);
  });

  test('fails for digest mismatch and expired approved status', async () => {
    const root = await mkdtemp(join(tmpdir(), 'decision-evidence-fail-'));
    const decisionDir = join(root, 'BUN-UPGRADE-2024-003');
    await mkdir(decisionDir, { recursive: true });

    const evidence: DecisionEvidence = {
      decision_id: 'BUN-UPGRADE-2024-003',
      title: 'Bun v1.3.9 Production Upgrade',
      timestamp: '2024-03-15T14:30:00Z',
      expiry: '2024-06-15T23:59:59Z',
      status: 'APPROVED',
      evidence_score: 0.96,
      evidence_digest: 'sha256:bad',
      sources: [
        { tier: 'T1', reference: 'official', verified: true, verification_method: 'release docs' },
        { tier: 'T2', reference: 'telemetry', verified: true, verification_method: 'canary metrics' },
      ],
      benchmarks: [],
      risks: [],
      mitigations: [],
      rollback_plan: { summary: 'rollback' },
    };

    await Bun.write(join(decisionDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await writeFile(
      join(root, 'index.json'),
      JSON.stringify(
        {
          decisions: [
            {
              decision_id: evidence.decision_id,
              evidence_path: 'BUN-UPGRADE-2024-003/evidence.json',
              status: 'APPROVED',
              evidence_digest: evidence.evidence_digest,
            },
          ],
        },
        null,
        2
      )
    );

    const result = await verifyDecisionEvidence({ root, json: true });
    expect(result.ok).toBe(false);
    const errors = result.results[0]?.errors || [];
    expect(Bun.deepEquals(
      {
        hasDigestMismatch: errors.some((err) => err.includes('digest mismatch')),
        hasStatusMismatch: errors.some((err) => err.includes('status mismatch')),
      },
      { hasDigestMismatch: true, hasStatusMismatch: true },
      true
    )).toBe(true);
  });
});
