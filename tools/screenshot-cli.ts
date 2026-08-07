#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/blog/bun-v1.3.12#bun-webview-headless-browser-automation — await using WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/console#object-inspection-depth — cliOut dual-mode
// @see https://bun.com/docs/bundler/executables — --force
/**
 * screenshot-cli.ts — dedicated CLI for WebView capture + TEST-003 evidence.
 *
 *   bun run screenshot -- capture <url> [--subject …] [--out-dir …] [--json]
 *   bun run screenshot -- verify <png-path> [--subject …] [--json]
 *   bun run screenshot -- remediate <png-path> [--subject …] [--json]
 *   bun run screenshot -- meta <image-path> [--json]
 *
 * Capture defaults to failing when WebView cannot capture (no silent placeholder).
 * Pass `--allow-placeholder` to write the fixture PNG and still run TEST-003.
 * Paths must stay under the repo root unless `--force`.
 *
 * Unknown long options: ALLOWED_LONG_REGISTRY['screenshot'] · BUN_STRIP_UNKNOWN.
 * Doc discovery: bun tools/bun-doc-refs.ts suggest "Bun.WebView" | "Bun.Image"
 */
import { parseArgs } from 'node:util';
import { cliOut, logTable, statusLine } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  SCREENSHOT_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';
import { extractImageEvidenceMeta } from '../lib/image-metadata.ts';
import { captureScreenshot } from '../lib/operator-research/screenshot.ts';
import {
  ensureResearchDirs,
  ROOT as REPO_ROOT,
  SCREENSHOTS_DIR,
} from '../lib/operator-research/paths.ts';
import { joinPath, normalizePath, relativePath, resolvePath } from '../lib/path-bun.ts';
import {
  remediateScreenshotCapture,
  runTest003,
  buildScreenshotEvidenceRecord,
  parseScreenshotEvidenceRecord,
  TEST_003,
  type Test003Response,
} from '../lib/screenshot-remediation.ts';

export { SCREENSHOT_ALLOWED_LONG };

const COMMANDS = ['capture', 'verify', 'remediate', 'meta'] as const;
type Command = (typeof COMMANDS)[number];

/** PNG signature bytes (89 50 4E 47 0D 0A 1A 0A). */
const PNG_MAGIC = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

export type ScreenshotCliResult = {
  payload: unknown;
  exitCode: number;
};

export type ScreenshotCliDeps = {
  capture?: typeof captureScreenshot;
};

function printHelp(): void {
  console.log(`Usage: bun run screenshot -- <command> [args] [options]

Commands:
  capture <url>       WebView PNG capture + TEST-003 gate + evidence write
  verify <path>       PNG → TEST-003, or re-parse a .test003.json sidecar
  remediate <png>     End-to-end remediateScreenshotCapture on a PNG
  meta <image-path>   Bun.Image metadata + digest only

Options:
  --subject <label>      Evidence subject (team/site/slug)
  --out-dir <path>       Capture output directory (default: data/operator-research/screenshots)
  --timeout-ms <n>       WebView navigate timeout (default: 18000)
  --allow-placeholder    On WebView failure, write fixture PNG and continue TEST-003
  --force                Allow paths outside the repository root
  --json                 Machine-readable summary via cliOut
  -h, --help             Show this help

Docs:
  bun tools/bun-doc-refs.ts suggest "Bun.WebView"
  bun tools/bun-doc-refs.ts suggest "Bun.Image"
  docs/BUN_NATIVE_CAPABILITIES.md · claim image-metadata-boundaries`);
}

function isCommand(value: string | undefined): value is Command {
  return value != null && (COMMANDS as readonly string[]).includes(value);
}

