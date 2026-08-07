#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/blog/bun-v1.3.12#bun-webview-headless-browser-automation — await using WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/console#object-inspection-depth — cliOut dual-mode
/**
 * screenshot-cli.ts — dedicated CLI for WebView capture + TEST-003 evidence.
 *
 *   bun run screenshot -- capture <url> [--subject …] [--out-dir …] [--json]
 *   bun run screenshot -- verify <png-path> [--subject …] [--json]
 *   bun run screenshot -- remediate <png-path> [--subject …] [--json]
 *   bun run screenshot -- meta <image-path> [--json]
 *
 * Wraps lib/operator-research/screenshot.ts · lib/screenshot-remediation.ts ·
 * lib/image-metadata.ts. Prefer this over ad-hoc WebView.screenshot calls when
 * you need TEST-003 digests, thumbnail bounds, and dual-mode summaries.
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
import { resolvePath } from '../lib/path-bun.ts';
import {
  remediateScreenshotCapture,
  runTest003,
  buildScreenshotEvidenceRecord,
  TEST_003,
} from '../lib/screenshot-remediation.ts';

export { SCREENSHOT_ALLOWED_LONG };

const COMMANDS = ['capture', 'verify', 'remediate', 'meta'] as const;
type Command = (typeof COMMANDS)[number];

function printHelp(): void {
  console.log(`Usage: bun run screenshot -- <command> [args] [options]

Commands:
  capture <url>       WebView PNG capture + TEST-003 evidence write
  verify <png-path>   Build evidence from an on-disk PNG and run TEST-003
  remediate <png>     End-to-end remediateScreenshotCapture on a PNG
  meta <image-path>   Bun.Image metadata + digest only

Options:
  --subject <label>   Evidence subject (team/site/slug)
  --out-dir <path>    Capture output directory (default: data/operator-research/screenshots)
  --timeout-ms <n>    WebView navigate timeout (default: 18000)
  --no-placeholder    Fail capture instead of writing the placeholder PNG
  --json              Machine-readable summary via cliOut
  -h, --help          Show this help

Docs:
  bun tools/bun-doc-refs.ts suggest "Bun.WebView"
  bun tools/bun-doc-refs.ts suggest "Bun.Image"
  docs/BUN_NATIVE_CAPABILITIES.md · claim image-metadata-boundaries`);
}

function isCommand(value: string | undefined): value is Command {
  return value != null && (COMMANDS as readonly string[]).includes(value);
}

async function readPngBytes(path: string): Promise<Uint8Array> {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`File not found: ${path}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error(`Empty image: ${path}`);
  return bytes;
}

export async function runScreenshotCli(args = Bun.argv.slice(2)): Promise<unknown> {
  const guarded = applyUnknownLongOptionGuardFor('screenshot', args, { onFail: 'throw' });
  const { values, positionals } = parseArgs({
    args: guarded,
    options: {
      subject: { type: 'string' },
      'out-dir': { type: 'string' },
      'timeout-ms': { type: 'string' },
      'no-placeholder': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    return undefined;
  }

  const [command, target] = positionals;
  if (!isCommand(command)) {
    throw new Error(`Unknown command "${command}". Expected: ${COMMANDS.join(' | ')}`);
  }
  if (!target) throw new Error(`Command "${command}" requires a path or URL argument`);

  const json = values.json === true;
  const subject = values.subject;

  if (command === 'capture') {
    const timeoutMs = values['timeout-ms'] == null ? undefined : Number(values['timeout-ms']);
    if (timeoutMs != null && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) {
      throw new Error('--timeout-ms must be a positive integer');
    }
    const result = await captureScreenshot(target, {
      subject,
      allowPlaceholder: values['no-placeholder'] !== true,
      timeoutMs,
      outDir: values['out-dir'] ? resolvePath(values['out-dir']) : undefined,
    });
    const payload = {
      command,
      testId: TEST_003,
      bunVersion: Bun.version,
      observation: result.observation,
    };
    if (json) {
      cliOut(payload, { json: true });
    } else {
      console.log(`screenshot capture · ${result.observation.source}`);
      console.log(
        statusLine('ok', String(result.observation.ok), result.observation.ok ? 'ok' : 'fail')
      );
      if (result.observation.pngPath) {
        console.log(statusLine('png', result.observation.pngPath));
      }
      if (result.observation.thumbPath) {
        console.log(statusLine('thumb', result.observation.thumbPath));
      }
      if (result.observation.error) {
        console.log(statusLine('note', result.observation.error, 'warn'));
      }
    }
    if (!result.observation.ok) process.exitCode = 1;
    return payload;
  }

  const absTarget = resolvePath(target);
  const bytes = await readPngBytes(absTarget);

  if (command === 'meta') {
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
    return payload;
  }

  if (command === 'verify') {
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
    if (!response.ok) process.exitCode = 1;
    return payload;
  }

  // remediate
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
  if (!response.ok) process.exitCode = 1;
  return payload;
}

if (import.meta.main) {
  try {
    await runScreenshotCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
