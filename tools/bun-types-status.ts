#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bun-types-status.ts — map-first morning dashboard for Bun-types pipeline.
 *
 * Composes committed inventory + cached tip-diff + usage into one verdict,
 * module coverage table, and actionable next steps. Does not re-run tip/usage
 * unless `--refresh`.
 *
 *   bun run bun:types-status
 *   bun run bun:types-status --refresh
 *   bun run bun:types-status --strict
 *   bun run bun:types-status --json
 *
 * @see docs/design/bun-types-inventory.md
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { resolvePath } from '../lib/path-bun.ts';
import {
  printArtifacts,
  printBanner,
  printDone,
  printMap,
  printPreviewTable,
  printSection,
  verdictBadge,
} from './lib/bun-types-tty.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');
const INVENTORY_JSON = resolvePath(REPO_ROOT, 'tools/bun-types-inventory.json');
const TIP_JSON = resolvePath(REPO_ROOT, '.cache/bun-types-tip-diff/report.json');
const USAGE_JSON = resolvePath(REPO_ROOT, '.cache/bun-types-usage/report.json');
const OUT_DIR = resolvePath(REPO_ROOT, '.cache/bun-types-status');
const OUT_JSON = resolvePath(OUT_DIR, 'report.json');
const OUT_MD = resolvePath(OUT_DIR, 'report.md');

export const DEFAULT_MAX_AGE_DAYS = 14;

export type StatusVerdict = 'ok' | 'warn' | 'fail';

/** Parsed CLI for status tool (defaults vs current in Flags table). */
export type StatusCli = {
  refresh: boolean;
  strict: boolean;
  json: boolean;
  help: boolean;
  maxAgeDays: number;
};

/**
 * Design-doc path for Flags REF:ID / href (Contents §4.1).
 * @see docs/design/bun-types-inventory.md
 */
export const BUN_TYPES_INVENTORY_DOC = 'docs/design/bun-types-inventory.md';
/** Contents number for Commands → Flags / settings. */
export const FLAGS_DOC_SECTION_REF = '4.1';
/** Fragment for the Flags section (`<a id="4.1">` in the design doc). */
export const FLAGS_DOC_SECTION_HREF = '#4.1';

/** One Flags/settings row — REF:ID ≡ doc number path; href ≡ `#` + REF:ID. */
export type StatusFlagRow = {
  script: string;
  /** Contents-number path, e.g. `4.1.refresh` (matches design-doc anchor). */
  refId: string;
  /** Markdown/HTML fragment, e.g. `#4.1.refresh`. */
  href: string;
  flag: string;
  shortcode: string;
  default: string;
  current: string;
};

/** Build REF:ID + href from a flag leaf under §4.1. */
export function flagDocRef(leaf: string): Pick<StatusFlagRow, 'refId' | 'href'> {
  const refId = `${FLAGS_DOC_SECTION_REF}.${leaf}`;
  return { refId, href: `#${refId}` };
}

export type TipDiffSnapshot = {
  present: boolean;
  verdict?: StatusVerdict;
  tipOnly?: number;
  pinOnly?: number;
  reasons?: readonly string[];
  generated?: string;
};

export type UsageSnapshot = {
  present: boolean;
  tracked?: number;
  used?: number;
  unused?: number;
  byModule?: readonly {
    module: string;
    tracked: number;
    used: number;
    unused: number;
    totalRefs: number;
  }[];
  unusedModules?: readonly string[];
  generated?: string;
};

export type InventorySnapshot = {
  present: boolean;
  totalMembers?: number;
  bunTypesVersion?: string;
  generated?: string;
  ageDays?: number;
};

export type StatusInputs = {
  inventory: InventorySnapshot;
  tip: TipDiffSnapshot;
  usage: UsageSnapshot;
  maxAgeDays?: number;
  nowMs?: number;
};

export type StatusReport = {
  schema: 'factorywager/bun-types-status/v1';
  generated: string;
  verdict: StatusVerdict;
  reasons: string[];
  nextSteps: string[];
  inventory: InventorySnapshot;
  tip: TipDiffSnapshot;
  usage: UsageSnapshot;
  maxAgeDays: number;
  flags: StatusFlagRow[];
};

export function parseStatusCli(argv: string[]): StatusCli {
  let maxAgeDays = DEFAULT_MAX_AGE_DAYS;
  for (const a of argv) {
    if (a.startsWith('--max-age-days=')) {
      const n = Number(a.slice('--max-age-days='.length));
      if (Number.isFinite(n) && n >= 0) maxAgeDays = Math.floor(n);
    }
  }
  return {
    refresh: argv.includes('--refresh'),
    strict: argv.includes('--strict'),
    json: argv.includes('--json'),
    help: argv.includes('--help') || argv.includes('-h'),
    maxAgeDays,
  };
}

