#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type {
  DecisionEvidence,
  DecisionIndex,
  DecisionVerificationResult,
  EvidenceSource,
} from './lib/decision-evidence-types';

type VerifyOptions = {
  root: string;
  decisionId?: string;
  json: boolean;
};

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

function parseArgs(argv: string[]): VerifyOptions {
  return {
    root: resolve(argv.find((a) => a.startsWith('--root='))?.split('=')[1] || 'docs/decisions'),
    decisionId: argv.find((a) => a.startsWith('--decision='))?.split('=')[1],
    json: argv.includes('--json'),
  };
}

function stableSort(value: JsonLike): JsonLike {
  if (Array.isArray(value)) {
    return value.map((item) => stableSort(item));
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, JsonLike> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = stableSort((value as Record<string, JsonLike>)[key] as JsonLike);
    }
    return sorted;
  }
  return value;
}

function digestEvidence(evidence: DecisionEvidence): string {
  const payload = { ...evidence, evidence_digest: '' };
  const normalized = JSON.stringify(stableSort(payload as unknown as JsonLike));
  const hash = createHash('sha256').update(normalized).digest('hex');
  return `sha256:${hash}`;
}

function hasTier(sources: EvidenceSource[], tier: 'T1' | 'T2'): boolean {
  return sources.some((source) => source.tier === tier && source.verified);
}

function toExpectedStatus(input: { declared: string; hasT1: boolean; hasT2: boolean; expired: boolean }): 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED' {
  if (input.declared === 'REJECTED') return 'REJECTED';
  if (input.expired || !input.hasT1 || !input.hasT2) return 'REVIEW_REQUIRED';
  return 'APPROVED';
}

function parseDate(value: string): number {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : Number.NaN;
}

async function verifyOne(root: string, evidencePath: string): Promise<DecisionVerificationResult> {
  const fullPath = resolve(root, evidencePath);
  const evidence = JSON.parse(await readFile(fullPath, 'utf8')) as DecisionEvidence;
  const digestComputed = digestEvidence(evidence);
  const digestExpected = evidence.evidence_digest || '';
  const hasT1 = hasTier(evidence.sources, 'T1');
  const hasT2 = hasTier(evidence.sources, 'T2');
  const expiryTs = parseDate(evidence.expiry);
  const expired = Number.isFinite(expiryTs) ? expiryTs < Date.now() : true;

  const errors: string[] = [];
  if (!evidence.decision_id) errors.push('missing decision_id');
  if (!evidence.title) errors.push('missing title');
  if (!Number.isFinite(parseDate(evidence.timestamp))) errors.push('invalid timestamp');
  if (!Number.isFinite(expiryTs)) errors.push('invalid expiry');
  if (!Array.isArray(evidence.sources) || evidence.sources.length === 0) errors.push('missing sources');
  if (!digestExpected) errors.push('missing evidence_digest');
  if (digestExpected !== digestComputed) errors.push(`digest mismatch (${digestExpected} != ${digestComputed})`);
  const declared = (evidence.status || 'REVIEW_REQUIRED') as 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED';
  if (declared === 'APPROVED') {
    if (!hasT1) errors.push('missing verified T1 source');
    if (!hasT2) errors.push('missing verified T2 source');
  }
  const statusExpected = toExpectedStatus({
    declared,
    hasT1,
    hasT2,
    expired,
  });
  if (declared !== statusExpected) {
    errors.push(`status mismatch (${declared} should be ${statusExpected})`);
  }

  return {
    decisionId: evidence.decision_id,
    evidencePath: fullPath,
    digestExpected,
    digestComputed,
    digestMatches: digestExpected === digestComputed,
    hasT1,
    hasT2,
    expired,
    statusDeclared: declared,
    statusExpected,
    valid: errors.length === 0,
    errors,
  };
}

export async function verifyDecisionEvidence(options: VerifyOptions): Promise<{
  ok: boolean;
  root: string;
  checked: number;
  results: DecisionVerificationResult[];
}> {
  const indexPath = join(options.root, 'index.json');
  const index = JSON.parse(await readFile(indexPath, 'utf8')) as DecisionIndex;
  const entries = Array.isArray(index.decisions) ? index.decisions : [];
  const filtered = options.decisionId
    ? entries.filter((entry) => entry.decision_id === options.decisionId)
    : entries;

  const results: DecisionVerificationResult[] = [];
  for (const entry of filtered) {
    const result = await verifyOne(options.root, entry.evidence_path);
    if (entry.evidence_digest && entry.evidence_digest !== result.digestComputed) {
      result.errors.push(`index digest mismatch (${entry.evidence_digest} != ${result.digestComputed})`);
      result.valid = false;
    }
    if (entry.status && entry.status !== result.statusDeclared) {
      result.errors.push(`index status mismatch (${entry.status} != ${result.statusDeclared})`);
      result.valid = false;
    }
    results.push(result);
  }

  return {
    ok: results.every((result) => result.valid),
    root: options.root,
    checked: results.length,
    results,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const summary = await verifyDecisionEvidence(options);
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const result of summary.results) {
      const status = result.valid ? 'ok' : 'fail';
      console.log(`[${status}] ${result.decisionId} digest=${result.digestMatches ? 'match' : 'mismatch'} status=${result.statusDeclared}`);
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
    }
  }
  process.exit(summary.ok ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
