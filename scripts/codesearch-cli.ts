#!/usr/bin/env bun
/**
 * CodeSearch CLI - Fast, streaming code search
 * 
 * Usage:
 *   bun run scripts/codesearch-cli.ts "query" [options]
 *   bun run scripts/codesearch-cli.ts "export function" --path ./src --type ts
 *   bun run scripts/codesearch-cli.ts "TODO" --stream
 *   bun run scripts/codesearch-cli.ts "class" --symbol --json
 */

import { CodeSearch, searchWithScoring, type CodeSearchOptions, type ScoredMatch } from '../lib/docs/codesearch';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CliOptions extends CodeSearchOptions {
  help: boolean;
  json: boolean;
  stream: boolean;
  symbol: boolean;
  scored: boolean;
  minScore: number;
  version: boolean;
  stats: boolean;
  noCache: boolean;
  configPaths: boolean;
  auditPaths: boolean;
  from?: string;
  to?: string;
}

function parseArgs(argv: string[]): { query: string; options: CliOptions } | null {
  const options: CliOptions = {
    help: false,
    json: false,
    stream: false,
    symbol: false,
    scored: false,
    minScore: 0,
    version: false,
    stats: false,
    noCache: false,
    query: '',
  };

  let query: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith('-') && query === null) {
      query = arg;
      continue;
    }

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
      case '-p':
      case '--path':
        const paths = argv[++i]?.split(',').map(p => p.trim()).filter(Boolean);
        if (paths?.length) options.paths = paths;
        break;
      case '-t':
      case '--type':
        options.type = argv[++i] as 'ts' | 'js' | 'md' | 'all';
        break;
      case '-l':
      case '--limit':
        options.maxResults = parseInt(argv[++i], 10) || 50;
        break;
      case '-c':
      case '--context':
        options.context = parseInt(argv[++i], 10) || 0;
        options.includeContext = options.context > 0;
        break;
      case '-i':
      case '--case-sensitive':
        options.caseSensitive = true;
        break;
      case '-w':
      case '--word':
      case '--symbol':
        options.wordBoundary = true;
        options.symbol = true;
        break;
      case '--stream':
        options.stream = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--scored':
        options.scored = true;
        break;
      case '--min-score':
        options.minScore = parseInt(argv[++i], 10) || 0;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--no-cache':
        options.noCache = true;
        options.cache = false;
        break;
      case '--no-color':
        // Handled in output
        break;
      case '--config-paths':
      case '--audit-config':
        options.configPaths = true;
        options.auditPaths = true;
        break;
      case '--audit-paths':
        options.auditPaths = true;
        break;
      case '--from':
        options.from = argv[++i];
        break;
      case '--to':
        options.to = argv[++i];
        break;
    }
  }

  if (options.help) {
    printUsage();
    return null;
  }

  if (options.version) {
    console.log('codesearch-cli v2.0.0');
    return null;
  }

  // Allow --config-paths to run without a positional query
  if (!query && !options.configPaths && !options.auditPaths) {
    console.error('Error: Query required\n');
    printUsage();
    process.exit(1);
  }

  options.query = query;
  if (options.cache === undefined && !options.noCache) {
    options.cache = true;
  }

  return { query, options };
}

function printUsage(): void {
  console.log(`
CodeSearch CLI - Fast, streaming code search

USAGE:
  bun run scripts/codesearch-cli.ts <query> [options]

OPTIONS:
  -p, --path <dirs>      Search paths (comma-separated, default: .)
  -t, --type <type>      File type: ts|js|md|all (default: all)
  -l, --limit <n>        Max results (default: 50)
  -c, --context <n>      Lines of context (default: 0)
  -i, --case-sensitive   Case-sensitive matching
  -w, --word, --symbol   Word boundary search (symbol mode)
  --stream               Stream results as they arrive
  --json                 Output JSON
  --scored               Use relevance scoring
  --min-score <n>        Minimum score for scored search
  --stats                Show detailed stats
  --no-cache             Disable caching
  --no-color             Disable colors
  -h, --help             Show this help
  --version              Show version
  --config-paths, --audit-config
                         Shortcut for common config migration (configs/ → config/)
  --audit-paths          General path migration audit mode (works with --from / --to)
  --from <old-path>      Old path for migration audit (used with --audit-paths or --config-paths)
  --to <new-path>        New path for migration audit (used with --audit-paths or --config-paths)

EXAMPLES:
  # Basic search
  bun run scripts/codesearch-cli.ts "export function"

  # Search TypeScript files only
  bun run scripts/codesearch-cli.ts "interface" --type ts --path ./src

  # Symbol search with word boundaries
  bun run scripts/codesearch-cli.ts "UserService" --symbol --path ./lib

  # Stream results (fastest TTFB)
  bun run scripts/codesearch-cli.ts "TODO" --stream

  # JSON output with scoring
  bun run scripts/codesearch-cli.ts "router" --scored --json

  # Detailed stats
  bun run scripts/codesearch-cli.ts "config" --stats --limit 100
`);
}

