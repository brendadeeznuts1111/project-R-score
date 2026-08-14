#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.3.14 · 2026-08-06 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
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
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
/**
 * @factorywager/proton-pass CLI — check | health | version
 * Full run/inject spawn lands in PR2; check/health usable now.
 */
import {
  findPassCli,
  checkEnvFile,
  ensureAgentSession,
  KALSHI_AGENT_SESSION,
  FACTORYWAGER_AGENT_SESSION,
  fetchSecretsParallel,
  SecretCacheManager,
  auditSecretHealth,
  printHealthTable,
  createLogger,
  envPrefixPresence,
  type AgentSessionConfig,
} from '../src/index.ts';

const log = createLogger({
  prefix: 'proton-pass',
  mode: Bun.env.PROTONPASS_LOG === 'json' ? 'json' : 'pretty',
});

function usage(): never {
  console.log(`Usage:
  proton-pass check [--env-file=.env.protonpass] [--agent=kalshi|factorywager] [--json]
  proton-pass health [--env-file=.env.protonpass]
  proton-pass version
`);
  process.exit(2);
}

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  for (const a of Bun.argv) {
    if (a.startsWith(pref)) return a.slice(pref.length);
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return Bun.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const cmd = Bun.argv[2] ?? 'help';
  if (cmd === 'help' || cmd === '-h' || cmd === '--help') usage();

  if (cmd === 'version') {
    const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json();
    console.log(`@factorywager/proton-pass ${pkg.version}`);
    process.exit(0);
  }

  const envFile = argValue('env-file') ?? Bun.env.PROTONPASS_ENV_FILE ?? '.env.protonpass';
  const agentName = argValue('agent') ?? 'kalshi';
  const agentCfg: AgentSessionConfig =
    agentName === 'factorywager' ? FACTORYWAGER_AGENT_SESSION : KALSHI_AGENT_SESSION;
  const json = hasFlag('json');

  const passCli = await findPassCli();
  if (!passCli) {
    log.error('pass_cli_missing', { candidates: ['pass-cli'] });
    console.error('PASS_CLI_MISSING: install pass-cli and ensure PATH');
    process.exit(1);
  }
  log.info('pass_cli_located', { path: passCli });

  if (cmd === 'check') {
    const agent = await ensureAgentSession(passCli, agentCfg);
    const envCheck = await checkEnvFile(envFile);
    const cache = new SecretCacheManager({
      path: Bun.env.PROTONPASS_CACHE_PATH ?? '.proton-pass-cache.json',
    });

    let resolve: Array<{ uri: string; status: string; durationMs: number; error?: string }> = [];
    if (envCheck.ok && envCheck.uris.length > 0 && agent.ok) {
      const results = await fetchSecretsParallel(envCheck.uris, {
        passCli,
        cache,
        timeoutMs: 15_000,
        retry: { maxAttempts: 2, baseMs: 500, jitter: true },
        logger: log,
      });
      resolve = results.map(r => ({
        uri: r.uri,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error,
      }));
    }

    const desk = envPrefixPresence('FANTASY402', [
      'BEARER_TOKEN',
      'CUSTOMER_ID',
      'AGENT_ID',
      'PASSWORD',
    ]);

    const report = {
      ok:
        Boolean(passCli) &&
        envCheck.ok &&
        (agent.ok || agent.mode === 'existing') &&
        resolve.every(r => r.status === 'ok' || resolve.length === 0),
      passCli,
      agent: {
        ok: agent.ok,
        mode: agent.mode,
        sessionDir: agent.sessionDir,
        detail: agent.detail,
      },
      envFile: {
        path: envFile,
        ok: envCheck.ok,
        uriCount: envCheck.uris.length,
      },
      resolve,
      deskProfile: {
        ok: desk.ok,
        present: desk.present,
        missing: desk.missing,
        note: 'keys only — run under proton-pass/run host to populate',
      },
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`${agent.ok ? '✅' : '❌'} agent: ${agent.mode} — ${agent.detail}`);
      console.log(`${envCheck.ok ? '✅' : '❌'} env-file: ${envFile} uris=${envCheck.uris.length}`);
      for (const r of resolve) {
        console.log(
          `  ${r.status === 'ok' ? '✅' : '❌'} ${r.uri} (${r.durationMs}ms)` +
            (r.error ? ` — ${r.error.slice(0, 80)}` : '')
        );
      }
      console.log(
        `desk FANTASY402: ${desk.ok ? '✅' : '⚠️'} present=[${desk.present.join(',')}] missing=[${desk.missing.join(',')}]`
      );
    }

    const hardFail =
      !passCli ||
      !envCheck.ok ||
      (!agent.ok && agent.mode !== 'existing') ||
      resolve.some(r => r.status === 'error');
    process.exit(hardFail ? 1 : 0);
  }

  if (cmd === 'health') {
    const envCheck = await checkEnvFile(envFile);
    if (!envCheck.ok || envCheck.uris.length === 0) {
      log.error('env_file_missing_or_empty', { path: envFile });
      process.exit(1);
    }
    const cache = new SecretCacheManager();
    const score = await auditSecretHealth({
      passCli,
      uris: envCheck.uris,
      cache,
    });
    printHealthTable(score);
    process.exit(score.errors > 0 ? 1 : 0);
  }

  usage();
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
