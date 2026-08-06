// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Tier 4 scrape agents TOML SSOT.
 *
 * Fleet defaults: `config/scrape-agents.toml`
 * Per-book: `config/operators/<bookId>.toml` `[scrape]`
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/operations/scrapers/README.md
 */

import { joinPath } from '../../path-bun.ts';
import { loadOperatorsSync } from '../../operator-research/operators.ts';
import { ROOT as OPERATOR_ROOT } from '../../operator-research/paths.ts';
import {
  asSportsbookId,
  asStateCode,
  tryStateCode,
  type SportsbookId,
  type StateCode,
} from './domain.ts';

/** Mirrors `CaptureHtmlViaWebViewOptions` — kept local to avoid import cycle with webview-html. */
export type WebViewCaptureOptionOverrides = {
  timeoutMs?: number;
  settleMs?: number;
  width?: number;
  height?: number;
};

export const SCRAPE_AGENTS_TOML_REL = 'config/scrape-agents.toml';

export type BookScrapeTomlConfig = {
  bookId: SportsbookId;
  agentId: string; // brand-ok — scrape agent slug (e.g. draftkings-agent), not a catalog *Id
  liveUrl: string;
  html: boolean;
  htmlUrl?: string;
  /** Absolute path when html_fixture is set. */
  htmlFixtureAbs?: string;
  jurisdiction: StateCode;
};

export type ScrapeFleetDefaults = {
  jurisdiction: StateCode;
  jsonTimeoutMs: number;
  htmlTimeoutMs: number;
};

export type ScrapeWebViewDefaults = {
  timeoutMs: number;
  settleMs: number;
  width: number;
  height: number;
};

export type ScrapeCronDefaults = {
  schedule: string;
  title: string;
};

export type ScrapeAgentsConfig = {
  defaults: ScrapeFleetDefaults;
  webview: ScrapeWebViewDefaults;
  cron: ScrapeCronDefaults;
  books: ReadonlyMap<string, BookScrapeTomlConfig>;
};

const FALLBACK: ScrapeAgentsConfig = {
  defaults: {
    jurisdiction: asStateCode('NJ'),
    jsonTimeoutMs: 10_000,
    htmlTimeoutMs: 18_000,
  },
  webview: {
    timeoutMs: 18_000,
    settleMs: 800,
    width: 1280,
    height: 720,
  },
  cron: {
    schedule: '*/15 * * * *',
    title: 'baseline-scrape',
  },
  books: new Map(),
};

let cached: ScrapeAgentsConfig | null = null;

function repoRoot(): string {
  return OPERATOR_ROOT;
}

function scrapeAgentsTomlPath(root: string = repoRoot()): string {
  return joinPath(root, SCRAPE_AGENTS_TOML_REL);
}

