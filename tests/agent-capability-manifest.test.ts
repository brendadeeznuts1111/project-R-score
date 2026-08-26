import { describe, expect, test } from 'bun:test';

import {
  authorizeAgentInvocation,
  parseAgentCapabilityManifestWire,
  parseAgentInvocationWire,
} from '../lib/agents/capability-manifest.ts';
import {
  contentDigestForBytes,
  contentKeyForDigest,
} from '../lib/content-store/content-contract.ts';

function contentRef() {
  const bytes = new TextEncoder().encode('agent-owned content');
  const digest = contentDigestForBytes(bytes);
  const authority = { kind: 'source-system', sourceSystemId: 'agent-content-store' } as const;
  return {
    version: 1,
    digest,
    key: contentKeyForDigest(digest),
    byteLength: bytes.byteLength,
    mediaType: 'application/json',
    sources: [],
    contentRelations: [],
    packageDependencies: [],
    rights: { state: 'unknown' },
    authorities: {
      publisher: authority,
      storageSteward: authority,
      rightsReviewAuthority: authority,
      aliasPublisher: authority,
    },
  };
}

function manifestWire() {
  return {
    version: 1,
    identityId: 'tool.release-reader',
    kind: 'tool',
    profile: 'test',
    expiresAt: '2030-01-01T00:00:00.000Z',
    controls: [
      { control: 'preload', values: ['./approved.ts'], reason: 'owned test module' },
      {
        control: 'experimental-http2-fetch',
        values: ['enabled'],
        reason: 'bounded protocol evidence',
      },
    ],
    networkRouteIds: ['route.release-feed'],
    registries: [{ plane: 'metadata-read', origin: 'https://registry.example.test' }],
    channelAliases: ['bun.release.stable'],
    contentRefs: [contentRef()],
    experimentalApproval: {
      controls: ['experimental-http2-fetch'],
      expiresAt: '2028-01-01T00:00:00.000Z',
      reason: 'canary approval record',
    },
  };
}

function invocationWire() {
  return {
    identityId: 'tool.release-reader',
    profile: 'test',
    command: 'runtime',
    argv: ['--preload', './approved.ts', '--experimental-http2-fetch'],
    environment: {},
    bunfig: {},
    request: {},
    networkRouteIds: ['route.release-feed'],
    registries: [{ plane: 'metadata-read', origin: 'https://registry.example.test' }],
    channelAliases: ['bun.release.stable'],
    contentRefs: [contentRef()],
  };
}

describe('agent capability wire boundary', () => {
  test('authorizes exact capabilities through the shared control evaluator', () => {
    const manifest = parseAgentCapabilityManifestWire(manifestWire());
    const invocation = parseAgentInvocationWire(invocationWire());
    const result = authorizeAgentInvocation(
      manifest,
      invocation,
      new Date('2027-01-01T00:00:00.000Z')
    );
    expect(result.ok).toBeTrue();
    expect(result.controls.effective.map(item => item.control)).toEqual([
      'preload',
      'experimental-http2-fetch',
    ]);
  });

  test('denies undeclared routes, registry planes, channels, content, and flags', () => {
    const request = invocationWire();
    request.argv = ['--preload', './unowned.ts'];
    request.networkRouteIds = ['route.admin'];
    request.registries = [{ plane: 'publish-write', origin: 'https://registry.example.test' }];
    request.channelAliases = ['bun.release.canary'];
    request.contentRefs = [
      {
        ...contentRef(),
        digest: contentDigestForBytes(new TextEncoder().encode('different')),
        key: contentKeyForDigest(contentDigestForBytes(new TextEncoder().encode('different'))),
      },
    ];
    const result = authorizeAgentInvocation(
      parseAgentCapabilityManifestWire(manifestWire()),
      parseAgentInvocationWire(request),
      new Date('2027-01-01T00:00:00.000Z')
    );
    expect(result.ok).toBeFalse();
    expect(result.rejected).toContain('control:missing-grant:--preload');
    expect(result.rejected).toContain('network-route-denied:route.admin');
    expect(result.rejected).toContain(
      'registry-denied:publish-write|https://registry.example.test'
    );
    expect(result.rejected.some(value => value.startsWith('channel-denied:'))).toBeTrue();
    expect(result.rejected.some(value => value.startsWith('content-denied:'))).toBeTrue();
  });

  test('rejects unknown keys, alias/case tricks, and raw locator substitution', () => {
    expect(() =>
      parseAgentCapabilityManifestWire({ ...manifestWire(), Controls: [] })
    ).toThrow('unexpected key Controls');
    expect(() =>
      parseAgentCapabilityManifestWire({ ...manifestWire(), identityId: 'Tool.release-reader' })
    ).toThrow('lowercase canonical name');
    expect(() =>
      parseAgentCapabilityManifestWire({
        ...manifestWire(),
        controls: [{ control: 'Preload', values: ['./approved.ts'], reason: 'alias trick' }],
      })
    ).toThrow('lowercase canonical name');
    expect(() =>
      parseAgentInvocationWire({
        ...invocationWire(),
        contentRefs: [{ locator: 'https://mutable.example.test/latest.json' }],
      })
    ).toThrow('Invalid ContentRef');
  });

  test('denies expired manifests and experimental approvals', () => {
    const expiredManifest = parseAgentCapabilityManifestWire({
      ...manifestWire(),
      expiresAt: '2026-01-01T00:00:00.000Z',
    });
    const invocation = parseAgentInvocationWire(invocationWire());
    expect(
      authorizeAgentInvocation(expiredManifest, invocation, new Date('2027-01-01T00:00:00.000Z'))
        .rejected
    ).toContain('manifest-expired');

    const expiredApproval = parseAgentCapabilityManifestWire({
      ...manifestWire(),
      experimentalApproval: {
        controls: ['experimental-http2-fetch'],
        expiresAt: '2026-01-01T00:00:00.000Z',
        reason: 'old evidence',
      },
    });
    expect(
      authorizeAgentInvocation(expiredApproval, invocation, new Date('2027-01-01T00:00:00.000Z'))
        .rejected
    ).toContain('experimental-approval-expired');
    expect(() => {
      const missingApproval = manifestWire();
      delete (missingApproval as { experimentalApproval?: unknown }).experimentalApproval;
      parseAgentCapabilityManifestWire(missingApproval);
    }).toThrow('missing exact approval for experimental-http2-fetch');
  });

  test('rejects credential-bearing and non-origin registry locators', () => {
    expect(() =>
      parseAgentCapabilityManifestWire({
        ...manifestWire(),
        registries: [
          { plane: 'metadata-read', origin: 'https://user:secret@registry.example.test' },
        ],
      })
    ).toThrow('credential-free');
    expect(() =>
      parseAgentCapabilityManifestWire({
        ...manifestWire(),
        registries: [
          { plane: 'metadata-read', origin: 'https://registry.example.test/package' },
        ],
      })
    ).toThrow('expected exact origin');
  });
});
