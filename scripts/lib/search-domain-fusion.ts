#!/usr/bin/env bun

import type { DomainHealthSummary } from './domain-health-read';

export interface FusionInputHit {
  file: string;
  score: number;
  reason?: string[];
}

export interface FusionAppliedHit<T extends FusionInputHit> extends T {
  fusionScore: number;
  fusionReason: string[];
  fusionBreakdown: {
    searchScoreNorm: number;
    domainScoreNorm: number;
    fusionWeight: number;
    penalties: number;
    preCapScore: number;
  };
  domainSnapshotRef: string;
}

export interface FusionOptions {
  fusionWeight?: number;
  strictP95Threshold?: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeDomainScore(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  if (value <= 1) return clamp01(value);
  return clamp01(value / 100);
}

export function applyDomainFusion<T extends FusionInputHit>(
  hits: T[],
  summary: DomainHealthSummary,
  options: FusionOptions = {}
): FusionAppliedHit<T>[] {
  if (hits.length === 0) return [];

  const fusionWeight = clamp01(Number.isFinite(options.fusionWeight) ? Number(options.fusionWeight) : 0.35);
  const maxSearchScore = Math.max(1, ...hits.map((hit) => Number.isFinite(hit.score) ? hit.score : 0));
  const domainScoreNorm = normalizeDomainScore(summary.overall.score);

  return hits
    .map((hit) => {
      const searchScoreNorm = clamp01((Number(hit.score) || 0) / maxSearchScore);
      const reasons: string[] = [];
      let penalties = 0;

      if (summary.overall.status === 'critical') {
        reasons.push('overall critical cap active');
      }
      if (summary.dns.status === 'critical') {
        penalties += 0.2;
        reasons.push('dns critical penalty -0.20');
      }
      if (summary.storage.status === 'critical') {
        penalties += 0.15;
        reasons.push('storage critical penalty -0.15');
      }
      if (summary.cookie.status === 'critical') {
        penalties += 0.1;
        reasons.push('cookie critical penalty -0.10');
      }

      const strictP95Ms = Number(summary.latency?.strictP95Ms);
      const strictThreshold = Number(options.strictP95Threshold);
      if (Number.isFinite(strictP95Ms) && Number.isFinite(strictThreshold) && strictP95Ms > strictThreshold) {
        penalties += 0.15;
        reasons.push(`strict p95 penalty -0.15 (${strictP95Ms}ms > ${strictThreshold}ms)`);
      }

      const blended = searchScoreNorm * (1 - fusionWeight) + domainScoreNorm * fusionWeight;
      const preCapScore = clamp01(blended - penalties);
      const fusionScore = summary.overall.status === 'critical'
        ? Math.min(preCapScore, 0.45)
        : preCapScore;

      if (reasons.length === 0) {
        reasons.push('no penalties applied');
      }

      return {
        ...hit,
        fusionScore: Number(fusionScore.toFixed(6)),
        fusionReason: reasons,
        fusionBreakdown: {
          searchScoreNorm: Number(searchScoreNorm.toFixed(6)),
          domainScoreNorm: Number(domainScoreNorm.toFixed(6)),
          fusionWeight: Number(fusionWeight.toFixed(6)),
          penalties: Number(penalties.toFixed(6)),
          preCapScore: Number(preCapScore.toFixed(6)),
        },
        domainSnapshotRef: `${summary.source}:${summary.domain}:${summary.checkedAt}`,
      };
    })
    .sort((a, b) => b.fusionScore - a.fusionScore || b.score - a.score);
}
