#!/usr/bin/env bun
/**
 * bun-docs - Elite Bun Documentation Search CLI
 * =============================================
 * Fast, cached, fuzzy search for Bun documentation
 *
 * @version 2.0.0
 * @author Barbershop CLI
 *
 * Usage:
 *   bun-docs search "Bun.serve"
 *   bun-docs search "sqlite" --com
 *   bun-docs index          # Update local cache
 *   bun-docs open "https://bun.com/docs/api/sqlite"
 */

import { nanoseconds, which } from 'bun';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.cache', 'bun-docs');
const INDEX_URL = 'https://bun.com/docs/llms.txt';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RESULTS = 10;
const MIN_FUZZY_SCORE = 10;

// Colors
const c = {
  reset: '\x1b[0m',
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

interface DocEntry {
  title: string;
  url: string;
  category?: string;
  description?: string;
  keywords?: string[];
}

interface SearchIndex {
  entries: DocEntry[];
  lastUpdated: number;
  version: string;
  source: string;
}

interface ScoredResult extends DocEntry {
  score: number;
  matches: string[];
}

interface SearchOptions {
  domain?: 'bun.com' | 'bun.sh';
  maxResults?: number;
  minScore?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function getIndexPath(): Promise<string> {
  return join(CACHE_DIR, 'index.json');
}

async function isCacheValid(): Promise<boolean> {
  try {
    const indexPath = await getIndexPath();
    const stats = await stat(indexPath);
    const age = Date.now() - stats.mtimeMs;
    return age < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

async function fetchIndex(): Promise<SearchIndex> {
  const startNs = nanoseconds();

  console.log(c.yellow('📡 Fetching index from bun.com...'));

  try {
    const response = await fetch(INDEX_URL, {
      headers: {
        'User-Agent': `bun-docs/2.0`,
        'Accept': 'text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    const entries = parseLlmsTxt(content);

    const index: SearchIndex = {
      entries,
      lastUpdated: Date.now(),
      version: Bun.version,
      source: INDEX_URL,
    };

    // Save to cache
    await ensureCacheDir();
    await writeFile(await getIndexPath(), JSON.stringify(index, null, 2));

    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
    const sizeKB = (content.length / 1024).toFixed(1);
    console.log(c.green(`✓ Indexed ${entries.length} pages (${sizeKB}KB) in ${elapsedMs.toFixed(1)}ms`));

    return index;
  } catch (error) {
    console.error(c.red(`Failed to fetch: ${(error as Error).message}`));

    // Try to load stale cache as fallback
    try {
      const staleIndex = await loadIndex();
      console.log(c.yellow('⚠️  Using cached index (may be outdated)'));
      return staleIndex;
    } catch {
      throw error;
    }
  }
}

async function loadIndex(): Promise<SearchIndex> {
  if (await isCacheValid()) {
    const indexPath = await getIndexPath();
    const data = await readFile(indexPath, 'utf-8');
    return JSON.parse(data);
  }
  
  return fetchIndex();
}

function parseLlmsTxt(content: string): DocEntry[] {
  const entries: DocEntry[] = [];
  const lines = content.split('\n');
  let currentCategory = '';
  let currentUrl = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for category headers (e.g., "## Docs")
    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      continue;
    }

    // Check for URL references: [url]: https://...
    const urlRefMatch = line.match(/^\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)/);
    if (urlRefMatch) {
      currentUrl = urlRefMatch[2];
      continue;
    }

    // Parse markdown links: [title](url): description
    const linkMatch = line.match(/-\s+\[(.+?)\]\((.+?)\)(?::\s*(.+))?/);
    if (linkMatch) {
      const [, title, url, description] = linkMatch;
      entries.push({
        title: description?.trim() || title,
        url,
        category: currentCategory,
        description: description?.trim(),
      });
      continue;
    }

    // Parse lines with just title and URL reference
    const simpleMatch = line.match(/^-\s+(.+?)$/);
    if (simpleMatch && currentUrl) {
      entries.push({
        title: simpleMatch[1].trim(),
        url: currentUrl,
        category: currentCategory,
      });
    }
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function fuzzyScore(query: string, text: string): { score: number; matches: string[] } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const matches: string[] = [];

  let score = 0;

  // Exact phrase match
  if (t === q) {
    return { score: 1000, matches: [query] };
  }

  // Starts with query
  if (t.startsWith(q)) {
    score += 500;
    matches.push(`starts with "${query}"`);
  }

  // Contains exact phrase
  if (t.includes(q)) {
    score += 200;
    matches.push(`contains "${query}"`);
  }

  // Individual term scoring
  for (const term of terms) {
    // Exact word match (with word boundaries)
    const wordRegex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    if (wordRegex.test(t)) {
      score += 100;
      matches.push(`word "${term}"`);
    } else if (t.includes(term)) {
      score += 50;
      matches.push(`partial "${term}"`);
    }
  }

  // Fuzzy character matching for unmatched terms
  for (const term of terms) {
    if (!matches.some((m) => m.includes(term))) {
      let tIdx = 0;
      let charMatches = 0;

      for (const char of term) {
        const found = t.indexOf(char, tIdx);
        if (found !== -1) {
          charMatches++;
          tIdx = found + 1;
        }
      }

      if (charMatches > term.length * 0.7) {
        score += 10;
        matches.push(`fuzzy "${term}"`);
      }
    }
  }

  return { score, matches };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function search(
  query: string,
  options: SearchOptions & { com?: boolean; sh?: boolean } = {}
): Promise<ScoredResult[]> {
  const startNs = nanoseconds();
  const { maxResults = MAX_RESULTS, minScore = MIN_FUZZY_SCORE } = options;

  if (!query) {
    console.log(c.red('Error: Search query required'));
    console.log('Usage: bun-docs search "<query>"');
    process.exit(1);
  }

  const index = await loadIndex();

  // Score and sort results
  const results: ScoredResult[] = index.entries
    .map((entry) => {
      const titleScore = fuzzyScore(query, entry.title);
      const urlScore = fuzzyScore(query, entry.url);
      const categoryScore = entry.category ? fuzzyScore(query, entry.category) : { score: 0, matches: [] };
      const descScore = entry.description ? fuzzyScore(query, entry.description) : { score: 0, matches: [] };

      const totalScore =
        titleScore.score * 1.0 +
        urlScore.score * 0.5 +
        categoryScore.score * 0.3 +
        descScore.score * 0.2;

      const allMatches = [
        ...titleScore.matches,
        ...urlScore.matches,
        ...categoryScore.matches,
        ...descScore.matches,
      ];

      return {
        ...entry,
        score: totalScore,
        matches: [...new Set(allMatches)], // Dedupe
      };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  const elapsedMs = Number(nanoseconds() - startNs) / 1e6;

  if (results.length === 0) {
    console.log(c.yellow(`No results found for "${query}"`));
    console.log(c.gray('Try: bun-docs index (to refresh cache)'));
    return [];
  }

  console.log();
  console.log(c.bold(c.cyan(`🔍 Results for "${query}" (${elapsedMs.toFixed(2)}ms)`)));
  console.log();

  const domain = options.sh ? 'bun.sh' : 'bun.com';

  results.forEach((result, i) => {
    const url = result.url.replace('bun.com', domain).replace('bun.sh', domain);

    console.log(`${c.bold(c.green(`${i + 1}.`))} ${c.bold(result.title)}`);
    if (result.category) {
      console.log(`   ${c.gray('Category:')} ${c.yellow(result.category)}`);
    }
    console.log(`   ${c.cyan(url)}`);
    console.log(`   ${c.gray(`Score: ${result.score.toFixed(0)}`)} ${c.gray(`[${result.matches.slice(0, 3).join(', ')}]`)}`);
    console.log();
  });

  // Print copy-pasteable command
  const topResult = results[0];
  const topUrl = topResult.url.replace('bun.com', domain).replace('bun.sh', domain);

  console.log(c.gray('─'.repeat(60)));
  console.log(c.gray('Open top result:'));
  console.log(c.yellow(`  bun-docs open "${topUrl}"`));
  console.log();

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN
// ═══════════════════════════════════════════════════════════════════════════════

async function openUrl(url: string, options: { app?: boolean } = {}): Promise<void> {
  if (!url) {
    console.log(c.red('Error: URL required'));
    process.exit(1);
  }

  // Normalize URL
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = `https://${url}`;
  }

  console.log(c.yellow(`🌐 Opening ${normalizedUrl}...`));

  const platform = process.platform;
  let command: string[];

  if (options.app) {
    // Try to open in Chrome app mode
    const chromePaths = [
      which('google-chrome'),
      which('chrome'),
      which('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      which('/usr/bin/google-chrome'),
    ].filter(Boolean);

    if (chromePaths.length > 0) {
      command = [chromePaths[0]!, '--app=' + normalizedUrl];
    } else {
      console.log(c.yellow('Chrome not found, using default browser'));
      command =
        platform === 'darwin'
          ? ['open', normalizedUrl]
          : platform === 'win32'
            ? ['cmd', '/c', 'start', normalizedUrl]
            : ['xdg-open', normalizedUrl];
    }
  } else {
    command =
      platform === 'darwin'
        ? ['open', normalizedUrl]
        : platform === 'win32'
          ? ['cmd', '/c', 'start', normalizedUrl]
          : ['xdg-open', normalizedUrl];
  }

  const proc = Bun.spawn({
    cmd: command,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error(c.red(`Failed to open URL (exit code: ${exitCode})`));
    process.exit(1);
  }

  console.log(c.green('✓ Opened in browser'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════════════════════

async function showStatus(): Promise<void> {
  console.log(c.bold(c.cyan('📊 bun-docs Status v2.0')));
  console.log();

  const indexPath = await getIndexPath();

  try {
    const stats = await stat(indexPath);
    const index = await loadIndex();
    const age = Date.now() - stats.mtimeMs;
    const ageHours = age / (60 * 60 * 1000);
    const ageDays = age / (24 * 60 * 60 * 1000);

    const formatAge = () => {
      if (ageHours < 1) return c.green('Just now');
      if (ageHours < 24) return c.yellow(`${ageHours.toFixed(1)} hours ago`);
      return c.yellow(`${ageDays.toFixed(1)} days ago`);
    };

    console.log(`${c.bold('Cache Location:')} ${indexPath}`);
    console.log(`${c.bold('Bun Version:')} ${Bun.version}`);
    console.log(`${c.bold('Index Version:')} ${index.version}`);
    console.log(`${c.bold('Pages Indexed:')} ${c.green(index.entries.length.toString())}`);
    console.log(`${c.bold('Last Updated:')} ${formatAge()}`);
    console.log(`${c.bold('Cache Valid:')} ${age < CACHE_TTL_MS ? c.green('✓ Yes') : c.red('✗ Expired')}`);

    // Show category breakdown
    const categories = new Map<string, number>();
    for (const entry of index.entries) {
      const cat = entry.category || 'Uncategorized';
      categories.set(cat, (categories.get(cat) || 0) + 1);
    }

    if (categories.size > 0) {
      console.log();
      console.log(c.bold('Categories:'));
      const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [cat, count] of sorted) {
        console.log(`  ${c.cyan(cat)}: ${count}`);
      }
    }
  } catch {
    console.log(c.yellow('No index found. Run: bun-docs index'));
  }

  console.log();
  console.log(c.gray('Commands:'));
  console.log(`  ${c.cyan('bun-docs index')}      - Update documentation index`);
  console.log(`  ${c.cyan('bun-docs search')}     - Search documentation`);
  console.log(`  ${c.cyan('bun-docs open')}       - Open URL in browser`);
  console.log(`  ${c.cyan('bun-docs status')}     - Show this status`);
  console.log(`  ${c.cyan('bun-docs clear')}      - Clear cache`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════════════════════════

function showHelp(): void {
  console.log(c.bold(c.cyan(`
╔════════════════════════════════════════════════════════════════╗
║  🔍 bun-docs - Elite Bun Documentation Search v2.0            ║
╠════════════════════════════════════════════════════════════════╣
║  Fast, cached, fuzzy search for Bun documentation             ║
╚════════════════════════════════════════════════════════════════╝
`)));

  console.log(c.bold('Usage:'));
  console.log(`  ${c.cyan('bun-docs')} ${c.yellow('<command>')} [options]`);
  console.log();

  console.log(c.bold('Commands:'));
  console.log(`  ${c.yellow('index')}              Update local documentation index`);
  console.log(`  ${c.yellow('search')} ${c.gray('<query>')}      Search documentation`);
  console.log(`  ${c.yellow('open')} ${c.gray('<url>')}         Open URL in browser`);
  console.log(`  ${c.yellow('status')}             Show cache status`);
  console.log(`  ${c.yellow('clear')}              Clear cache`);
  console.log(`  ${c.yellow('help')}               Show this help`);
  console.log();

  console.log(c.bold('Search Options:'));
  console.log(`  ${c.cyan('--com')}              Use bun.com domain (default)`);
  console.log(`  ${c.cyan('--sh')}               Use bun.sh domain`);
  console.log(`  ${c.cyan('--max <n>')}         Maximum results (default: 10)`);
  console.log();

  console.log(c.bold('Open Options:'));
  console.log(`  ${c.cyan('--app')}              Open in Chrome app mode`);
  console.log();

  console.log(c.bold('Examples:'));
  console.log(`  ${c.gray('# Search for Bun.serve API')}`);
  console.log(`  bun-docs search "Bun.serve"`);
  console.log();
  console.log(`  ${c.gray('# Search for SQLite with bun.sh links')}`);
  console.log(`  bun-docs search "sqlite" --sh`);
  console.log();
  console.log(`  ${c.gray('# Open a specific URL')}`);
  console.log(`  bun-docs open "https://bun.com/docs/api/sqlite"`);
  console.log();
  console.log(`  ${c.gray('# Open in Chrome app mode')}`);
  console.log(`  bun-docs open "https://bun.com/docs" --app`);
}

async function clearCache(): Promise<void> {
  const indexPath = await getIndexPath();
  const flatPath = join(CACHE_DIR, 'docs-flat.txt');

  try {
    await Bun.file(indexPath).unlink();
    console.log(c.green(`✓ Removed ${indexPath}`));
  } catch {
    console.log(c.gray(`  (index not found)`));
  }

  try {
    await Bun.file(flatPath).unlink();
    console.log(c.green(`✓ Removed ${flatPath}`));
  } catch {
    // Ignore
  }

  console.log(c.green('✓ Cache cleared'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  // Parse flags
  const flags = {
    com: args.includes('--com'),
    sh: args.includes('--sh'),
    app: args.includes('--app'),
  };

  // Parse --max flag
  const maxResults = args.includes('--max')
    ? parseInt(args[args.indexOf('--max') + 1], 10) || MAX_RESULTS
    : MAX_RESULTS;

  // Remove flags (and their option values) while preserving numeric query terms.
  const cleanArgs: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--com' || arg === '--sh' || arg === '--app') {
      continue;
    }
    if (arg === '--max') {
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      continue;
    }
    cleanArgs.push(arg);
  }

  switch (command) {
    case 'index':
      await fetchIndex();
      break;

    case 'search':
      await search(cleanArgs.join(' '), {
        com: flags.com,
        sh: flags.sh,
        maxResults,
      });
      break;

    case 'open':
      await openUrl(cleanArgs.join(''), { app: flags.app });
      break;

    case 'status':
      await showStatus();
      break;

    case 'clear':
      await clearCache();
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      if (!command) {
        await showStatus();
      } else {
        console.log(c.red(`Unknown command: ${command}`));
        console.log();
        showHelp();
        process.exit(1);
      }
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(c.red(`Error: ${err.message}`));
    process.exit(1);
  });
}

export { search, openUrl, fetchIndex, loadIndex, clearCache, fuzzyScore, parseLlmsTxt };
export type { DocEntry, SearchIndex, ScoredResult, SearchOptions };
