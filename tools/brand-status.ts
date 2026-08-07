#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/console — console depth · AsyncIterable stdin · console.write
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve bind hostname ≠ HostId
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
/**
 * brand-status.ts — live brand / apex / subdomain / lineage status for the terminal.
 *
 * Tables use Bun.inspect.table + cli-chrome. Depth follows bunfig [console] depth.
 * `--docs` → Bun.markdown.ansi lineage slice · `--json` → machine snapshot
 * `--plane` filters HOST PLANES · `--lineage [host]` live transition matrix
 * `--flags` → long/short flag catalog · default bind/serve view uses indexed cards
 * `--compact` → wide Bun.inspect.table (may truncate) instead of cards
 * `--lifecycle` → Server methods + serve options cards only (C + D)
 * REPL: FQDN / URL / AccessDomain · commands access · url · plane · lineage · help
 *
 * Usage:
 *   bun tools/brand-status.ts --once
 *   bun tools/brand-status.ts --plane bind --once
 *   bun tools/brand-status.ts --lifecycle --once
 *   bun tools/brand-status.ts --flags
 *   bun tools/brand-status.ts --json --once
 */

import { stripANSI } from 'bun';
import {
  getConsoleDepth,
  logDepth,
  logTable,
  shouldColor,
  termWidth,
  truncateWidth,
} from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  BRAND_STATUS_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { BRAND_STATUS_ALLOWED_LONG };
import {
  LINEAGE_DEMO_HOST,
  dnsAccessLineageRows,
  resolveLineageInput,
} from '../lib/http/host-lineage.ts';
import {
  bunServeMethodTableRows,
  bunServeOptionTableRows,
} from '../lib/http/bun-serve-lifecycle.ts';
import { bunServeShapeTableRows } from '../lib/http/bun-serve-shape.ts';
import { type HostPlane, hostPlaneTableRows, isHostPlane } from '../lib/http/host-planes.ts';
import {
  cliTone,
  formatIndexedCards,
  frameBlock,
  kvLines,
  msFromNs,
  type IndexedCard,
} from '../lib/portal/cli-chrome.ts';
import { hostPartsForSurface, loadSurfacesInventory } from '../lib/surfaces/inventory.ts';
import {
  FACTORY_WAGER_APEX,
  accessDomainFromHost,
  hostIdFromParts,
  httpsUrlForAccessDomain,
  httpsUrlForHost,
  splitHostId,
  tryHostId,
} from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun.ts';

const MANIFEST = new URL('../lib/types/brand-manifest.json', import.meta.url).pathname;
const BRANDED_README = new URL('../lib/types/branded/README.md', import.meta.url).pathname;
const ROOT = resolvePath(import.meta.dir, '..');
const SURFACES_TOML = `${ROOT}/config/surfaces.toml`;

const LINEAGE_START = '### DNS / Access lineage';
const LINEAGE_END = '## Constructor tiers';
const DEFAULT_WATCH_CRON = '*/5 * * * *';

type BrandRow = {
  name: string;
  domain: string;
  kind: string;
  shortName: string;
  envName: string;
  mint: string[];
  module: string;
};

type Manifest = {
  version: number;
  brandCount: number;
  domainCount: number;
  kinds: { id: number; key: number; code: number };
  brands: BrandRow[];
};

type CliOpts = {
  once: boolean;
  replOnly: boolean;
  docs: boolean;
  watch: boolean;
  every: string;
  json: boolean;
  verbose: boolean;
  compact: boolean;
  lifecycle: boolean;
  flagsOnly: boolean;
  plane: HostPlane | undefined;
  lineageHost: string | undefined;
  zone: boolean;
  help: boolean;
};

