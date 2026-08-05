#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see `codex app-server generate-json-schema --experimental` — thread/name/set
/**
 * Audit and apply the curated Project R Codex thread portfolio.
 *
 * Titles use Codex's supported app-server protocol. Pinning is not exposed by
 * that protocol in Codex 0.146, so `--pins` performs a guarded, exact-row
 * update against the local Codex state database after creating a SQLite backup.
 *
 * Usage:
 *   bun tools/codex-thread-portfolio.ts
 *   bun tools/codex-thread-portfolio.ts --markdown
 *   bun tools/codex-thread-portfolio.ts --apply --pins
 *   bun tools/codex-thread-portfolio.ts --verify
 */

import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { dirnamePath, joinPath } from '../lib/path-bun.ts';

const DEFAULT_PORTFOLIO_PATH = new URL('./codex-thread-portfolio.json', import.meta.url).pathname;

const MAX_TITLE_LENGTH = 100;
const EXPECTED_PINNED_WORK_THREADS = 5;

export type ThreadState =
  | 'index'
  | 'shipped'
  | 'merged'
  | 'verified'
  | 'ready'
  | 'blocked'
  | 'pushed'
  | 'local'
  | 'audit'
  | 'snapshot'
  | 'analysis'
  | 'closed-unmerged'
  | 'incomplete'
  | 'empty';

export type PortfolioThread = {
  rank: number;
  threadId: string; // brand-ok — opaque Codex provider thread identifier
  title: string;
  score: number;
  state: ThreadState;
  pin: boolean;
  summary: string;
  evidence: string[];
  closure: string;
};

export type ThreadPortfolio = {
  schemaVersion: 1;
  scope: {
    cwd: string;
    reviewedAt: string;
    scoreWeights: {
      deliveredValue: number;
      verification: number;
      integration: number;
      reusability: number;
      closure: number;
    };
  };
  threads: PortfolioThread[];
};

export type LocalThreadStatus = {
  present: boolean;
  titleMatches: boolean;
  pinMatches: boolean;
  currentTitle?: string;
  currentlyPinned?: boolean;
};

type LocalThreadRow = {
  opaqueKey: string;
  title: string;
  isPinned: number;
};

type RpcResponse = {
  id?: number;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function parseNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
}

function parseBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${path} must be a boolean`);
  }
  return value;
}

function parseStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value.map((entry, index) => parseString(entry, `${path}[${index}]`));
}

const THREAD_STATES = new Set<ThreadState>([
  'index',
  'shipped',
  'merged',
  'verified',
  'ready',
  'blocked',
  'pushed',
  'local',
  'audit',
  'snapshot',
  'analysis',
  'closed-unmerged',
  'incomplete',
  'empty',
]);

function parseThreadState(value: unknown, path: string): ThreadState {
  const state = parseString(value, path);
  if (!THREAD_STATES.has(state as ThreadState)) {
    throw new Error(`${path} has unsupported state: ${state}`);
  }
  return state as ThreadState;
}

function parsePortfolioThreadWire(value: unknown, index: number): PortfolioThread {
  if (!isRecord(value)) {
    throw new Error(`threads[${index}] must be an object`);
  }
  return {
    rank: parseNumber(value.rank, `threads[${index}].rank`),
    threadId: parseString(value.threadId, `threads[${index}].threadId`), // brand-ok — parsed opaque Codex provider thread identifier
    title: parseString(value.title, `threads[${index}].title`),
    score: parseNumber(value.score, `threads[${index}].score`),
    state: parseThreadState(value.state, `threads[${index}].state`),
    pin: parseBoolean(value.pin, `threads[${index}].pin`),
    summary: parseString(value.summary, `threads[${index}].summary`),
    evidence: parseStringArray(value.evidence, `threads[${index}].evidence`),
    closure: parseString(value.closure, `threads[${index}].closure`),
  };
}

export function parseThreadPortfolioWire(value: unknown): ThreadPortfolio {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('thread portfolio must use schemaVersion 1');
  }
  if (!isRecord(value.scope) || !isRecord(value.scope.scoreWeights)) {
    throw new Error('thread portfolio scope and scoreWeights are required');
  }
  if (!Array.isArray(value.threads)) {
    throw new Error('thread portfolio threads must be an array');
  }
  const portfolio: ThreadPortfolio = {
    schemaVersion: 1,
    scope: {
      cwd: parseString(value.scope.cwd, 'scope.cwd'),
      reviewedAt: parseString(value.scope.reviewedAt, 'scope.reviewedAt'),
      scoreWeights: {
        deliveredValue: parseNumber(
          value.scope.scoreWeights.deliveredValue,
          'scope.scoreWeights.deliveredValue'
        ),
        verification: parseNumber(
          value.scope.scoreWeights.verification,
          'scope.scoreWeights.verification'
        ),
        integration: parseNumber(
          value.scope.scoreWeights.integration,
          'scope.scoreWeights.integration'
        ),
        reusability: parseNumber(
          value.scope.scoreWeights.reusability,
          'scope.scoreWeights.reusability'
        ),
        closure: parseNumber(value.scope.scoreWeights.closure, 'scope.scoreWeights.closure'),
      },
    },
    threads: value.threads.map(parsePortfolioThreadWire),
  };
  validateThreadPortfolio(portfolio);
  return portfolio;
}

export function validateThreadPortfolio(portfolio: ThreadPortfolio): void {
  const weightTotal = Object.values(portfolio.scope.scoreWeights).reduce(
    (total, weight) => total + weight,
    0
  );
  if (weightTotal !== 100) {
    throw new Error(`score weights must total 100, received ${weightTotal}`);
  }
  if (portfolio.threads.length === 0) {
    throw new Error('thread portfolio must not be empty');
  }

  const opaqueKeys = new Set<string>();
  const ranks = new Set<number>();
  let indexCount = 0;
  for (const thread of portfolio.threads) {
    if (opaqueKeys.has(thread.threadId)) {
      throw new Error(`duplicate Codex thread identifier: ${thread.threadId}`);
    }
    opaqueKeys.add(thread.threadId);
    if (!Number.isInteger(thread.rank) || thread.rank < 0) {
      throw new Error(`thread rank must be a non-negative integer: ${thread.rank}`);
    }
    if (ranks.has(thread.rank)) {
      throw new Error(`duplicate thread rank: ${thread.rank}`);
    }
    ranks.add(thread.rank);
    if (!Number.isInteger(thread.score) || thread.score < 0 || thread.score > 100) {
      throw new Error(`thread score must be an integer from 0 to 100: ${thread.score}`);
    }
    if (thread.title.length > MAX_TITLE_LENGTH) {
      throw new Error(`thread title exceeds ${MAX_TITLE_LENGTH} characters: ${thread.title}`);
    }
    if (thread.rank === 0) {
      indexCount++;
      if (thread.state !== 'index' || !thread.pin) {
        throw new Error('rank 0 must be the pinned portfolio index');
      }
    }
  }
  if (indexCount !== 1) {
    throw new Error(
      `thread portfolio must contain exactly one rank 0 index, received ${indexCount}`
    );
  }

  const workThreads = rankedWorkThreads(portfolio);
  for (let index = 0; index < workThreads.length; index++) {
    const expectedRank = index + 1;
    if (workThreads[index]!.rank !== expectedRank) {
      throw new Error(`work thread ranks must be contiguous; expected ${expectedRank}`);
    }
  }
  const pinnedWorkThreads = workThreads.filter(thread => thread.pin);
  if (pinnedWorkThreads.length !== EXPECTED_PINNED_WORK_THREADS) {
    throw new Error(
      `exactly ${EXPECTED_PINNED_WORK_THREADS} work threads must be pinned, received ${pinnedWorkThreads.length}`
    );
  }
  if (pinnedWorkThreads.some(thread => thread.rank > EXPECTED_PINNED_WORK_THREADS)) {
    throw new Error('only the top five ranked work threads may be pinned');
  }
}

export function rankedWorkThreads(portfolio: ThreadPortfolio): PortfolioThread[] {
  return portfolio.threads.filter(thread => thread.rank > 0).sort((a, b) => a.rank - b.rank);
}

export function formatThreadPortfolioMarkdown(portfolio: ThreadPortfolio): string {
  const escape = (value: string) => value.replaceAll('|', '\\|');
  const lines = [
    '# Project R Codex thread portfolio',
    '',
    `Reviewed: ${portfolio.scope.reviewedAt} · Scope: \`${portfolio.scope.cwd}\``,
    '',
    '| Rank | Score | State | Pin | Purpose-based title | Bring-home action |',
    '|---:|---:|---|:---:|---|---|',
  ];
  for (const thread of portfolio.threads.slice().sort((a, b) => a.rank - b.rank)) {
    lines.push(
      `| ${thread.rank === 0 ? 'INDEX' : thread.rank} | ${thread.score} | ${thread.state} | ${thread.pin ? 'yes' : 'no'} | ${escape(thread.title)} | ${escape(thread.closure)} |`
    );
  }
  lines.push(
    '',
    'Scoring weights: delivered value 30, verification 25, integration 20, reusability 15, closure 10.',
    ''
  );
  return lines.join('\n');
}

async function loadThreadPortfolio(path = DEFAULT_PORTFOLIO_PATH): Promise<ThreadPortfolio> {
  const wire = (await Bun.file(path).json()) as unknown;
  return parseThreadPortfolioWire(wire);
}

