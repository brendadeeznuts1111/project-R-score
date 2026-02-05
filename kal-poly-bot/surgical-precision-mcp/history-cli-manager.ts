#!/usr/bin/env bun
/**
 * HistoryCLI Manager - Production-Ready Command History with Tab Completion
 * 
 * Features:
 * - Persistent command history (~/.surgical_precision_history)
 * - Tab completion for files, directories, and commands
 * - Ctrl-R reverse history search
 * - Command timing metrics integration
 * - Team color-coded output
 * - Zero-collateral memory management
 * - Performance targets: <10ms history load (10k commands), <50ms tab completion
 * 
 * Reference: Bun v1.3.5+ Terminal API
 */

import { TableUtils, PrecisionUtils } from './precision-utils';
import { TerminalManager } from './terminal-manager';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';

export interface HistoryEntry {
  command: string;
  timestamp: string;
  exitCode: number;
  durationMs: number;
  workingDir: string;
}

export interface CompletionResult {
  suggestions: string[];
  prefix: string;
  type: 'command' | 'file' | 'directory' | 'history';
  processingTimeMs: number;
}

export interface HistoryStats {
  totalCommands: number;
  uniqueCommands: number;
  averageDurationMs: number;
  successRate: number;
  oldestEntry: string;
  newestEntry: string;
  memorySizeBytes: number;
  loadTimeMs: number;
}

/**
 * HistoryCLI Manager - Persistent command history with tab completion
 */
export class HistoryCLIManager {
  private historyFilePath: string;
  private history: HistoryEntry[] = [];
  private isLoaded = false;
  private maxHistorySize = 10000;
  private terminalManager: TerminalManager | null = null;
  
  // Tab completion state
  private lastCompletionContext = '';
  private completionCache: Map<string, CompletionResult> = new Map();

  constructor(historyPath?: string) {
    // Default to ~/.surgical_precision_history
    this.historyFilePath = historyPath || 
      resolve(process.env.HOME || '/tmp', '.surgical_precision_history');
    
    console.error(
      `[HistoryCLI] Initialized with history file: ${TableUtils.color.cyan(this.historyFilePath)}`
    );
  }