/** brand-status flag catalog (not Bun runtime flags — those are portal:flags). */
const BRAND_STATUS_FLAGS = [
  { short: '-h', long: '--help', meaning: 'Show usage' },
  { short: '-v', long: '--verbose', meaning: 'Extra columns (ssot · docs) on cards/tables' },
  { short: '', long: '--once', meaning: 'Print tables/cards and exit (no REPL)' },
  { short: '', long: '--repl', meaning: 'Skip inventory dump; host/lineage REPL only' },
  { short: '', long: '--docs', meaning: 'Render DNS/Access lineage markdown (ansi)' },
  {
    short: '',
    long: '--lineage [host]',
    meaning: 'Live helper transition matrix (default score…)',
  },
  { short: '', long: '--plane NAME', meaning: 'Filter HOST PLANES: bind|dns|access|pages' },
  {
    short: '',
    long: '--json',
    meaning: 'Machine snapshot (planes + serveShape + serveMethods + serveOptions + lineage)',
  },
  { short: '', long: '--watch', meaning: 'Bun.cron reprint (default */5; no REPL)' },
  { short: '', long: '--every EXPR', meaning: 'Cron expression for --watch (UTC)' },
  { short: '', long: '--flags', meaning: 'Print this flag catalog (long · short · meaning)' },
  {
    short: '',
    long: '--zone',
    meaning: 'CF zone check — TOML dnsTarget/mail vs live zone (drift table)',
  },
  { short: '', long: '--compact', meaning: 'Wide inspect.table instead of indexed cards' },
  {
    short: '',
    long: '--lifecycle',
    meaning: 'Print only C. SERVER METHODS + D. SERVE OPTIONS',
  },
] as const;

function args(): CliOpts {
  const a = applyUnknownLongOptionGuardFor('brand:status', Bun.argv.slice(2));
  const take = (flag: string): string | undefined => {
    const i = a.indexOf(flag);
    if (i < 0) return undefined;
    const v = a[i + 1];
    return typeof v === 'string' && !v.startsWith('-') ? v : undefined;
  };
  const planeRaw = take('--plane');
  const plane = planeRaw && isHostPlane(planeRaw) ? planeRaw : undefined;
  const lineageFlag = a.includes('--lineage');
  const lineageHost = take('--lineage') ?? (lineageFlag ? LINEAGE_DEMO_HOST : undefined);
  return {
    once: a.includes('--once'),
    replOnly: a.includes('--repl'),
    docs: a.includes('--docs'),
    watch: a.includes('--watch'),
    every: take('--every') ?? DEFAULT_WATCH_CRON,
    json: a.includes('--json'),
    verbose: a.includes('--verbose') || a.includes('-v'),
    compact: a.includes('--compact'),
    lifecycle: a.includes('--lifecycle'),
    flagsOnly: a.includes('--flags'),
    plane,
    lineageHost,
    zone: a.includes('--zone'),
    help: a.includes('--help') || a.includes('-h'),
  };
}

function printFlagsCatalog(): void {
  console.info(
    cliTone.accent('\nFLAGS') +
      cliTone.dim('  brand-status · Bun runtime flags → bun run portal:flags')
  );
  logTable(
    BRAND_STATUS_FLAGS.map(f => ({
      short: f.short || '—',
      long: f.long,
      meaning: f.meaning,
    })),
    ['short', 'long', 'meaning']
  );
}

function printHelp(): void {
  console.info(`brand-status — apex/subdomain + host planes + DNS/Access lineage

Usage:
  bun tools/brand-status.ts --once
  bun tools/brand-status.ts --plane bind --once     indexed SERVER/URL + bind + lifecycle
  bun tools/brand-status.ts --lifecycle --once      C. SERVER METHODS + D. SERVE OPTIONS only
  bun tools/brand-status.ts --flags                 long · short · meaning
  bun tools/brand-status.ts --compact --plane bind  wide inspect.table (truncates)
  bun tools/brand-status.ts --docs --once
  bun tools/brand-status.ts --lineage [host] --once
  bun tools/brand-status.ts --json --once
  bun tools/brand-status.ts --watch [--every '*/5 * * * *']
  bun tools/brand-status.ts --repl

REPL: FQDN · url · host/path · access · url · lineage · plane · docs · help · q
Cards: full default/fallback text (wrap). Compact tables may ellipsis.
`);
  printFlagsCatalog();
}
async function loadManifest(): Promise<Manifest> {
  return (await Bun.file(MANIFEST).json()) as Manifest;
}

function printHeader(m: Manifest, t0: number): void {
  const body = [
    ...kvLines([
      ['manifest', `v${m.version}`],
      ['brands', String(m.brandCount)],
      ['domains', String(m.domainCount)],
      ['kinds', `${m.kinds.id} id · ${m.kinds.key} key · ${m.kinds.code} code`],
      ['apex', String(FACTORY_WAGER_APEX)],
      ['bun', Bun.version],
      ['depth', String(getConsoleDepth())],
      ['colors', shouldColor() ? 'on' : 'off'],
      ['elapsed', msFromNs(Bun.nanoseconds() - t0)],
    ]),
  ];
  console.info(
    frameBlock('brand status', 'OK', body, {
      width: Math.min(termWidth(), 88),
      ok: true,
    })
  );
}

