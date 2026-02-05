#!/usr/bin/env bun

/**
 * @fileoverview Advanced Path Resolution Utilities
 * @description High-performance path resolution using Bun APIs
 * @module path-resolver
 */

export class PathResolver {
  static resolve(specifier: string, from: string = import.meta.dir): string {
    try {
      return Bun.resolveSync(specifier, from);
    } catch (error) {
      throw new Error(`Cannot resolve "${specifier}" from "${from}"`);
    }
  }

  static resolveModule(name: string): string {
    // Try to resolve from current directory
    try {
      return this.resolve(name, import.meta.dir);
    } catch {
      // Try to resolve from project root
      try {
        return this.resolve(name, process.cwd());
      } catch {
        throw new Error(`Module "${name}" not found`);
      }
    }
  }

  static isFileURL(url: string): boolean {
    return url.startsWith('file://');
  }

  static toFileURL(path: string): URL {
    return Bun.pathToFileURL(path);
  }

  static fromFileURL(url: string | URL): string {
    return Bun.fileURLToPath(url);
  }

  static getRelativePath(from: string, to: string): string {
    const fromParts = from.split('/').filter(Boolean);
    const toParts = to.split('/').filter(Boolean);

    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
      i++;
    }

    const up = '../'.repeat(fromParts.length - i);
    const down = toParts.slice(i).join('/');

    return up + down || '.';
  }

  static normalizePath(path: string): string {
    // Remove redundant separators and resolve . and ..
    const parts = path.split('/').filter(Boolean);
    const normalized: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else if (part !== '.') {
        normalized.push(part);
      }
    }

    return '/' + normalized.join('/');
  }

  static joinPath(...parts: string[]): string {
    return parts
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/');
  }

  static dirname(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '.' : path.slice(0, lastSlash) || '/';
  }

  static basename(path: string, ext?: string): string {
    const base = path.split('/').pop() || '';
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  }

  static extname(path: string): string {
    const base = this.basename(path);
    const lastDot = base.lastIndexOf('.');
    return lastDot === -1 ? '' : base.slice(lastDot);
  }

  static isAbsolute(path: string): boolean {
    return path.startsWith('/');
  }

  static resolveAbsolute(...paths: string[]): string {
    let resolved = '';

    for (let i = paths.length - 1; i >= 0; i--) {
      const path = paths[i];
      if (!path) continue;

      resolved = path + '/' + resolved;

      if (this.isAbsolute(path)) {
        break;
      }
    }

    // Normalize the result
    return this.normalizePath(resolved);
  }

  static async findUp(filename: string, startDir: string = import.meta.dir): Promise<string | null> {
    let currentDir = startDir;

    while (true) {
      const filePath = this.joinPath(currentDir, filename);

      try {
        // Check if file exists (simple check)
        const stat = await Bun.file(filePath).exists();
        if (stat) {
          return filePath;
        }
      } catch {
        // File doesn't exist
      }

      const parentDir = this.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root
        break;
      }
      currentDir = parentDir;
    }

    return null;
  }

  static async findUpAsync(filename: string, startDir: string = import.meta.dir): Promise<string | null> {
    let currentDir = startDir;

    while (true) {
      const filePath = this.joinPath(currentDir, filename);

      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return filePath;
        }
      } catch {
        // File doesn't exist
      }

      const parentDir = this.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root
        break;
      }
      currentDir = parentDir;
    }

    return null;
  }

  static glob(pattern: string, options: {
    cwd?: string;
    absolute?: boolean;
    onlyFiles?: boolean;
    ignore?: string[];
  } = {}): string[] {
    const { cwd = import.meta.dir, absolute = false, ignore = [] } = options;

    try {
      // Use Bun.Glob for pattern matching
      const glob = new Bun.Glob(pattern);
      const results: string[] = [];

      for (const path of glob.scanSync({ cwd })) {
        let fullPath = absolute ? this.joinPath(cwd, path) : path;

        // Apply ignore patterns
        if (ignore.length > 0) {
          const shouldIgnore = ignore.some(ignorePattern => {
            if (ignorePattern.includes('*')) {
              // Simple glob matching
              const regex = new RegExp(ignorePattern.replace(/\*/g, '.*'));
              return regex.test(fullPath);
            }
            return fullPath.includes(ignorePattern);
          });

          if (shouldIgnore) continue;
        }

        results.push(fullPath);
      }

      return results;
    } catch (error) {
      console.warn(`Glob pattern "${pattern}" failed:`, error);
      return [];
    }
  }
}