/** Reject non-http(s) capture targets. */
export function assertHttpUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`capture URL must be absolute http(s); got: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`capture URL must use http(s); got protocol ${parsed.protocol}`);
  }
  return parsed.href;
}

/** Resolve realpath when the path exists (falls back to normalized absolute). */
export async function resolveExistingRealPath(path: string): Promise<string> {
  const abs = normalizePath(resolvePath(path));
  if (!(await Bun.file(abs).exists())) return abs;
  const proc = Bun.spawn(['realpath', '--', abs], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  const resolved = stdout.trim();
  return exitCode === 0 && resolved ? normalizePath(resolved) : abs;
}

/** Resolve a path and optionally require it under the repo root (realpath-aware). */
export async function assertRepoPath(
  path: string,
  opts: { force?: boolean; label: string }
): Promise<string> {
  const abs = await resolveExistingRealPath(path);
  if (opts.force) return abs;
  const root = await resolveExistingRealPath(REPO_ROOT);
  const rel = relativePath(root, abs);
  if (rel.startsWith('..') || rel === '..') {
    throw new Error(
      `${opts.label} must stay under the repository root (${root}); got ${abs}. Pass --force to override.`
    );
  }
  return abs;
}

export function hasPngMagic(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_MAGIC.byteLength) return false;
  for (let i = 0; i < PNG_MAGIC.byteLength; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return false;
  }
  return true;
}

async function readPngBytes(path: string): Promise<Uint8Array> {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`File not found: ${path}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error(`Empty image: ${path}`);
  if (!hasPngMagic(bytes)) {
    throw new Error(`Not a PNG (missing signature): ${path}`);
  }
  return bytes;
}

function captureExitCode(opts: {
  observationOk: boolean;
  source: string;
  allowPlaceholder: boolean;
  test003Ok: boolean | null;
}): number {
  if (!opts.observationOk) return 1;
  if (opts.source === 'placeholder' && !opts.allowPlaceholder) return 1;
  if (opts.test003Ok === false) return 1;
  return 0;
}