function hostPlaneNoteCols(): number {
  const parsed = Number.parseInt(Bun.env.COLUMNS ?? '', 10);
  const cols = process.stdout.columns ?? (Number.isFinite(parsed) && parsed > 0 ? parsed : 100);
  return Math.min(64, Math.max(36, cols - 70));
}

function clip(text: string, cols: number, tty: boolean): string {
  return tty ? truncateWidth(text, cols, { ellipsis: '…' }) : text;
}

function cardWidth(): number {
  return Math.min(termWidth(), 88);
}

/** Bun.serve Server + URL — indexed cards (full text) or compact table. */
function printServeShapeTable(opts: { verbose: boolean; compact: boolean }): void {
  const rows = bunServeShapeTableRows();
  if (opts.compact) {
    const tty = process.stdout.isTTY === true;
    const w = Math.min(48, Math.max(24, hostPlaneNoteCols()));
    console.info(cliTone.accent('\nSERVER / URL') + cliTone.dim('  compact table · may truncate'));
    logTable(
      rows.map(r => ({
        property: r.property,
        type: r.type,
        values: clip(r.values, w, tty),
        default: clip(r.default, w, tty),
        fallback: clip(r.fallback, w, tty),
        ...(opts.verbose ? { docs: r.docs } : {}),
      })),
      opts.verbose
        ? ['property', 'type', 'values', 'default', 'fallback', 'docs']
        : ['property', 'type', 'values', 'default', 'fallback']
    );
    return;
  }

  const cards: IndexedCard[] = rows.map((r, i) => ({
    index: i + 1,
    title: r.property,
    fields: [
      ['type', r.type],
      ['values', r.values],
      ['default', r.default],
      ['fallback', r.fallback],
      ...(opts.verbose ? ([['docs', r.docs]] as const) : []),
    ],
  }));
  console.info(
    formatIndexedCards(
      'A. SERVER / URL',
      'after bind read server.port · server.url · defaults are pre-bind only',
      cards,
      { width: cardWidth() }
    )
  );
}

/** Server methods + serve/WS options — indexed cards or compact table. */
function printServeLifecycleTables(opts: { compact: boolean }): void {
  const methods = bunServeMethodTableRows();
  const options = bunServeOptionTableRows();

  if (opts.compact) {
    const tty = process.stdout.isTTY === true;
    const w = Math.min(48, Math.max(24, hostPlaneNoteCols()));
    console.info(
      cliTone.accent('\nC. SERVER METHODS') + cliTone.dim('  compact table · may truncate')
    );
    logTable(
      methods.map(r => ({
        property: r.property,
        signature: clip(r.signature, w, tty),
        default: clip(r.default, w, tty),
        note: clip(r.note, w, tty),
      })),
      ['property', 'signature', 'default', 'note']
    );
    console.info(
      cliTone.accent('\nD. SERVE OPTIONS') + cliTone.dim('  compact table · may truncate')
    );
    logTable(
      options.map(r => ({
        property: r.property,
        signature: clip(r.signature, w, tty),
        default: clip(r.default, w, tty),
        note: clip(r.note, w, tty),
      })),
      ['property', 'signature', 'default', 'note']
    );
    return;
  }

  const methodCards: IndexedCard[] = methods.map((r, i) => ({
    index: i + 1,
    title: r.property,
    fields: [
      ['kind', r.kind],
      ['signature', r.signature],
      ['values', r.values],
      ['default', r.default],
      ['fallback', r.fallback],
      ['note', r.note],
    ],
  }));
  console.info(
    formatIndexedCards(
      'C. SERVER METHODS',
      'stop · reload · timeout · ref/unref — bun-types Server',
      methodCards,
      { width: cardWidth() }
    )
  );

  const optionCards: IndexedCard[] = options.map((r, i) => ({
    index: i + 1,
    title: r.property,
    fields: [
      ['kind', r.kind],
      ['signature', r.signature],
      ['values', r.values],
      ['default', r.default],
      ['fallback', r.fallback],
      ['note', r.note],
    ],
  }));
  console.info(
    formatIndexedCards(
      'D. SERVE OPTIONS',
      'idleTimeout default 10 · max 255 · 0 = off · WS idleTimeout separate',
      optionCards,
      { width: cardWidth() }
    )
  );
}

