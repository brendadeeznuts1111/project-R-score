#!/usr/bin/env bun
// @see https://bun.com/docs/test/reporters — custom reporters via Inspector Protocol
// @see https://bun.com/docs/runtime/debugger — --inspect · --inspect-wait
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/http/websockets — WebSocket client
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Inspector TestReporter client for `bun test`.
 *
 * Spawns `bun test --inspect-wait=host:port`, connects WebSocket, enables
 * TestReporter / LifecycleReporter, streams events to JSONL + summary JSON,
 * and prints https://debug.bun.sh/#… for browser attach.
 *
 * Usage:
 *   bun run test:inspect
 *   bun run test:inspect -- tests/console-depth.test.ts
 *   bun scripts/inspect-tests.ts --inspect-port 6499 --out tmp/inspect -- tests/foo.test.ts
 *
 * Orthogonal to JUnit (`bun run test:ci`). Prefer JUnit for CI XML; this for live UX.
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { cliOut } from '../lib/console/index.ts';
import { applyUnknownLongOptionGuard } from '../lib/docs/ref-id-tool-flags.ts';
import {
  accumulateInspectMessage,
  buildEnableRequests,
  buildInitializedRequest,
  buildInspectSummary,
  buildRunIfWaitingRequest,
  createInspectAccumulator,
  debugBunShUrl,
  encodeJsonRpc,
  parseInspectorWsUrl,
  testDisplayName,
  testStatus,
  tryParseJsonRpc,
  type InspectJsonRpcMessage,
} from '../lib/harness/inspect-test-reporter.ts';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 6499;
const DEFAULT_OUT = 'tmp/inspect';
const WS_WAIT_MS = 30_000;

/** Long-option allowlist for this CLI (not yet in ALLOWED_LONG_REGISTRY). */
const TEST_INSPECT_ALLOWED_LONG = [
  'host',
  'inspect-port',
  'out',
  'timeout',
  'json',
  'quiet',
  'help',
  'hlp',
] as const;

type CliOpts = {
  host: string;
  port: number;
  out: string;
  json: boolean;
  quiet: boolean;
  timeoutMs: number;
  /** Paths / patterns passed after `--` to `bun test`. */
  testArgs: string[];
};

function printHelp(): void {
  console.info(`inspect-tests — Bun Inspector TestReporter client

Usage:
  bun scripts/inspect-tests.ts [flags] [-- <bun test args…>]

Flags:
  --host <ip>            Inspect bind host (default ${DEFAULT_HOST})
  --inspect-port <n>     Inspect port (default ${DEFAULT_PORT})
  --out <dir>            Write inspect-events.jsonl + inspect-summary.json (default ${DEFAULT_OUT})
  --timeout <ms>         Max wait for ws:// on stderr (default ${WS_WAIT_MS})
  --json                 Machine summary on stdout
  --quiet                Less TTY progress
  --help

Examples:
  bun run test:inspect
  bun run test:inspect -- tests/console-depth.test.ts -t "bun run - stdin"
`);
}

function parseArgs(argv: string[]): CliOpts {
  const cleaned = applyUnknownLongOptionGuard(argv, TEST_INSPECT_ALLOWED_LONG, {
    cliName: 'test:inspect',
    onFail: 'exit',
  });
  const opts: CliOpts = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    out: DEFAULT_OUT,
    json: false,
    quiet: false,
    timeoutMs: WS_WAIT_MS,
    testArgs: [],
  };

  const dash = cleaned.indexOf('--');
  const flagArgs = dash >= 0 ? cleaned.slice(0, dash) : cleaned;
  opts.testArgs = dash >= 0 ? cleaned.slice(dash + 1) : [];

  for (let i = 0; i < flagArgs.length; i++) {
    const a = flagArgs[i]!;
    if (a === '--help' || a === '--hlp') {
      printHelp();
      process.exit(0);
    }
    if (a === '--json') {
      opts.json = true;
      continue;
    }
    if (a === '--quiet') {
      opts.quiet = true;
      continue;
    }
    if (a === '--host') {
      opts.host = flagArgs[++i] ?? opts.host;
      continue;
    }
    if (a.startsWith('--host=')) {
      opts.host = a.slice('--host='.length);
      continue;
    }
    if (a === '--inspect-port') {
      opts.port = Number(flagArgs[++i] ?? opts.port);
      continue;
    }
    if (a.startsWith('--inspect-port=')) {
      opts.port = Number(a.slice('--inspect-port='.length));
      continue;
    }
    if (a === '--out') {
      opts.out = flagArgs[++i] ?? opts.out;
      continue;
    }
    if (a.startsWith('--out=')) {
      opts.out = a.slice('--out='.length);
      continue;
    }
    if (a === '--timeout') {
      opts.timeoutMs = Number(flagArgs[++i] ?? opts.timeoutMs);
      continue;
    }
    if (a.startsWith('--timeout=')) {
      opts.timeoutMs = Number(a.slice('--timeout='.length));
      continue;
    }
    if (!a.startsWith('-')) {
      opts.testArgs.push(a);
      continue;
    }
  }

  if (!Number.isFinite(opts.port) || opts.port <= 0) {
    console.error('❌ --inspect-port must be a positive number');
    process.exit(2);
  }
  if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
    console.error('❌ --timeout must be a positive number');
    process.exit(2);
  }
  return opts;
}

async function ensureOutDir(dir: string): Promise<void> {
  await Bun.$`mkdir -p ${dir}`.quiet();
}

