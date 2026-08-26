// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/glob#quickstart
import { joinPath } from '../path-bun.ts';

export type AgentConsumerKind = 'agent-tool' | 'mcp-configuration' | 'skill-executable';
export type AgentEffectKind = 'network' | 'subprocess' | 'registry' | 'channel' | 'content';
export type AgentConsumerEnforcement = 'authorized' | 'unowned' | 'effect-free';

export interface AgentConsumerAuthorityReview {
  readonly profile: string;
  readonly executable: string;
  readonly args: string;
  readonly cwd: string;
  readonly environment: string;
  readonly stdio: string;
  readonly network: string;
  readonly offline: string;
  readonly flagPassthrough: string;
  readonly defaultDeny: boolean;
}

export interface AgentExecutableEntrypoint {
  readonly id: string; // brand-ok -- repository inventory key, not a domain entity ID
  readonly kind: AgentConsumerKind;
  readonly owner: string;
  readonly source: string;
  readonly effects: readonly AgentEffectKind[];
  readonly enforcement: AgentConsumerEnforcement;
  readonly authority: AgentConsumerAuthorityReview;
}

export interface AgentConsumerInventoryRatchet {
  readonly count: number;
  readonly sha256: string;
}

const EXPECTED_AGENT_CONSUMER_RATCHET: AgentConsumerInventoryRatchet = {
  count: 59,
  sha256: 'bc7be76cde6332ea5556c06f0f485c204e0d069b9d24eefe33d59cd97aefde38',
};

type DiscoveredAgentEntrypoint = Omit<AgentExecutableEntrypoint, 'authority' | 'enforcement'>;

type OwnershipProfile = Omit<AgentConsumerAuthorityReview, 'profile'> & {
  readonly enforcement: AgentConsumerEnforcement;
};

type OwnershipManifest = {
  readonly schema: 'factorywager.agent-consumer-ownership.v1';
  readonly profiles: Readonly<Record<string, OwnershipProfile>>;
  readonly assignments: Readonly<
    Record<string, Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>>
  >;
};