/** Default StatusCli (no argv) — soft morning check. */
export function defaultStatusCli(): StatusCli {
  return {
    refresh: false,
    strict: false,
    json: false,
    help: false,
    maxAgeDays: DEFAULT_MAX_AGE_DAYS,
  };
}

/**
 * Flag rows for TTY / report.json — REF:ID / href match design-doc §4.1 anchors.
 */
export function buildStatusFlagRows(cli: StatusCli): StatusFlagRow[] {
  const onOff = (v: boolean) => (v ? 'on' : 'off');
  const row = (
    leaf: string,
    fields: Omit<StatusFlagRow, 'refId' | 'href' | 'script'>
  ): StatusFlagRow => ({
    script: 'bun:types-status',
    ...flagDocRef(leaf),
    ...fields,
  });
  return [
    row('refresh', {
      flag: '--refresh',
      shortcode: '—',
      default: 'off',
      current: onOff(cli.refresh),
    }),
    row('strict', {
      flag: '--strict',
      shortcode: '—',
      default: 'soft (exit 0)',
      current: cli.strict ? 'strict (exit 1 on warn/fail)' : 'soft (exit 0)',
    }),
    row('max-age-days', {
      flag: '--max-age-days',
      shortcode: '—',
      default: String(DEFAULT_MAX_AGE_DAYS),
      current: String(cli.maxAgeDays),
    }),
    row('json', {
      flag: '--json',
      shortcode: '—',
      default: 'off',
      current: onOff(cli.json),
    }),
    row('help', {
      flag: '--help',
      shortcode: '-h',
      default: '—',
      current: onOff(cli.help),
    }),
    // Shared tip/report flags (documented as script=shared in design Flags table)
    {
      script: 'shared',
      ...flagDocRef('shared.strict'),
      flag: '--strict',
      shortcode: '—',
      default: 'soft',
      current: 'tip-diff / types-report / types-ci',
    },
    {
      script: 'shared',
      ...flagDocRef('shared.prefer-local'),
      flag: '--prefer-local',
      shortcode: '—',
      default: 'off',
      current: 'baked into :local / :ci / types-report',
    },
  ];
}

function daysBetween(iso: string | undefined, nowMs: number): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return undefined;
  return Math.max(0, (nowMs - t) / (24 * 60 * 60 * 1000));
}

export function computeVerdict(inputs: StatusInputs): {
  verdict: StatusVerdict;
  reasons: string[];
} {
  const reasons: string[] = [];
  let verdict: StatusVerdict = 'ok';
  const maxAge = inputs.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;

  if (!inputs.inventory.present) {
    reasons.push('inventory missing — run bun run bun:types-inventory:write');
    return { verdict: 'fail', reasons };
  }

  const age = inputs.inventory.ageDays;
  if (age !== undefined && age > maxAge) {
    reasons.push(`inventory age ${age.toFixed(1)}d exceeds max ${maxAge}d`);
    if (verdict === 'ok') verdict = 'warn';
  }

  if (!inputs.tip.present) {
    reasons.push('tip-diff report missing — run bun run bun:types-report:local');
    if (verdict === 'ok') verdict = 'warn';
  } else {
    if (inputs.tip.verdict === 'fail') {
      reasons.push(
        `tip-diff verdict=fail${inputs.tip.reasons?.length ? ` (${inputs.tip.reasons.join('; ')})` : ''}`
      );
      verdict = 'fail';
    } else if (inputs.tip.verdict === 'warn') {
      reasons.push(
        `tip-diff verdict=warn${inputs.tip.reasons?.length ? ` (${inputs.tip.reasons.slice(0, 2).join('; ')})` : ''}`
      );
      if (verdict === 'ok') verdict = 'warn';
    }
    const tipOnly = inputs.tip.tipOnly ?? 0;
    const pinOnly = inputs.tip.pinOnly ?? 0;
    if (pinOnly > 0 && verdict !== 'fail') {
      reasons.push(`pin-only ${pinOnly} (in pin, missing on tip)`);
      if (verdict === 'ok') verdict = 'warn';
    }
    if (tipOnly > 0 && !reasons.some(r => r.includes('tip-only') || r.includes('tip-diff'))) {
      reasons.push(`tip-only ${tipOnly}`);
      if (verdict === 'ok') verdict = 'warn';
    }
  }

  if (!inputs.usage.present) {
    reasons.push('usage report missing — run bun run bun:types-report:local');
    if (verdict === 'ok') verdict = 'warn';
  }

  if (reasons.length === 0)
    reasons.push('inventory current · tip/usage caches present · no drift flags');

  return { verdict, reasons };
}

