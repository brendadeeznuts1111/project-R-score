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
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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
import { parseSessionId, type SessionId } from '../lib/types/branded.ts';

const DEFAULT_PORTFOLIO_PATH = new URL('./codex-thread-portfolio.json', import.meta.url).pathname;

const MAX_TITLE_LENGTH = 100;
const EXPECTED_PINNED_WORK_THREADS = 5;

export type ThreadState =
  | 'index'
  | 'shipped'
  | 'merged'
  | 'verified'
  | 'ready'
  | 'open'
  | 'blocked'
  | 'pushed'
  | 'local'
  | 'audit'
  | 'snapshot'
  | 'analysis'
  | 'planned'
  | 'closed-unmerged'
  | 'incomplete'
  | 'empty';

export type ThreadLane =
  | 'agent'
  | 'bun'
  | 'ci'
  | 'cli'
  | 'compliance'
  | 'domain'
  | 'dx'
  | 'identity'
  | 'operations'
  | 'partner'
  | 'portal'
  | 'project'
  | 'research'
  | 'security'
  | 'tennis'
  | 'testing'
  | 'tooling';

export type ThreadQuality =
  'production' | 'verified' | 'review-required' | 'analysis-only' | 'blocked' | 'empty';

export type ThreadTitleTransport = 'app-server' | 'state-only';

export type ThreadReferenceKind =
  | 'branch'
  | 'command'
  | 'commit'
  | 'deployment'
  | 'document'
  | 'issue'
  | 'pull-request'
  | 'thread'
  | 'worktree';

export type ThreadReference = `RTH-${string}`;

export type ThreadLaneDefinition = {
  entrypoint: string;
  boundary: string;
};

export type PortfolioReference = {
  kind: ThreadReferenceKind;
  label: string;
  target: string;
};

export type PortfolioThread = {
  ref: ThreadReference;
  rank: number;
  sessionId: SessionId;
  title: string;
  lane: ThreadLane;
  score: number;
  quality: ThreadQuality;
  state: ThreadState;
  titleTransport: ThreadTitleTransport;
  pin: boolean;
  summary: string;
  evidence: string[];
  references: PortfolioReference[];
  relatedRefs: ThreadReference[];
  closure: string;
};

export type ThreadPortfolio = {
  schemaVersion: 3;
  catalog: string;
  scope: {
    cwd: string;
    reviewedAt: string;
    rootThreadCount: number;
    identity: {
      humanRefPrefix: string;
      humanRefRule: string;
      providerIdentity: string;
      rankRule: string;
      titleOrder: string[];
    };
    inclusion: string;
    exclusion: string;
    scoreWeights: {
      deliveredValue: number;
      verification: number;
      integration: number;
      reusability: number;
      closure: number;
    };
  };
  lanes: Record<ThreadLane, ThreadLaneDefinition>;
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

type InventoryThreadRow = {
  opaqueKey: string;
  createdAt: number;
  source: string;
  threadSource: string | null;
};

export type ThreadInventoryStatus = {
  catalogCount: number;
  rootThreadCount: number;
  missingCatalogSessionIds: string[];
  uncatalogedRootSessionIds: string[];
  chronologicalRefsMatch: boolean;
  subagentCount: number;
  orphanSubagentSessionIds: string[];
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

function parseThreadReference(value: unknown, path: string): ThreadReference {
  const ref = parseString(value, path);
  if (!/^RTH-\d{3}$/.test(ref)) {
    throw new Error(`${path} must match RTH-###`);
  }
  return ref as ThreadReference;
}

const THREAD_STATES = new Set<ThreadState>([
  'index',
  'shipped',
  'merged',
  'verified',
  'ready',
  'open',
  'blocked',
  'pushed',
  'local',
  'audit',
  'snapshot',
  'analysis',
  'planned',
  'closed-unmerged',
  'incomplete',
  'empty',
]);

const THREAD_LANES = new Set<ThreadLane>([
  'agent',
  'bun',
  'ci',
  'cli',
  'compliance',
  'domain',
  'dx',
  'identity',
  'operations',
  'partner',
  'portal',
  'project',
  'research',
  'security',
  'tennis',
  'testing',
  'tooling',
]);

const THREAD_QUALITIES = new Set<ThreadQuality>([
  'production',
  'verified',
  'review-required',
  'analysis-only',
  'blocked',
  'empty',
]);

const THREAD_REFERENCE_KINDS = new Set<ThreadReferenceKind>([
  'branch',
  'command',
  'commit',
  'deployment',
  'document',
  'issue',
  'pull-request',
  'thread',
  'worktree',
]);

function parseThreadState(value: unknown, path: string): ThreadState {
  const state = parseString(value, path);
  if (!THREAD_STATES.has(state as ThreadState)) {
    throw new Error(`${path} has unsupported state: ${state}`);
  }
  return state as ThreadState;
}

function parseThreadLane(value: unknown, path: string): ThreadLane {
  const lane = parseString(value, path);
  if (!THREAD_LANES.has(lane as ThreadLane)) {
    throw new Error(`${path} has unsupported lane: ${lane}`);
  }
  return lane as ThreadLane;
}

function parseThreadQuality(value: unknown, path: string): ThreadQuality {
  const quality = parseString(value, path);
  if (!THREAD_QUALITIES.has(quality as ThreadQuality)) {
    throw new Error(`${path} has unsupported quality: ${quality}`);
  }
  return quality as ThreadQuality;
}

function parseThreadTitleTransport(value: unknown, path: string): ThreadTitleTransport {
  if (value === undefined) return 'app-server';
  const transport = parseString(value, path);
  if (transport !== 'app-server' && transport !== 'state-only') {
    throw new Error(`${path} must be app-server or state-only`);
  }
  return transport;
}

function parsePortfolioReferences(value: unknown, path: string): PortfolioReference[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`${path}[${index}] must be an object`);
    }
    const kind = parseString(entry.kind, `${path}[${index}].kind`);
    if (!THREAD_REFERENCE_KINDS.has(kind as ThreadReferenceKind)) {
      throw new Error(`${path}[${index}].kind has unsupported reference kind: ${kind}`);
    }
    return {
      kind: kind as ThreadReferenceKind,
      label: parseString(entry.label, `${path}[${index}].label`),
      target: parseString(entry.target, `${path}[${index}].target`),
    };
  });
}