  /**
   * Load history from disk
   * Performance target: <10ms for 10,000 commands
   */
  async load(): Promise<void> {
    const startTime = performance.now();

    try {
      if (!existsSync(this.historyFilePath)) {
        this.history = [];
        this.isLoaded = true;
        console.error('[HistoryCLI] No existing history file found - starting fresh');
        return;
      }

      const content = readFileSync(this.historyFilePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      this.history = lines.slice(-this.maxHistorySize).map(line => {
        try {
          return JSON.parse(line) as HistoryEntry;
        } catch {
          // Skip malformed lines
          return null;
        }
      }).filter((entry): entry is HistoryEntry => entry !== null);

      this.isLoaded = true;

      const loadTimeMs = performance.now() - startTime;
      const memorySize = content.length;

      console.error(
        `[HistoryCLI] Loaded ${TableUtils.color.green(this.history.length.toString())} ` +
        `entries (${memorySize} bytes) in ${TableUtils.color.yellow(loadTimeMs.toFixed(2))}ms`
      );

      // Warn if exceeding performance target
      if (loadTimeMs > 10) {
        console.error(
          `⚠️  [HistoryCLI] Load time exceeded 10ms target: ${loadTimeMs.toFixed(2)}ms`
        );
      }

    } catch (error) {
      console.error('[HistoryCLI] Error loading history:', error);
      this.history = [];
      this.isLoaded = true;
    }
  }

  /**
   * Add a command entry to history
   */
  addEntry(
    command: string,
    exitCode: number,
    durationMs: number,
    workingDir?: string
  ): void {
    if (!this.isLoaded) {
      throw new Error('History not loaded - call load() first');
    }

    const entry: HistoryEntry = {
      command,
      timestamp: PrecisionUtils.timestamp(),
      exitCode,
      durationMs,
      workingDir: workingDir || process.cwd(),
    };

    this.history.push(entry);

    // Keep history size bounded
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    // Append to file (for real-time persistence)
    try {
      writeFileSync(
        this.historyFilePath,
        JSON.stringify(entry) + '\n',
        { flag: 'a' }
      );
    } catch (error) {
      console.error('[HistoryCLI] Failed to persist entry:', error);
    }
  }

  /**
   * Get command suggestions for tab completion
   * Performance target: <50ms completion time
   */
  async getCompletions(
    prefix: string,
    cursorPos: number,
    currentLine: string
  ): Promise<CompletionResult> {
    const startTime = performance.now();

    if (!this.isLoaded) {
      await this.load();
    }

    // Check cache first
    const cacheKey = `${prefix}:${cursorPos}`;
    if (this.completionCache.has(cacheKey)) {
      return this.completionCache.get(cacheKey)!;
    }

    let suggestions: string[] = [];
    let type: 'command' | 'file' | 'directory' | 'history' = 'history';

    // Determine completion type
    if (prefix.startsWith('/') || prefix.startsWith('.') || prefix.includes('/')) {
      // File/directory completion
      const suggestions_ = await this.completeFilesAndDirs(prefix);
      suggestions = suggestions_;
      type = prefix.endsWith('/') ? 'directory' : 'file';
    } else if (prefix.length === 0) {
      // Show recent commands
      suggestions = this.history
        .slice(-20)
        .reverse()
        .map(e => e.command)
        .filter((cmd, idx, arr) => arr.indexOf(cmd) === idx) // Unique
        .slice(0, 10);
    } else {
      // Command history completion
      suggestions = this.history
        .filter(e => e.command.startsWith(prefix))
        .map(e => e.command)
        .filter((cmd, idx, arr) => arr.indexOf(cmd) === idx) // Unique
        .slice(-10)
        .reverse();
    }

    const processingTimeMs = performance.now() - startTime;

    const result: CompletionResult = {
      suggestions,
      prefix,
      type,
      processingTimeMs,
    };

    // Cache result
    this.completionCache.set(cacheKey, result);

    // Warn if exceeding performance target
    if (processingTimeMs > 50) {
      console.error(
        `⚠️  [HistoryCLI] Completion time exceeded 50ms target: ${processingTimeMs.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Tab completion for files and directories
   */
  private async completeFilesAndDirs(prefix: string): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Get directory and pattern
      const dir = dirname(prefix);
      const pattern = prefix.split('/').pop() || '';
      const fullDir = resolve(dir === '.' ? process.cwd() : dir);

      if (!existsSync(fullDir)) {
        return suggestions;
      }

      const entries = readdirSync(fullDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(pattern)) {
          const fullPath = resolve(fullDir, entry.name);
          const suffix = entry.isDirectory() ? '/' : '';
          suggestions.push(fullPath + suffix);
        }
      }

      // Sort and limit
      suggestions.sort();
      return suggestions.slice(0, 20);

    } catch {
      return suggestions;
    }
  }

  /**
   * Search history with Ctrl-R reverse search
   */
  searchHistory(pattern: string, maxResults: number = 10): HistoryEntry[] {
    if (!this.isLoaded) {
      throw new Error('History not loaded - call load() first');
    }

    const regex = new RegExp(pattern, 'i');
    return this.history
      .filter(e => regex.test(e.command))
      .slice(-maxResults)
      .reverse();
  }

  /**
   * Get history statistics
   */
  getStats(): HistoryStats {
    if (!this.history.length) {
      return {
        totalCommands: 0,
        uniqueCommands: 0,
        averageDurationMs: 0,
        successRate: 0,
        oldestEntry: 'none',
        newestEntry: 'none',
        memorySizeBytes: 0,
        loadTimeMs: 0,
      };
    }

    const uniqueCommands = new Set(this.history.map(e => e.command)).size;
    const successCount = this.history.filter(e => e.exitCode === 0).length;
    const totalDuration = this.history.reduce((sum, e) => sum + e.durationMs, 0);
    const avgDuration = totalDuration / this.history.length;

    // Calculate approximate memory size
    const memorySizeBytes = JSON.stringify(this.history).length;

    return {
      totalCommands: this.history.length,
      uniqueCommands,
      averageDurationMs: avgDuration,
      successRate: (successCount / this.history.length) * 100,
      oldestEntry: this.history[0]?.timestamp || 'none',
      newestEntry: this.history[Math.max(0, this.history.length - 1)]?.timestamp || 'none',
      memorySizeBytes,
      loadTimeMs: 0, // Set during load()
    };
  }

  /**
   * Clear history cache (for testing zero-collateral operations)
   */
  clearCache(): void {
    this.completionCache.clear();
    console.error('[HistoryCLI] Completion cache cleared');
  }

  /**
   * Export history to JSON format
   */
  exportToJSON(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Clear all history (destructive operation)
   */
  async clearHistory(): Promise<void> {
    this.history = [];
    this.completionCache.clear();
    
    try {
      writeFileSync(this.historyFilePath, '');
      console.error('[HistoryCLI] History cleared');
    } catch (error) {
      console.error('[HistoryCLI] Failed to clear history file:', error);
    }
  }

  /**
   * Format history entry with team colors
   */
  formatEntry(entry: HistoryEntry): string {
    const timestamp = TableUtils.color.cyan(entry.timestamp.substring(11, 19));
    const command = TableUtils.color.alice(entry.command);
    const exitCode = entry.exitCode === 0 
      ? TableUtils.color.dave('✓')
      : TableUtils.color.carol('✗');
    const duration = TableUtils.color.bob(`${entry.durationMs.toFixed(0)}ms`);

    return `${timestamp} ${exitCode} ${command} [${duration}]`;
  }

  /**
   * Display formatted history
   */
  displayHistory(limit: number = 20): void {
    console.log('\n' + TableUtils.color.bold('📚 Recent Command History'));
    console.log('━'.repeat(70));

    const recent = this.history.slice(-limit).reverse();
    recent.forEach((entry, idx) => {
      console.log(`${String(idx + 1).padStart(2)}. ${this.formatEntry(entry)}`);
    });

    console.log('');
  }

  /**
   * Verify zero-collateral state (for testing)
   */
  verifyZeroCollateral(): boolean {
    // Check for memory leaks or state corruption
    const hasInvalidEntries = this.history.some(e => 
      !e.command || !e.timestamp || typeof e.exitCode !== 'number'
    );

    if (hasInvalidEntries) {
      throw new Error('Invalid history entries detected - zero-collateral violation');
    }

    // Verify cache consistency
    if (this.completionCache.size > 1000) {
      console.warn('[HistoryCLI] Cache size exceeding 1000 entries - potential leak');
      this.clearCache();
    }

    return true;
  }
}

/**
 * Interactive history browser (CLI utility)
 */
export async function browseHistory(historyPath?: string): Promise<void> {
  const manager = new HistoryCLIManager(historyPath);
  await manager.load();

  const stats = manager.getStats();

  console.log('\n' + TableUtils.color.bold('🔍 Command History Browser'));
  console.log('━'.repeat(70));
  console.log(`Total Commands: ${TableUtils.color.alice(stats.totalCommands.toString())}`);
  console.log(`Unique Commands: ${TableUtils.color.bob(stats.uniqueCommands.toString())}`);
  console.log(`Success Rate: ${TableUtils.color.dave(stats.successRate.toFixed(1))}%`);
  console.log(`Average Duration: ${TableUtils.color.carol(stats.averageDurationMs.toFixed(2))}ms`);
  console.log(`Memory: ${TableUtils.color.yellow(stats.memorySizeBytes.toLocaleString())} bytes`);
  console.log('');

  manager.displayHistory(30);
}

/**
 * Quick history search CLI
 */
export async function searchHistoryCLI(pattern: string, historyPath?: string): Promise<void> {
  const manager = new HistoryCLIManager(historyPath);
  await manager.load();

  const results = manager.searchHistory(pattern, 20);

  if (results.length === 0) {
    console.log(`No history entries matching: ${TableUtils.color.yellow(pattern)}`);
    return;
  }

  console.log(
    `\nFound ${TableUtils.color.alice(results.length.toString())} ` +
    `entries matching: ${TableUtils.color.cyan(pattern)}`
  );
  console.log('━'.repeat(70));

  results.forEach((entry, idx) => {
    console.log(`${String(idx + 1).padStart(2)}. ${manager.formatEntry(entry)}`);
  });

  console.log('');
}

// Codebase search using ripgrep MCP
export async function searchCodebaseCLI(query: string, options: {
  path?: string;
  type?: 'ts' | 'js' | 'md' | 'all';
  context?: number;
  maxResults?: number;
} = {}): Promise<void> {
  const { path = '.', type = 'ts', context = 2, maxResults = 10 } = options;

  console.log(`🔍 Searching codebase: ${TableUtils.color.cyan(query)}`);
  console.log(`   Path: ${TableUtils.color.yellow(path)}`);
  console.log(`   Type: ${TableUtils.color.green(type)}`);
  console.log(`   Context: ${context} lines`);
  console.log('━'.repeat(70));

  try {
    // Import ripgrep MCP dynamically to avoid circular dependencies
    const { RipgrepCodeSearch } = await import('../utils/codesearch.ts');
    const searcher = new RipgrepCodeSearch();

    const result = await searcher.search({
      query,
      path,
      type: type === 'all' ? 'all' : type,
      context,
      maxResults
    });

    if (result.matches.length === 0) {
      console.log(`\n❌ No matches found for: ${TableUtils.color.yellow(query)}`);
      return;
    }

    console.log(`\n🎯 Found ${TableUtils.color.alice(result.matches.length.toString())} matches ` +
                `in ${TableUtils.color.green(result.files.length.toString())} files`);
    console.log(`⚡ Search completed in ${TableUtils.color.cyan(result.stats.timeMs.toFixed(1) + 'ms')}`);

    result.matches.forEach((match, idx) => {
      console.log(`\n${String(idx + 1).padStart(2)}. ${TableUtils.color.cyan(match.file)}:${TableUtils.color.yellow(match.line.toString())}`);
      console.log(`   ${match.content}`);

      if (match.context.before.length > 0) {
        match.context.before.forEach(line => {
          console.log(`   ${TableUtils.color.gray('│')} ${line}`);
        });
      }

      if (match.context.after.length > 0) {
        match.context.after.forEach(line => {
          console.log(`   ${TableUtils.color.gray('│')} ${line}`);
        });
      }
    });

    console.log(`\n📊 Stats: ${result.stats.matchesFound} matches, ${result.stats.filesSearched} files searched`);

  } catch (error) {
    console.error(`❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('\n💡 Make sure MCP server is running: bun run mcp:start');
  }
}

// Enhanced CLI with both history and codebase search
export async function enhancedHistoryCLI(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log('🖥️  Enhanced HistoryCLI - Command History + Codebase Search');
    console.log('━'.repeat(70));
    console.log('');
    console.log('📋 Commands:');
    console.log('  history <pattern>     - Search command history');
    console.log('  search <query>        - Search codebase (TypeScript by default)');
    console.log('  search <query> --type=js    - Search JavaScript files');
    console.log('  search <query> --type=all   - Search all file types');
    console.log('  search <query> --path=src   - Search specific directory');
    console.log('');
    console.log('📖 Examples:');
    console.log('  history npm           - Find npm commands in history');
    console.log('  search Bun\\.Terminal     - Find Terminal usage in code');
    console.log('  search interface --type=ts - Find interfaces in TypeScript');
    console.log('  search TODO --type=md      - Find TODOs in markdown');
    return;
  }

  const command = args[0];
  const query = args.slice(1).join(' ');

  // Parse options from query
  const options: any = {};
  const cleanQuery = query.replace(/--(\w+)=([^ ]+)/g, (match, key, value) => {
    options[key] = value;
    return '';
  }).trim();

  if (command === 'history') {
    await searchHistoryCLI(cleanQuery);
  } else if (command === 'search') {
    await searchCodebaseCLI(cleanQuery, options);
  } else {
    // Default to codebase search for backward compatibility
    await searchCodebaseCLI([command, ...args.slice(1)].join(' '), options);
  }
}

// Demo if run directly
if (import.meta.main) {
  console.log('🖥️  Surgical Precision HistoryCLI Manager Demo');
  console.log('━'.repeat(70));
  console.log('');

  const manager = new HistoryCLIManager();
  await manager.load();

  console.log('✅ History loaded successfully');
  console.log('');

  // Show stats
  const stats = manager.getStats();
  console.log('📊 History Statistics:');
  console.log(`  • Total Commands: ${stats.totalCommands}`);
  console.log(`  • Unique Commands: ${stats.uniqueCommands}`);
  console.log(`  • Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`  • Avg Duration: ${stats.averageDurationMs.toFixed(2)}ms`);

  // Add sample entry
  manager.addEntry('ls -la', 0, 45, process.cwd());
  manager.addEntry('npm test', 0, 2500, process.cwd());
  console.log('\n✅ Sample entries added');

  // Get completions
  const completions = await manager.getCompletions('npm', 3, 'npm');
  console.log(`\n💡 Completions for 'npm': ${completions.suggestions.slice(0, 3).join(', ')}`);

  // Search history
  const searchResults = manager.searchHistory('npm');
  console.log(`\n🔍 Search results for 'npm': ${searchResults.length} found`);

   console.log('\n📋 Use Cases:');
   console.log('  • browseHistory() - Interactive history browser');
   console.log('  • searchHistoryCLI() - Command-line history search');
   console.log('  • searchCodebaseCLI() - Lightning-fast codebase search');
   console.log('  • enhancedHistoryCLI() - Unified history + codebase search');
   console.log('  • getCompletions() - Tab completion suggestions');
   console.log('  • verifyZeroCollateral() - State verification');
}

export default HistoryCLIManager;
