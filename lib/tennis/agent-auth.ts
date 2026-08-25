import type { VaultMapFile } from '../security/vault-map.ts';

export const TENNIS_AGENT_AUTH_KIND = 'tennis-hq-agent-auth' as const;
export const TENNIS_AGENT_AUTH_PATH = '/registry/tennis/agent-auth.json' as const;
export const TENNIS_AGENT_AUTH_SCHEMA_VERSION = 4 as const;
export const TENNIS_AGENT_AUTH_ENV_KEY = 'FACTORY_WAGER_TOKEN' as const;
export const TENNIS_AGENT_AUTH_REGISTRY_URL = 'https://registry.factory-wager.com/api/npm' as const;
export const TENNIS_HQ_RUNTIME_URL = 'https://tennis.factory-wager.com' as const;

export type TennisAgentAuthArtifact = {
  schemaVersion: typeof TENNIS_AGENT_AUTH_SCHEMA_VERSION;
  kind: typeof TENNIS_AGENT_AUTH_KIND;
  path: typeof TENNIS_AGENT_AUTH_PATH;
  generatedAt: string;
  tenantId: 'tennis';
  consumer: 'tennis-hq-cloud-agent';
  label: string;
  purpose: string;
  status: 'configured' | 'missing';
  configured: boolean;
  registryUrl: string;
  envKey: typeof TENNIS_AGENT_AUTH_ENV_KEY;
  envAliases: readonly ['FW_REGISTRY_TOKEN', 'REGISTRY_SECRET'];
  vaultRef: string | null;
  vaultItem: string | null;
  vault: string | null;
  tokenKind: 'shared-bearer';
  secretInRepo: false;
  handoff: {
    operatorEnvFile: string;
    inject: string;
    npmrcLine: string;
    bunfigScopes: readonly ['@factorywager'];
  };
  planes: {
    read: string;
    write: string;
  };
  producerRuntime: {
    url: typeof TENNIS_HQ_RUNTIME_URL;
    worker: 'tennis-hq';
    platform: 'cloudflare-workers';
    ownership: 'factorywager-operator';
    versionPath: '/api/version';
    contractBasePath: '/api/v1';
    contractAuth: {
      mode: 'bearer-fail-closed';
      producerEnvKey: 'PARTNER_API_TOKEN';
      registryTokenAccepted: false;
      unauthenticatedStatuses: readonly [401, 503];
    };
    releaseVerification: 'bun run cloudflare:deploy:verify';
  };
  docs: readonly string[];
  portal: {
    board: string;
    md: string;
    registry: string;
    vaultMap: string;
    envBoard: string;
  };
};

/** Build public configuration evidence without reading or serializing the secret value. */
export function buildTennisAgentAuthArtifact(
  vaultMap: VaultMapFile | null,
  generatedAt = new Date().toISOString()
): TennisAgentAuthArtifact {
  const entry = vaultMap?.envMap[TENNIS_AGENT_AUTH_ENV_KEY];
  const vault = entry?.vault?.trim() || null;
  const item = entry?.item?.trim() || null;
  const field = entry?.key?.trim() || 'password';
  const configured = Boolean(vault && item);

  return {
    schemaVersion: TENNIS_AGENT_AUTH_SCHEMA_VERSION,
    kind: TENNIS_AGENT_AUTH_KIND,
    path: TENNIS_AGENT_AUTH_PATH,
    generatedAt,
    tenantId: 'tennis',
    consumer: 'tennis-hq-cloud-agent',
    label: 'Tennis HQ · FactoryWager registry auth',
    purpose:
      'Cloud agent remote sandbox: install scoped packages and publish to FactoryWager registry',
    status: configured ? 'configured' : 'missing',
    configured,
    registryUrl: TENNIS_AGENT_AUTH_REGISTRY_URL,
    envKey: TENNIS_AGENT_AUTH_ENV_KEY,
    envAliases: ['FW_REGISTRY_TOKEN', 'REGISTRY_SECRET'],
    vaultRef: configured ? `pass://${vault}/${item}/${field}` : null,
    vaultItem: item,
    vault,
    tokenKind: 'shared-bearer',
    secretInRepo: false,
    handoff: {
      operatorEnvFile: '~/.reasonix/tennis-hq-registry-token.env',
      inject: `export ${TENNIS_AGENT_AUTH_ENV_KEY} from vault or operator handoff; never commit`,
      npmrcLine: '@factorywager:registry=https://registry.factory-wager.com/api/npm',
      bunfigScopes: ['@factorywager'],
    },
    planes: {
      read: 'Public Pages/R2 mirror — GET/HEAD without token',
      write: `Bearer ${TENNIS_AGENT_AUTH_ENV_KEY} — local serve-public or private publish path (Pages rejects writes)`,
    },
    producerRuntime: {
      url: TENNIS_HQ_RUNTIME_URL,
      worker: 'tennis-hq',
      platform: 'cloudflare-workers',
      ownership: 'factorywager-operator',
      versionPath: '/api/version',
      contractBasePath: '/api/v1',
      contractAuth: {
        mode: 'bearer-fail-closed',
        producerEnvKey: 'PARTNER_API_TOKEN',
        registryTokenAccepted: false,
        unauthenticatedStatuses: [401, 503],
      },
      releaseVerification: 'bun run cloudflare:deploy:verify',
    },
    docs: [
      'docs/harness/tenants/tennis-hq-registry.md',
      'docs/registry-client.md',
      'docs/guides/REGISTRY_PRODUCTION_READINESS.md',
    ],
    portal: {
      board: '/portal/tennis/',
      md: '/portal/tennis.md',
      registry: '/registry/tennis/registry.json',
      vaultMap: '/registry/vault-map.json',
      envBoard: '/portal/env/',
    },
  };
}
