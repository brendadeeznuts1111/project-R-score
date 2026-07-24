// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  probeRegistryClientPublishRequiresApiKey,
  REGISTRY_CLIENT_PROBE_PACKAGE,
  REGISTRY_CLIENT_PROBE_VERSION,
  REGISTRY_CLIENT_SDK_VERSION,
  runRegistryClientVerification,
} from '../lib/verification/registry-client-probes.ts';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';

describe('registry-client verification probes', () => {
  test('SDK version matches package.json', () => {
    expect(REGISTRY_CLIENT_SDK_VERSION).toBe('1.0.0');
    expect(REGISTRY_CLIENT_PROBE_PACKAGE).toBe('@factorywager/registry-client');
    expect(REGISTRY_CLIENT_PROBE_VERSION).toBe('1.0.0');
  });

  test('canonical refs exist for resolve, download, publish', () => {
    expect(CANONICAL_REFS['registry-client resolve']).toContain('registry-client.md#resolve');
    expect(CANONICAL_REFS['registry-client download']).toContain('registry-client.md#download');
    expect(CANONICAL_REFS['registry-client publish']).toContain('registry-client.md#publish');
  });

  test('publish probe rejects missing apiKey', async () => {
    const row = await probeRegistryClientPublishRequiresApiKey();
    expect(row.passed).toBe(true);
    expect(row.probe).toBe('registry-client.publish');
    expect(row.canonical).toContain('registry-client.md');
  });

  test('runRegistryClientVerification returns three probes', async () => {
    const report = await runRegistryClientVerification();
    expect(report.results).toHaveLength(3);
    expect(report.results.map(r => r.probe)).toEqual([
      'registry-client.resolve',
      'registry-client.download',
      'registry-client.publish',
    ]);
    const publish = report.results.find(r => r.probe === 'registry-client.publish');
    expect(publish?.passed).toBe(true);
  });
});
