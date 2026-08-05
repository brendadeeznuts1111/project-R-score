// @see https://bun.com/docs/test/index#run-tests — bun:test

import { describe, expect, test } from 'bun:test';
import type { VaultMapFile } from '../lib/security/vault-map.ts';
import {
  buildTennisAgentAuthArtifact,
  TENNIS_AGENT_AUTH_ENV_KEY,
  TENNIS_AGENT_AUTH_KIND,
  TENNIS_AGENT_AUTH_PATH,
  TENNIS_AGENT_AUTH_SCHEMA_VERSION,
  TENNIS_HQ_RUNTIME_URL,
} from '../lib/tennis/agent-auth.ts';

function vaultMap(): VaultMapFile {
  return {
    schemaVersion: 1,
    kind: 'vault-map',
    envMap: {
      [TENNIS_AGENT_AUTH_ENV_KEY]: {
        vault: 'factorywager',
        item: 'FactoryWager Registry Token',
        key: 'password',
        type: 'token',
      },
    },
  };
}

describe('Tennis HQ agent auth artifact', () => {
  test('projects vault configuration without reading a secret value', () => {
    const artifact = buildTennisAgentAuthArtifact(vaultMap(), '2026-07-31T00:00:00.000Z');
    expect(artifact.schemaVersion).toBe(TENNIS_AGENT_AUTH_SCHEMA_VERSION);
    expect(artifact.kind).toBe(TENNIS_AGENT_AUTH_KIND);
    expect(artifact.path).toBe(TENNIS_AGENT_AUTH_PATH);
    expect(artifact.status).toBe('configured');
    expect(artifact.configured).toBe(true);
    expect(artifact.secretInRepo).toBe(false);
    expect(artifact.vaultRef).toBe(
      'pass://factorywager/FactoryWager Registry Token/password'
    );
    expect(JSON.stringify(artifact)).not.toContain('tokenPresent');
    expect(artifact.producerRuntime.url).toBe(TENNIS_HQ_RUNTIME_URL);
    expect(artifact.producerRuntime.platform).toBe('cloudflare-workers');
    expect(artifact.producerRuntime.contractAuth.registryTokenAccepted).toBe(false);
    expect(artifact.producerRuntime.contractAuth.unauthenticatedStatuses).toEqual([401, 503]);
    // Must match a real package.json script (not a dead alias).
    expect(artifact.producerRuntime.releaseVerification).toBe(
      'bun run cloudflare:deploy:verify'
    );
  });

  test('fails closed when the vault mapping is absent', () => {
    const artifact = buildTennisAgentAuthArtifact(null, '2026-07-31T00:00:00.000Z');
    expect(artifact.status).toBe('missing');
    expect(artifact.configured).toBe(false);
    expect(artifact.vaultRef).toBeNull();
  });

  test('publishes the owned producer runtime from the Tennis portal', async () => {
    const portal = await Bun.file('public/portal/tennis/index.html').text();
    expect(portal).toContain(`href="${TENNIS_HQ_RUNTIME_URL}"`);
    expect(portal).toContain(`${TENNIS_HQ_RUNTIME_URL}/api/version`);
  });
});