export function buildNextSteps(inputs: StatusInputs, verdict: StatusVerdict): string[] {
  const steps: string[] = [];
  if (!inputs.inventory.present) {
    steps.push('Run `bun run bun:types-inventory:write` to create the committed SSOT.');
    return steps;
  }
  if (!inputs.tip.present || !inputs.usage.present) {
    steps.push(
      'Run `bun run bun:types-report:local` (or `bun:types-status --refresh`) to refresh tip-diff + usage caches.'
    );
  }
  const tipOnly = inputs.tip.tipOnly ?? 0;
  const pinOnly = inputs.tip.pinOnly ?? 0;
  if (inputs.tip.present && pinOnly === 0 && tipOnly > 0) {
    steps.push(
      `pin-only=0, tip-only=${tipOnly} — upstream surface grew; bump bun-types only if you need those APIs.`
    );
  }
  if (inputs.tip.present && pinOnly > 0) {
    steps.push(
      `pin-only=${pinOnly} — pin has members tip lacks; re-check pin path / tip source before relying on tip.`
    );
  }
  if (inputs.usage.present && inputs.usage.used !== undefined && inputs.usage.tracked) {
    steps.push(
      `Usage coverage ${inputs.usage.used}/${inputs.usage.tracked} tracked type-likes — see module table / \`bun:types-usage:unused\`.`
    );
  }
  const age = inputs.inventory.ageDays;
  const maxAge = inputs.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  if (age !== undefined && age > maxAge) {
    steps.push(
      'Re-run `bun run bun:types-inventory:write` after a bun-types bump or when the SSOT feels stale.'
    );
  }
  if (verdict === 'ok' && steps.length === 0) {
    steps.push('No action needed — soft morning check is green.');
  }
  if (verdict === 'ok' && steps.length > 0 && !steps.some(s => s.includes('No action'))) {
    // keep coverage tip; add calm closer when only informational
    if (pinOnly === 0 && tipOnly === 0) {
      steps.push('No tip/pin drift — no bun-types bump required.');
    }
  }
  return steps.slice(0, 4);
}

export function buildStatusReport(
  inputs: StatusInputs,
  cli: StatusCli = defaultStatusCli()
): StatusReport {
  const nowMs = inputs.nowMs ?? Date.now();
  const inv = { ...inputs.inventory };
  if (inv.present && inv.generated && inv.ageDays === undefined) {
    inv.ageDays = daysBetween(inv.generated, nowMs);
  }
  const normalized: StatusInputs = {
    ...inputs,
    inventory: inv,
    maxAgeDays: inputs.maxAgeDays ?? cli.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS,
    nowMs,
  };
  const { verdict, reasons } = computeVerdict(normalized);
  const nextSteps = buildNextSteps(normalized, verdict);
  return {
    schema: 'factorywager/bun-types-status/v1',
    generated: new Date(nowMs).toISOString(),
    verdict,
    reasons,
    nextSteps,
    inventory: normalized.inventory,
    tip: normalized.tip,
    usage: normalized.usage,
    maxAgeDays: normalized.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS,
    flags: buildStatusFlagRows(cli),
  };
}

