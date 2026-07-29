import { describe, expect, test } from 'bun:test';
import { runDomainRegistryDoctor } from '../scripts/domain-registry-status.ts';
import {
  evaluateReadiness,
  type DomainHealthSummary,
} from '../scripts/lib/domain-health-read.ts';
import { readinessExitCode } from '../scripts/project-online-readiness.ts';

describe('domain readiness blocked-state semantics', () => {
  test('missing optional local registry is blocked while committed env defaults pass', async () => {
    const nonce = `${process.pid}-${Date.now()}`;
    const doctor = await runDomainRegistryDoctor({
      registryPath: `/tmp/factorywager-missing-domain-registry-${nonce}.json`,
      latestPath: `/tmp/factorywager-missing-latest-${nonce}.json`,
      healthReportPath: `/tmp/factorywager-missing-health-${nonce}.json`,
      envFile: `/tmp/factorywager-missing-env-${nonce}`,
      json: true,
      doctor: true,
      fix: false,
      emitSecretsCommands: false,
    });

    expect(doctor.ok).toBe(false);
    expect(doctor.state).toBe('blocked');
    expect(doctor.checks.find(check => check.id === 'registry_file_exists')?.state).toBe(
      'blocked'
    );
    expect(doctor.checks.find(check => check.id === 'env_scaffold')?.state).toBe('pass');
    expect(doctor.checks.find(check => check.id === 'bucket_mapping_complete')?.detail).toBe(
      'not evaluated: no configured domains'
    );
    expect(doctor.blockedBySecrets).toEqual([]);
    expect(doctor.secretCommands).toBeUndefined();
  });

  test('missing required health evidence is blocked, not reported as observed degradation', () => {
    const summary: DomainHealthSummary = {
      domain: 'factory-wager.com',
      source: 'local',
      checkedAt: '2026-07-28T00:00:00.000Z',
      overall: { status: 'unknown', score: 0.35 },
      dns: { status: 'unknown', score: 0.35 },
      storage: { status: 'degraded', score: 0.5 },
      cookie: { status: 'unknown', score: 0.35 },
      notes: ['missing_local_health_report:/tmp/health-report.json'],
    };

    const readiness = evaluateReadiness(summary);
    expect(readiness).toMatchObject({
      ready: false,
      blocked: true,
      blockedBy: ['missing_local_health_report:/tmp/health-report.json'],
      state: 'blocked',
      status: 'degraded',
    });
    expect(readiness.reasons[0]).toContain('required_evidence_unavailable');
    expect(readinessExitCode(readiness)).toBe(2);
  });

  test('observed degraded health remains not-ready rather than blocked', () => {
    const summary: DomainHealthSummary = {
      domain: 'factory-wager.com',
      source: 'local',
      checkedAt: '2026-07-28T00:00:00.000Z',
      overall: { status: 'degraded', score: 0.5 },
      dns: { status: 'degraded', score: 0.5 },
      storage: { status: 'healthy', score: 1 },
      cookie: { status: 'healthy', score: 1 },
      notes: ['live_probe_latency_warning'],
    };

    const readiness = evaluateReadiness(summary);
    expect(readiness).toMatchObject({
      ready: false,
      blocked: false,
      state: 'not-ready',
      status: 'degraded',
    });
    expect(readinessExitCode(readiness)).toBe(2);
  });
});
