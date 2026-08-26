// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// @updated --fetch-preconnect · changed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated --fetch-preconnect · fixed v1.1.23 · 2024-08-14 · https://bun.com/blog/bun-v1.1.23
// @verified --fetch-preconnect · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup
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
import { CONTROL_POLICY, type ControlProfile } from '../security/control-policy.ts';

export type RuntimePreloadDeclaration = {
  readonly owner: string;
  readonly module: string;
  readonly profiles: readonly ControlProfile[];
  readonly sideEffects: {
    readonly secrets: false;
    readonly network: false;
    readonly mutableSharedState: false;
  };
  readonly expiresAt: string;
  readonly evidence: readonly string[];
};

/** No application runtime preload is promoted. Test preload is a separate runner contract. */
export const RUNTIME_PRELOAD_DECLARATIONS: readonly RuntimePreloadDeclaration[] = [];

export const PRELOAD_CONCEPTS = [
  {
    id: 'test-runner-preload',
    owner: 'test-harness',
    surface: 'bunfig.toml [test].preload',
    policy: 'minimal environment normalization only',
  },
  {
    id: 'runtime-module-preload',
    owner: 'bun-runtime',
    surface: '-r/--preload/--require/--import and bunfig preload',
    policy: 'exact manifest grant required',
  },
  {
    id: 'fetch-preconnect',
    owner: 'networking',
    surface: '--fetch-preconnect',
    policy: 'exact origin grant required; denied offline and release',
  },
  {
    id: 'browser-resource-preload',
    owner: 'web-surface',
    surface: 'HTML rel=preload/modulepreload',
    policy: 'browser resource hint; never runtime module authority',
  },
] as const;

export type AgentEntrypointInventory = {
  readonly mcpServers: readonly string[];
  readonly skills: readonly string[];
  readonly agentDescriptors: readonly string[];
  readonly agentAndMcpTools: readonly string[];
  readonly browserPreloadConsumers: readonly string[];
};

export type AgentInventoryRatchet = {
  readonly count: number;
  readonly sha256: string;
};

export type AgentInventoryRatchets = Readonly<
  Record<keyof AgentEntrypointInventory, AgentInventoryRatchet>
>;

const EXPECTED_RATCHETS: AgentInventoryRatchets = {
  mcpServers: {
    count: 8,
    sha256: '91d77f8ee7f6864b58287c06bb9027fc2bedfc1e700a392765cb3de0d537f52c',
  },
  skills: {
    count: 26,
    sha256: '312baf73dc32597e9b8ce4367081ac9f25146c93a7130d562b14f664576391ba',
  },
  agentDescriptors: {
    count: 16,
    sha256: 'ec487665151d6772d89acb97fafcb37f92a45830725467d7440bdff5d2ec8bcf',
  },
  agentAndMcpTools: {
    count: 16,
    sha256: 'bfef446f45fdab430cd50e55c93faf186e4417e9d885c1c9d343aa1c9719dbfd',
  },
  browserPreloadConsumers: {
    count: 7,
    sha256: '3f9e704e09565439354df8d131fcc40a5db814f439e7df832f46f9f2408b0b2a',
  },
};

function paths(glob: string, root: string): string[] {
  return [...new Bun.Glob(glob).scanSync({ cwd: root, onlyFiles: true })].sort();
}

function containsBrowserPreload(source: string): boolean {
  return /rel=["'](?:module)?preload["']/.test(source);
}

export async function readAgentEntrypointInventory(
  root: string
): Promise<AgentEntrypointInventory> {
  const mcp = JSON.parse(await Bun.file(joinPath(root, '.mcp.json')).text()) as {
    mcpServers?: Record<string, unknown>;
  };
  const browserCandidates = [
    ...paths('lib/**/*.{ts,tsx,html}', root),
    ...paths('tools/**/*.{ts,tsx,html}', root),
    ...paths('scripts/**/*.{ts,tsx,html}', root),
    ...paths('server/**/*.{ts,tsx,html}', root),
    ...paths('projects/active/**/*.{ts,tsx,html}', root),
  ];
  const browserPreloadConsumers: string[] = [];
  for (const value of browserCandidates) {
    if (containsBrowserPreload(await Bun.file(joinPath(root, value)).text())) {
      browserPreloadConsumers.push(value);
    }
  }
  return {
    mcpServers: Object.keys(mcp.mcpServers ?? {}).sort(),
    skills: paths('.agents/skills/*/SKILL.md', root).map(value => value.split('/')[2] ?? value),
    agentDescriptors: paths('.agents/skills/*/agents/openai.yaml', root),
    agentAndMcpTools: [
      ...paths('scripts/**/*agent*.{ts,sh}', root),
      ...paths('scripts/**/*mcp*.{ts,sh}', root),
      ...paths('tools/**/*agent*.ts', root),
      ...paths('tools/**/*mcp*.ts', root),
    ].sort(),
    browserPreloadConsumers,
  };
}

function ratchet(values: readonly string[]): AgentInventoryRatchet {
  return {
    count: values.length,
    sha256: Bun.CryptoHasher.hash('sha256', JSON.stringify(values), 'hex'),
  };
}

export function calculateAgentInventoryRatchets(
  inventory: AgentEntrypointInventory
): AgentInventoryRatchets {
  return {
    mcpServers: ratchet(inventory.mcpServers),
    skills: ratchet(inventory.skills),
    agentDescriptors: ratchet(inventory.agentDescriptors),
    agentAndMcpTools: ratchet(inventory.agentAndMcpTools),
    browserPreloadConsumers: ratchet(inventory.browserPreloadConsumers),
  };
}

export async function agentInventoryIssues(root: string): Promise<readonly string[]> {
  const inventory = await readAgentEntrypointInventory(root);
  const actual = calculateAgentInventoryRatchets(inventory);
  const issues: string[] = [];
  for (const key of Object.keys(EXPECTED_RATCHETS) as Array<keyof AgentEntrypointInventory>) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(EXPECTED_RATCHETS[key])) {
      issues.push(
        `${key}: expected ${JSON.stringify(EXPECTED_RATCHETS[key])}, received ${JSON.stringify(actual[key])}`
      );
    }
  }
  const preload = CONTROL_POLICY.find(spec => spec.id === 'preload');
  const runtimeAliases = preload?.aliases
    .filter(alias => alias.source === 'cli')
    .map(alias => alias.name);
  if (
    JSON.stringify(runtimeAliases) !== JSON.stringify(['-r', '--preload', '--require', '--import'])
  ) {
    issues.push(`runtime preload alias drift: ${JSON.stringify(runtimeAliases)}`);
  }
  const preconnect = CONTROL_POLICY.find(spec => spec.id === 'fetch-preconnect');
  if (preconnect?.aliases[0]?.name !== '--fetch-preconnect') {
    issues.push('fetch preconnect alias drift');
  }
  const bunfig = await Bun.file(joinPath(root, 'bunfig.toml')).text();
  if (!/\[test\][\s\S]*?preload\s*=\s*"\.\/tests\/preload\.ts"/.test(bunfig)) {
    issues.push('test preload is not the declared minimal tests/preload.ts');
  }
  const testPreload = await Bun.file(joinPath(root, 'tests/preload.ts')).text();
  if (/\b(?:fetch|Bun\.spawn|Bun\.connect|Bun\.serve|password|secret)\s*\(/i.test(testPreload)) {
    issues.push('test preload gained network, subprocess, or secret side effects');
  }
  return issues;
}

export function expectedAgentInventoryRatchets(): AgentInventoryRatchets {
  return EXPECTED_RATCHETS;
}
