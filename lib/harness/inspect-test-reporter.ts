// @see https://bun.com/docs/test/reporters — custom reporters (TestReporter · LifecycleReporter)
// @see https://bun.com/docs/runtime/debugger — bun --inspect / --inspect-wait
// @see https://bun.com/docs/runtime/http/websockets — WebSocket client
// @see https://bun.com/blog/bun-v1.3.7 — late-connect TestReporter.found/start/end
/**
 * Bun WebKit Inspector Protocol helpers for custom `bun test` reporters.
 *
 * Custom reporters are not a Jest-style plugin hook — they are a debugger client
 * that speaks JSON-RPC over WebSocket against Bun's TestReporter /
 * LifecycleReporter domains while `bun test --inspect` (or `--inspect-wait`) runs.
 *
 * Orthogonal to JUnit (`--reporter=junit`): use JUnit for CI XML; use this for
 * live telemetry / JSONL / debug.bun.sh attach.
 */

export const INSPECT_TEST_REPORTER_DOCS = 'https://bun.com/docs/test/reporters';
export const INSPECT_DEBUGGER_DOCS = 'https://bun.com/docs/runtime/debugger';

/** Soft fields — Bun event params are lightly documented. */
export type TestReporterFoundParams = {
  id?: number;
  name?: string;
  title?: string;
  testId?: string | number; // brand-ok — soft Bun Inspector field, not catalog TestId
  type?: 'test' | 'describe' | string;
  url?: string;
  sourceURL?: string;
  line?: number;
  [key: string]: unknown;
};

export type TestReporterEndParams = {
  id?: number;
  name?: string;
  title?: string;
  testId?: string | number; // brand-ok — soft Bun Inspector field, not catalog TestId
  status?: 'pass' | 'fail' | 'skip' | 'todo' | string;
  duration?: number;
  [key: string]: unknown;
};

export type InspectJsonRpcRequest = {
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

export type InspectJsonRpcMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code?: number; message?: string };
};

export type InspectEventRecord = {
  at: string;
  method: string;
  params: Record<string, unknown>;
};

export type InspectRunSummary = {
  kind: 'inspect-test-summary';
  schemaVersion: 1;
  inspectorUrl: string;
  debugBunUrl: string;
  bunVersion: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  found: number;
  started: number;
  ended: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  consoleMessages: number;
  eventsPath: string;
  summaryPath: string;
};

const WS_URL_RE = /ws:\/\/[^\s"'<>]+/i;

/** Extract first `ws://…` inspector URL from bun stderr/stdout text. */
export function parseInspectorWsUrl(text: string): string | undefined {
  const m = text.match(WS_URL_RE);
  if (!m) return undefined;
  return m[0]!.replace(/[.,;)]+$/, '');
}

/** https://debug.bun.sh/#ws://host:port/… browser attach helper. */
export function debugBunShUrl(inspectorWsUrl: string): string {
  return `https://debug.bun.sh/#${inspectorWsUrl}`;
}

export function testDisplayName(params: Record<string, unknown> | undefined): string {
  if (!params) return '(unknown)';
  const p = params as TestReporterFoundParams;
  const raw = p.name ?? p.title ?? p.testId;
  if (raw === undefined || raw === null || raw === '') return '(unnamed)';
  return String(raw);
}

export function testStatus(params: Record<string, unknown> | undefined): string {
  if (!params) return 'unknown';
  const status = (params as TestReporterEndParams).status;
  return typeof status === 'string' && status.length > 0 ? status : 'unknown';
}

/** Domains to enable after WebSocket open (CDP-style). */
export const INSPECT_ENABLE_METHODS = [
  'Inspector.enable',
  'Runtime.enable',
  'Debugger.enable',
  'Console.enable',
  'TestReporter.enable',
  'LifecycleReporter.enable',
] as const;

export function buildEnableRequests(startId = 1): InspectJsonRpcRequest[] {
  return INSPECT_ENABLE_METHODS.map((method, i) => ({
    id: startId + i,
    method,
  }));
}

export function buildInitializedRequest(id: number): InspectJsonRpcRequest {
  return { id, method: 'Inspector.initialized' };
}

export function buildRunIfWaitingRequest(id: number): InspectJsonRpcRequest {
  return { id, method: 'Runtime.runIfWaitingForDebugger' };
}

export type InspectAccumulator = {
  found: number;
  started: number;
  ended: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  consoleMessages: number;
  events: InspectEventRecord[];
};

export function createInspectAccumulator(): InspectAccumulator {
  return {
    found: 0,
    started: 0,
    ended: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
    consoleMessages: 0,
    events: [],
  };
}

/** Apply one inspector notification; mutates accumulator. */
export function accumulateInspectMessage(
  acc: InspectAccumulator,
  msg: InspectJsonRpcMessage,
  at = new Date().toISOString()
): void {
  if (!msg.method) return;
  const params = (msg.params ?? {}) as Record<string, unknown>;
  acc.events.push({ at, method: msg.method, params });

  switch (msg.method) {
    case 'TestReporter.found':
      acc.found += 1;
      break;
    case 'TestReporter.start':
      acc.started += 1;
      break;
    case 'TestReporter.end': {
      acc.ended += 1;
      const status = testStatus(params);
      if (status === 'pass' || status === 'passed') acc.passed += 1;
      else if (status === 'fail' || status === 'failed') acc.failed += 1;
      else if (status === 'skip' || status === 'skipped' || status === 'todo') acc.skipped += 1;
      break;
    }
    case 'LifecycleReporter.error':
      acc.errors += 1;
      break;
    case 'Console.messageAdded':
      acc.consoleMessages += 1;
      break;
    default:
      break;
  }
}

export function buildInspectSummary(input: {
  acc: InspectAccumulator;
  inspectorUrl: string;
  bunVersion: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  eventsPath: string;
  summaryPath: string;
}): InspectRunSummary {
  return {
    kind: 'inspect-test-summary',
    schemaVersion: 1,
    inspectorUrl: input.inspectorUrl,
    debugBunUrl: debugBunShUrl(input.inspectorUrl),
    bunVersion: input.bunVersion,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    exitCode: input.exitCode,
    found: input.acc.found,
    started: input.acc.started,
    ended: input.acc.ended,
    passed: input.acc.passed,
    failed: input.acc.failed,
    skipped: input.acc.skipped,
    errors: input.acc.errors,
    consoleMessages: input.acc.consoleMessages,
    eventsPath: input.eventsPath,
    summaryPath: input.summaryPath,
  };
}

export function encodeJsonRpc(msg: InspectJsonRpcRequest): string {
  return JSON.stringify(msg);
}

export function tryParseJsonRpc(raw: string): InspectJsonRpcMessage | undefined {
  const t = raw.trim();
  if (!t.startsWith('{')) return undefined;
  try {
    const v = JSON.parse(t) as InspectJsonRpcMessage;
    if (v && typeof v === 'object') return v;
  } catch {
    return undefined;
  }
  return undefined;
}
