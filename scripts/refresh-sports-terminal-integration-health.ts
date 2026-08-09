#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Refresh public Sports Terminal integration-health registry artifact.
 *
 * Reads authenticated GET /api/v1/partners/integration-health (or a local
 * fixture via --from-file / --stdin), normalizes to the redacted public write
 * shape, proves with parseSportsTerminalIntegrationHealth, and writes
 * public/registry/sports-terminal/partner-integration-health.json.
 *
 * partnerRoutes list/detail stay unmounted — this job only consumes the
 * integration-health contract.
 *
 * Env (live fetch only):
 *   SPORTS_TERMINAL_HEALTH_URL  override URL (default contract path)
 *   SPORTS_TERMINAL_TOKEN or FACTORY_WAGER_TOKEN  bearer for auth
 *
 * Flags:
 *   --from-file <path>  offline fixture/live capture
 *   --stdin             read JSON from stdin
 *   --check             fail when committed artifact stable body differs
 *   --dry-run           normalize + prove; do not write
 *   --json              machine summary on stdout
 *
 * @see packages/partners/src/adapters/sports-terminal.ts
 * @see docs/design/partner-dashboard-squad.md Lane H
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  SPORTS_TERMINAL_HEALTH_CONTRACT_PATH,
  SPORTS_TERMINAL_INPUT_REF,
  normalizeSportsTerminalIntegrationHealthDocument,
  parseSportsTerminalIntegrationHealth,
  type SportsTerminalIntegrationHealthDocument,
} from '../packages/partners/src/index.ts';

const TOOL_ID = 'sports-terminal:health:refresh' as const;

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor(TOOL_ID, Bun.argv.slice(2))
  : Bun.argv.slice(2);

const outputPath = `public${SPORTS_TERMINAL_INPUT_REF}`;

function flagValue(name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith('--')) {
    throw new TypeError(`${name} requires a value`);
  }
  return next;
}

async function loadInput(): Promise<{ raw: unknown; mode: 'live' | 'file' | 'stdin' }> {
  if (argv.includes('--stdin')) {
    const text = await Bun.stdin.text();
    return { raw: JSON.parse(text) as unknown, mode: 'stdin' };
  }
  const fromFile = flagValue('--from-file');
  if (fromFile !== undefined) {
    const raw = await Bun.file(fromFile).json();
    return { raw, mode: 'file' };
  }

  const url = Bun.env.SPORTS_TERMINAL_HEALTH_URL?.trim() || SPORTS_TERMINAL_HEALTH_CONTRACT_PATH;
  const token = Bun.env.SPORTS_TERMINAL_TOKEN?.trim() || Bun.env.FACTORY_WAGER_TOKEN?.trim() || '';
  if (!token) {
    throw new TypeError(
      'live refresh requires SPORTS_TERMINAL_TOKEN or FACTORY_WAGER_TOKEN (or pass --from-file / --stdin)'
    );
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new TypeError(
      `integration-health fetch failed: HTTP ${response.status} ${response.statusText}`
    );
  }
  return { raw: (await response.json()) as unknown, mode: 'live' };
}

function stableBody(doc: SportsTerminalIntegrationHealthDocument): string {
  const { generatedAt: _g, ...rest } = doc;
  return JSON.stringify(rest);
}

async function main(): Promise<void> {
  const check = argv.includes('--check');
  const dryRun = argv.includes('--dry-run');
  const asJson = argv.includes('--json');

  const { raw, mode } = await loadInput();
  const source =
    mode === 'live'
      ? ('live' as const)
      : mode === 'file'
        ? ('fixture' as const)
        : ('offline-join' as const);

  const document = normalizeSportsTerminalIntegrationHealthDocument(raw, {
    source:
      typeof (raw as { source?: string }).source === 'string'
        ? undefined // keep payload source when already valid
        : source,
  });
  // Re-prove after normalize (also done inside normalize).
  parseSportsTerminalIntegrationHealth(document);

  if (check) {
    const current = (await Bun.file(outputPath)
      .json()
      .catch(() => null)) as SportsTerminalIntegrationHealthDocument | null;
    if (current === null) {
      throw new TypeError(`${outputPath} missing; run without --check to write`);
    }
    if (stableBody(current) !== stableBody(document)) {
      throw new TypeError(
        `${outputPath} is stale relative to input; run bun run sports-terminal:health:refresh`
      );
    }
    const msg = `${outputPath} current (${document.summary.partnerCount} partners · source=${document.source})`;
    if (asJson) {
      console.log(
        JSON.stringify({
          ok: true,
          path: outputPath,
          partnerCount: document.summary.partnerCount,
          source: document.source,
          check: true,
        })
      );
    } else {
      console.log(msg);
    }
    return;
  }

  if (dryRun) {
    if (asJson) {
      console.log(
        JSON.stringify({
          ok: true,
          dryRun: true,
          path: outputPath,
          partnerCount: document.summary.partnerCount,
          source: document.source,
          summary: document.summary,
        })
      );
    } else {
      console.log(
        `dry-run ok: would write ${outputPath} (${document.summary.partnerCount} partners · source=${document.source})`
      );
    }
    return;
  }

  await Bun.write(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  if (asJson) {
    console.log(
      JSON.stringify({
        ok: true,
        wrote: outputPath,
        partnerCount: document.summary.partnerCount,
        source: document.source,
        summary: document.summary,
      })
    );
  } else {
    console.log(
      `wrote ${outputPath} (${document.summary.partnerCount} partners · source=${document.source})`
    );
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

export { loadInput, main };
