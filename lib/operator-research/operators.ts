// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/glob — Bun.Glob
import { joinPath } from '../path-bun.ts';
import { OPERATORS_GLOB, ROOT, DEFAULT_SEEDS_PATH } from './paths.ts';
import type { OperatorConfig, OperatorScrapeConfig, SeedDomain } from './types.ts';

type OperatorToml = {
  operator?: {
    id?: string; // brand-ok — opaque research/wire id
    name?: string;
    host?: string;
    url?: string;
    identity?: string;
    geo?: string[];
    markets?: string[];
    lifecycle?: string[];
    expected_stack?: string[];
    probe_paths?: string[];
  };
  scrape?: {
    agent_id?: string; // brand-ok — scrape agent slug from TOML wire
    live_url?: string;
    html?: boolean;
    html_url?: string;
    html_fixture?: string;
    jurisdiction?: string;
  };
};

// eslint-disable-next-line harness/no-unknown-function-param -- TOML wire field → string[]
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function parseScrapeSection(
  raw: OperatorToml['scrape'],
  sourcePath: string
): OperatorScrapeConfig | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;

  const agentId = typeof raw.agent_id === 'string' ? raw.agent_id.trim() : '';
  const liveUrl = typeof raw.live_url === 'string' ? raw.live_url.trim() : '';
  if (!agentId || !liveUrl) {
    throw new Error(`Invalid [scrape] at ${sourcePath}: need agent_id and live_url`);
  }

  const html = raw.html === true;
  const htmlUrl = typeof raw.html_url === 'string' ? raw.html_url.trim() : '';
  const htmlFixture = typeof raw.html_fixture === 'string' ? raw.html_fixture.trim() : '';
  if (html && (!htmlUrl || !htmlFixture)) {
    throw new Error(
      `Invalid [scrape] at ${sourcePath}: html=true requires html_url and html_fixture`
    );
  }

  const jurisdiction =
    typeof raw.jurisdiction === 'string' && raw.jurisdiction.trim().length > 0
      ? raw.jurisdiction.trim()
      : 'NJ';

  const scrape: OperatorScrapeConfig = {
    agentId,
    liveUrl,
    html,
    jurisdiction,
  };
  if (htmlUrl) scrape.htmlUrl = htmlUrl;
  if (htmlFixture) scrape.htmlFixture = htmlFixture;
  return scrape;
}

export function parseOperatorToml(text: string, sourcePath: string): OperatorConfig {
  const raw = Bun.TOML.parse(text) as OperatorToml;
  const op = raw.operator ?? {};
  const id = typeof op.id === 'string' ? op.id : '';
  const host = typeof op.host === 'string' ? op.host : '';
  const url = typeof op.url === 'string' ? op.url : host ? `https://${host}` : '';
  if (!id || !host || !url) {
    throw new Error(`Invalid operator TOML at ${sourcePath}: need id, host, url`);
  }
  return {
    id,
    name: typeof op.name === 'string' ? op.name : id,
    host,
    url,
    identity: typeof op.identity === 'string' ? op.identity : `brand:${id}`,
    geo: asStringArray(op.geo),
    markets: asStringArray(op.markets),
    lifecycle: asStringArray(op.lifecycle),
    expectedStack: asStringArray(op.expected_stack),
    probePaths: asStringArray(op.probe_paths),
    sourcePath,
    scrape: parseScrapeSection(raw.scrape, sourcePath),
  };
}

/** Load all operator configs via Bun.Glob + Bun.TOML.parse. */
export async function loadOperators(globPattern = OPERATORS_GLOB): Promise<OperatorConfig[]> {
  const glob = new Bun.Glob(globPattern);
  const out: OperatorConfig[] = [];
  for await (const rel of glob.scan({ cwd: ROOT, onlyFiles: true })) {
    const abs = joinPath(ROOT, rel);
    const text = await Bun.file(abs).text();
    out.push(parseOperatorToml(text, abs));
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

/** Sync load for scrape SSOT (module-init / CLI). */
export function loadOperatorsSync(globPattern = OPERATORS_GLOB): OperatorConfig[] {
  const glob = new Bun.Glob(globPattern);
  const out: OperatorConfig[] = [];
  for (const rel of glob.scanSync({ cwd: ROOT, onlyFiles: true })) {
    const abs = joinPath(ROOT, rel);
    const file = Bun.file(abs);
    if (file.size <= 0) {
      throw new Error(`Operator TOML empty or unreadable: ${abs}`);
    }
    const content = new TextDecoder().decode(Bun.mmap(abs));
    out.push(parseOperatorToml(content, abs));
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

export async function loadSeeds(path = DEFAULT_SEEDS_PATH): Promise<SeedDomain[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Seeds file not found: ${path}`);
  }
  const raw = (await file.json()) as { domains?: SeedDomain[] } | SeedDomain[];
  const domains = Array.isArray(raw) ? raw : (raw.domains ?? []);
  return domains.filter(d => typeof d.url === 'string' && d.url.length > 0);
}

export function seedsFromOperators(operators: OperatorConfig[], limit = 20): SeedDomain[] {
  return operators.slice(0, limit).map(op => ({
    id: op.id,
    host: op.host,
    url: op.url,
  }));
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] ?? url;
  }
}
