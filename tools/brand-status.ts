#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/console — console depth · AsyncIterable stdin · console.write
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve bind hostname ≠ HostId
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * brand-status.ts — live brand / apex / subdomain status for the terminal.
 *
 * Tables use Bun.inspect.table + cli-chrome (stringWidth · wrapAnsi · color).
 * Depth for nested dumps follows bunfig [console] depth (6) via console-depth SSOT.
 * Interactive mode reads hosts line-by-line from `console` (AsyncIterable stdin).
 *
 * Usage:
 *   bun tools/brand-status.ts              # tables, then REPL if TTY / piped lines
 *   bun tools/brand-status.ts --once       # tables only
 *   bun tools/brand-status.ts --repl       # skip inventory dump; prompt for hosts
 *   printf 'score.factory-wager.com\n' | bun tools/brand-status.ts --repl
 */

import {
  getConsoleDepth,
  logDepth,
  logTable,
  shouldColor,
  stripANSI,
  termWidth,
} from '../lib/console-depth.ts';
import { hostPlaneTableRows } from '../lib/http/host-planes.ts';
import { cliTone, frameBlock, kvLines, msFromNs } from '../lib/portal/cli-chrome.ts';
import { hostPartsForSurface, loadSurfacesInventory } from '../lib/surfaces/inventory.ts';
import {
  FACTORY_WAGER_APEX,
  hostIdFromParts,
  splitHostId,
  tryHostId,
} from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun.ts';

const MANIFEST = new URL('../lib/types/brand-manifest.json', import.meta.url).pathname;
const ROOT = resolvePath(import.meta.dir, '..');
const SURFACES_TOML = `${ROOT}/config/surfaces.toml`;

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

function args(): { once: boolean; replOnly: boolean; help: boolean } {
  const a = Bun.argv.slice(2);
  return {
    once: a.includes('--once'),
    replOnly: a.includes('--repl'),
    help: a.includes('--help') || a.includes('-h'),
  };
}

function printHelp(): void {
  console.info(`brand-status — apex/subdomain + brand glossary tables

Usage:
  bun tools/brand-status.ts           tables then stdin REPL (TTY or pipe)
  bun tools/brand-status.ts --once    tables only
  bun tools/brand-status.ts --repl    host split REPL only
  bun tools/brand-status.ts --help

REPL: type a host FQDN per line (q / quit / exit to leave).
Depth: bunfig [console] depth · --console-depth · getConsoleDepth().
`);
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

/** Bind listen hostname ≠ DNS HostId — show the plane map first. */
function printHostPlanesTable(): void {
  console.info(
    cliTone.accent('\nHOST PLANES') +
      cliTone.dim('  bind = Bun.serve listen · dns = public FQDN brands · do not mix')
  );
  logTable(hostPlaneTableRows(), ['plane', 'concept', 'typeOrField', 'example', 'note']);
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

function splitRow(raw: string): {
  host: string;
  apex: string;
  subdomain: string;
  roundTrip: string;
} | null {
  const host = tryHostId(raw.trim());
  if (!host) return null;
  const parts = splitHostId(host);
  const round = hostIdFromParts(parts.apex, parts.subdomain);
  const ok = String(round) === String(host);
  return {
    host: String(host),
    apex: String(parts.apex),
    subdomain: String(parts.subdomain),
    roundTrip: ok ? cliTone.ok('ok') : cliTone.fail('FAIL'),
  };
}

function printSplit(raw: string): void {
  const row = splitRow(raw);
  if (!row) {
    console.info(cliTone.fail(`invalid HostId: ${JSON.stringify(raw.trim())}`));
    return;
  }
  logTable([row], ['host', 'apex', 'subdomain', 'roundTrip']);
  // Nested dump at effective console depth (bunfig 6 unless overridden).
  const host = tryHostId(raw.trim())!;
  logDepth({ host: String(host), ...splitHostId(host) }, { depth: getConsoleDepth() });
}

function isQuit(line: string): boolean {
  const t = line.trim().toLowerCase();
  return t === 'q' || t === 'quit' || t === 'exit' || t === '.';
}

/**
 * Read hosts line-by-line from Bun's console AsyncIterable (process.stdin).
 * @see https://bun.com/docs/runtime/console — for await (const line of console)
 */
async function runRepl(): Promise<void> {
  console.info('');
  console.info(cliTone.dim('host split REPL') + '  ' + cliTone.dim('(FQDN per line · q to quit)'));
  console.write(cliTone.accent('host> '));

  for await (const line of console) {
    if (isQuit(line)) {
      console.info(cliTone.dim('bye'));
      break;
    }
    if (!line.trim()) {
      console.write(cliTone.accent('host> '));
      continue;
    }
    printSplit(line);
    console.write(cliTone.accent('host> '));
  }
}

async function main(): Promise<void> {
  const opts = args();
  if (opts.help) {
    printHelp();
    return;
  }

  const t0 = Bun.nanoseconds();

  if (!opts.replOnly) {
    const m = await loadManifest();
    printHeader(m, t0);
    printHostPlanesTable();
    printDomainTable(m.brands);
    printSurfacesTable(m.brands);
    await printInventoryTable();
    // Width sanity for ANSI status cells
    const sample = cliTone.ok('ok');
    console.info(
      cliTone.dim(
        `\nwidth  stripANSI=${JSON.stringify(stripANSI(sample))}  stringWidth=${Bun.stringWidth(sample)}  depth=${getConsoleDepth()}`
      )
    );
  }

  if (opts.once) return;

  // REPL when TTY, or when stdin is a pipe (non-TTY) so scripts can feed hosts.
  const tty = process.stdin.isTTY === true;
  const piped = process.stdin.isTTY === false;
  if (opts.replOnly || tty || piped) {
    await runRepl();
  }
}

if (import.meta.main) {
  await main();
}