function renderStatusMd(report: StatusReport): string {
  const lines = [
    '# Bun-types status',
    '',
    `| Field | Value |`,
    `| ----- | ----- |`,
    `| Generated | ${report.generated} |`,
    `| Verdict | **${report.verdict}** |`,
    `| Inventory members | ${report.inventory.totalMembers ?? '—'} |`,
    `| bun-types | ${report.inventory.bunTypesVersion ?? '—'} |`,
    `| Inventory age (d) | ${report.inventory.ageDays?.toFixed(1) ?? '—'} |`,
    `| Tip-only | ${report.tip.present ? (report.tip.tipOnly ?? 0) : 'missing'} |`,
    `| Pin-only | ${report.tip.present ? (report.tip.pinOnly ?? 0) : 'missing'} |`,
    `| Usage used/tracked | ${
      report.usage.present ? `${report.usage.used ?? 0}/${report.usage.tracked ?? 0}` : 'missing'
    } |`,
    '',
    '## Reasons',
    '',
    ...report.reasons.map(r => `- ${r}`),
    '',
    '## Next steps',
    '',
    ...report.nextSteps.map(s => `- ${s}`),
    '',
    '## Flags / settings',
    '',
    `Doc: [\`${BUN_TYPES_INVENTORY_DOC}\`](../../${BUN_TYPES_INVENTORY_DOC}) · section [\`${FLAGS_DOC_SECTION_REF}\`](../../${BUN_TYPES_INVENTORY_DOC}${FLAGS_DOC_SECTION_HREF})`,
    '',
    '| Script | REF:ID | href | --flag | shortcode | default | current |',
    '| ------ | ------ | ---- | ------ | --------- | ------- | ------- |',
    ...report.flags.map(
      f =>
        `| \`${f.script}\` | \`${f.refId}\` | [\`${f.href}\`](../../${BUN_TYPES_INVENTORY_DOC}${f.href}) | \`${f.flag}\` | ${f.shortcode === '—' ? '—' : `\`${f.shortcode}\``} | ${f.default} | ${f.current} |`
    ),
    '',
  ];
  if (report.usage.byModule?.length) {
    lines.push(
      '## Usage by module',
      '',
      '| Module | tracked | used | unused | refs |',
      '| ------ | ------- | ---- | ------ | ---- |'
    );
    for (const m of report.usage.byModule) {
      lines.push(`| \`${m.module}\` | ${m.tracked} | ${m.used} | ${m.unused} | ${m.totalRefs} |`);
    }
    lines.push('');
  }
  lines.push(
    '## Refresh',
    '',
    '```bash',
    'bun run bun:types-status --refresh',
    'bun run bun:types-report:local',
    '```',
    ''
  );
  return `${lines.join('\n')}`;
}

async function loadInventory(): Promise<InventorySnapshot> {
  const file = Bun.file(INVENTORY_JSON);
  if (!(await file.exists())) return { present: false };
  try {
    const j = (await file.json()) as {
      generated?: string;
      summary?: { total?: number };
      types?: { version?: string };
    };
    const generated = typeof j.generated === 'string' ? j.generated : undefined;
    return {
      present: true,
      totalMembers: j.summary?.total,
      bunTypesVersion: j.types?.version,
      generated,
      ageDays: daysBetween(generated, Date.now()),
    };
  } catch {
    return { present: false };
  }
}

async function loadTip(): Promise<TipDiffSnapshot> {
  const file = Bun.file(TIP_JSON);
  if (!(await file.exists())) return { present: false };
  try {
    const j = (await file.json()) as {
      generated?: string;
      verdict?: StatusVerdict;
      reasons?: string[];
      diff?: { tipOnly?: unknown[]; pinOnly?: unknown[] };
    };
    return {
      present: true,
      verdict: j.verdict,
      tipOnly: Array.isArray(j.diff?.tipOnly) ? j.diff!.tipOnly!.length : undefined,
      pinOnly: Array.isArray(j.diff?.pinOnly) ? j.diff!.pinOnly!.length : undefined,
      reasons: j.reasons,
      generated: j.generated,
    };
  } catch {
    return { present: false };
  }
}

async function loadUsage(): Promise<UsageSnapshot> {
  const file = Bun.file(USAGE_JSON);
  if (!(await file.exists())) return { present: false };
  try {
    const j = (await file.json()) as {
      generated?: string;
      summary?: {
        tracked?: number;
        used?: number;
        unused?: number;
        byModule?: UsageSnapshot['byModule'];
        unusedModules?: string[];
      };
    };
    return {
      present: true,
      tracked: j.summary?.tracked,
      used: j.summary?.used,
      unused: j.summary?.unused,
      byModule: j.summary?.byModule,
      unusedModules: j.summary?.unusedModules,
      generated: j.generated,
    };
  } catch {
    return { present: false };
  }
}

async function refreshLocal(strict: boolean): Promise<number> {
  printSection('Refresh');
  const bunBin = process.execPath.includes('bun') ? process.execPath : 'bun';
  const args = ['run', 'bun:types-report:local'];
  if (strict) args.push('--', '--strict');
  // package script already has --prefer-local; pass strict via env of child argv on report tool
  const proc = Bun.spawn(
    strict
      ? [bunBin, 'tools/bun-types-report.ts', '--prefer-local', '--strict']
      : [bunBin, 'run', 'bun:types-report:local'],
    {
      cwd: REPO_ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...Bun.env },
    }
  );
  return (await proc.exited) ?? 1;
}

