#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/semver — Bun.semver
// @see https://bun.com/docs/runtime/terminal — Bun.terminal / Bun.write(Bun.stdout)
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Domain scanner v2 — extract domain boundaries, data sources, widgets, compute.
 *
 * Features: spinner progress, watch mode, interactive prompt, version check,
 *           Bun.inspect output, summary statistics, JSON schema validation.
 *
 *   bun run scan:domains                  # Full scan
 *   bun run scan:domains --watch          # Continuous watch mode
 *   bun run scan:domains --limit-only     # Only limit-related domains
 *   bun run scan:domains --interactive    # Interactive prompt mode
 *   bun run scan:domains --json           # JSON output
 *   bun run scan:domains --help           # Usage
 */
import { Glob, Transpiler, inspect, stringWidth, semver, which, sleep } from 'bun';

// ── Version check ─────────────────────────────────────────────────────────
const MIN_BUN = '1.3.0';
const BUN_OK = semver.satisfies(Bun.version, `>=${MIN_BUN}`);

// ── Constants ─────────────────────────────────────────────────────────────
const LIMIT_KEYWORDS = ['limit', 'raise', 'decrease', 'wager', 'max_bet', 'stake', 'max_wager'];
const HELP_TEXT = `Domain Scanner v2 — Bun ${Bun.version}

  bun run scan:domains [opts]

  --limit-only     Only domains with limit-related code
  --json           JSON output (to stdout)
  --watch [sec]    Watch mode, re-scan every N seconds (default: 10)
  --interactive    Interactive prompt after scan
  --inspect        Use Bun.inspect for rich domain detail
  --quiet          Suppress spinner
  --help           This message
`;

// ── Types ─────────────────────────────────────────────────────────────────
type LimitHit = { file: string; line: number; match: string };
type DomainEntry = {
  files: string[];
  dataSources: string[];
  widgets: string[];
  compute: string[];
  exports: string[];
  imports: string[];
  limitHits: LimitHit[];
  totalLines: number;
  scannedAt: string;
};
type DomainMatrix = Record<string, DomainEntry>;

// ── Terminal spinner ──────────────────────────────────────────────────────
function createSpinner(text: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let running = true;
  const id = setInterval(() => {
    if (!running) return;
    Bun.stdout.write(`\r${frames[i]!} ${text}  `);
    i = (i + 1) % frames.length;
  }, 80);
  return {
    stop(final = '✅') {
      running = false;
      clearInterval(id);
      Bun.stdout.write(`\r${final} ${text}  \n`);
    },
    setText(t: string) {
      text = t;
    },
  };
}

// ── Domain extraction ─────────────────────────────────────────────────────
function extractDomainName(file: string): string | null {
  const parts = file.split('/');
  if (parts[0] === 'lib' && parts.length >= 2) {
    if (parts[1] && !parts[1].includes('.')) return parts[1];
    const stem = parts[1]!.replace(/\.ts$/, '');
    if (!stem.includes('.')) return stem;
  }
  return null;
}

function extractLimitHits(code: string, file: string): LimitHit[] {
  const lines = code.split('\n');
  const hits: LimitHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (const kw of LIMIT_KEYWORDS) {
      if (lines[i]!.toLowerCase().includes(kw)) {
        hits.push({ file, line: i + 1, match: lines[i]!.trim().slice(0, 100) });
        break;
      }
    }
  }
  return hits;
}