/** HOST PLANES — indexed cards when expanded; dense table otherwise. */
function printHostPlanesTable(opts: {
  plane?: HostPlane;
  verbose: boolean;
  compact: boolean;
}): void {
  const planeLabel = opts.plane ? ` · plane=${opts.plane}` : '';
  const expanded = opts.verbose || opts.plane === 'bind';
  const planeRows = hostPlaneTableRows({
    plane: opts.plane,
    includeSsot: true,
    includeDefaults: true,
  });

  if (!expanded || opts.compact) {
    const tty = process.stdout.isTTY === true;
    const noteCols = hostPlaneNoteCols();
    console.info(
      cliTone.accent('\nHOST PLANES') +
        cliTone.dim(
          opts.compact ? `  bind≠dns${planeLabel} · compact` : `  bind≠dns${planeLabel} · dense`
        )
    );
    const cols = expanded
      ? (['plane', 'concept', 'property', 'type', 'example', 'note'] as string[])
      : (['plane', 'concept', 'typeOrField', 'example', 'note'] as string[]);
    logTable(
      planeRows.map(r => ({
        ...r,
        note: clip(r.note, noteCols, tty),
      })),
      cols
    );
    return;
  }

  const cards: IndexedCard[] = planeRows.map((r, i) => ({
    index: i + 1,
    title: r.property ?? r.typeOrField,
    subtitle: `${r.plane} · ${r.concept}`,
    fields: [
      ['type', r.type ?? ''],
      ['values', r.values ?? ''],
      ['default', r.default ?? ''],
      ['fallback', r.fallback ?? ''],
      ['example', r.example],
      ...(opts.verbose
        ? ([
            ['ssot', r.ssot ?? ''],
            ['note', r.note],
          ] as const)
        : ([['note', r.note]] as const)),
    ],
  }));
  console.info(
    formatIndexedCards(
      'B. HOST PLANES',
      `bind ≠ dns${planeLabel} · full default/fallback (wrap, no ellipsis)`,
      cards,
      { width: cardWidth() }
    )
  );
}
function printDomainTable(brands: BrandRow[]): void {
  const byDomain = new Map<string, number>();
  for (const b of brands) byDomain.set(b.domain, (byDomain.get(b.domain) ?? 0) + 1);
  const rows = [...byDomain.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain, n]) => {
      const hit = brands.find(b => b.domain === domain);
      return {
        domain,
        n,
        module: hit?.module.replace('lib/types/branded/', '') ?? '',
        example: hit?.name ?? '',
      };
    });
  console.info(cliTone.accent('\nDOMAINS'));
  logTable(rows, ['domain', 'n', 'module', 'example']);
}

function printSurfacesTable(brands: BrandRow[]): void {
  const rows = brands
    .filter(b => b.domain === 'surfaces')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(b => ({
      brand: b.name,
      kind: b.kind,
      shortName: b.shortName,
      envName: b.envName,
      mint: b.mint.join(','),
    }));
  console.info(
    cliTone.accent('\nSURFACES') + cliTone.dim('  Host · Apex · Subdomain · Surface · Access')
  );
  logTable(rows, ['brand', 'kind', 'shortName', 'envName', 'mint']);
}

async function printInventoryTable(): Promise<void> {
  const inv = await loadSurfacesInventory(SURFACES_TOML);
  const rows = inv.surfaces
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map(s => {
      const p = hostPartsForSurface(s);
      const st =
        s.status === 'live'
          ? cliTone.ok(s.status)
          : s.status === 'broken'
            ? cliTone.fail(s.status)
            : s.status === 'dangling' || s.status === 'vanity'
              ? cliTone.warn(s.status)
              : s.status;
      return {
        surfaceId: String(s.id),
        host: String(s.host),
        apex: String(p.apex),
        subdomain: String(p.subdomain),
        status: st,
        access: s.access,
      };
    });
  console.info(
    cliTone.accent('\nINVENTORY') + cliTone.dim(`  ${rows.length} · hostPartsForSurface`)
  );
  logTable(rows, ['surfaceId', 'host', 'apex', 'subdomain', 'status', 'access']);
}

