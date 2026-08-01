#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags — --cpu
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.3.14#no-orphans — --no-orphans
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading — --no-env-file
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options — --cpu-prof
// @see https://bun.com/docs/bundler/executables#embedding-runtime-arguments — --user-agent
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/bunfig#run-silent-suppress-reporting-the-command-being-run — --silent
// @see https://bun.com/docs/runtime/index#general-execution-options — bun flags
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Bake portal Bun CLI reference from live `bun --help` (+ curated catalog metadata).
 *
 *   bun tools/bake-bun-cli-reference.ts
 *   bun tools/bake-bun-cli-reference.ts --check
 *
 * Writes: public/registry/bun-cli-reference.json
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  fetchBunHelpText,
  tryLoadRuntimeFlagsCatalog,
  type RuntimeFlagEntry,
} from './lib/portal-cli-bun-flags.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT = joinPath(ROOT, 'public/registry/bun-cli-reference.json');

export type BunCliFlag = {
  flag: string;
  short?: string | null;
  type: 'boolean' | 'string' | 'number';
  default: string | null;
  description: string;
  /** Catalog category when known */
  category?: string;
  curated?: boolean;
  url?: string;
};

export type BunCliGroup = {
  id: string; // brand-ok — bake group key (not a domain *Id)
  label: string;
  flags: BunCliFlag[];
};

export type BunCliReference = {
  schemaVersion: 1;
  kind: 'bun-cli-reference';
  path: '/registry/bun-cli-reference.json';
  generated: string;
  bunVersion: string;
  source: 'bun --help';
  summary: { groups: number; flags: number; curated: number };
  groups: BunCliGroup[];
};

/** Stable group order for the tools board. */
const GROUP_DEFS: {
  id: string; // brand-ok — bake group key (not a domain *Id)
  label: string;
  match: (f: BunCliFlag) => boolean;
}[] = [
  {
    id: 'general-execution',
    label: 'General execution',
    match: f =>
      /^(--silent|--if-present|--eval|--print|--help|--version|--revision|--cwd|--config|--bun|--no-orphans|--shell|--console-depth|--title|--cron-)/.test(
        f.flag
      ) ||
      f.short === '-e' ||
      f.short === '-p' ||
      f.short === '-h' ||
      f.short === '-v' ||
      f.short === '-b' ||
      f.short === '-c',
  },
  {
    id: 'workspace-management',
    label: 'Workspace management',
    match: f =>
      /^(--filter|--elide-lines|--workspaces|--parallel|--sequential|--no-exit-on-error)/.test(
        f.flag
      ) || f.short === '-F',
  },
  {
    id: 'development',
    label: 'Development',
    match: f =>
      /^(--watch|--hot|--no-clear-screen|--smol|--preload|--require|--import)/.test(f.flag) ||
      f.short === '-r',
  },
  {
    id: 'debug',
    label: 'Debug & profiling',
    match: f =>
      /^(--inspect|--cpu-prof|--heap-prof|--expose-gc|--no-deprecation|--throw-deprecation)/.test(
        f.flag
      ),
  },
  {
    id: 'deps',
    label: 'Dependencies & install',
    match: f =>
      /^(--no-install|--install|--prefer-offline|--prefer-latest)/.test(f.flag) || f.short === '-i',
  },
  {
    id: 'transpile',
    label: 'Transpile & JSX',
    match: f =>
      /^(--define|--drop|--feature|--loader|--no-macros|--jsx-|--ignore-dce|--tsconfig|--extension-order|--main-fields|--preserve-symlinks|--conditions)/.test(
        f.flag
      ) ||
      f.short === '-d' ||
      f.short === '-l',
  },
  {
    id: 'networking',
    label: 'Networking & HTTP',
    match: f =>
      /^(--port|--fetch-preconnect|--experimental-http|--max-http|--dns-result|--user-agent|--use-system-ca|--use-openssl-ca|--use-bundled-ca|--redis-preconnect|--sql-preconnect)/.test(
        f.flag
      ),
  },
  {
    id: 'runtime',
    label: 'Runtime environment',
    match: f =>
      /^(--env-file|--no-env-file|--unhandled-rejections|--zero-fill|--no-addons|--experimental-stream)/.test(
        f.flag
      ),
  },
  {
    id: 'other',
    label: 'Other',
    match: () => true,
  },
];

/** Parse one help flag line into structured fields. */
export function parseHelpFlagLine(line: string): BunCliFlag | null {
  // Examples:
  // "      --silent                        Don't print…"
  // "  -F, --filter=<val>                  Run a script…"
  // "  -i                                  Auto-install…"
  // "      --elide-lines=<val>             Number of lines… (default: 10)."
  const m = line.match(/^\s+(?:(-[a-zA-Z0-9]),\s+)?(--[a-z0-9-]+)?(?:=<val>)?\s{2,}(\S.*)?$/);
  if (!m) {
    // bare short only
    const bare = line.match(/^\s+(-[a-zA-Z0-9])\s{2,}(\S.*)$/);
    if (!bare) return null;
    const desc = bare[2]!.trim();
    return normalizeFlag({
      flag: bare[1]!,
      short: bare[1]!,
      type: 'boolean',
      default: null,
      description: desc,
    });
  }
  const short = m[1] ?? null;
  let long = m[2] ?? null;
  const rest = (m[3] ?? '').trim();
  if (!long && !short) return null;
  // line may be "  -i   desc" without long — handled by bare
  if (!long && short) {
    return normalizeFlag({
      flag: short,
      short,
      type: 'boolean',
      default: null,
      description: rest,
    });
  }
  const takesValue =
    /=<val>/.test(line) || /\s--[a-z0-9-]+=<val>/.test(line) || line.includes('=<val>');
  // Re-check takesValue from original line more carefully
  const takesVal = /--[a-z0-9-]+=<val>/.test(line);
  let defaultVal: string | null = null;
  const defM = rest.match(/\(default:\s*([^)]+)\)/i);
  if (defM) defaultVal = defM[1]!.trim();
  // number heuristic
  let type: BunCliFlag['type'] = takesVal ? 'string' : 'boolean';
  if (takesVal && /default:\s*\d+/i.test(rest)) type = 'number';
  if (takesVal && /microseconds|lines|depth|bytes|port|interval|size/i.test(rest)) type = 'number';

  return normalizeFlag({
    flag: long!,
    short,
    type,
    default: defaultVal,
    description: rest || long!,
  });
}