function parsePortfolioThreadWire(value: unknown, index: number): PortfolioThread {
  if (!isRecord(value)) {
    throw new Error(`threads[${index}] must be an object`);
  }
  return {
    ref: parseThreadReference(value.ref, `threads[${index}].ref`),
    rank: parseNumber(value.rank, `threads[${index}].rank`),
    sessionId: parseSessionId(value.sessionId),
    title: parseString(value.title, `threads[${index}].title`),
    lane: parseThreadLane(value.lane, `threads[${index}].lane`),
    score: parseNumber(value.score, `threads[${index}].score`),
    quality: parseThreadQuality(value.quality, `threads[${index}].quality`),
    state: parseThreadState(value.state, `threads[${index}].state`),
    titleTransport: parseThreadTitleTransport(
      value.titleTransport,
      `threads[${index}].titleTransport`
    ),
    pin: parseBoolean(value.pin, `threads[${index}].pin`),
    summary: parseString(value.summary, `threads[${index}].summary`),
    evidence: parseStringArray(value.evidence, `threads[${index}].evidence`),
    references: parsePortfolioReferences(value.references, `threads[${index}].references`),
    relatedRefs: parseStringArray(value.relatedRefs, `threads[${index}].relatedRefs`).map(
      (ref, relatedIndex) =>
        parseThreadReference(ref, `threads[${index}].relatedRefs[${relatedIndex}]`)
    ),
    closure: parseString(value.closure, `threads[${index}].closure`),
  };
}