/** --zone — TOML dnsTarget/mail vs live CF zone (drift table via surfaces:bake zoneDrift). */
async function runZoneCheck(): Promise<{ ok: boolean; issues: string[]; skipped?: string }> {
  const token = Bun.env.CLOUDFLARE_DNS_API_TOKEN?.trim() || Bun.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    return { ok: false, issues: [], skipped: 'no CLOUDFLARE_DNS_API_TOKEN / CLOUDFLARE_API_TOKEN' };
  }
  const { zoneDrift } = await import('../scripts/bake-surfaces.ts');
  const { CLOUDFLARE_DEFAULTS } = await import('../config/r2-env.ts');
  const inv = await loadSurfacesInventory(SURFACES_TOML);
  const zoneId = CLOUDFLARE_DEFAULTS.zones.factoryWager.id;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const body = (await res.json()) as {
    success: boolean;
    errors?: Array<{ message: string }>;
    result?: Array<{ type: string; name: string; content: string }>;
  };
  if (!body.success) {
    return { ok: false, issues: [`zone API error: ${body.errors?.[0]?.message ?? res.status}`] };
  }
  const issues = zoneDrift(inv.surfaces, inv.mail, body.result ?? []);
  return { ok: issues.length === 0, issues };
}

async function printZoneSection(): Promise<void> {
  const r = await runZoneCheck();
  console.info(
    cliTone.accent('\nZONE CHECK') +
      cliTone.dim('  config/surfaces.toml dnsTarget + mail ↔ live zone')
  );
  if (r.skipped) {
    console.info(cliTone.warn(`  skipped — ${r.skipped}`));
    return;
  }
  if (r.ok) {
    console.info(cliTone.ok('  ✓ TOML dnsTarget/mail matches live zone'));
    return;
  }
  logTable(
    r.issues.map(i => ({ drift: i })),
    ['drift']
  );
}

async function printLineageDocs(): Promise<void> {
  const md = await Bun.file(BRANDED_README).text();
  const a = md.indexOf(LINEAGE_START);
  const b = md.indexOf(LINEAGE_END);
  if (a < 0 || b < 0 || b <= a) {
    console.info(cliTone.fail('lineage section not found in lib/types/branded/README.md'));
    return;
  }
  console.info(
    cliTone.accent('\nLINEAGE DOCS') +
      cliTone.dim('  lib/types/branded/README.md · Bun.markdown.ansi')
  );
  process.stdout.write(Bun.markdown.ansi(md.slice(a, b).trimEnd() + '\n'));
}

function printLineageTransitions(rawHost: string): void {
  const resolved = resolveLineageInput(rawHost);
  if (resolved.kind === 'invalid') {
    console.info(cliTone.fail(`invalid lineage input: ${JSON.stringify(rawHost)}`));
    return;
  }
  const host = resolved.host;
  const rows = dnsAccessLineageRows(host);
  const kind =
    resolved.kind === 'access'
      ? `access→${resolved.access}`
      : resolved.kind === 'url'
        ? `url→${resolved.url}`
        : 'host';
  console.info(cliTone.accent('\nLINEAGE') + cliTone.dim(`  ${host} · ${kind} · live helpers`));
  logTable(rows, ['step', 'from', 'op', 'to', 'note']);
  logDepth(
    {
      host: String(host),
      ...splitHostId(host),
      https: httpsUrlForHost(host),
      accessPortal: String(accessDomainFromHost(host, '/portal')),
    },
    { depth: getConsoleDepth() }
  );
}

function printSplit(raw: string): void {
  const resolved = resolveLineageInput(raw);
  if (resolved.kind === 'invalid') {
    console.info(cliTone.fail(`invalid input: ${JSON.stringify(raw.trim())}`));
    return;
  }
  const host = resolved.host;
  const parts = splitHostId(host);
  const round = hostIdFromParts(parts.apex, parts.subdomain);
  const ok = String(round) === String(host);
  logTable(
    [
      {
        kind: resolved.kind,
        host: String(host),
        apex: String(parts.apex),
        subdomain: String(parts.subdomain),
        roundTrip: ok ? cliTone.ok('ok') : cliTone.fail('FAIL'),
        https: httpsUrlForHost(host),
      },
    ],
    ['kind', 'host', 'apex', 'subdomain', 'roundTrip', 'https']
  );
  printLineageTransitions(String(host));
}