export async function runScreenshotCli(
  args = Bun.argv.slice(2),
  deps: ScreenshotCliDeps = {}
): Promise<ScreenshotCliResult> {
  const guarded = applyUnknownLongOptionGuardFor('screenshot', args, { onFail: 'throw' });
  const { values, positionals } = parseArgs({
    args: guarded,
    options: {
      subject: { type: 'string' },
      'out-dir': { type: 'string' },
      'timeout-ms': { type: 'string' },
      'allow-placeholder': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    return { payload: undefined, exitCode: 0 };
  }

  const [command, target] = positionals;
  if (!isCommand(command)) {
    throw new Error(`Unknown command "${command}". Expected: ${COMMANDS.join(' | ')}`);
  }
  if (!target) throw new Error(`Command "${command}" requires a path or URL argument`);

  const json = values.json === true;
  const subject = values.subject;
  const force = values.force === true;
  const allowPlaceholder = values['allow-placeholder'] === true;
  const captureFn = deps.capture ?? captureScreenshot;

  if (command === 'capture') {
    const url = assertHttpUrl(target);
    const timeoutMs = values['timeout-ms'] == null ? undefined : Number(values['timeout-ms']);
    if (timeoutMs != null && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) {
      throw new Error('--timeout-ms must be a positive integer');
    }
    await ensureResearchDirs();
    const outDir = await assertRepoPath(values['out-dir'] ?? SCREENSHOTS_DIR, {
      force,
      label: '--out-dir',
    });
    const result = await captureFn(url, {
      subject,
      allowPlaceholder,
      timeoutMs,
      outDir,
    });

    let test003: Test003Response | null = null;
    let evidencePath: string | undefined;
    if (result.pngBytes) {
      const remediated = await remediateScreenshotCapture(result.pngBytes, {
        subject: subject ?? url,
      });
      // Drop thumbnailBytes — binary must not land in --json / evidence sidecars.
      const { thumbnailBytes: _thumb, ...gate } = remediated;
      test003 = gate;
      if (result.observation.evidenceId) {
        evidencePath = joinPath(outDir, `${result.observation.evidenceId}.test003.json`);
        await Bun.write(
          evidencePath,
          JSON.stringify(
            {
              ...test003,
              evidenceId: String(test003.evidence.evidenceId),
              observation: result.observation,
            },
            null,
            2
          )
        );
      }
    }

    const exitCode = captureExitCode({
      observationOk: result.observation.ok,
      source: result.observation.source,
      allowPlaceholder,
      test003Ok: test003?.ok ?? null,
    });
    const payload = {
      command,
      testId: TEST_003,
      bunVersion: Bun.version,
      observation: result.observation,
      test003,
      evidencePath,
      exitCode,
    };
    if (json) {
      cliOut(payload, { json: true });
    } else {
      console.log(`screenshot capture · ${result.observation.source}`);
      console.log(statusLine('ok', String(exitCode === 0), exitCode === 0 ? 'ok' : 'fail'));
      if (result.observation.pngPath) {
        console.log(statusLine('png', result.observation.pngPath));
      }
      if (result.observation.thumbPath) {
        console.log(statusLine('thumb', result.observation.thumbPath));
      }
      if (evidencePath) console.log(statusLine('evidence', evidencePath));
      if (test003) {
        console.log(
          statusLine(
            TEST_003,
            `${test003.status} · ${test003.remediation.action}`,
            test003.ok ? 'ok' : 'fail'
          )
        );
      }
      if (result.observation.error) {
        console.log(statusLine('note', result.observation.error, 'warn'));
      }
    }
    return { payload, exitCode };
  }

  const absTarget = await assertRepoPath(target, { force, label: 'image path' });

  if (command === 'meta') {
    const bytes = await readPngBytes(absTarget);
    const meta = await extractImageEvidenceMeta(bytes);
    const payload = { command, path: absTarget, bunVersion: Bun.version, meta };
    if (json) {
      cliOut(payload, { json: true });
    } else {
      logTable(
        [{ ...meta, path: absTarget }],
        ['path', 'width', 'height', 'format', 'size', 'algorithm', 'digest']
      );
    }
    return { payload, exitCode: 0 };
  }

  if (command === 'verify') {
    if (absTarget.endsWith('.test003.json') || absTarget.endsWith('.json')) {
      const wire = await Bun.file(absTarget).json();
      const record = parseScreenshotEvidenceRecord(wire);
      const response = runTest003(record);
      const payload = {
        command,
        path: absTarget,
        bunVersion: Bun.version,
        source: 'sidecar',
        ...response,
      };
      if (json) {
        cliOut(payload, { json: true });
      } else {
        console.log(`${TEST_003} sidecar ${response.status} · ${response.remediation.action}`);
        console.log(statusLine('message', response.remediation.message));
        logTable(
          response.checks.map(c => ({
            id: c.id,
            ok: c.ok ? 'pass' : 'FAIL',
            message: c.message,
          })),
          ['id', 'ok', 'message']
        );
      }
      return { payload, exitCode: response.ok ? 0 : 1 };
    }

    const bytes = await readPngBytes(absTarget);
    const { record, elapsedMs } = await buildScreenshotEvidenceRecord(bytes, { subject });
    const response = runTest003(record, undefined, { elapsedMs });
    const payload = { command, path: absTarget, bunVersion: Bun.version, ...response };
    if (json) {
      cliOut(payload, { json: true });
    } else {
      console.log(`${TEST_003} ${response.status} · ${response.remediation.action}`);
      console.log(statusLine('message', response.remediation.message));
      logTable(
        response.checks.map(c => ({
          id: c.id,
          ok: c.ok ? 'pass' : 'FAIL',
          message: c.message,
        })),
        ['id', 'ok', 'message']
      );
    }
    return { payload, exitCode: response.ok ? 0 : 1 };
  }

  // remediate
  const bytes = await readPngBytes(absTarget);
  const response = await remediateScreenshotCapture(bytes, { subject });
  const payload = {
    command,
    path: absTarget,
    bunVersion: Bun.version,
    ok: response.ok,
    status: response.status,
    action: response.remediation.action,
    message: response.remediation.message,
    evidenceId: String(response.evidence.evidenceId),
    source: response.evidence.source,
    thumbnail: response.evidence.thumbnail,
    checks: response.checks,
    elapsedMs: response.elapsedMs,
  };
  if (json) {
    cliOut(payload, { json: true });
  } else {
    console.log(`${TEST_003} remediate · ${response.status} · ${response.remediation.action}`);
    console.log(statusLine('message', response.remediation.message));
    logTable(
      [
        {
          plane: 'source',
          width: response.evidence.source.width,
          height: response.evidence.source.height,
          format: response.evidence.source.format,
          size: response.evidence.source.size,
        },
        {
          plane: 'thumbnail',
          width: response.evidence.thumbnail.width,
          height: response.evidence.thumbnail.height,
          format: response.evidence.thumbnail.format,
          size: response.evidence.thumbnail.size,
        },
      ],
      ['plane', 'width', 'height', 'format', 'size']
    );
  }
  return { payload, exitCode: response.ok ? 0 : 1 };
}

if (import.meta.main) {
  try {
    const { exitCode } = await runScreenshotCli();
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