function resolveCodexHome(): string {
  const configured = Bun.env.CODEX_HOME?.trim();
  return configured && configured.length > 0 ? configured : joinPath(homedir(), '.codex');
}

function resolveStateDatabase(codexHome: string): string {
  return joinPath(codexHome, 'state_5.sqlite');
}

export function readLocalThreadStatuses(
  portfolio: ThreadPortfolio,
  stateDatabasePath = resolveStateDatabase(resolveCodexHome())
): Map<string, LocalThreadStatus> {
  const database = new Database(stateDatabasePath, { readonly: true });
  try {
    const rows = database
      .query<
        LocalThreadRow,
        [string]
      >('SELECT id AS opaqueKey, title, is_pinned AS isPinned FROM threads WHERE cwd = ?')
      .all(portfolio.scope.cwd);
    const byOpaqueKey = new Map(rows.map(row => [row.opaqueKey, row]));
    return new Map(
      portfolio.threads.map(thread => {
        const row = byOpaqueKey.get(thread.threadId);
        return [
          thread.threadId,
          row
            ? {
                present: true,
                titleMatches: row.title === thread.title,
                pinMatches: Boolean(row.isPinned) === thread.pin,
                currentTitle: row.title,
                currentlyPinned: Boolean(row.isPinned),
              }
            : { present: false, titleMatches: false, pinMatches: false },
        ];
      })
    );
  } finally {
    database.close();
  }
}

function parseRpcOutput(stdout: string): RpcResponse[] {
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as RpcResponse);
}