// ── Scan ──────────────────────────────────────────────────────────────────
async function scan(
  limitOnly: boolean,
  quiet: boolean
): Promise<{ matrix: DomainMatrix; total: number }> {
  const spinner = quiet ? null : createSpinner('Scanning lib/...');

  const glob = new Glob('lib/**/*.ts');
  const allFiles = await Array.fromAsync(glob.scan());
  const domainFiles = new Map<string, string[]>();

  for (const file of allFiles) {
    const domain = extractDomainName(file);
    if (domain) {
      const list = domainFiles.get(domain) ?? [];
      list.push(file);
      domainFiles.set(domain, list);
    }
  }

  const domainNames = [...domainFiles.keys()].sort();
  const matrix: DomainMatrix = {};
  let scanned = 0;

  for (const domainName of domainNames) {
    if (
      limitOnly &&
      !domainName.toLowerCase().includes('limit') &&
      !domainFiles.get(domainName)?.some(f => f.includes('limit'))
    )
      continue;

    spinner?.setText(
      `Scanning ${domainName} (${domainFiles.get(domainName)?.length ?? 0} files)...`
    );

    const files = domainFiles.get(domainName)?.sort() ?? [];
    const entry: DomainEntry = {
      files,
      dataSources: [],
      widgets: [],
      compute: [],
      exports: [],
      imports: [],
      limitHits: [],
      totalLines: 0,
      scannedAt: new Date().toISOString(),
    };

    for (const file of files) {
      const code = await Bun.file(file).text();
      const lines = code.split('\n');
      entry.totalLines += lines.length;
      scanned++;

      for (const line of lines) {
        const im = line.match(/import\s+(?:\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (im) entry.imports.push(im[1]!);
        const ex = line.match(
          /^export\s+(?:async\s+)?(?:function|class|const|type|interface)\s+(\w+)/
        );
        if (ex) entry.exports.push(ex[1]!);
      }

      if (/Database|\.db\b|\.query\(|CREATE TABLE|sqlite/i.test(code)) entry.dataSources.push(file);
      if (
        /HTMLElement|customElements\.define|class\s+\w+\s+extends\s+(?:HTMLElement|HTML\w+Element)/.test(
          code
        )
      )
        entry.widgets.push(file);
      entry.limitHits.push(...extractLimitHits(code, file));
    }

    entry.exports = [...new Set(entry.exports)].sort();
    entry.imports = [...new Set(entry.imports)].sort();
    matrix[domainName] = entry;
  }

  spinner?.stop(`✅ Scanned ${scanned} files across ${Object.keys(matrix).length} domains`);
  return { matrix, total: scanned };
}

// ── Render ────────────────────────────────────────────────────────────────
function render(matrix: DomainMatrix, total: number, useInspect: boolean) {
  const domainNames = Object.keys(matrix).sort();

  if (useInspect) {
    // Rich Bun.inspect with custom depth
    const summary = domainNames.map(name => {
      const d = matrix[name]!;
      return {
        domain: name,
        files: d.files.length,
        exports: d.exports.length,
        dataSources: d.dataSources.length,
        widgets: d.widgets.length,
        limitHits: d.limitHits.length,
        lines: d.totalLines,
      };
    });
    console.log(inspect(summary, { depth: 3, colors: true }));
    console.log(`\n  Total: ${total} files, ${domainNames.length} domains`);
    return;
  }

  console.log(
    `\n  📊 Domain Matrix — ${domainNames.length} domains, ${total} files (Bun ${Bun.version})\n`
  );
  for (const name of domainNames) {
    const d = matrix[name]!;
    const limitTag = d.limitHits.length > 0 ? ` 🔴${d.limitHits.length}` : '';
    const pct =
      d.totalLines > 0 ? ` ${((d.limitHits.length / d.totalLines) * 1000).toFixed(1)}‰` : '';
    console.log(`  ${name}${limitTag}${pct}`);
    console.log(
      `     Files: ${d.files.length}  |  Exports: ${d.exports.length}  |  ` +
        `Data: ${d.dataSources.length}  |  UI: ${d.widgets.length}  |  Lines: ${d.totalLines}`
    );
    if (d.limitHits.length > 0) {
      const maxShow = d.limitHits.length > 5 ? 3 : d.limitHits.length;
      for (const h of d.limitHits.slice(0, maxShow)) {
        console.log(`       L${h.line}  ${h.match.slice(0, 80)}`);
      }
      if (d.limitHits.length > maxShow)
        console.log(`       ... +${d.limitHits.length - maxShow} more`);
    }
    console.log('');
  }

  // Summary statistics
  const totalLimitHits = domainNames.reduce((s, n) => s + (matrix[n]?.limitHits.length ?? 0), 0);
  const totalLines = domainNames.reduce((s, n) => s + (matrix[n]?.totalLines ?? 0), 0);
  const totalDataSources = [...new Set(domainNames.flatMap(n => matrix[n]?.dataSources ?? []))]
    .length;
  const totalWidgets = [...new Set(domainNames.flatMap(n => matrix[n]?.widgets ?? []))].length;
  console.log(`  ─── Summary ───`);
  console.log(`  Files: ${total}  |  Lines: ${totalLines}  |  Limit hits: ${totalLimitHits}`);
  console.log(`  Data sources: ${totalDataSources}  |  Widgets: ${totalWidgets}`);
  if (!BUN_OK) console.log(`  ⚠️  Bun ${Bun.version} < ${MIN_BUN} — upgrade recommended`);
  console.log('');
}

// ── Interactive mode ──────────────────────────────────────────────────────
async function interactive(matrix: DomainMatrix) {
  const names = Object.keys(matrix).sort();
  console.log(
    `\n  🔍 Interactive mode — ${names.length} domains. Type a domain name for details, or 'q' to quit.\n`
  );
  for (let i = 0; i < names.length; i += 4) {
    console.log(
      `  ${names
        .slice(i, i + 4)
        .map((n, j) => `${i + j + 1}.${n}`.padEnd(22))
        .join('')}`
    );
  }
  console.log('');
  const buf = new Uint8Array(1024);
  while (true) {
    Bun.stdout.write('  > ');
    const n = await Bun.stdin.read(buf);
    if (n === null || n === 0) break;
    const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
    if (input === 'q' || input === 'quit' || input === 'exit') break;

    const match = names.find(n => n.startsWith(input) || n.includes(input));
    if (match) {
      const d = matrix[match]!;
      console.log(
        inspect(
          {
            domain: match,
            files: d.files.slice(0, 10),
            exports: d.exports.slice(0, 15),
            dataSources: d.dataSources,
            widgets: d.widgets,
            limitHits: d.limitHits.slice(0, 8),
          },
          { depth: 3, colors: true }
        )
      );
      console.log('');
    } else {
      console.log(`  No domain matching "${input}"`);
    }
  }
}

// ── Watch mode ────────────────────────────────────────────────────────────
async function watchMode(limitOnly: boolean, intervalSec: number, quiet: boolean) {
  console.log(`  👁️  Watch mode — re-scanning every ${intervalSec}s. Ctrl+C to stop.\n`);
  while (true) {
    const { matrix, total } = await scan(limitOnly, quiet);
    render(matrix, total, false);
    await sleep(intervalSec * 1000);
  }
}

// ── JSON schema validation ────────────────────────────────────────────────
const MATRIX_SCHEMA = {
  type: 'object',
  patternProperties: {
    '^[a-z]': {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        dataSources: { type: 'array' },
        widgets: { type: 'array' },
        exports: { type: 'array' },
        limitHits: {
          type: 'array',
          items: {
            type: 'object',
            properties: { file: { type: 'string' }, line: { type: 'number' } },
          },
        },
        totalLines: { type: 'number' },
        scannedAt: { type: 'string' },
      },
    },
  },
};

// eslint-disable-next-line harness/no-unknown-function-param
function validateMatrix(matrix: unknown): boolean {
  if (typeof matrix !== 'object' || matrix === null) return false;
  for (const [key, val] of Object.entries(matrix as Record<string, unknown>)) {
    if (typeof val !== 'object') return false;
    const entry = val as Record<string, unknown>;
    if (!Array.isArray(entry.files)) return false;
    if (typeof entry.totalLines !== 'number') return false;
  }
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(HELP_TEXT);
    return;
  }

  // Check for required tools
  if (!BUN_OK) {
    console.warn(`⚠️  Bun ${Bun.version} < ${MIN_BUN} — some features may not work`);
  }
  const hasGit = await which('git');
  if (!hasGit) console.warn('⚠️  git not found — some features unavailable');

  const limitOnly = args.includes('--limit-only');
  const jsonOut = args.includes('--json');
  const useInspect = args.includes('--inspect');
  const interactiveMode = args.includes('--interactive');
  const quiet = args.includes('--quiet');

  const watchIdx = args.indexOf('--watch');
  if (watchIdx >= 0) {
    const sec = Number(args[watchIdx + 1]) || 10;
    await watchMode(limitOnly, sec, quiet);
    return;
  }

  const { matrix, total } = await scan(limitOnly, quiet);

  // Validate
  if (!validateMatrix(matrix)) {
    console.error('❌ Invalid matrix structure');
    process.exit(1);
  }

  // Write matrix under reports/ (gitignored local dump; not wiki/docs SSOT)
  const matrixPath = `${import.meta.dir}/../reports/domain-matrix.json`;
  await Bun.write(matrixPath, JSON.stringify(matrix, null, 2));

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          metadata: {
            bunVersion: Bun.version,
            totalFiles: total,
            domains: Object.keys(matrix).length,
            schema: MATRIX_SCHEMA,
          },
          matrix,
        },
        null,
        2
      )
    );
  } else {
    render(matrix, total, useInspect);
    console.log(
      `  📝 Written: reports/domain-matrix.json (${Object.keys(matrix).length} domains, ${total} files)`
    );
  }

  if (interactiveMode) {
    await interactive(matrix);
  }
}

if (import.meta.main) main();