const SOURCE_EFFECTS: ReadonlyArray<readonly [AgentEffectKind, RegExp]> = [
  ['network', /\b(?:fetch|Bun\.(?:connect|serve))\s*\(/],
  ['subprocess', /\bBun\.(?:spawn|spawnSync|which)\s*\(|\b(?:execFile|spawn)\s*\(/],
  ['registry', /\b(?:resolveRegistryPackage|getRegistryPackage|publishRegistry|RegistryClient)\b/],
  ['channel', /\b(?:ChannelAlias|channelAlias|telegram|Telegram)\b/],
  ['content', /\b(?:ContentRef|ContentStore|contentDigest|contentStore)\b/],
];

function files(glob: string, root: string): string[] {
  return [...new Bun.Glob(glob).scanSync({ cwd: root, onlyFiles: true })].sort();
}

function hasShebang(source: string): boolean {
  return source.startsWith('#!');
}

function sourceEffects(source: string, path: string): readonly AgentEffectKind[] {
  const effects = SOURCE_EFFECTS.filter(([, pattern]) => pattern.test(source)).map(
    ([kind]) => kind
  );
  if (path.endsWith('.sh') && !effects.includes('subprocess')) effects.push('subprocess');
  return effects.sort();
}

function sourceRow(
  kind: Exclude<AgentConsumerKind, 'mcp-configuration'>,
  owner: string,
  path: string,
  source: string
): DiscoveredAgentEntrypoint {
  const effects = sourceEffects(source, path);
  return {
    id: `${kind}:${path}`,
    kind,
    owner,
    source: path,
    effects,
  };
}

function parseMcpRow(
  id: string, // brand-ok -- workspace MCP config key, not a domain entity ID
  value: unknown
): DiscoveredAgentEntrypoint {
  const record =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const remote = record.type === 'http';
  return {
    id: `mcp-configuration:${id}`,
    kind: 'mcp-configuration',
    owner: `workspace-mcp:${id}`,
    source: '.mcp.json',
    effects: [remote ? 'network' : 'subprocess'],
  };
}

async function readOwnershipManifest(root: string): Promise<OwnershipManifest> {
  return (await Bun.file(
    joinPath(root, 'config/agent-consumer-ownership.json')
  ).json()) as OwnershipManifest;
}

function expandOwnershipManifest(
  manifest: OwnershipManifest
): Map<string, AgentExecutableEntrypoint> {
  if (manifest.schema !== 'factorywager.agent-consumer-ownership.v1') {
    throw new TypeError(`Unsupported agent consumer ownership schema: ${String(manifest.schema)}`);
  }
  const reviewed = new Map<string, AgentExecutableEntrypoint>();
  for (const [profileName, owners] of Object.entries(manifest.assignments)) {
    const profile = manifest.profiles[profileName];
    if (!profile) throw new TypeError(`Unknown agent consumer ownership profile: ${profileName}`);
    for (const [owner, effectGroups] of Object.entries(owners)) {
      if (!owner.trim()) throw new TypeError(`Agent consumer profile ${profileName} has no owner`);
      for (const [effectList, ids] of Object.entries(effectGroups)) {
        const effects = effectList === '' ? [] : effectList.split(',');
        if (effects.some(effect => !SOURCE_EFFECTS.some(([kind]) => kind === effect))) {
          throw new TypeError(`Agent consumer profile ${profileName} has an unknown effect`);
        }
        for (const id of ids) {
          if (reviewed.has(id)) throw new TypeError(`Duplicate agent consumer review: ${id}`);
          const kind = id.split(':', 1)[0] as AgentConsumerKind;
          const source = kind === 'mcp-configuration' ? '.mcp.json' : id.slice(id.indexOf(':') + 1);
          reviewed.set(id, {
            id,
            kind,
            owner,
            source,
            effects: effects as AgentEffectKind[],
            enforcement: profile.enforcement,
            authority: {
              profile: profileName,
              executable: profile.executable,
              args: profile.args,
              cwd: profile.cwd,
              environment: profile.environment,
              stdio: profile.stdio,
              network: profile.network,
              offline: profile.offline,
              flagPassthrough: profile.flagPassthrough,
              defaultDeny: profile.defaultDeny,
            },
          });
        }
      }
    }
  }
  return reviewed;
}

/**
 * Discover executable surfaces only: configured MCP launches, executable
 * first-party agent/MCP files, and executable files shipped by local skills.
 * Helpers without a shebang and declarative SKILL.md files are intentionally
 * not executable entrypoints.
 */
export async function readAgentExecutableEntrypoints(
  root: string
): Promise<readonly AgentExecutableEntrypoint[]> {
  const discovered: DiscoveredAgentEntrypoint[] = [];
  const mcp = JSON.parse(await Bun.file(joinPath(root, '.mcp.json')).text()) as {
    mcpServers?: Record<string, unknown>;
  };
  for (const [id, value] of Object.entries(mcp.mcpServers ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    discovered.push(parseMcpRow(id, value));
  }

  for (const path of [
    ...files('scripts/**/*{agent,mcp}*.{ts,sh}', root),
    ...files('tools/**/*{agent,mcp}*.{ts,sh}', root),
  ].sort()) {
    const source = await Bun.file(joinPath(root, path)).text();
    if (hasShebang(source)) discovered.push(sourceRow('agent-tool', 'project-r', path, source));
  }

  for (const path of files('.agents/skills/**/*.{ts,sh}', root)) {
    const source = await Bun.file(joinPath(root, path)).text();
    if (!hasShebang(source)) continue;
    const skillName = path.split('/')[2] ?? 'unknown';
    discovered.push(sourceRow('skill-executable', `skill:${skillName}`, path, source));
  }

  const reviewed = expandOwnershipManifest(await readOwnershipManifest(root));
  const discoveredById = new Map(discovered.map(row => [row.id, row]));
  const issues: string[] = [];
  for (const row of discovered) {
    const review = reviewed.get(row.id);
    if (!review) {
      issues.push(`unreviewed executable surface: ${row.id}`);
      continue;
    }
    if (review.kind !== row.kind || review.owner !== row.owner || review.source !== row.source) {
      issues.push(`agent consumer identity drift: ${row.id}`);
    }
    if (JSON.stringify(review.effects) !== JSON.stringify(row.effects)) {
      issues.push(`agent consumer effect drift: ${row.id}`);
    }
    if (review.enforcement === 'effect-free' && review.effects.length !== 0) {
      issues.push(`effect-free agent consumer declares effects: ${row.id}`);
    }
    if (review.enforcement === 'authorized' && !review.authority.defaultDeny) {
      issues.push(`authorized agent consumer is not default-deny: ${row.id}`);
    }
  }
  for (const id of reviewed.keys()) {
    if (!discoveredById.has(id)) issues.push(`stale executable review: ${id}`);
  }
  if (issues.length > 0) throw new TypeError(issues.join('\n'));
  return [...reviewed.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function calculateAgentConsumerRatchet(
  rows: readonly AgentExecutableEntrypoint[]
): AgentConsumerInventoryRatchet {
  return {
    count: rows.length,
    sha256: Bun.CryptoHasher.hash('sha256', JSON.stringify(rows), 'hex'),
  };
}

export function summarizeAgentConsumers(rows: readonly AgentExecutableEntrypoint[]): {
  readonly total: number;
  readonly authorized: number;
  readonly unowned: number;
  readonly effectFree: number;
  readonly unownedByEffect: Readonly<Record<AgentEffectKind, number>>;
} {
  const unowned = rows.filter(row => row.enforcement === 'unowned');
  return {
    total: rows.length,
    authorized: rows.filter(row => row.enforcement === 'authorized').length,
    unowned: unowned.length,
    effectFree: rows.filter(row => row.enforcement === 'effect-free').length,
    unownedByEffect: Object.fromEntries(
      (['network', 'subprocess', 'registry', 'channel', 'content'] as const).map(effect => [
        effect,
        unowned.filter(row => row.effects.includes(effect)).length,
      ])
    ) as Readonly<Record<AgentEffectKind, number>>,
  };
}

export async function agentConsumerInventoryIssues(root: string): Promise<readonly string[]> {
  const rows = await readAgentExecutableEntrypoints(root);
  const ids = rows.map(row => row.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  const issues = duplicates.map(id => `duplicate executable classification: ${id}`);
  const actual = calculateAgentConsumerRatchet(rows);
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_AGENT_CONSUMER_RATCHET)) {
    issues.push(
      `agent consumer inventory drift: expected ${JSON.stringify(EXPECTED_AGENT_CONSUMER_RATCHET)}, received ${JSON.stringify(actual)}`
    );
  }
  return issues;
}

export function expectedAgentConsumerRatchet(): AgentConsumerInventoryRatchet {
  return EXPECTED_AGENT_CONSUMER_RATCHET;
}
