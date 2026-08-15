// @see https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun — Bun.dns.lookup
// @verified Bun.dns.lookup · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.jpeg
// @released Bun.Image.jpeg · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @verified Bun.nanoseconds · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @verified Bun.peek · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-peek
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @verified Bun.TOML.parse · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/toml#bun-toml-parse
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @verified Bun.version · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/webview — Bun.WebView
// @see https://bun.com/blog/bun-v1.3.12#bun-webview-headless-browser-automation — await using WebView
// @see https://bun.com/docs/runtime/image — Bun.Image
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
import { joinPath } from '../path-bun.ts';
import { FIXTURES_DIR } from './paths.ts';
import { checkBunVersion, type VersionCheckResult } from './version-check.ts';

export type CapabilityCheck = {
  ok: boolean;
  elapsedMs: number;
  error?: string;
  detail?: Record<string, unknown>;
};

export type ToolAvailability = Record<string, string | null>;

export type DoctorReport = {
  generatedAt: string;
  bun: VersionCheckResult;
  features: {
    webview: boolean;
    image: boolean;
    http2: boolean;
    http3: boolean;
    cron: boolean;
    semver: boolean;
    peek: boolean;
    sleep: boolean;
    dns: boolean;
    toml: boolean;
    glob: boolean;
  };
  checks: {
    webview: CapabilityCheck;
    image: CapabilityCheck;
  };
  tools: ToolAvailability;
};

export async function getToolAvailability(
  names: string[] = ['curl', 'git', 'jq', 'bun']
): Promise<ToolAvailability> {
  const out: ToolAvailability = {};
  for (const name of names) {
    out[name] = Bun.which(name);
  }
  return out;
}

export async function checkWebView(timeoutMs = 2000): Promise<CapabilityCheck> {
  const started = Number(Bun.nanoseconds());
  try {
    // Bun.WebView is AsyncDisposable — await using closes the view at scope exit.
    await using view = new Bun.WebView({ width: 320, height: 240, headless: true });
    await Promise.race([
      view.navigate('about:blank'),
      Bun.sleep(timeoutMs).then(() => {
        throw new Error(`WebView navigation timeout (${timeoutMs}ms)`);
      }),
    ]);
    return {
      ok: true,
      elapsedMs: (Number(Bun.nanoseconds()) - started) / 1_000_000,
      detail: { navigated: 'about:blank' },
    };
  } catch (err) {
    return {
      ok: false,
      elapsedMs: (Number(Bun.nanoseconds()) - started) / 1_000_000,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkImage(): Promise<CapabilityCheck> {
  const started = Number(Bun.nanoseconds());
  try {
    const placeholder = joinPath(FIXTURES_DIR, 'placeholder.png');
    const file = Bun.file(placeholder);
    if (!(await file.exists())) {
      throw new Error(`missing fixture ${placeholder}`);
    }
    const source = new Uint8Array(await file.arrayBuffer());
    const bytes = await new Bun.Image(source)
      .resize(8, 8, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .bytes();
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
      throw new Error('Empty JPEG buffer after resize');
    }
    const meta = await new Bun.Image(bytes).metadata();
    return {
      ok: true,
      elapsedMs: (Number(Bun.nanoseconds()) - started) / 1_000_000,
      detail: {
        bytes: bytes.byteLength,
        width: meta.width,
        height: meta.height,
        format: meta.format,
      },
    };
  } catch (err) {
    return {
      ok: false,
      elapsedMs: (Number(Bun.nanoseconds()) - started) / 1_000_000,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function detectHttpFeatures(): { http2: boolean; http3: boolean } {
  // Feature detection via Bun.semver against known ship points in this repo's engines pin.
  const http2 = Bun.semver.satisfies(Bun.version, '>=1.3.0');
  const http3 = Bun.semver.satisfies(Bun.version, '>=1.3.14');
  return { http2, http3 };
}

export async function runDoctor(): Promise<DoctorReport> {
  const [bun, webview, image, tools] = await Promise.all([
    checkBunVersion(),
    checkWebView(),
    checkImage(),
    getToolAvailability(),
  ]);
  const { http2, http3 } = detectHttpFeatures();
  return {
    generatedAt: new Date().toISOString(),
    bun,
    features: {
      webview: webview.ok,
      image: image.ok,
      http2,
      http3,
      cron: typeof Bun.cron === 'function',
      semver: typeof Bun.semver?.satisfies === 'function',
      peek: typeof Bun.peek === 'function',
      sleep: typeof Bun.sleep === 'function',
      dns: typeof Bun.dns?.lookup === 'function',
      toml: typeof Bun.TOML?.parse === 'function',
      glob: typeof Bun.Glob === 'function',
    },
    checks: { webview, image },
    tools,
  };
}

export function formatDoctorTable(report: DoctorReport): string {
  const lines = [
    'Operator research doctor',
    `Bun ${report.bun.bunVersion} (required ${report.bun.required}) · satisfies=${report.bun.satisfies}`,
    `Agent ${report.bun.packageName}@${report.bun.agentVersion}`,
    '',
    'Capability          Status   Detail',
    '------------------  -------  ------',
    `webview             ${report.checks.webview.ok ? 'ok' : 'FAIL'}     ${report.checks.webview.error ?? `${report.checks.webview.elapsedMs.toFixed(1)}ms`}`,
    `image               ${report.checks.image.ok ? 'ok' : 'FAIL'}     ${report.checks.image.error ?? `jpeg ${report.checks.image.detail?.bytes ?? '?'}B`}`,
    `http2               ${report.features.http2 ? 'ok' : 'no'}`,
    `http3               ${report.features.http3 ? 'ok' : 'no'}`,
    `cron                ${report.features.cron ? 'ok' : 'no'}`,
    `semver/peek/sleep   ${report.features.semver && report.features.peek && report.features.sleep ? 'ok' : 'partial'}`,
    '',
    'Tools:',
  ];
  for (const [name, path] of Object.entries(report.tools)) {
    lines.push(`  ${name.padEnd(8)} ${path ?? '(missing)'}`);
  }
  return lines.join('\n');
}
