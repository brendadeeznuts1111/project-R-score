// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  networkingArtifactToResults,
  runNetworkingChannelVerification,
} from '../lib/verification/networking-channel.ts';
import type { NetworkingProofArtifact } from '../lib/http/networking-proof.ts';

describe('lib/verification/networking-channel', () => {
  test('networkingArtifactToResults tags every row networking', () => {
    const artifact: NetworkingProofArtifact = {
      schemaVersion: 1,
      reportType: 'networking-verification',
      proofHash: 'abc',
      timestamp: 't',
      subsystem: 'networking',
      allOk: true,
      targets: [
        {
          name: 'Health',
          category: 'ops',
          optimizations: {
            'Cold fetch': { metric: '12ms (200)', status: 'PASS' },
            'Warm fetch': { metric: '3ms (200)', status: 'PASS' },
          },
          summary: { coldFetchMs: 12, warmFetchMs: 3 },
        },
      ],
      global: { checksPassed: 2, checksTotal: 2 },
    };
    const rows = networkingArtifactToResults(artifact);
    expect(rows.length).toBe(2); // target + global
    expect(rows.every(r => r.subsystem === 'networking')).toBe(true);
    expect(rows.every(r => r.name.startsWith('networking:'))).toBe(true);
    expect(rows.every(r => r.passed)).toBe(true);
  });

  test('runNetworkingChannelVerification prefers artifact when present', async () => {
    const { report, source } = await runNetworkingChannelVerification({
      preferArtifact: true,
      semanticTags: {
        channel: 'runtime',
        targetVersion: '1.4.0',
        provenanceId: 'test',
        testedAt: new Date().toISOString(),
        runtimeVersion: '1.4.0',
      },
    });
    expect(report.semanticTags.subsystems).toContain('networking');
    expect(report.summary.bySubsystem?.networking?.total).toBeGreaterThan(0);
    expect(report.results.every(r => r.subsystem === 'networking')).toBe(true);
    // Prefer artifact when public/registry/networking-proof.json exists
    if (await Bun.file('public/registry/networking-proof.json').exists()) {
      expect(source).toBe('artifact');
    }
  });
});
