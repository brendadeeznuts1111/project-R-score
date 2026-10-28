import { describe, expect, test } from 'bun:test';

import {
  AgentInvocationDeniedError,
  executeAuthorizedAgentInvocation,
} from '../lib/agents/authorized-execution.ts';
import {
  contentDigestForBytes,
  contentKeyForDigest,
} from '../lib/content-store/content-contract.ts';

function contentRef() {
  const bytes = new TextEncoder().encode('consumer inventory fixture');
  const digest = contentDigestForBytes(bytes);
  const authority = { kind: 'source-system', sourceSystemId: 'agent-consumer-test' } as const;
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
    identityId: 'tool.consumer-test',
    kind: 'tool',
    profile: 'test',
    expiresAt: '2030-01-01T00:00:00.000Z',
    controls: [],
    networkRouteIds: ['route.test'],
    registries: [{ plane: 'metadata-read', origin: 'https://registry.example.test' }],
    channelAliases: [],
    contentRefs: [],
  };
}

function invocationWire() {
  return {
    identityId: 'tool.consumer-test',
    profile: 'test',
    command: 'runtime',
    argv: [],
    environment: {},
    bunfig: {},
    request: {},
    networkRouteIds: ['route.test'],
    registries: [{ plane: 'metadata-read', origin: 'https://registry.example.test' }],
    channelAliases: [],
    contentRefs: [],
  };
}

describe('authorized agent execution boundary', () => {
  test('enters injected effects only after exact parsing and authorization', async () => {
    let effects = 0;
    const result = await executeAuthorizedAgentInvocation({
      manifest: manifestWire(),
      invocation: invocationWire(),
      now: new Date('2027-01-01T00:00:00.000Z'),
      effects: {
        execute(context) {
          effects += 1;
          expect(String(context.manifest.identityId)).toBe('tool.consumer-test');
          return 'ran';
        },
      },
    });
    expect(result).toBe('ran');
    expect(effects).toBe(1);
  });

  for (const [name, mutate] of [
    ['unknown request control', (wire: ReturnType<typeof invocationWire>) => {
      wire.request = { Proxy: 'https://proxy.example.test' };
    }],
    ['unknown bunfig control', (wire: ReturnType<typeof invocationWire>) => {
      wire.bunfig = { 'install.Registry': 'https://registry.example.test' };
    }],
    ['undeclared route', (wire: ReturnType<typeof invocationWire>) => {
      wire.networkRouteIds = ['route.admin'];
    }],
    ['undeclared registry', (wire: ReturnType<typeof invocationWire>) => {
      wire.registries = [{ plane: 'publish', origin: 'https://registry.example.test' }];
    }],
  ] as const) {
    test(`rejects ${name} before effects`, async () => {
      let effects = 0;
      const invocation = invocationWire();
      mutate(invocation);
      await expect(
        executeAuthorizedAgentInvocation({
          manifest: manifestWire(),
          invocation,
          now: new Date('2027-01-01T00:00:00.000Z'),
          effects: { execute: () => (effects += 1) },
        })
      ).rejects.toBeInstanceOf(AgentInvocationDeniedError);
      expect(effects).toBe(0);
    });
  }

  test('rejects malformed manifests and invocations before effects', async () => {
    let effects = 0;
    await expect(
      executeAuthorizedAgentInvocation({
        manifest: { ...manifestWire(), unexpected: true },
        invocation: invocationWire(),
        effects: { execute: () => (effects += 1) },
      })
    ).rejects.toThrow('unexpected key unexpected');
    expect(effects).toBe(0);
  });

  test('rejects undeclared channels and full ContentRef substitution before effects', async () => {
    let effects = 0;
    const channelInvocation = {
      ...invocationWire(),
      channelAliases: ['release-canary'],
    };
    await expect(
      executeAuthorizedAgentInvocation({
        manifest: manifestWire(),
        invocation: channelInvocation,
        now: new Date('2027-01-01T00:00:00.000Z'),
        effects: { execute: () => (effects += 1) },
      })
    ).rejects.toBeInstanceOf(AgentInvocationDeniedError);

    const allowedRef = contentRef();
    const contentInvocation = { ...invocationWire(), contentRefs: [{ ...allowedRef, mediaType: 'image/png' }] };
    await expect(
      executeAuthorizedAgentInvocation({
        manifest: { ...manifestWire(), contentRefs: [allowedRef] },
        invocation: contentInvocation,
        now: new Date('2027-01-01T00:00:00.000Z'),
        effects: { execute: () => (effects += 1) },
      })
    ).rejects.toBeInstanceOf(AgentInvocationDeniedError);
    expect(effects).toBe(0);
  });
});