function printAccess(hostRaw: string, path = '/portal'): void {
  const host = tryHostId(hostRaw.trim());
  if (!host) {
    console.info(cliTone.fail(`invalid HostId: ${JSON.stringify(hostRaw)}`));
    return;
  }
  const access = accessDomainFromHost(host, path);
  logTable(
    [
      {
        host: String(host),
        path,
        access: String(access),
        https: httpsUrlForAccessDomain(access),
      },
    ],
    ['host', 'path', 'access', 'https']
  );
}

function printUrl(raw: string): void {
  const resolved = resolveLineageInput(raw);
  if (resolved.kind === 'invalid') {
    console.info(cliTone.fail(`invalid url input: ${JSON.stringify(raw)}`));
    return;
  }
  if (resolved.kind === 'access') {
    logTable(
      [
        {
          input: String(resolved.access),
          https: httpsUrlForAccessDomain(resolved.access),
          host: String(resolved.host),
        },
      ],
      ['input', 'https', 'host']
    );
    return;
  }
  logTable(
    [{ input: String(resolved.host), https: httpsUrlForHost(resolved.host) }],
    ['input', 'https']
  );
}

function isQuit(line: string): boolean {
  const t = line.trim().toLowerCase();
  return t === 'q' || t === 'quit' || t === 'exit' || t === '.';
}

async function handleReplLine(line: string, opts: CliOpts): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const c = (cmd ?? '').toLowerCase();

  if (c === 'help' || c === '?') {
    printHelp();
    return;
  }
  if (c === 'docs') {
    await printLineageDocs();
    return;
  }
  if (c === 'plane') {
    const p = rest[0];
    if (p && !isHostPlane(p)) {
      console.info(cliTone.fail(`unknown plane: ${p} (bind|dns|access|pages)`));
      return;
    }
    printHostPlanesTable({
      plane: p && isHostPlane(p) ? p : opts.plane,
      verbose: true,
    });
    return;
  }
  if (c === 'lineage') {
    printLineageTransitions(rest[0] ?? LINEAGE_DEMO_HOST);
    return;
  }
  if (c === 'access') {
    if (!rest[0]) {
      console.info(cliTone.fail('usage: access <host> [path]'));
      return;
    }
    printAccess(rest[0], rest[1] ?? '/portal');
    return;
  }
  if (c === 'url') {
    if (!rest[0]) {
      console.info(cliTone.fail('usage: url <host|access|url>'));
      return;
    }
    printUrl(rest.join(' '));
    return;
  }

  // Bare token — FQDN / URL / AccessDomain
  printSplit(trimmed);
}

async function runRepl(opts: CliOpts): Promise<void> {
  console.info('');
  console.info(
    cliTone.dim('lineage REPL') +
      '  ' +
      cliTone.dim('FQDN · url · host/path · access · url · lineage · plane · docs · q')
  );
  console.write(cliTone.accent('brand> '));

  for await (const line of console) {
    if (isQuit(line)) {
      console.info(cliTone.dim('bye'));
      break;
    }
    if (!line.trim()) {
      console.write(cliTone.accent('brand> '));
      continue;
    }
    await handleReplLine(line, opts);
    console.write(cliTone.accent('brand> '));
  }
}

async function buildJsonSnapshot(opts: CliOpts): Promise<Record<string, unknown>> {
  const m = await loadManifest();
  const inv = await loadSurfacesInventory(SURFACES_TOML);
  const lineageHost = tryHostId(opts.lineageHost ?? LINEAGE_DEMO_HOST);
  return {
    kind: 'brand-status',
    bun: Bun.version,
    depth: getConsoleDepth(),
    apex: String(FACTORY_WAGER_APEX),
    manifest: {
      version: m.version,
      brandCount: m.brandCount,
      domainCount: m.domainCount,
      kinds: m.kinds,
    },
    planes: hostPlaneTableRows({
      plane: opts.plane,
      includeSsot: true,
      includeDefaults: true,
    }),
    serveShape: bunServeShapeTableRows(),
    serveMethods: bunServeMethodTableRows(),
    serveOptions: bunServeOptionTableRows(),
    domains: [...new Set(m.brands.map(b => b.domain))].sort(),
    surfacesBrands: m.brands
      .filter(b => b.domain === 'surfaces')
      .map(b => ({ name: b.name, shortName: b.shortName, envName: b.envName })),
    inventory: inv.surfaces.map(s => {
      const p = hostPartsForSurface(s);
      return {
        surfaceId: String(s.id),
        host: String(s.host),
        apex: String(p.apex),
        subdomain: String(p.subdomain),
        status: s.status,
        access: s.access,
      };
    }),
    lineage: lineageHost
      ? {
          host: String(lineageHost),
          transitions: dnsAccessLineageRows(lineageHost),
        }
      : null,
    ...(opts.zone ? { zoneCheck: await runZoneCheck() } : {}),
  };
}

