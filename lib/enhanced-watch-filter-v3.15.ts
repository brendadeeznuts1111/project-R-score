#!/usr/bin/env bun

/**
 * Enhanced Watch Filter Integration v3.15 - Official CLI Native
 * 
 * Integrates the watch engine with official Bun CLI patterns
 * using the native CLI integration for maximum compatibility
 */

import { executeBunCLI, parseOfficialFlags, BunCLIFlags, CLISession } from '../lib/bun-cli-native-v3.15';
import { createWatchSession, startWebSocketDashboard } from '../lib/watch-engine-v3.14';

// Enhanced watch-filter session with CLI integration
interface WatchFilterSession {
  id: string;
  cliSession: CLISession;
  watchSessionId?: string;
  pattern: string;
  script: string;
  startTime: number;
  status: 'initializing' | 'watching' | 'error' | 'stopped';
  lastActivity: number;
  restartCount: number;
  events: WatchEvent[];
}

interface WatchEvent {
  timestamp: number;
  type: 'file_change' | 'restart' | 'error' | 'filter_update';
  details: Record<string, any>;
}

const watchSessions = new Map<string, WatchFilterSession>();

// Color utilities
const c = {
  red: (s: string) => `\x1b[38;2;255;100;100m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;2;100;255;100m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[38;2;100;200;255m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[38;2;255;255;100m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[38;2;100;150;255m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[38;2;255;100;255m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[38;2;150;150;150m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Enhanced watch-filter with official CLI integration
 */
export async function startWatchFilterCLI(
  rawArgs: string[]
): Promise<WatchFilterSession> {
  const sessionId = crypto.randomUUID();
  const { flags, command, args } = parseOfficialFlags(rawArgs);
  
  // Ensure watch mode is enabled
  if (!flags.watch && !flags.hot) {
    flags.watch = true;
  }
  
  // Extract pattern and script from args
  const pattern = flags.filter || '*';
  const script = command || 'dev';
  
  console.log(c.bold('🚀 Enhanced Watch Filter CLI v3.15'));
  console.log(c.gray('Official Bun CLI integration with enhanced filtering\n'));
  
  // Create CLI session
  const cliSession = await executeBunCLI([
    '--filter', pattern,
    '--watch',
    ...(flags.hot ? ['--hot'] : []),
    ...(flags.smol ? ['--smol'] : []),
    ...(flags.noClear ? ['--no-clear'] : []),
    ...(flags.silent ? ['--silent'] : []),
    ...(flags.filterOutputLines ? ['--filter-output-lines', String(flags.filterOutputLines)] : []),
    ...(flags.parallel ? ['--parallel'] : []),
    ...(flags.sequential ? ['--sequential'] : []),
    ...(flags.continueOnError ? ['--continue-on-error'] : []),
    script,
    ...args
  ], { captureOutput: true });
  
  const watchSession: WatchFilterSession = {
    id: sessionId,
    cliSession,
    pattern,
    script,
    startTime: Date.now(),
    status: 'initializing',
    lastActivity: Date.now(),
    restartCount: 0,
    events: []
  };
  
  watchSessions.set(sessionId, watchSession);
  
  try {
    // Start enhanced watch session
    watchSession.watchSessionId = await createWatchSession(pattern, script, {
      debounceMs: 100,
      clearScreen: !flags.noClear,
      parallel: flags.parallel ?? true,
      maxRestarts: 10,
      healthCheckUrl: process.env.HEALTH_CHECK_URL,
      hotReload: flags.hot ?? false,
      smolMode: flags.smol ?? false,
      consoleDepth: 2
    });
    
    watchSession.status = 'watching';
    
    console.log(c.green(`✅ Watch filter session started: ${sessionId}`));
    console.log(c.cyan(`📋 Pattern: ${pattern} → Script: ${script}`));
    console.log(c.gray(`🔗 Dashboard: http://localhost:3001\n`));
    
    // Log initial event
    addWatchEvent(sessionId, 'filter_update', {
      pattern,
      script,
      flags,
      packages: 'discovering'
    });
    
  } catch (error) {
    watchSession.status = 'error';
    console.error(c.red(`❌ Failed to start watch session: ${error}`));
    addWatchEvent(sessionId, 'error', { error: String(error) });
  }
  
  return watchSession;
}