/**
 * Executable finder with advanced features
 */
export class ExecutableFinder {
  static find(bin: string, options: {
    cwd?: string;
    PATH?: string;
    required?: boolean;
  } = {}): string | null {
    const path = Bun.which(bin, options);

    if (!path && options.required) {
      throw new Error(`Command "${bin}" not found in PATH`);
    }

    return path;
  }

  static async findWithFallback(bin: string, fallbacks: string[]): Promise<string> {
    for (const cmd of [bin, ...fallbacks]) {
      const path = this.find(cmd);
      if (path) return path;
    }

    throw new Error(`None of the commands found: ${[bin, ...fallbacks].join(', ')}`);
  }

  static getAvailableCommands(): Map<string, string> {
    const commands = new Map<string, string>();
    const paths = process.env.PATH?.split(':') || [];

    for (const pathDir of paths) {
      try {
        // Use a simple approach - check common executables
        const commonCommands = ['ls', 'cat', 'grep', 'find', 'node', 'bun', 'git'];
        for (const cmd of commonCommands) {
          const fullPath = PathResolver.joinPath(pathDir, cmd);
          if (!commands.has(cmd)) {
            commands.set(cmd, fullPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist or not readable
      }
    }

    return commands;
  }

  static async checkCommandExists(cmd: string): Promise<boolean> {
    try {
      const process = Bun.spawn([cmd, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const exitCode = await process.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  static getCommandInfo(cmd: string): {
    path: string | null;
    exists: boolean;
    version?: string;
  } {
    const path = this.find(cmd);
    const exists = path !== null;

    return {
      path,
      exists,
      version: exists ? this.getCommandVersion(cmd) : undefined
    };
  }

  private static getCommandVersion(cmd: string): string | undefined {
    try {
      const process = Bun.spawnSync([cmd, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      if (process.exitCode === 0) {
        const output = process.stdout.toString().trim();
        // Extract version from common patterns
        const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : output.split('\n')[0];
      }
    } catch {
      // Command failed
    }

    return undefined;
  }
}

// Demo function
async function demo() {
  console.log('📁 Advanced Path Resolution Demo\n');

  // 1. Basic path resolution
  console.log('Basic Path Resolution:');
  try {
    const resolved = PathResolver.resolve('./package.json');
    console.log('Resolved package.json:', resolved);
  } catch (error) {
    console.log('Resolution failed:', error instanceof Error ? error.message : String(error));
  }

  try {
    const modulePath = PathResolver.resolveModule('zod');
    console.log('Resolved zod module:', modulePath);
  } catch (error) {
    console.log('Module resolution failed:', error instanceof Error ? error.message : String(error));
  }
  console.log();

  // 2. URL conversions
  console.log('URL Conversions:');
  const fileURL = PathResolver.toFileURL('/tmp/test.txt');
  console.log('File URL:', fileURL.href);

  const filePath = PathResolver.fromFileURL(fileURL);
  console.log('File path:', filePath);
  console.log();

  // 3. Path operations
  console.log('Path Operations:');
  const testPath = '/home/user/projects/my-app/src/index.ts';
  console.log('Original path:', testPath);
  console.log('Directory:', PathResolver.dirname(testPath));
  console.log('Basename:', PathResolver.basename(testPath));
  console.log('Basename (no ext):', PathResolver.basename(testPath, '.ts'));
  console.log('Extension:', PathResolver.extname(testPath));
  console.log();

  // 4. Executable finding
  console.log('Executable Finding:');
  const lsPath = ExecutableFinder.find('ls');
  console.log('ls executable:', lsPath || 'not found');

  const nodePath = ExecutableFinder.find('node');
  console.log('node executable:', nodePath || 'not found');

  try {
    const pythonPath = await ExecutableFinder.findWithFallback('python3', ['python', 'py']);
    console.log('Python executable:', pythonPath);
  } catch (error) {
    console.log('Python not found:', error instanceof Error ? error.message : String(error));
  }
  console.log();

  // 5. Available commands
  console.log('Available Commands (first 10):');
  const commands = ExecutableFinder.getAvailableCommands();
  Array.from(commands.entries()).slice(0, 10).forEach(([name, path]) => {
    console.log(`  ${name}: ${path}`);
  });
  console.log(`  ... and ${commands.size - 10} more`);
  console.log();

  console.log('✨ Path resolution demo complete!');
}

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}