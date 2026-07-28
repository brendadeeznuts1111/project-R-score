#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob
// @see https://bun.com/docs/runtime/module
/**
 * Domain scanner — extract domain boundaries, data sources, widgets, compute.
 *
 * Adapts the domains/** convention to the existing lib/ structure:
 * each top-level subdirectory under lib/ is treated as a domain.
 *
 *   bun run scan:domains
 *   bun run scan:domains --json
 *   bun run scan:domains --limit-only
 */
import { Glob, Transpiler } from 'bun';

const LIMIT_KEYWORDS = ['limit', 'raise', 'decrease', 'wager', 'max_bet', 'stake'];

type DomainEntry = {
  files: string[];
  dataSources: string[];
  widgets: string[];
  compute: string[];
  exports: string[];
  imports: string[];
  /** Lines matching limit-related keywords */
  limitHits: Array<{ file: string; line: number; match: string }>;
};

type DomainMatrix = Record<string, DomainEntry>;

function extractDomainName(file: string): string | null {
  const parts = file.split('/');
  // lib/<domain>/... or lib/<domain>.ts
  if (parts[0] === 'lib' && parts.length >= 2) {
    if (parts[1] && !parts[1].includes('.')) return parts[1];
    // Domain is the file stem for top-level lib/*.ts files
    const stem = parts[1]!.replace(/\.ts$/, '');
    if (!stem.includes('.')) return stem;
  }
  return null;
}

function isDataSource(line: string): boolean {
  return /Database|\.db\b|\.query\(|SELECT|CREATE TABLE|sqlite|postgres/i.test(line);
}

function isWidget(line: string): boolean {
  return /HTMLElement|customElements\.define|class\s+\w+ extends|render\(|innerHTML|shadowRoot/i.test(
    line
  );
}

function isCompute(line: string): boolean {
  return /function\s+\w+\(|=>\s*{/.test(line) && !isWidget(line) && !/import|export/.test(line);
}

function extractLimitHits(code: string, file: string): DomainEntry['limitHits'] {
  const lines = code.split('\n');
  const hits: DomainEntry['limitHits'] = [];
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitOnly = args.includes('--limit-only');
  const jsonOut = args.includes('--json');

  // Scan all .ts files under lib/
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

  const matrix: DomainMatrix = {};

  for (const [domainName, files] of domainFiles) {
    if (
      limitOnly &&
      !domainName.toLowerCase().includes('limit') &&
      !files.some(f => f.includes('limit'))
    )
      continue;

    const entry: DomainEntry = {
      files,
      dataSources: [],
      widgets: [],
      compute: [],
      exports: [],
      imports: [],
      limitHits: [],
    };

    for (const file of files.sort()) {
      const code = await Bun.file(file).text();
      const lines = code.split('\n');

      // Extract imports
      for (const line of lines) {
        const im = line.match(/import\s+(?:\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (im) entry.imports.push(im[1]!);

        const ex = line.match(
          /^export\s+(?:async\s+)?(?:function|class|const|type|interface)\s+(\w+)/
        );
        if (ex) entry.exports.push(ex[1]!);
      }

      // Data sources
      if (code.match(/Database|\.db\b|\.query\(|CREATE TABLE|sqlite/i)) {
        entry.dataSources.push(file);
      }

      // Widgets (UI components)
      if (
        code.match(
          /HTMLElement|customElements\.define|class\s+\w+\s+extends\s+(?:HTMLElement|HTML\w+Element)/
        )
      ) {
        entry.widgets.push(file);
      }

      // Limit hits
      entry.limitHits.push(...extractLimitHits(code, file));
    }

    entry.files.sort();
    entry.exports = [...new Set(entry.exports)].sort();
    entry.imports = [...new Set(entry.imports)].sort();

    matrix[domainName] = entry;
  }

  if (jsonOut) {
    console.log(JSON.stringify(matrix, null, 2));
  } else {
    const domainNames = Object.keys(matrix).sort();
    console.log(`\n  📊 Domain Matrix — ${domainNames.length} domains, ${allFiles.length} files\n`);
    for (const name of domainNames) {
      const d = matrix[name]!;
      const limitTag = d.limitHits.length > 0 ? ` 🔴${d.limitHits.length}` : '';
      console.log(`  ${name}${limitTag}`);
      console.log(
        `     Files: ${d.files.length}  |  Exports: ${d.exports.length}  |  Data: ${d.dataSources.length}  |  UI: ${d.widgets.length}`
      );
      if (d.limitHits.length > 0) {
        const topHits = d.limitHits.slice(0, 3);
        for (const h of topHits) {
          console.log(`       L${h.line}  ${h.match.slice(0, 80)}`);
        }
        if (d.limitHits.length > 3) console.log(`       ... +${d.limitHits.length - 3} more`);
      }
      console.log('');
    }
  }

  // Write matrix to file
  await Bun.write('domain-matrix.json', JSON.stringify(matrix, null, 2));
  console.log(`  📝 Written: domain-matrix.json (${Object.keys(matrix).length} domains)`);
}

if (import.meta.main) main();