function parsePositiveMs(value: number | undefined, fallback: number): number {
  if (value != null && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  return fallback;
}

function readTomlTable(raw: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = raw[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseFleetToml(text: string): Omit<ScrapeAgentsConfig, 'books'> {
  // Wire boundary: Bun.TOML.parse → typed fleet config
  const raw = Bun.TOML.parse(text) as Record<string, unknown>;
  const defaultsRaw = readTomlTable(raw, 'defaults');
  const webviewRaw = readTomlTable(raw, 'webview');
  const cronRaw = readTomlTable(raw, 'cron');

  const jurRaw = typeof defaultsRaw.jurisdiction === 'string' ? defaultsRaw.jurisdiction : 'NJ';
  const jurisdiction = tryStateCode(jurRaw) ?? FALLBACK.defaults.jurisdiction;

  return {
    defaults: {
      jurisdiction,
      jsonTimeoutMs: parsePositiveMs(
        typeof defaultsRaw.json_timeout_ms === 'number' ? defaultsRaw.json_timeout_ms : undefined,
        FALLBACK.defaults.jsonTimeoutMs
      ),
      htmlTimeoutMs: parsePositiveMs(
        typeof defaultsRaw.html_timeout_ms === 'number' ? defaultsRaw.html_timeout_ms : undefined,
        FALLBACK.defaults.htmlTimeoutMs
      ),
    },
    webview: {
      timeoutMs: parsePositiveMs(
        typeof webviewRaw.timeout_ms === 'number' ? webviewRaw.timeout_ms : undefined,
        FALLBACK.webview.timeoutMs
      ),
      settleMs: parsePositiveMs(
        typeof webviewRaw.settle_ms === 'number' ? webviewRaw.settle_ms : undefined,
        FALLBACK.webview.settleMs
      ),
      width: parsePositiveMs(
        typeof webviewRaw.width === 'number' ? webviewRaw.width : undefined,
        FALLBACK.webview.width
      ),
      height: parsePositiveMs(
        typeof webviewRaw.height === 'number' ? webviewRaw.height : undefined,
        FALLBACK.webview.height
      ),
    },
    cron: {
      schedule:
        typeof cronRaw.schedule === 'string' && cronRaw.schedule.trim().length > 0
          ? cronRaw.schedule.trim()
          : FALLBACK.cron.schedule,
      title:
        typeof cronRaw.title === 'string' && cronRaw.title.trim().length > 0
          ? cronRaw.title.trim()
          : FALLBACK.cron.title,
    },
  };
}

function booksFromOperators(root: string): Map<string, BookScrapeTomlConfig> {
  const books = new Map<string, BookScrapeTomlConfig>();
  const operators = loadOperatorsSync();
  for (const op of operators) {
    const scrape = op.scrape;
    if (!scrape) continue;
    const bookId = asSportsbookId(op.id);
    const jurisdiction = tryStateCode(scrape.jurisdiction) ?? asStateCode('NJ');
    const entry: BookScrapeTomlConfig = {
      bookId,
      agentId: scrape.agentId,
      liveUrl: scrape.liveUrl,
      html: scrape.html,
      jurisdiction,
    };
    if (scrape.htmlUrl) entry.htmlUrl = scrape.htmlUrl;
    if (scrape.htmlFixture) {
      entry.htmlFixtureAbs = joinPath(root, scrape.htmlFixture);
    }
    books.set(String(bookId), entry);
  }
  return books;
}

/** Parse-once fleet + per-book scrape config. */
export function loadScrapeAgentsConfigSync(root: string = repoRoot()): ScrapeAgentsConfig {
  if (cached && root === repoRoot()) return cached;

  let fleet: Omit<ScrapeAgentsConfig, 'books'> = {
    defaults: FALLBACK.defaults,
    webview: FALLBACK.webview,
    cron: FALLBACK.cron,
  };

  const path = scrapeAgentsTomlPath(root);
  try {
    const file = Bun.file(path);
    if (file.size > 0) {
      const text = new TextDecoder().decode(Bun.mmap(path));
      fleet = parseFleetToml(text);
    }
  } catch {
    /* keep FALLBACK fleet slice */
  }

  const config: ScrapeAgentsConfig = {
    ...fleet,
    books: booksFromOperators(root),
  };

  if (root === repoRoot()) cached = config;
  return config;
}

/** Drop cache (tests). */
export function resetScrapeAgentsConfigCache(): void {
  cached = null;
}

export function getBookScrapeConfig(
  bookId: string | SportsbookId
): BookScrapeTomlConfig | undefined {
  return loadScrapeAgentsConfigSync().books.get(String(bookId));
}

export function requireBookScrapeConfig(bookId: string | SportsbookId): BookScrapeTomlConfig {
  const cfg = getBookScrapeConfig(bookId);
  if (!cfg) {
    throw new Error(
      `No [scrape] config for book "${bookId}" in config/operators/*.toml (fleet: ${SCRAPE_AGENTS_TOML_REL})`
    );
  }
  return cfg;
}

/** Merge caller overrides with fleet `[webview]` defaults. */
export function resolveWebViewOptions(
  options: WebViewCaptureOptionOverrides = {}
): Required<WebViewCaptureOptionOverrides> {
  const wv = loadScrapeAgentsConfigSync().webview;
  return {
    timeoutMs: options.timeoutMs ?? wv.timeoutMs,
    settleMs: options.settleMs ?? wv.settleMs,
    width: options.width ?? wv.width,
    height: options.height ?? wv.height,
  };
}

export function resolveJsonTimeoutMs(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.trunc(override);
  }
  return loadScrapeAgentsConfigSync().defaults.jsonTimeoutMs;
}

export function resolveHtmlTimeoutMs(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.trunc(override);
  }
  return loadScrapeAgentsConfigSync().defaults.htmlTimeoutMs;
}

/** Cron schedule: env `BASELINE_SCRAPE_CRON_SCHEDULE` wins over TOML. */
export function resolveScrapeCronSchedule(): string {
  const env = (Bun.env.BASELINE_SCRAPE_CRON_SCHEDULE || '').trim();
  if (env.length > 0) return env;
  return loadScrapeAgentsConfigSync().cron.schedule;
}

export function resolveScrapeCronTitle(): string {
  return loadScrapeAgentsConfigSync().cron.title;
}

/** Live HTML URL: env `<BOOK>_HTML_URL` (e.g. DRAFTKINGS_HTML_URL) wins over TOML. */
export function resolveHtmlLiveUrl(bookId: string | SportsbookId, envKey: string): string {
  const env = Bun.env[envKey];
  if (typeof env === 'string' && env.trim().length > 0) return env.trim();
  const cfg = requireBookScrapeConfig(bookId);
  if (!cfg.htmlUrl) {
    throw new Error(`Book "${bookId}" has html scrape without html_url in operator TOML`);
  }
  return cfg.htmlUrl;
}