async function applyThreadTitles(portfolio: ThreadPortfolio): Promise<void> {
  const child = Bun.spawn(['codex', 'app-server', '--stdio'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stderrPromise = new Response(child.stderr).text();
  const iterator = child.stdout[Symbol.asyncIterator]();
  const decoder = new TextDecoder();
  let buffer = '';

  const waitForResponse = async (expectedId: number): Promise<RpcResponse> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const newline = buffer.indexOf('\n');
      if (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const [response] = parseRpcOutput(line);
        if (response?.id !== expectedId) continue;
        if (response.error) {
          throw new Error(
            `Codex RPC ${expectedId} failed: ${response.error.message ?? 'unknown error'}`
          );
        }
        return response;
      }
      const remaining = Math.max(1, deadline - Date.now());
      const result = await Promise.race([
        iterator.next(),
        Bun.sleep(remaining).then(() => ({ done: true as const, value: undefined })),
      ]);
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
    }
    throw new Error(`timed out waiting for Codex RPC response ${expectedId}`);
  };

  const initialize = {
    id: 1,
    method: 'initialize',
    params: {
      clientInfo: {
        name: 'project-r-thread-portfolio',
        title: 'Project R Thread Portfolio',
        version: '1.0.0',
      },
      capabilities: { experimentalApi: true },
    },
  };

  try {
    child.stdin.write(`${JSON.stringify(initialize)}\n`);
    await waitForResponse(1);
    child.stdin.write(`${JSON.stringify({ method: 'initialized' })}\n`);
    for (let index = 0; index < portfolio.threads.length; index++) {
      const thread = portfolio.threads[index]!;
      const requestId = index + 2;
      child.stdin.write(
        `${JSON.stringify({
          id: requestId,
          method: 'thread/name/set',
          params: { threadId: thread.threadId, name: thread.title },
        })}\n`
      );
      await waitForResponse(requestId);
    }
  } catch (error) {
    child.kill();
    await child.exited;
    const stderr = await stderrPromise;
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}` +
        (stderr.trim() ? `; stderr=${stderr.trim().slice(0, 500)}` : '')
    );
  }

  child.kill();
  await child.exited;
  await stderrPromise;
}

function escapeSqliteDotPath(path: string): string {
  if (path.includes("'")) {
    throw new Error(`SQLite backup path contains an unsupported quote: ${path}`);
  }
  return `'${path}'`;
}

async function backUpStateDatabase(stateDatabasePath: string, codexHome: string): Promise<string> {
  const sqlite = Bun.which('sqlite3');
  if (!sqlite) {
    throw new Error('sqlite3 is required to back up Codex state before pin updates');
  }
  const backupDirectory = joinPath(codexHome, 'backups');
  const mkdirChild = Bun.spawn(['mkdir', '-p', backupDirectory], {
    stdout: 'ignore',
    stderr: 'pipe',
  });
  const [mkdirStderr, mkdirExitCode] = await Promise.all([
    new Response(mkdirChild.stderr).text(),
    mkdirChild.exited,
  ]);
  if (mkdirExitCode !== 0) {
    throw new Error(
      `unable to create Codex backup directory: ${mkdirStderr.trim() || `exit ${mkdirExitCode}`}`
    );
  }
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const backupPath = joinPath(backupDirectory, `state_5.before-thread-portfolio.${stamp}.sqlite`);
  const child = Bun.spawn(
    [sqlite, stateDatabasePath, `.backup ${escapeSqliteDotPath(backupPath)}`],
    { stdout: 'pipe', stderr: 'pipe' }
  );
  const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
  if (exitCode !== 0 || !(await Bun.file(backupPath).exists())) {
    throw new Error(`Codex state backup failed: ${stderr.trim() || `exit ${exitCode}`}`);
  }
  return backupPath;
}

async function applyThreadPins(
  portfolio: ThreadPortfolio,
  stateDatabasePath = resolveStateDatabase(resolveCodexHome())
): Promise<string> {
  const codexHome = dirnamePath(stateDatabasePath);
  const backupPath = await backUpStateDatabase(stateDatabasePath, codexHome);
  const database = new Database(stateDatabasePath);
  try {
    const columns = database.query<{ name: string }, []>('PRAGMA table_info(threads)').all();
    const names = new Set(columns.map(column => column.name));
    for (const required of ['id', 'cwd', 'is_pinned']) {
      if (!names.has(required)) {
        throw new Error(`Codex state schema is missing threads.${required}`);
      }
    }

    const update = database.query('UPDATE threads SET is_pinned = ? WHERE id = ? AND cwd = ?');
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const thread of portfolio.threads) {
        const result = update.run(thread.pin ? 1 : 0, thread.threadId, portfolio.scope.cwd);
        if (result.changes !== 1) {
          throw new Error(`pin update matched ${result.changes} rows for ${thread.threadId}`);
        }
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  } finally {
    database.close();
  }
  return backupPath;
}

function printAudit(
  portfolio: ThreadPortfolio,
  statuses: Map<string, LocalThreadStatus>,
  asJson: boolean
): void {
  const rows = portfolio.threads
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map(thread => ({
      rank: thread.rank === 0 ? 'INDEX' : String(thread.rank).padStart(2, '0'),
      score: thread.score,
      state: thread.state,
      pin: thread.pin,
      present: statuses.get(thread.threadId)?.present ?? false,
      titleMatches: statuses.get(thread.threadId)?.titleMatches ?? false,
      pinMatches: statuses.get(thread.threadId)?.pinMatches ?? false,
      title: thread.title,
    }));
  if (asJson) {
    jsonOut({ scope: portfolio.scope, rows });
    return;
  }
  logTable(rows);
}

function printHelp(): void {
  console.info(`Project R Codex thread portfolio

Usage:
  bun tools/codex-thread-portfolio.ts [--json|--markdown]
  bun tools/codex-thread-portfolio.ts --apply [--pins]
  bun tools/codex-thread-portfolio.ts --verify

Options:
  --apply      Apply all curated titles through Codex app-server.
  --pins       With --apply, set the index and top five pins after a SQLite backup.
  --verify     Exit non-zero unless every title and pin matches the catalog.
  --json       Emit the audit as JSON.
  --markdown   Emit the durable scorecard as Markdown.
  --help       Show this help.
`);
}

async function main(): Promise<void> {
  const args = new Set(Bun.argv.slice(2).filter(argument => argument !== '--'));
  if (args.has('--help')) {
    printHelp();
    return;
  }
  if (args.has('--pins') && !args.has('--apply')) {
    throw new Error('--pins requires --apply');
  }

  const portfolio = await loadThreadPortfolio();
  if (args.has('--markdown')) {
    process.stdout.write(`${formatThreadPortfolioMarkdown(portfolio)}\n`);
    return;
  }

  const codexHome = resolveCodexHome();
  const stateDatabasePath = resolveStateDatabase(codexHome);
  if (args.has('--apply')) {
    await applyThreadTitles(portfolio);
    console.info(`Applied ${portfolio.threads.length} purpose-based thread titles.`);
    if (args.has('--pins')) {
      const backupPath = await applyThreadPins(portfolio, stateDatabasePath);
      console.info(`Applied ${portfolio.threads.filter(thread => thread.pin).length} pins.`);
      console.info(`Codex state backup: ${backupPath}`);
    }
  }

  const statuses = readLocalThreadStatuses(portfolio, stateDatabasePath);
  printAudit(portfolio, statuses, args.has('--json'));
  if (args.has('--verify')) {
    const failures = [...statuses.values()].filter(
      status => !status.present || !status.titleMatches || !status.pinMatches
    );
    if (failures.length > 0) {
      throw new Error(`${failures.length} thread portfolio entries do not match local Codex state`);
    }
  }
}

if (import.meta.main) {
  await main();
}
