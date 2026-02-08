#!/usr/bin/env bun
/**
 * bun-docs - Elite Bun Documentation Search CLI
 * =============================================
 * Fast, cached, fuzzy search for Bun documentation
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
}

interface SearchIndex {
  entries: DocEntry[];
  lastUpdated: number;
  version: string;
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
  
  const response = await fetch(INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch index: ${response.status}`);
  }
  
  const content = await response.text();
  const entries = parseLlmsTxt(content);
  
  const index: SearchIndex = {
    entries,
    lastUpdated: Date.now(),
    version: Bun.version,
  };
  
  // Save to cache
  await ensureCacheDir();
  await writeFile(await getIndexPath(), JSON.stringify(index, null, 2));
  
  const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
  console.log(c.green(`✓ Indexed ${entries.length} pages in ${elapsedMs.toFixed(1)}ms`));
  
  return index;
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
  
  for (const line of lines) {
    // Check for category headers (e.g., "## Docs")
    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      continue;
    }
    
    // Parse markdown links: [title](url): description
    const linkMatch = line.match(/-\s+\[(.+?)\]\((.+?)\)(?::\s*(.+))?/);
    if (linkMatch) {
      const [, title, url, description] = linkMatch;
      entries.push({
        title: description || title,
        url,
        category: currentCategory,
      });
    }
  }
  
  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  // Exact match
  if (t === q) return 1000;
  
  // Starts with
  if (t.startsWith(q)) return 500;
  
  // Contains
  if (t.includes(q)) return 100;
  
  // Fuzzy match (character by character)
  let score = 0;
  let tIdx = 0;
  
  for (const char of q) {
    const found = t.indexOf(char, tIdx);
    if (found !== -1) {
      score += 10;
      tIdx = found + 1;
    }
  }
  
  return score;
}

async function search(query: string, options: { com?: boolean; sh?: boolean } = {}): Promise<void> {
  const startNs = nanoseconds();
  
  if (!query) {
    console.log(c.red('Error: Search query required'));
    console.log('Usage: bun-docs search "<query>"');
    process.exit(1);
  }
  
  const index = await loadIndex();
  
  // Score and sort results
  const results = index.entries
    .map(entry => ({
      ...entry,
      score: fuzzyScore(query, entry.title) + 
             fuzzyScore(query, entry.url) * 0.5 +
             (entry.category ? fuzzyScore(query, entry.category) * 0.3 : 0),
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
  
  if (results.length === 0) {
    console.log(c.yellow(`No results found for "${query}"`));
    console.log(c.gray('Try: bun-docs index (to refresh cache)'));
    return;
  }
  
  console.log();
  console.log(c.bold(c.cyan(`🔍 Results for "${query}" (${elapsedMs.toFixed(2)}ms)`)));
  console.log();
  
  results.forEach((result, i) => {
    const domain = options.sh ? 'bun.sh' : 'bun.com';
    const url = result.url.replace('bun.com', domain);
    
    console.log(`${c.bold(c.green(`${i + 1}.`))} ${c.bold(result.title)}`);
    if (result.category) {
      console.log(`   ${c.gray('Category:')} ${c.yellow(result.category)}`);
    }
    console.log(`   ${c.cyan(url)}`);
    console.log(`   ${c.gray(`Score: ${result.score.toFixed(0)}`)}`);
    console.log();
  });
  
  // Print copy-pasteable command
  const topResult = results[0];
  const domain = options.sh ? 'bun.sh' : 'bun.com';
  const topUrl = topResult.url.replace('bun.com', domain);
  
  console.log(c.gray('─'.repeat(60)));
  console.log(c.gray('Open top result:'));
  console.log(c.yellow(`  bun-docs open "${topUrl}"`));
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN
// ═══════════════════════════════════════════════════════════════════════════════

async function openUrl(url: string, options: { app?: boolean } = {}): Promise<void> {
  if (!url) {
    console.log(c.red('Error: URL required'));
    process.exit(1);
  }
  
  console.log(c.yellow(`🌐 Opening ${url}...`));
  
  const platform = process.platform;
  let command: string[];
  
  if (options.app) {
    // Try to open in Chrome app mode
    const chromePath = which('google-chrome') || which('chrome') || which('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    if (chromePath) {
      command = [chromePath, '--app=' + url];
    } else {
      console.log(c.yellow('Chrome not found, using default browser'));
      command = platform === 'darwin' ? ['open', url] : platform === 'win32' ? ['start', url] : ['xdg-open', url];
    }
  } else {
    command = platform === 'darwin' ? ['open', url] : platform === 'win32' ? ['start', url] : ['xdg-open', url];
  }
  
  const proc = Bun.spawn({
    cmd: command,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  
  await proc.exited;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════════════════════

async function showStatus(): Promise<void> {
  console.log(c.bold(c.cyan('📊 bun-docs Status')));
  console.log();
  
  const indexPath = await getIndexPath();
  
  try {
    const stats = await stat(indexPath);
    const index = await loadIndex();
    const age = Date.now() - stats.mtimeMs;
    const ageHours = age / (60 * 60 * 1000);
    
    console.log(`${c.bold('Cache Location:')} ${indexPath}`);
    console.log(`${c.bold('Index Version:')} ${index.version}`);
    console.log(`${c.bold('Pages Indexed:')} ${c.green(index.entries.length.toString())}`);
    console.log(`${c.bold('Last Updated:')} ${ageHours < 1 ? c.green('Just now') : c.yellow(`${ageHours.toFixed(1)} hours ago`)}`);
    console.log(`${c.bold('Cache Valid:')} ${age < CACHE_TTL_MS ? c.green('✓ Yes') : c.red('✗ Expired')}`);
  } catch {
    console.log(c.yellow('No index found. Run: bun-docs index'));
  }
  
  console.log();
  console.log(c.gray('Commands:'));
  console.log(`  ${c.cyan('bun-docs index')}      - Update documentation index`);
  console.log(`  ${c.cyan('bun-docs search')}     - Search documentation`);
  console.log(`  ${c.cyan('bun-docs open')}       - Open URL in browser`);
  console.log(`  ${c.cyan('bun-docs status')}     - Show this status`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════════════════════════

function showHelp(): void {
  console.log(c.bold(c.cyan(`
╔════════════════════════════════════════════════════════════════╗
║  🔍 bun-docs - Elite Bun Documentation Search                 ║
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
  console.log(`  ${c.yellow('help')}               Show this help`);
  console.log();
  
  console.log(c.bold('Search Options:'));
  console.log(`  ${c.cyan('--com')}              Use bun.com domain (default)`);
  console.log(`  ${c.cyan('--sh')}               Use bun.sh domain`);
  console.log(`  ${c.cyan('--app')}              Open in Chrome app mode`);
  console.log();
  
  console.log(c.bold('Examples:'));
  console.log(`  ${c.gray('# Search for Bun.serve API')}`);
  console.log(`  bun-docs search "Bun.serve"`);
  console.log();
  console.log(`  ${c.gray('# Search for SQLite with bun.sh links')}`);
  console.log(`  bun-docs search "sqlite" --sh`);
  console.log();
  console.log(`  ${c.gray('# Search and open top result')}`);
  console.log(`  bun-docs search "Bun.file" | head -n 2 | tail -n 1 | xargs bun-docs open`);
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
  
  // Remove flags from args
  const cleanArgs = rest.filter(arg => !arg.startsWith('--'));
  
  switch (command) {
    case 'index':
      await fetchIndex();
      break;
    
    case 'search':
      await search(cleanArgs.join(' '), { com: flags.com, sh: flags.sh });
      break;
    
    case 'open':
      await openUrl(cleanArgs.join(''), { app: flags.app });
      break;
    
    case 'status':
      await showStatus();
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

export { search, openUrl, fetchIndex, loadIndex };