// ============================================================================
// Output Formatting
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function highlightQuery(text: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, `${colors.yellow}$1${colors.reset}`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatMatch(match: ScoredMatch, index: number, query: string, showScore: boolean): string {
  const file = match.file.replace(process.cwd(), '.');
  const line = `${colors.bright}${file}:${match.line}${colors.reset}`;
  const col = match.column ? `:${match.column}` : '';
  const score = showScore && match.score !== undefined ? ` ${colors.cyan}[${match.score}]${colors.reset}` : '';
  const reasons = match.reasons?.length ? ` ${colors.dim}(${match.reasons.join(', ')})${colors.reset}` : '';
  
  let content = match.content;
  if (content.length > 120) {
    content = content.slice(0, 117) + '...';
  }
  content = highlightQuery(content, query);

  let output = `${index + 1}. ${line}${col}${score}${reasons}\n   ${content}`;

  if (match.context?.before?.length) {
    const before = match.context.before.slice(-2).map(l => `   ${colors.dim}${l.slice(0, 100)}${colors.reset}`).join('\n');
    output = `${before}\n${output}`;
  }

  if (match.context?.after?.length) {
    const after = match.context.after.slice(0, 2).map(l => `   ${colors.dim}${l.slice(0, 100)}${colors.reset}`).join('\n');
    output = `${output}\n${after}`;
  }

  return output;
}

function formatStats(stats: { timeMs: number; filesSearched: number; matchesFound: number; cached?: boolean }, cacheSize?: number): string {
  const cached = stats.cached ? ` ${colors.green}[cached]${colors.reset}` : '';
  const cache = cacheSize !== undefined ? ` (cache: ${cacheSize})` : '';
  return `${colors.dim}Found ${stats.matchesFound} matches in ${stats.filesSearched} files (${stats.timeMs.toFixed(2)}ms)${cached}${cache}${colors.reset}`;
}

// ============================================================================
// Search Execution
// ============================================================================

async function runSearch(query: string, options: CliOptions): Promise<void> {
  const searcher = new CodeSearch();
  const start = performance.now();

  // Streaming mode
  if (options.stream && !options.json) {
    console.log(`${colors.dim}Streaming results for "${query}"...${colors.reset}\n`);
    
    let count = 0;
    const files = new Set<string>();

    for await (const match of searcher.searchStream(options)) {
      count++;
      files.add(match.file);
      console.log(formatMatch(match as ScoredMatch, count - 1, query, false));
      
      if (options.maxResults && count >= options.maxResults) {
        break;
      }
    }

    const totalTime = performance.now() - start;
    console.log(`\n${formatStats({ timeMs: totalTime, filesSearched: files.size, matchesFound: count })}`);
    return;
  }

  // Regular or scored search
  let result;
  if (options.scored) {
    result = await searchWithScoring({
      ...options,
      boostDefinitions: true,
      boostPathMatch: true,
      minScore: options.minScore,
    });
  } else {
    result = await searcher.search(options);
  }

  const totalTime = performance.now() - start;

  // JSON output
  if (options.json) {
    const output = {
      query,
      options: {
        paths: options.paths,
        type: options.type,
        caseSensitive: options.caseSensitive,
        wordBoundary: options.wordBoundary,
        maxResults: options.maxResults,
      },
      stats: {
        ...result.stats,
        totalTimeMs: Number(totalTime.toFixed(2)),
      },
      matches: result.matches,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Pretty output
  console.log(`${colors.bright}Search: "${query}"${colors.reset}\n`);

  if (result.matches.length === 0) {
    console.log(`${colors.yellow}No matches found${colors.reset}`);
  } else {
    result.matches.forEach((match, i) => {
      console.log(formatMatch(match as ScoredMatch, i, query, options.scored));
      console.log();
    });
  }

  console.log(formatStats(result.stats, searcher.getCacheStats().size));

  if (options.stats) {
    console.log(`\n${colors.dim}Detailed Stats:${colors.reset}`);
    console.log(`  Cache enabled: ${options.cache !== false}`);
    console.log(`  Cache size: ${searcher.getCacheStats().size}`);
    console.log(`  Case sensitive: ${options.caseSensitive || false}`);
    console.log(`  Word boundary: ${options.wordBoundary || false}`);
    console.log(`  File type: ${options.type || 'all'}`);
    console.log(`  Paths: ${options.paths?.join(', ') || '.'}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) return;

  const { query, options } = parsed;

  // Path migration / audit mode (general + config shortcut)
  if (options.auditPaths || options.configPaths) {
    await runPathMigrationAudit(options);
    return;
  }

  try {
    await runSearch(query, options);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function runPathMigrationAudit(options: CliOptions): Promise<void> {
  const isConfigMode = options.configPaths;

  console.log(`${colors.bright}🔍 Path Migration Audit Mode${colors.reset}${isConfigMode ? ' (Config)' : ''}\n`);

  const fromPath = options.from || (isConfigMode ? 'configs/' : null);
  const toPath = options.to || (isConfigMode ? 'config/' : null);

  if (!fromPath) {
    console.error('Error: --from <path> is required when using --audit-paths or --config-paths');
    process.exit(1);
  }

  console.log(`Auditing references to paths...`);
  if (fromPath && toPath) {
    console.log(`Migration audit: ${colors.yellow}${fromPath}${colors.reset} → ${colors.green}${toPath}${colors.reset}\n`);
  } else {
    console.log(`Showing references to "${fromPath}" (potential stale references).\n`);
  }

  const searcher = new CodeSearch();

  // === Stale references (old path) ===
  console.log(`${colors.yellow}Stale / Old Path References ("${fromPath}"):${colors.reset}`);

  // Base search for the old path
  const staleResult = await searcher.search({
    query: fromPath,
    paths: options.paths || ['.'],
    type: 'all',
    context: 1,
    maxResults: 150,
    cache: true,
  });

  // Additional regex search for dynamic imports containing the old path
  // This catches patterns like: `...${env}...configs/cookie-crc32/...`
  const dynamicQuery = `${fromPath.replace('/', '\\/')}.*\\$\\{|\\$\\{.*${fromPath.replace('/', '\\/')}`;
  const dynamicResult = await searcher.search({
    query: dynamicQuery,
    paths: options.paths || ['.'],
    type: 'all',
    context: 1,
    maxResults: 50,
    cache: true,
  });

  // Merge and deduplicate
  const allStale = [...staleResult.matches, ...dynamicResult.matches];
  const uniqueStale = allStale.filter((m, index, self) =>
    index === self.findIndex(t => t.file === m.file && t.line === m.line)
  );

  if (uniqueStale.length === 0) {
    console.log(`  ${colors.green}✓ No stale references found for "${fromPath}"${colors.reset}\n`);
  } else {
    uniqueStale.slice(0, 40).forEach((m, i) => {
      const file = m.file.replace(process.cwd(), '.');
      const content = m.content.trim().slice(0, 110);

      // Try to generate a suggested replacement if --from and --to were provided
      let suggestion = '';
      if (options.from && options.to) {
        const suggested = content.replace(new RegExp(options.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), options.to);
        if (suggested !== content) {
          suggestion = `\n     ${colors.green}→ Suggested: ${suggested.slice(0, 100)}${colors.reset}`;
        }
      }

      const isDynamic = content.includes('${') || content.includes('`');
      const prefix = isDynamic ? `${colors.cyan}[dynamic]${colors.reset} ` : '';

      console.log(`  ${i + 1}. ${prefix}${file}:${m.line}`);
      console.log(`     ${content}${suggestion}`);
    });

    if (uniqueStale.length > 40) {
      console.log(`  ... and ${uniqueStale.length - 40} more`);
    }
    console.log('');
  }

  // === Current / New path references ===
  console.log(`${colors.blue}Current / New Path References ("${toPath}"):${colors.reset}`);

  const currentResult = await searcher.search({
    query: toPath,
    paths: options.paths || ['.'],
    type: 'all',
    context: 0,
    maxResults: 60,
    cache: true,
  });

  if (currentResult.matches.length === 0) {
    console.log(`  ${colors.dim}(No references to "${toPath}" found in this run)${colors.reset}`);
  } else {
    currentResult.matches.slice(0, 25).forEach((m, i) => {
      const file = m.file.replace(process.cwd(), '.');
      console.log(`  ${i + 1}. ${file}:${m.line}`);
    });

    if (currentResult.matches.length > 25) {
      console.log(`  ... and ${currentResult.matches.length - 25} more`);
    }
  }

  // Summary
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  Stale references found: ${uniqueStale.length}`);
  console.log(`  Current path references found: ${currentResult.matches.length}`);

  if (options.from && options.to && uniqueStale.length > 0) {
    console.log(`\n${colors.yellow}Tip:${colors.reset} Use the suggested lines above to update your code.`);
    console.log(`      Run with --json for machine-readable output in the future.`);
  }

  console.log(`\n${colors.dim}Usage examples:${colors.reset}`);
  console.log(`  bun run scripts/codesearch-cli.ts --config-paths --from configs/ --to config/`);
  console.log(`  bun run scripts/codesearch-cli.ts --config-paths --from cli/ --to tools/cli/`);
}

await main();
