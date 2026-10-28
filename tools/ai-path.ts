#!/usr/bin/env bun
import {
  discoverAgentPath,
  doctorAgentPath,
  pruneAgentFriction,
  recordAgentFriction,
  reportAgentFriction,
} from '../lib/ai/agent-path.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { resolvePath } from '../lib/path-bun.ts';

const repoRoot = resolvePath(import.meta.dir, '..');
const rawArgs = Bun.argv.slice(2);
const wantsJson = rawArgs.includes('--json');
const help = `Project R AI path

Usage:
  bun run ai -- discover "<task>" [--path <target>] [--limit <1-20>] [--json]
  bun run ai -- doctor [--json]
  bun run ai -- friction report [--json]
  bun run ai -- friction record --tool <id> --code <id> [--path <target>] [--detail <safe-text>] [--json]
  bun run ai -- friction prune [--json]

Discovery is an index. The selected source, command help, and tests remain authority.`;

const valueFlags = new Set(['--path', '--limit', '--tool', '--code', '--detail']);

function parseArgs(args: string[]): {
  flags: Set<string>;
  values(flag: string): string[];
  positional: string[];
} {
  const flags = new Set<string>();
  const consumed = new Set<number>();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (!argument.startsWith('--')) continue;
    if (![...valueFlags, '--json', '--help'].includes(argument)) {
      throw new TypeError(`unknown option: ${argument}`);
    }
    flags.add(argument);
    consumed.add(index);
    if (valueFlags.has(argument)) {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) throw new TypeError(`missing value for ${argument}`);
      consumed.add(index + 1);
      index++;
    }
  }
  return {
    flags,
    values(flag: string) {
      const output: string[] = [];
      for (let index = 0; index < args.length; index++) {
        if (args[index] === flag && args[index + 1]) output.push(args[index + 1]!);
      }
      return output;
    },
    positional: args.filter((_, index) => !consumed.has(index)),
  };
}

function allowOnly(actual: Set<string>, allowed: string[]): void {
  const unexpected = [...actual].filter(flag => !allowed.includes(flag));
  if (unexpected.length > 0) throw new TypeError(`option not valid here: ${unexpected.join(', ')}`);
}

function one(values: string[], flag: string): string | undefined {
  if (values.length > 1) throw new TypeError(`${flag} may be provided only once`);
  return values[0];
}

function parseLimit(value: string | undefined): number {
  if (value === undefined) return 8;
  if (!/^\d+$/.test(value)) throw new TypeError('--limit must be an integer from 1 through 20');
  const limit = Number(value);
  if (limit < 1 || limit > 20) throw new TypeError('--limit must be an integer from 1 through 20');
  return limit;
}

async function main(): Promise<void> {
  const action = rawArgs.shift() ?? 'help';
  if (action === 'help' || action === '--help' || rawArgs.includes('--help')) {
    console.log(help);
    return;
  }
  const parsed = parseArgs(rawArgs);
  const json = parsed.flags.has('--json');

  if (action === 'discover') {
    allowOnly(parsed.flags, ['--path', '--limit', '--json']);
    const report = await discoverAgentPath(repoRoot, {
      query: parsed.positional.join(' '),
      paths: parsed.values('--path'),
      limit: parseLimit(one(parsed.values('--limit'), '--limit')),
    });
    if (json) jsonOut(report);
    else {
      console.log(`AI path · ${report.query || 'repository orientation'}`);
      for (const hit of report.hits) {
        console.log(`  ${hit.kind.padEnd(8)} ${hit.command ?? hit.path ?? hit.id}`);
        console.log(
          `           ${hit.summary}${hit.matchedTerms?.length ? ` · matched: ${hit.matchedTerms.join(', ')}` : ''}`
        );
      }
    }
    return;
  }

  if (action === 'doctor') {
    allowOnly(parsed.flags, ['--json']);
    if (parsed.positional.length > 0) throw new TypeError('doctor accepts no positional arguments');
    const report = await doctorAgentPath(repoRoot);
    if (json) jsonOut(report);
    else
      for (const check of report.checks)
        console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.id} · ${check.detail}`);
    if (!report.ok) process.exitCode = 1;
    return;
  }

  if (action !== 'friction') throw new TypeError(`unknown AI path action: ${action}`);
  const [operation = 'report', ...extra] = parsed.positional;
  if (extra.length > 0) throw new TypeError(`unexpected friction arguments: ${extra.join(' ')}`);
  if (operation === 'record') {
    allowOnly(parsed.flags, ['--tool', '--code', '--path', '--detail', '--json']);
    const tool = one(parsed.values('--tool'), '--tool');
    const code = one(parsed.values('--code'), '--code');
    if (!tool || !code) throw new TypeError('friction record requires --tool and --code');
    const event = await recordAgentFriction(repoRoot, {
      tool,
      code,
      path: one(parsed.values('--path'), '--path'),
      detail: one(parsed.values('--detail'), '--detail'),
    });
    if (json) jsonOut(event);
    else console.log(`Recorded friction ${event.fingerprint} (${event.tool}/${event.code})`);
    return;
  }
  allowOnly(parsed.flags, ['--json']);
  if (operation === 'prune') {
    const result = await pruneAgentFriction(repoRoot);
    if (json) jsonOut(result);
    else
      console.log(
        `AI friction · pruned ${result.deleted} events older than ${result.retentionDays} days`
      );
    return;
  }
  if (operation !== 'report') throw new TypeError(`unknown friction operation: ${operation}`);
  const report = await reportAgentFriction(repoRoot);
  if (json) jsonOut(report);
  else {
    console.log(
      `AI friction · ${report.observations} observations in ${report.observationWindowDays} days · ${report.expiredObservations} expired · promote at ${report.promotionThreshold}`
    );
    for (const entry of report.fingerprints) {
      console.log(
        `  ${entry.promote ? 'PROMOTE' : 'observe'} ${entry.count}× ${entry.tool}/${entry.code}${entry.path ? ` @ ${entry.path}` : ''}`
      );
    }
    for (const issue of report.known)
      console.log(
        `  known ${issue.reopen ? 'REOPEN' : issue.status} · ${issue.id} · ${issue.observations} new observations`
      );
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof TypeError ? 'invalid-arguments' : 'internal-error';
    if (wantsJson) jsonOut({ schemaVersion: 1, ok: false, error: { code, message } });
    else console.error(`AI path error [${code}]: ${message}`);
    process.exitCode = code === 'invalid-arguments' ? 2 : 1;
  }
}