/** Normalize types/defaults so the board never shows empty junk. */
export function normalizeFlag(f: BunCliFlag): BunCliFlag {
  let description = (f.description || '').replace(/\s*\bcurated\b\s*$/i, '').trim();
  let type = f.type;
  let def = f.default;
  // Boolean switches: default off unless help/catalog says otherwise
  if (type === 'boolean' && (def == null || def === '')) {
    def = 'false';
  }
  // Catalog sometimes leaves takesValue false with null default — keep false
  if (type !== 'boolean' && (def === '' || def === undefined)) {
    def = null;
  }
  // Number defaults already parsed from "(default: N)"
  return { ...f, type, default: def, description };
}

export function parseBunHelpFlags(helpText: string): BunCliFlag[] {
  const flags: BunCliFlag[] = [];
  let inFlags = false;
  for (const raw of helpText.split('\n')) {
    if (/^\s*Flags:\s*$/.test(raw)) {
      inFlags = true;
      continue;
    }
    if (inFlags && /^\s*Examples:\s*$/i.test(raw)) break;
    if (inFlags && /^\s*Commands:\s*$/i.test(raw)) break;
    if (!inFlags) continue;
    if (!raw.trim()) continue;
    const row = parseHelpFlagLine(raw);
    if (row) flags.push(row);
  }
  // de-dupe by flag
  const seen = new Set<string>();
  return flags.filter(f => {
    if (seen.has(f.flag)) return false;
    seen.add(f.flag);
    return true;
  });
}

function enrichFromCatalog(flags: BunCliFlag[], catalog: RuntimeFlagEntry[]): BunCliFlag[] {
  const byLong = new Map<string, RuntimeFlagEntry>();
  for (const row of catalog) {
    const primary = row.flag.split('=')[0]!;
    byLong.set(primary, row);
  }
  return flags.map(f => {
    const cat = byLong.get(f.flag);
    if (!cat) return normalizeFlag(f);
    return normalizeFlag({
      ...f,
      description: cat.description || f.description,
      // Prefer help-parsed default; then catalog; then boolean false via normalize
      default: f.default ?? cat.default ?? null,
      type: cat.takesValue ? (f.type === 'number' ? 'number' : 'string') : 'boolean',
      category: cat.category,
      curated: Boolean(cat.curated),
      url: cat.url,
      short: f.short ?? cat.shortcode ?? null,
    });
  });
}

export function groupFlags(flags: BunCliFlag[]): BunCliGroup[] {
  const assigned = new Set<string>();
  const groups: BunCliGroup[] = [];
  for (const def of GROUP_DEFS) {
    const list = flags.filter(f => !assigned.has(f.flag) && def.match(f));
    for (const f of list) assigned.add(f.flag);
    if (list.length === 0 && def.id === 'other') continue;
    if (list.length === 0) continue;
    groups.push({
      id: def.id,
      label: def.label,
      flags: list.sort((a, b) => a.flag.localeCompare(b.flag)),
    });
  }
  return groups;
}

export async function buildBunCliReference(): Promise<BunCliReference> {
  const help = await fetchBunHelpText();
  let flags = parseBunHelpFlags(help);
  const loaded = await tryLoadRuntimeFlagsCatalog();
  flags = enrichFromCatalog(flags, loaded.catalog);
  const groups = groupFlags(flags);
  const curated = flags.filter(f => f.curated).length;
  return {
    schemaVersion: 1,
    kind: 'bun-cli-reference',
    path: '/registry/bun-cli-reference.json',
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    source: 'bun --help',
    summary: {
      groups: groups.length,
      flags: flags.length,
      curated,
    },
    groups,
  };
}

const isMain =
  import.meta.path === Bun.main || process.argv[1]?.endsWith('bake-bun-cli-reference.ts');

if (isMain) {
  const check = Bun.argv.includes('--check');
  const payload = await buildBunCliReference();
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (check) {
    const prev = await Bun.file(OUT)
      .text()
      .catch(() => '');
    if (prev.replace(/"generated": "[^"]+"/, '') !== text.replace(/"generated": "[^"]+"/, '')) {
      console.error('bun-cli-reference.json is stale — run: bun tools/bake-bun-cli-reference.ts');
      process.exit(1);
    }
    console.log('bun-cli-reference.json up to date');
    process.exit(0);
  }
  await Bun.write(OUT, text);
  console.log(
    `wrote ${OUT} · ${payload.summary.flags} flags · ${payload.summary.groups} groups · bun ${payload.bunVersion}`
  );
}