/**
 * Update watch filter pattern dynamically
 */
export async function updateWatchFilter(
  sessionId: string,
  newPattern: string,
  newFlags?: Partial<BunCLIFlags>
): Promise<void> {
  const session = watchSessions.get(sessionId);
  if (!session) {
    throw new Error(`Watch session not found: ${sessionId}`);
  }
  
  console.log(c.cyan(`\n🔄 Updating filter: ${session.pattern} → ${newPattern}`));
  
  // Stop current watch session
  if (session.watchSessionId) {
    // Note: In a real implementation, you'd stop the existing watch session
    // For now, we'll just update the pattern and restart
  }
  
  // Update pattern
  session.pattern = newPattern;
  session.lastActivity = Date.now();
  
  // Start new watch session with updated pattern
  try {
    session.watchSessionId = await createWatchSession(newPattern, session.script, {
      debounceMs: 100,
      clearScreen: true,
      parallel: newFlags?.parallel ?? true,
      maxRestarts: 10,
      healthCheckUrl: process.env.HEALTH_CHECK_URL,
      hotReload: newFlags?.hot ?? false,
      smolMode: newFlags?.smol ?? false
    });
    
    session.restartCount++;
    session.status = 'watching';
    
    addWatchEvent(sessionId, 'filter_update', {
      oldPattern: session.pattern,
      newPattern,
      restartCount: session.restartCount
    });
    
    console.log(c.green(`✅ Filter updated successfully`));
    
  } catch (error) {
    session.status = 'error';
    console.error(c.red(`❌ Failed to update filter: ${error}`));
    addWatchEvent(sessionId, 'error', { error: String(error) });
  }
}

/**
 * Get watch session statistics
 */
export function getWatchSessionStats(sessionId: string): {
  session: WatchFilterSession;
  cliSession: CLISession;
  uptime: number;
  eventSummary: Record<string, number>;
} | null {
  const session = watchSessions.get(sessionId);
  if (!session) return null;
  
  const eventSummary = session.events.reduce((summary, event) => {
    summary[event.type] = (summary[event.type] || 0) + 1;
    return summary;
  }, {} as Record<string, number>);
  
  return {
    session,
    cliSession: session.cliSession,
    uptime: Date.now() - session.startTime,
    eventSummary
  };
}

/**
 * List all active watch sessions
 */
export function listWatchSessions(): WatchFilterSession[] {
  return Array.from(watchSessions.values());
}

/**
 * Stop a watch session
 */
export async function stopWatchSession(sessionId: string): Promise<void> {
  const session = watchSessions.get(sessionId);
  if (!session) return;
  
  console.log(c.yellow(`🛑 Stopping watch session: ${sessionId}`));
  
  session.status = 'stopped';
  session.lastActivity = Date.now();
  
  // Add final event
  addWatchEvent(sessionId, 'restart', { 
    action: 'stopped',
    totalDuration: Date.now() - session.startTime
  });
  
  watchSessions.delete(sessionId);
  console.log(c.green(`✅ Watch session stopped`));
}

/**
 * Add event to watch session
 */
function addWatchEvent(sessionId: string, type: WatchEvent['type'], details: Record<string, any>): void {
  const session = watchSessions.get(sessionId);
  if (!session) return;
  
  const event: WatchEvent = {
    timestamp: Date.now(),
    type,
    details
  };
  
  session.events.push(event);
  session.lastActivity = Date.now();
  
  // Keep only last 100 events
  if (session.events.length > 100) {
    session.events = session.events.slice(-100);
  }
}