async function printTables(opts: CliOpts & { widthHint: boolean }): Promise<void> {
  const t0 = Bun.nanoseconds();
  const m = await loadManifest();
  printHeader(m, t0);

  if (opts.lifecycle) {
    printServeLifecycleTables({ compact: opts.compact });
    if (opts.widthHint) {
      const sample = cliTone.ok('ok');
      console.info(
        cliTone.dim(
          `\nwidth  stripANSI=${JSON.stringify(stripANSI(sample))}  stringWidth=${Bun.stringWidth(sample)}  depth=${getConsoleDepth()}  noteCols=${hostPlaneNoteCols()}`
        )
      );
    }
    return;
  }

  printHostPlanesTable({
    plane: opts.plane,
    verbose: opts.verbose,
    compact: opts.compact,
  });
  if (!opts.plane || opts.plane === 'bind' || opts.verbose) {
    printServeShapeTable({
      verbose: opts.verbose || opts.plane === 'bind',
      compact: opts.compact,
    });
    printServeLifecycleTables({ compact: opts.compact });
  }
  if (!opts.plane) {
    printDomainTable(m.brands);
    printSurfacesTable(m.brands);
    await printInventoryTable();
  }
  if (opts.zone) {
    await printZoneSection();
  }
  if (opts.lineageHost !== undefined) {
    printLineageTransitions(opts.lineageHost);
  }
  if (opts.docs) await printLineageDocs();
  if (opts.widthHint) {
    const sample = cliTone.ok('ok');
    console.info(
      cliTone.dim(
        `\nwidth  stripANSI=${JSON.stringify(stripANSI(sample))}  stringWidth=${Bun.stringWidth(sample)}  depth=${getConsoleDepth()}  noteCols=${hostPlaneNoteCols()}`
      )
    );
  }
}

function startWatch(opts: CliOpts): Bun.CronJob {
  console.info(
    cliTone.dim(`\nwatch  cron=${JSON.stringify(opts.every)} UTC · Ctrl-C to stop · bun --hot safe`)
  );
  return Bun.cron(opts.every, async () => {
    console.info(cliTone.dim(`\n── cron reprint ${new Date().toISOString()} ──`));
    await printTables({ ...opts, widthHint: false });
  });
}

async function main(): Promise<void> {
  const opts = args();
  if (opts.help) {
    printHelp();
    return;
  }
  if (opts.flagsOnly) {
    printFlagsCatalog();
    return;
  }

  if (opts.plane === undefined) {
    const planeRaw = Bun.argv.slice(2).find((_, i, a) => a[i - 1] === '--plane');
    if (Bun.argv.includes('--plane') && planeRaw && !isHostPlane(planeRaw)) {
      console.info(cliTone.fail(`unknown --plane ${planeRaw} (bind|dns|access|pages)`));
      process.exitCode = 1;
      return;
    }
  }

  if (opts.json) {
    // stdout.write — not console.info(JSON.stringify) — keeps console-format ratchet clean
    process.stdout.write(`${JSON.stringify(await buildJsonSnapshot(opts), null, 2)}\n`);
    return;
  }

  if (!opts.replOnly) {
    await printTables({ ...opts, widthHint: !opts.watch });
  } else if (opts.docs) {
    await printLineageDocs();
  } else if (opts.lineageHost !== undefined) {
    printLineageTransitions(opts.lineageHost);
  }

  if (opts.watch) {
    using _job = startWatch(opts);
    await new Promise<void>(() => {});
    return;
  }

  if (opts.once) return;

  const tty = process.stdin.isTTY === true;
  const piped = process.stdin.isTTY === false;
  if (opts.replOnly || tty || piped) {
    await runRepl(opts);
  }
}

if (import.meta.main) {
  await main();
}
