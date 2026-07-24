// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { ensureRowTaxonomy, rehashChannelProof } from '../lib/verification/channel-proof.ts';
import type { ChannelAwareVerificationReport, VerificationResult } from '../lib/verification/types.ts';

describe('lib/verification/channel-proof', () => {
  test('ensureRowTaxonomy fills kind / introducedIn / stability for sparse rows', () => {
    const row = ensureRowTaxonomy({
      name: 'tls.getCACertificates',
      expected: 'ok',
      actual: 'ok',
      passed: true,
      canonical:
        'https://bun.com/blog/bun-v1.3.14#tls-getcacertificates-system-now-works-without-use-system-ca',
      subsystem: 'runtime',
    });
    expect(row.canonicalKind).toBe('ShipNote');
    expect(row.introducedIn).toBe('1.3.14');
    expect(row.canonicalStability).toBe('stable');
  });

  test('rehashChannelProof normalizes sparse rows and stable subsystems order', () => {
    const sparse: VerificationResult = {
      name: 'bundler:loader.css',
      expected: 'ok',
      actual: 'ok',
      passed: true,
      canonical: 'https://bun.com/docs/bundler/loaders#css',
    };
    const report = rehashChannelProof({
      type: 'ChannelAwareVerificationReport',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      bunVersion: '1.4.0',
      bunRevision: 'test',
      semanticTags: {
        channel: 'runtime',
        targetVersion: '1.4.0',
        provenanceId: 'test',
        testedAt: new Date().toISOString(),
        runtimeVersion: '1.4.0',
      },
      results: [sparse],
      summary: { passed: 1, total: 1, status: 'pass' },
      proofHash: '',
    } as ChannelAwareVerificationReport);

    expect(report.results[0]!.canonicalKind).toBeTruthy();
    expect(report.results[0]!.introducedIn).toBe('all');
    expect(report.results[0]!.subsystem).toBe('bundler');
    expect(report.semanticTags.subsystems).toEqual(['bundler']);
    expect(report.summary.bySubsystem?.bundler?.total).toBe(1);
    expect(report.proofHash.length).toBe(64);
  });
});