export function parseThreadPortfolioWire(value: unknown): ThreadPortfolio {
  if (!isRecord(value) || value.schemaVersion !== 3) {
    throw new Error('thread portfolio must use schemaVersion 3');
  }
  if (
    !isRecord(value.scope) ||
    !isRecord(value.scope.identity) ||
    !isRecord(value.scope.scoreWeights)
  ) {
    throw new Error('thread portfolio scope, identity, and scoreWeights are required');
  }
  if (!Array.isArray(value.threads)) {
    throw new Error('thread portfolio threads must be an array');
  }
  if (!isRecord(value.lanes)) {
    throw new Error('thread portfolio lanes are required');
  }
  const lanes = Object.fromEntries(
    [...THREAD_LANES].map(lane => {
      const definition = value.lanes[lane];
      if (!isRecord(definition)) {
        throw new Error(`lanes.${lane} must be an object`);
      }
      return [
        lane,
        {
          entrypoint: parseString(definition.entrypoint, `lanes.${lane}.entrypoint`),
          boundary: parseString(definition.boundary, `lanes.${lane}.boundary`),
        },
      ];
    })
  ) as Record<ThreadLane, ThreadLaneDefinition>;
  const portfolio: ThreadPortfolio = {
    schemaVersion: 3,
    catalog: parseString(value.catalog, 'catalog'),
    scope: {
      cwd: parseString(value.scope.cwd, 'scope.cwd'),
      reviewedAt: parseString(value.scope.reviewedAt, 'scope.reviewedAt'),
      rootThreadCount: parseNumber(value.scope.rootThreadCount, 'scope.rootThreadCount'),
      identity: {
        humanRefPrefix: parseString(
          value.scope.identity.humanRefPrefix,
          'scope.identity.humanRefPrefix'
        ),
        humanRefRule: parseString(value.scope.identity.humanRefRule, 'scope.identity.humanRefRule'),
        providerIdentity: parseString(
          value.scope.identity.providerIdentity,
          'scope.identity.providerIdentity'
        ),
        rankRule: parseString(value.scope.identity.rankRule, 'scope.identity.rankRule'),
        titleOrder: parseStringArray(value.scope.identity.titleOrder, 'scope.identity.titleOrder'),
      },
      inclusion: parseString(value.scope.inclusion, 'scope.inclusion'),
      exclusion: parseString(value.scope.exclusion, 'scope.exclusion'),
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
    lanes,
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

  if (portfolio.scope.rootThreadCount !== portfolio.threads.length) {
    throw new Error(
      `scope.rootThreadCount must equal catalog length; received ${portfolio.scope.rootThreadCount} and ${portfolio.threads.length}`
    );
  }
  if (portfolio.scope.identity.humanRefPrefix !== 'RTH') {
    throw new Error('scope.identity.humanRefPrefix must be RTH');
  }

  const sessionIds = new Set<SessionId>();
  const refs = new Set<ThreadReference>();
  const ranks = new Set<number>();
  let indexCount = 0;
  for (const thread of portfolio.threads) {
    if (!portfolio.lanes[thread.lane]) {
      throw new Error(`${thread.ref} uses lane ${thread.lane} without a lane definition`);
    }
    if (sessionIds.has(thread.sessionId)) {
      throw new Error(`duplicate Codex SessionId: ${thread.sessionId}`);
    }
    sessionIds.add(thread.sessionId);
    if (refs.has(thread.ref)) {
      throw new Error(`duplicate Project R thread reference: ${thread.ref}`);
    }
    refs.add(thread.ref);
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
    if (thread.titleTransport === 'state-only' && thread.state !== 'empty') {
      throw new Error(
        `${thread.ref} may use state-only title transport only for a legacy empty row`
      );
    }
    const titlePrefix = `${thread.ref} · ${thread.state.toUpperCase().replace('CLOSED-UNMERGED', 'CLOSED')} · ${thread.lane.toUpperCase()} · `;
    if (!thread.title.startsWith(titlePrefix)) {
      throw new Error(`thread title must follow ref · state · lane order: ${thread.title}`);
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

  const referenceNumbers = [...refs].map(ref => Number(ref.slice(4))).sort((a, b) => a - b);
  const expectedReferenceNumbers = Array.from(
    { length: portfolio.scope.rootThreadCount },
    (_, index) => index + 1
  );
  if (referenceNumbers.some((value, index) => value !== expectedReferenceNumbers[index])) {
    throw new Error('RTH references must be contiguous from RTH-001 through the root count');
  }
  for (const thread of portfolio.threads) {
    for (const relatedRef of thread.relatedRefs) {
      if (!refs.has(relatedRef)) {
        throw new Error(`${thread.ref} references unknown related thread ${relatedRef}`);
      }
      if (relatedRef === thread.ref) {
        throw new Error(`${thread.ref} must not relate to itself`);
      }
    }
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

export function resolveLocalPortfolioReferences(portfolio: ThreadPortfolio): string[] {
  const targets = [
    ...Object.values(portfolio.lanes).map(lane => lane.entrypoint),
    ...portfolio.threads.flatMap(thread =>
      thread.references
        .filter(reference => reference.kind === 'document' || reference.kind === 'worktree')
        .map(reference => reference.target)
    ),
  ];
  return [...new Set(targets)].map(target =>
    target.startsWith('/') ? target : joinPath(portfolio.scope.cwd, target)
  );
}

export async function findMissingLocalPortfolioReferences(
  portfolio: ThreadPortfolio
): Promise<string[]> {
  const targets = resolveLocalPortfolioReferences(portfolio);
  const exists = await Promise.all(targets.map(target => Bun.file(target).exists()));
  return targets.filter((_target, index) => !exists[index]);
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
    '| Rank | Ref | Score | Quality | State | Lane | Pin | Purpose-based title | Bring-home action |',
    '|---:|---|---:|---|---|---|:---:|---|---|',
  ];
  for (const thread of portfolio.threads.slice().sort((a, b) => a.rank - b.rank)) {
    lines.push(
      `| ${thread.rank === 0 ? 'INDEX' : thread.rank} | ${thread.ref} | ${thread.score} | ${thread.quality} | ${thread.state} | ${thread.lane} | ${thread.pin ? 'yes' : 'no'} | ${escape(thread.title)} | ${escape(thread.closure)} |`
    );
  }
  lines.push(
    '',
    'Scoring weights: delivered value 30, verification 25, integration 20, reusability 15, closure 10.',
    ''
  );
  return lines.join('\n');
}

export async function loadThreadPortfolio(path = DEFAULT_PORTFOLIO_PATH): Promise<ThreadPortfolio> {
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
      .query<LocalThreadRow, [string]>(
        'SELECT id AS opaqueKey, title, is_pinned AS isPinned FROM threads WHERE cwd = ?'
      )
      .all(portfolio.scope.cwd);
    const byOpaqueKey = new Map(rows.map(row => [row.opaqueKey, row]));
    return new Map(
      portfolio.threads.map(thread => {
        const row = byOpaqueKey.get(thread.sessionId);
        return [
          thread.sessionId,
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

function parseSubagentParentSessionId(source: string): string | undefined {
  try {
    const wire = JSON.parse(source) as unknown;
    if (!isRecord(wire) || !isRecord(wire.subagent) || !isRecord(wire.subagent.thread_spawn)) {
      return undefined;
    }
    const parent = wire.subagent.thread_spawn.parent_thread_id;
    return typeof parent === 'string' ? parent : undefined;
  } catch {
    return undefined;
  }
}

export function inspectThreadInventory(
  portfolio: ThreadPortfolio,
  stateDatabasePath = resolveStateDatabase(resolveCodexHome())
): ThreadInventoryStatus {
  const database = new Database(stateDatabasePath, { readonly: true });
  try {
    const rows = database
      .query<InventoryThreadRow, [string]>(
        'SELECT id AS opaqueKey, created_at AS createdAt, source, thread_source AS threadSource FROM threads WHERE cwd = ?'
      )
      .all(portfolio.scope.cwd);
    const rootRows = rows
      .filter(row => row.source === 'vscode' || row.threadSource === 'user')
      .sort((a, b) => a.opaqueKey.localeCompare(b.opaqueKey));
    const catalogBySessionId = new Map(
      portfolio.threads.map(thread => [thread.sessionId as string, thread])
    );
    const rootIds = new Set(rootRows.map(row => row.opaqueKey));
    const missingCatalogSessionIds = portfolio.threads
      .map(thread => thread.sessionId as string)
      .filter(sessionId => !rootIds.has(sessionId));
    const uncatalogedRootSessionIds = rootRows
      .map(row => row.opaqueKey)
      .filter(sessionId => !catalogBySessionId.has(sessionId));
    const chronologicalRefsMatch = rootRows.every((row, index) => {
      const expectedRef = `RTH-${String(index + 1).padStart(3, '0')}`;
      return catalogBySessionId.get(row.opaqueKey)?.ref === expectedRef;
    });
    const subagentRows = rows.filter(row => row.threadSource === 'subagent');
    const orphanSubagentSessionIds = subagentRows
      .filter(row => {
        const parentSessionId = parseSubagentParentSessionId(row.source);
        return !parentSessionId || !catalogBySessionId.has(parentSessionId);
      })
      .map(row => row.opaqueKey);
    return {
      catalogCount: portfolio.threads.length,
      rootThreadCount: rootRows.length,
      missingCatalogSessionIds,
      uncatalogedRootSessionIds,
      chronologicalRefsMatch,
      subagentCount: subagentRows.length,
      orphanSubagentSessionIds,
    };
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
    const appServerThreads = portfolio.threads.filter(
      thread => thread.titleTransport === 'app-server'
    );
    for (let index = 0; index < appServerThreads.length; index++) {
      const thread = appServerThreads[index]!;
      const requestId = index + 2;
      child.stdin.write(
        `${JSON.stringify({
          id: requestId,
          method: 'thread/name/set',
          params: { threadId: thread.sessionId, name: thread.title },
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

async function applyThreadLocalState(
  portfolio: ThreadPortfolio,
  stateDatabasePath = resolveStateDatabase(resolveCodexHome()),
  includePins = true
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

    const updatePin = database.query('UPDATE threads SET is_pinned = ? WHERE id = ? AND cwd = ?');
    const updateTitle = database.query('UPDATE threads SET title = ? WHERE id = ? AND cwd = ?');
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const thread of portfolio.threads) {
        if (thread.titleTransport === 'state-only') {
          const result = updateTitle.run(thread.title, thread.sessionId, portfolio.scope.cwd);
          if (result.changes !== 1) {
            throw new Error(
              `state-only title update matched ${result.changes} rows for ${thread.sessionId}`
            );
          }
        }
        if (includePins) {
          const result = updatePin.run(thread.pin ? 1 : 0, thread.sessionId, portfolio.scope.cwd);
          if (result.changes !== 1) {
            throw new Error(`pin update matched ${result.changes} rows for ${thread.sessionId}`);
          }
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
  inventory: ThreadInventoryStatus,
  asJson: boolean
): void {
  const rows = portfolio.threads
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map(thread => ({
      rank: thread.rank === 0 ? 'INDEX' : String(thread.rank).padStart(2, '0'),
      ref: thread.ref,
      score: thread.score,
      quality: thread.quality,
      state: thread.state,
      lane: thread.lane,
      pin: thread.pin,
      present: statuses.get(thread.sessionId)?.present ?? false,
      titleMatches: statuses.get(thread.sessionId)?.titleMatches ?? false,
      pinMatches: statuses.get(thread.sessionId)?.pinMatches ?? false,
      title: thread.title,
    }));
  if (asJson) {
    jsonOut({ scope: portfolio.scope, inventory, rows });
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
  const args = new Set(
    applyUnknownLongOptionGuardFor('threads:portfolio', Bun.argv.slice(2)).filter(
      argument => argument !== '--'
    )
  );
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
    const appServerCount = portfolio.threads.filter(
      thread => thread.titleTransport === 'app-server'
    ).length;
    const stateOnlyCount = portfolio.threads.length - appServerCount;
    console.info(`Applied ${appServerCount} app-server thread titles.`);
    if (args.has('--pins') || stateOnlyCount > 0) {
      const backupPath = await applyThreadLocalState(
        portfolio,
        stateDatabasePath,
        args.has('--pins')
      );
      if (stateOnlyCount > 0) {
        console.info(`Applied ${stateOnlyCount} backup-backed state-only thread title.`);
      }
      if (args.has('--pins')) {
        console.info(`Applied ${portfolio.threads.filter(thread => thread.pin).length} pins.`);
      }
      console.info(`Codex state backup: ${backupPath}`);
    }
  }

  const statuses = readLocalThreadStatuses(portfolio, stateDatabasePath);
  const inventory = inspectThreadInventory(portfolio, stateDatabasePath);
  if (!args.has('--json')) {
    console.info(
      `Inventory: ${inventory.rootThreadCount}/${inventory.catalogCount} root threads · ${inventory.subagentCount} mapped subagents · chronological refs ${inventory.chronologicalRefsMatch ? 'match' : 'DRIFT'}`
    );
  }
  printAudit(portfolio, statuses, inventory, args.has('--json'));
  if (args.has('--verify')) {
    const missingLocalReferences = await findMissingLocalPortfolioReferences(portfolio);
    if (missingLocalReferences.length > 0) {
      throw new Error(
        `thread portfolio has ${missingLocalReferences.length} missing local reference(s): ${missingLocalReferences.join(', ')}`
      );
    }
    const failures = [...statuses.values()].filter(
      status => !status.present || !status.titleMatches || !status.pinMatches
    );
    if (failures.length > 0) {
      throw new Error(`${failures.length} thread portfolio entries do not match local Codex state`);
    }
    if (
      inventory.rootThreadCount !== inventory.catalogCount ||
      inventory.missingCatalogSessionIds.length > 0 ||
      inventory.uncatalogedRootSessionIds.length > 0 ||
      !inventory.chronologicalRefsMatch ||
      inventory.orphanSubagentSessionIds.length > 0
    ) {
      throw new Error(`Project R root/subagent inventory does not match the RTH catalog`);
    }
  }
}

if (import.meta.main) {
  await main();
}
