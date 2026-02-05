/**
 * Shell Utilities
 * Bun shell API wrapper for CLI operations
 */

import { $ } from 'bun';

export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ShellOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  verbose?: boolean;
}

/**
 * Execute a shell command using Bun's native shell API
 */
export async function executeCommand(
  command: string,
  options: ShellOptions = {}
): Promise<ShellResult> {
  const { cwd, env, timeout, verbose } = options;

  if (verbose) {
    console.log(`🔧 Executing: ${command}`);
  }

  try {
    const result = await $`${command}`.cwd(cwd || process.cwd());

    if (verbose) {
      console.log(`✅ Command succeeded`);
    }

    return {
      success: true,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: 0,
    };
  } catch (error: any) {
    if (verbose) {
      console.error(`❌ Command failed: ${error.message}`);
    }

    return {
      success: false,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message,
      exitCode: error.exitCode || 1,
    };
  }
}

/**
 * Run multiple commands in sequence
 */
export async function executeSequence(
  commands: string[],
  options: ShellOptions = {}
): Promise<ShellResult[]> {
  const results: ShellResult[] = [];

  for (const command of commands) {
    const result = await executeCommand(command, options);
    results.push(result);

    if (!result.success && options.verbose) {
      console.warn(`⚠️ Command failed, continuing...`);
    }
  }

  return results;
}

/**
 * Run commands in parallel
 */
export async function executeParallel(
  commands: string[],
  options: ShellOptions = {}
): Promise<ShellResult[]> {
  return Promise.all(
    commands.map(cmd => executeCommand(cmd, options))
  );
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const result = await executeCommand(`which ${command}`);
  return result.success;
}

/**
 * Get file size in human-readable format
 */
export async function getFileSize(filePath: string): Promise<string> {
  const result = await executeCommand(`du -h "${filePath}"`);
  if (result.success) {
    return result.stdout.split('\t')[0];
  }
  return 'unknown';
}

/**
 * Count lines of code in a file or directory
 */
export async function countLines(path: string): Promise<number> {
  const result = await executeCommand(`find "${path}" -type f -name "*.ts" -o -name "*.js" | xargs wc -l | tail -1`);
  if (result.success) {
    const match = result.stdout.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
}

/**
 * Create a directory structure
 */
export async function createDirectories(paths: string[]): Promise<ShellResult> {
  const command = `mkdir -p ${paths.map(p => `"${p}"`).join(' ')}`;
  return executeCommand(command, { verbose: true });
}

/**
 * Copy files with progress
 */
export async function copyFiles(
  source: string,
  destination: string,
  options: ShellOptions = {}
): Promise<ShellResult> {
  const command = `cp -r "${source}" "${destination}"`;
  return executeCommand(command, { ...options, verbose: true });
}

/**
 * Remove files/directories
 */
export async function removeFiles(paths: string[]): Promise<ShellResult> {
  const command = `rm -rf ${paths.map(p => `"${p}"`).join(' ')}`;
  return executeCommand(command, { verbose: true });
}

/**
 * List files in directory
 */
export async function listFiles(
  directory: string,
  options: { recursive?: boolean; pattern?: string } = {}
): Promise<string[]> {
  const { recursive, pattern } = options;
  let command = `find "${directory}"`;

  if (!recursive) {
    command += ` -maxdepth 1`;
  }

  if (pattern) {
    command += ` -name "${pattern}"`;
  }

  const result = await executeCommand(command);
  if (result.success) {
    return result.stdout
      .split('\n')
      .filter(line => line.trim().length > 0);
  }
  return [];
}

/**
 * Search for text in files
 */
export async function searchInFiles(
  pattern: string,
  directory: string,
  options: { recursive?: boolean; caseSensitive?: boolean } = {}
): Promise<string[]> {
  const { recursive, caseSensitive } = options;
  let command = `grep ${caseSensitive ? '' : '-i'} ${recursive ? '-r' : ''} "${pattern}" "${directory}"`;

  const result = await executeCommand(command);
  if (result.success) {
    return result.stdout
      .split('\n')
      .filter(line => line.trim().length > 0);
  }
  return [];
}

/**
 * Get git status
 */
export async function getGitStatus(): Promise<string> {
  const result = await executeCommand('git status --short');
  return result.stdout;
}

/**
 * Get git log
 */
export async function getGitLog(limit: number = 10): Promise<string> {
  const result = await executeCommand(`git log --oneline -${limit}`);
  return result.stdout;
}

/**
 * Run git command
 */
export async function runGitCommand(command: string): Promise<ShellResult> {
  return executeCommand(`git ${command}`, { verbose: true });
}

/**
 * Install dependencies
 */
export async function installDependencies(
  packageManager: 'bun' | 'npm' | 'yarn' = 'bun'
): Promise<ShellResult> {
  const commands: Record<string, string> = {
    bun: 'bun install',
    npm: 'npm install',
    yarn: 'yarn install',
  };

  return executeCommand(commands[packageManager], { verbose: true });
}

/**
 * Run build command
 */
export async function runBuild(buildCommand: string = 'bun run build'): Promise<ShellResult> {
  return executeCommand(buildCommand, { verbose: true });
}

/**
 * Run tests
 */
export async function runTests(testCommand: string = 'bun test'): Promise<ShellResult> {
  return executeCommand(testCommand, { verbose: true });
}

/**
 * Format code with prettier
 */
export async function formatCode(paths: string[]): Promise<ShellResult> {
  const command = `prettier --write ${paths.map(p => `"${p}"`).join(' ')}`;
  return executeCommand(command, { verbose: true });
}

/**
 * Lint code with eslint
 */
export async function lintCode(paths: string[]): Promise<ShellResult> {
  const command = `eslint ${paths.map(p => `"${p}"`).join(' ')}`;
  return executeCommand(command, { verbose: true });
}

/**
 * Check TypeScript
 */
export async function checkTypeScript(path: string = '.'): Promise<ShellResult> {
  return executeCommand(`tsc --noEmit "${path}"`, { verbose: true });
}

/**
 * Deploy application
 */
export async function deploy(deployCommand: string): Promise<ShellResult> {
  return executeCommand(deployCommand, { verbose: true });
}

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<Record<string, string>> {
  const info: Record<string, string> = {};

  const osResult = await executeCommand('uname -s');
  info.os = osResult.stdout.trim();

  const archResult = await executeCommand('uname -m');
  info.arch = archResult.stdout.trim();

  const nodeResult = await executeCommand('node --version');
  info.node = nodeResult.stdout.trim();

  const bunResult = await executeCommand('bun --version');
  info.bun = bunResult.stdout.trim();

  return info;
}

/**
 * Monitor file changes
 */
export async function watchFiles(
  pattern: string,
  callback: (files: string[]) => Promise<void>
): Promise<void> {
  const result = await executeCommand(`find "${pattern}" -type f`);
  if (result.success) {
    const files = result.stdout.split('\n').filter(f => f.trim());
    await callback(files);
  }
}

export default {
  executeCommand,
  executeSequence,
  executeParallel,
  commandExists,
  getFileSize,
  countLines,
  createDirectories,
  copyFiles,
  removeFiles,
  listFiles,
  searchInFiles,
  getGitStatus,
  getGitLog,
  runGitCommand,
  installDependencies,
  runBuild,
  runTests,
  formatCode,
  lintCode,
  checkTypeScript,
  deploy,
  getSystemInfo,
  watchFiles,
};