async function waitForWsUrl(
  stderr: ReadableStream<Uint8Array>,
  timeoutMs: number
): Promise<string> {
  const decoder = new TextDecoder();
  let buf = '';
  const reader = stderr.getReader();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const read = await Promise.race([
      reader.read(),
      Bun.sleep(remaining).then(() => ({ done: true as const, value: undefined as undefined })),
    ]);
    if (read.value) {
      buf += decoder.decode(read.value, { stream: true });
      const url = parseInspectorWsUrl(buf);
      if (url) {
        void (async () => {
          try {
            for (;;) {
              const n = await reader.read();
              if (n.done) break;
            }
          } catch {
            /* ignore */
          }
        })();
        return url;
      }
    }
    if (read.done) break;
  }
  throw new Error(
    `Timed out waiting for Inspector ws:// URL on stderr (waited ${timeoutMs}ms).\n` +
      `stderr so far:\n${buf.slice(0, 2000)}`
  );
}

async function runClient(opts: CliOpts): Promise<number> {
  const startedAt = new Date().toISOString();
  await ensureOutDir(opts.out);
  const eventsPath = `${opts.out}/inspect-events.jsonl`;
  const summaryPath = `${opts.out}/inspect-summary.json`;
  await Bun.write(eventsPath, '');

  const inspectFlag = `--inspect-wait=${opts.host}:${opts.port}`;
  const cmd = bunSpawnArgs(['test', inspectFlag, ...opts.testArgs]);

  if (!opts.quiet && !opts.json) {
    console.info(`▶ ${cmd.join(' ')}`);
  }

  const proc = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
    env: {
      ...Bun.env,
      BUN_OPTIONS: '',
    },
  });

  const inspectorUrl = await waitForWsUrl(proc.stderr, opts.timeoutMs);
  const debugUrl = debugBunShUrl(inspectorUrl);

  if (!opts.quiet && !opts.json) {
    console.info(`🔗 Inspector ${inspectorUrl}`);
    console.info(`🌐 ${debugUrl}`);
  }

  const acc = createInspectAccumulator();
  let rpcId = 100;
  let eventsBuf = '';
  let socketClosed = false;

  const appendEvent = async (msg: InspectJsonRpcMessage) => {
    accumulateInspectMessage(acc, msg);
    const line = `${JSON.stringify({
      at: new Date().toISOString(),
      method: msg.method,
      params: msg.params,
      id: msg.id,
    })}\n`;
    eventsBuf += line;
    await Bun.write(eventsPath, eventsBuf);

    if (opts.quiet || opts.json || !msg.method) return;
    if (msg.method.startsWith('TestReporter.')) {
      const name = testDisplayName(msg.params as Record<string, unknown> | undefined);
      if (msg.method === 'TestReporter.found') console.info(`  · found  ${name}`);
      if (msg.method === 'TestReporter.start') console.info(`  → start  ${name}`);
      if (msg.method === 'TestReporter.end') {
        console.info(
          `  ✓ end    ${name}  (${testStatus(msg.params as Record<string, unknown> | undefined)})`
        );
      }
    }
    if (msg.method === 'LifecycleReporter.error') {
      console.info(`  ✗ error  ${JSON.stringify(msg.params)}`);
    }
  };

  const ws = new WebSocket(inspectorUrl);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), opts.timeoutMs);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener('error', ev => {
      clearTimeout(timer);
      reject(new Error(`WebSocket error: ${String((ev as ErrorEvent).message ?? 'failed')}`));
    });
  });

  ws.addEventListener('message', ev => {
    const data = typeof ev.data === 'string' ? ev.data : String(ev.data);
    for (const line of data.split('\n')) {
      const msg = tryParseJsonRpc(line);
      if (!msg) continue;
      void appendEvent(msg);
    }
  });

  ws.addEventListener('close', () => {
    socketClosed = true;
  });

  const send = (msg: { id: number; method: string }) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(encodeJsonRpc(msg));
  };

  for (const req of buildEnableRequests(rpcId)) {
    send(req);
    rpcId = req.id + 1;
  }
  send(buildInitializedRequest(rpcId++));
  send(buildRunIfWaitingRequest(rpcId++));

  if (proc.stdout) {
    const outReader = proc.stdout.getReader();
    void (async () => {
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await outReader.read();
        if (done) break;
        if (value && !opts.json && !opts.quiet) process.stdout.write(dec.decode(value));
      }
    })();
  }

  const exitCode = await proc.exited;
  if (!socketClosed) await Bun.sleep(200);
  try {
    ws.close();
  } catch {
    /* ignore */
  }

  const summary = buildInspectSummary({
    acc,
    inspectorUrl,
    bunVersion: Bun.version,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    eventsPath,
    summaryPath,
  });
  await Bun.write(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  if (opts.json) {
    cliOut(summary, { json: true });
  } else if (!opts.quiet) {
    console.info('');
    console.info(
      `Summary: found=${summary.found} started=${summary.started} ended=${summary.ended} ` +
        `pass=${summary.passed} fail=${summary.failed} skip=${summary.skipped} errors=${summary.errors}`
    );
    console.info(`Events:  ${eventsPath}`);
    console.info(`Summary: ${summaryPath}`);
    console.info(`Debug:   ${debugUrl}`);
  }

  return exitCode ?? (summary.failed > 0 || summary.errors > 0 ? 1 : 0);
}

if (import.meta.main) {
  const opts = parseArgs(Bun.argv.slice(2));
  try {
    process.exit(await runClient(opts));
  } catch (err) {
    console.error(`❌ inspect-tests: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