/**
 * Enhanced CLI runner with watch-filter integration
 */
export async function runWatchFilterCLI(args: string[]): Promise<void> {
  // Start WebSocket dashboard with port conflict handling
  try {
    startWebSocketDashboard(3001);
  } catch (error) {
    console.log(c.yellow('⚠️  Dashboard port 3001 in use, continuing without dashboard'));
  }
  
  // Parse arguments to check for help
  if (args.includes('--help') || args.includes('-h')) {
    showWatchFilterHelp();
    return;
  }
  
  try {
    // Start watch filter session
    const session = await startWatchFilterCLI(args);
    
    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log(c.yellow('\n\n🛑 Shutting down watch filter...'));
      await stopWatchSession(session.id);
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log(c.yellow('\n\n🛑 Shutting down watch filter...'));
      await stopWatchSession(session.id);
      process.exit(0);
    });
    
    // Keep process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error(c.red(`❌ Watch filter CLI failed: ${error}`));
    process.exit(1);
  }
}

/**
 * Show help for watch filter CLI
 */
function showWatchFilterHelp(): void {
  console.log(c.bold('🚀 Enhanced Watch Filter CLI v3.15 - Help\n'));
  
  console.log(c.cyan('USAGE:'));
  console.log('  bun watch-filter [options] <script> [args...]\n');
  
  console.log(c.cyan('OPTIONS:'));
  console.log('  ' + c.yellow('--filter, -F <pattern>') + '     Filter packages by glob pattern');
  console.log('  ' + c.yellow('--filter-output-lines <n>') + ' Limit output lines per package (default: 10)');
  console.log('  ' + c.yellow('--ws') + '                       Run in all workspaces');
  console.log('  ' + c.yellow('--parallel') + '                 Run packages in parallel (default)');
  console.log('  ' + c.yellow('--sequential') + '               Run packages sequentially');
  console.log('  ' + c.yellow('--continue-on-error') + '         Continue on error');
  console.log('  ' + c.yellow('--watch') + '                    Enable watch mode');
  console.log('  ' + c.yellow('--hot') + '                      Enable hot reload');
  console.log('  ' + c.yellow('--no-clear') + '                 Don\'t clear screen on restart');
  console.log('  ' + c.yellow('--smol') + '                     Use memory-optimized mode');
  console.log('  ' + c.yellow('--silent') + '                   Suppress output');
  console.log('  ' + c.yellow('--help, -h') + '                 Show this help\n');
  
  console.log(c.cyan('EXAMPLES:'));
  console.log('  ' + c.gray('# Watch all packages with dev script'));
  console.log('  ' + c.green('bun watch-filter --filter "*" dev'));
  console.log('');
  console.log('  ' + c.gray('# Watch API packages with limited output'));
  console.log('  ' + c.green('bun watch-filter --filter "api-*" --filter-output-lines 5 dev'));
  console.log('');
  console.log('  ' + c.gray('# Hot reload for UI packages'));
  console.log('  ' + c.green('bun watch-filter --filter "ui-*" --hot storybook'));
  console.log('');
  console.log('  ' + c.gray('# Memory-optimized watching'));
  console.log('  ' + c.green('bun watch-filter --filter "worker-*" --smol start'));
  console.log('');
  console.log('  ' + c.gray('# Sequential execution with continue on error'));
  console.log('  ' + c.green('bun watch-filter --filter "test-*" --sequential --continue-on-error test'));
  console.log('');
  
  console.log(c.cyan('DASHBOARD:'));
  console.log('  ' + c.blue('http://localhost:3001') + ' - Real-time monitoring dashboard\n');
  
  console.log(c.gray('For more information, visit: https://bun.com/docs/runtime'));
}

// Auto-run if this is the main module
if (process.argv[1] && process.argv[1].endsWith('enhanced-watch-filter-v3.15.ts')) {
  runWatchFilterCLI(process.argv.slice(2)).catch(console.error);
}