async function main(): Promise<number> {
  const args = parseStatusCli(Bun.argv.slice(2));
  if (args.help) {
    console.log(`bun-types-status — morning dashboard (inventory · tip-diff · usage)

  Script:  bun:types-status
  Command: bun tools/bun-types-status.ts

  (default)           Read caches; do not re-run tip/usage
  --refresh           Run bun:types-report:local first
  --strict            Exit 1 on warn/fail (soft default exits 0)
  --max-age-days=N    Inventory age warn threshold (default ${DEFAULT_MAX_AGE_DAYS})
  --json              Print StatusReport JSON to stdout
  -h, --help
`);
    return 0;
  }

  if (!args.json) {
    printBanner('bun-types-status', 'pin SSOT · tip-diff · usage coverage');
  }

  if (args.refresh) {
    const code = await refreshLocal(args.strict);
    if (code !== 0) {
      if (!args.json) printDone(false, 'refresh failed');
      return args.strict ? code : 0;
    }
  }

  const inputs: StatusInputs = {
    inventory: await loadInventory(),
    tip: await loadTip(),
    usage: await loadUsage(),
    maxAgeDays: args.maxAgeDays,
  };
  const report = buildStatusReport(inputs, args);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printSection('Verdict');
    printMap([
      { key: 'verdict', value: verdictBadge(report.verdict) },
      { key: 'reasons', value: String(report.reasons.length) },
    ]);
    for (const r of report.reasons) console.info(`  ${r}`);

    printSection('Inventory');
    printMap([
      {
        key: 'present',
        value: report.inventory.present ? 'yes' : 'no',
      },
      {
        key: 'members',
        value:
          report.inventory.totalMembers !== undefined ? String(report.inventory.totalMembers) : '—',
      },
      {
        key: 'bun-types',
        value: report.inventory.bunTypesVersion ?? '—',
      },
      {
        key: 'generated',
        value: report.inventory.generated ?? '—',
      },
      {
        key: 'age-days',
        value: report.inventory.ageDays !== undefined ? report.inventory.ageDays.toFixed(1) : '—',
        note: `max ${report.maxAgeDays}`,
      },
    ]);

    printSection('Tip-diff');
    if (!report.tip.present) {
      console.info('  missing — bun run bun:types-report:local');
    } else {
      printMap([
        { key: 'verdict', value: verdictBadge(report.tip.verdict ?? 'ok') },
        { key: 'tip-only', value: String(report.tip.tipOnly ?? 0) },
        { key: 'pin-only', value: String(report.tip.pinOnly ?? 0) },
        { key: 'generated', value: report.tip.generated ?? '—' },
      ]);
    }

    printSection('Usage');
    if (!report.usage.present) {
      console.info('  missing — bun run bun:types-report:local');
    } else {
      printMap([
        { key: 'tracked', value: String(report.usage.tracked ?? 0) },
        { key: 'used', value: String(report.usage.used ?? 0) },
        { key: 'unused', value: String(report.usage.unused ?? 0) },
        { key: 'generated', value: report.usage.generated ?? '—' },
      ]);
      if (report.usage.byModule?.length) {
        printPreviewTable(
          report.usage.byModule.map(m => ({
            module: m.module,
            tracked: m.tracked,
            used: m.used,
            unused: m.unused,
            refs: m.totalRefs,
          })),
          ['module', 'tracked', 'used', 'unused', 'refs']
        );
      }
    }

    printSection('Flags');
    printMap([
      { key: 'script', value: 'bun:types-status' },
      { key: 'command', value: 'bun tools/bun-types-status.ts' },
      { key: 'doc', value: BUN_TYPES_INVENTORY_DOC },
      { key: 'section', value: `${FLAGS_DOC_SECTION_REF}  ${FLAGS_DOC_SECTION_HREF}` },
    ]);
    printPreviewTable(
      report.flags.map(f => ({
        'REF:ID': f.refId,
        href: f.href,
        '--flag': f.flag,
        shortcode: f.shortcode,
        default: f.default,
        current: f.current,
      })),
      ['REF:ID', 'href', '--flag', 'shortcode', 'default', 'current']
    );

    printSection('Next steps');
    for (const s of report.nextSteps) console.info(`  • ${s}`);
  }

  await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await Bun.write(OUT_MD, renderStatusMd(report));
  if (!args.json) {
    printArtifacts([OUT_JSON, OUT_MD]);
    const ok = report.verdict !== 'fail';
    printDone(ok || !args.strict, `bun-types-status ${report.verdict}`);
  }
  if (args.strict && (report.verdict === 'fail' || report.verdict === 'warn')) return 1;
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}
