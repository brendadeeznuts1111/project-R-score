/**
 * Monorepo inject project map — SSOT for template/out/agent triples.
 * Shell `proton-inject.sh` and TS inject share this catalog.
 *
 * @see packages/proton-pass (inject/run)
 * @see docs/harness/tenants/proton-integration.md
 */
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { joinPath } from '../path-bun.ts';
import {
  agentConfigFor,
  findPassCli,
  injectEnvFile,
  type AgentSessionConfig,
  type InjectResult,
} from '@factorywager/proton-pass';

export type ProtonInjectProject =
  | 'factorywager'
  | 'cloudflare'
  | 'bet-ticker'
  | 'cascade-mover'
  | 'scanner'
  | 'kalshi-bot'
  | 'kalshi';

export type ProtonProjectSpec = {
  /** pass-cli / package agent name */
  agent: string;
  /** Relative to monorepo root */
  templateRel: string;
  /** Relative to monorepo root */
  outRel: string;
  /** Allow --reasonix (CF/Telegram derived cache) */
  reasonix?: boolean;
};

/** Project → paths (relative to monorepo root). */
export const PROTON_INJECT_PROJECTS: Record<string, ProtonProjectSpec> = {
  factorywager: {
    agent: 'factorywager',
    templateRel: 'env.template',
    outRel: '.env',
    reasonix: true,
  },
  cloudflare: {
    agent: 'factorywager',
    templateRel: 'env.template',
    outRel: '.env',
    reasonix: true,
  },
  'bet-ticker': {
    agent: 'bet-ticker',
    templateRel: 'projects/active/enterprise/bet-ticker-worker-v1.1/env.template',
    outRel: 'projects/active/enterprise/bet-ticker-worker-v1.1/.env',
  },
  'cascade-mover': {
    agent: 'cascade-mover',
    templateRel: 'projects/active/enterprise/cascade-mover-v3/env.template',
    outRel: 'projects/active/enterprise/cascade-mover-v3/.env',
  },
  scanner: {
    agent: 'factorywager',
    templateRel: 'projects/active/analysis/scanner/env.template',
    outRel: 'projects/active/analysis/scanner/.env',
  },
  'kalshi-bot': {
    agent: 'kalshi-bot',
    templateRel: 'Kalshi-bot/env.template',
    outRel: 'Kalshi-bot/.env',
  },
  kalshi: {
    agent: 'kalshi-bot',
    templateRel: 'Kalshi-bot/env.template',
    outRel: 'Kalshi-bot/.env',
  },
};

export function listProtonProjects(): string[] {
  return Object.keys(PROTON_INJECT_PROJECTS).filter(k => k !== 'kalshi');
}

export function resolveProtonProject(
  name: string,
  repoRoot: string
): {
  agent: string;
  agentCfg: AgentSessionConfig;
  template: string;
  out: string;
  reasonix: boolean;
} {
  const spec = PROTON_INJECT_PROJECTS[name];
  if (!spec) {
    throw new Error(`Unknown project "${name}". Projects: ${listProtonProjects().join(', ')}`);
  }
  return {
    agent: spec.agent,
    agentCfg: agentConfigFor(spec.agent),
    template: joinPath(repoRoot, spec.templateRel),
    out: joinPath(repoRoot, spec.outRel),
    reasonix: Boolean(spec.reasonix),
  };
}

/**
 * Inject a monorepo project template via @factorywager/proton-pass.
 * Does not print secret values.
 */
export async function injectProtonProject(
  name: string,
  repoRoot: string,
  opts?: { reason?: string }
): Promise<InjectResult & { template: string }> {
  const resolved = resolveProtonProject(name, repoRoot);
  const passCli = await findPassCli();
  if (!passCli) {
    return {
      ok: false,
      outFile: resolved.out,
      template: resolved.template,
      agent: {
        ok: false,
        mode: 'missing-token',
        sessionDir: resolved.agentCfg.sessionDir,
        detail: 'pass-cli not on PATH',
      },
      code: 1,
      detail: 'pass-cli not on PATH',
    };
  }
  const result = await injectEnvFile({
    passCli,
    agent: resolved.agentCfg,
    inFile: resolved.template,
    outFile: resolved.out,
    reason: opts?.reason ?? `Inject env secrets for ${name}`,
  });
  return { ...result, template: resolved.template };
}
