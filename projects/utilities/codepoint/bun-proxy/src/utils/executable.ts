// @bun/proxy/utils/executable.ts - Executable path detection utilities (Code Point: 0x700-0x70F)

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';

// Executable detection configuration
export interface ExecutableConfig {
  name: string;
  commonPaths: string[];
  envVar?: string;
  windowsName?: string;
  required?: boolean;
  versionCommand?: string;
  versionRegex?: RegExp;
}

// Common executable configurations
export const COMMON_EXECUTABLES: Record<string, ExecutableConfig> = {
  ffmpeg: {
    name: 'ffmpeg',
    commonPaths: [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'ffmpeg'
    ],
    envVar: 'FFMPEG_PATH',
    windowsName: 'ffmpeg.exe',
    versionCommand: 'ffmpeg -version',
    versionRegex: /ffmpeg version (\d+\.\d+\.\d+)/
  },

  ffprobe: {
    name: 'ffprobe',
    commonPaths: [
      '/usr/bin/ffprobe',
      '/usr/local/bin/ffprobe',
      '/opt/homebrew/bin/ffprobe',
      'C:\\ffmpeg\\bin\\ffprobe.exe',
      'ffprobe'
    ],
    envVar: 'FFPROBE_PATH',
    windowsName: 'ffprobe.exe',
    versionCommand: 'ffprobe -version',
    versionRegex: /ffprobe version (\d+\.\d+\.\d+)/
  },

  curl: {
    name: 'curl',
    commonPaths: [
      '/usr/bin/curl',
      '/usr/local/bin/curl',
      '/opt/homebrew/bin/curl',
      'C:\\Windows\\System32\\curl.exe',
      'curl'
    ],
    envVar: 'CURL_PATH',
    windowsName: 'curl.exe',
    versionCommand: 'curl --version',
    versionRegex: /curl (\d+\.\d+\.\d+)/
  },

  wget: {
    name: 'wget',
    commonPaths: [
      '/usr/bin/wget',
      '/usr/local/bin/wget',
      '/opt/homebrew/bin/wget',
      'C:\\Windows\\System32\\wget.exe',
      'wget'
    ],
    envVar: 'WGET_PATH',
    windowsName: 'wget.exe',
    versionCommand: 'wget --version',
    versionRegex: /GNU Wget (\d+\.\d+\.\d+)/
  },

  openssl: {
    name: 'openssl',
    commonPaths: [
      '/usr/bin/openssl',
      '/usr/local/bin/openssl',
      '/opt/homebrew/bin/openssl',
      'C:\\OpenSSL\\bin\\openssl.exe',
      'openssl'
    ],
    envVar: 'OPENSSL_PATH',
    windowsName: 'openssl.exe',
    versionCommand: 'openssl version',
    versionRegex: /OpenSSL (\d+\.\d+\.\d+)/
  },

  node: {
    name: 'node',
    commonPaths: [
      '/usr/bin/node',
      '/usr/local/bin/node',
      '/opt/homebrew/bin/node',
      'C:\\Program Files\\nodejs\\node.exe',
      'node'
    ],
    envVar: 'NODE_PATH',
    windowsName: 'node.exe',
    versionCommand: 'node --version',
    versionRegex: /v(\d+\.\d+\.\d+)/
  },

  bun: {
    name: 'bun',
    commonPaths: [
      '/usr/bin/bun',
      '/usr/local/bin/bun',
      '/opt/homebrew/bin/bun',
      'C:\\bun\\bin\\bun.exe',
      'bun'
    ],
    envVar: 'BUN_PATH',
    windowsName: 'bun.exe',
    versionCommand: 'bun --version',
    versionRegex: /(\d+\.\d+\.\d+)/
  }
};

// Executable information
export interface ExecutableInfo {
  name: string;
  path: string;
  version?: string;
  available: boolean;
  lastChecked: Date;
}

// Executable registry
class ExecutableRegistry {
  private static instance: ExecutableRegistry;
  private executables = new Map<string, ExecutableInfo>();
  private searchPaths: string[] = [];

  private constructor() {
    this.initializeSearchPaths();
  }

  static getInstance(): ExecutableRegistry {
    if (!ExecutableRegistry.instance) {
      ExecutableRegistry.instance = new ExecutableRegistry();
    }
    return ExecutableRegistry.instance;
  }

  private initializeSearchPaths(): void {
    // Add common system paths
    const commonPaths = [
      '/usr/bin',
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/usr/sbin',
      '/sbin'
    ];

    // Add Windows paths if on Windows
    if (process.platform === 'win32') {
      commonPaths.push(
        'C:\\Windows\\System32',
        'C:\\Windows',
        'C:\\Program Files\\nodejs',
        'C:\\Program Files (x86)\\nodejs'
      );
    }

    // Add PATH directories
    const pathEnv = process.env.PATH || process.env.Path || '';
    const pathDirs = pathEnv.split(process.platform === 'win32' ? ';' : ':');

    this.searchPaths = [...commonPaths, ...pathDirs];
  }

  // Find executable path using Bun's which-like functionality
  async findExecutable(name: string, config?: Partial<ExecutableConfig>): Promise<ExecutableInfo> {
    const cacheKey = name;
    const cached = this.executables.get(cacheKey);

    // Return cached result if recent (within 5 minutes)
    if (cached && (Date.now() - cached.lastChecked.getTime()) < 300000) {
      return cached;
    }

    const fullConfig = { ...COMMON_EXECUTABLES[name], ...config };
    if (!fullConfig) {
      return {
        name,
        path: '',
        available: false,
        lastChecked: new Date()
      };
    }

    let executablePath = '';

    // 1. Check environment variable
    if (fullConfig.envVar && process.env[fullConfig.envVar]) {
      executablePath = process.env[fullConfig.envVar]!;
      if (await this.verifyExecutable(executablePath, fullConfig)) {
        return this.createExecutableInfo(name, executablePath, fullConfig);
      }
    }

    // 2. Check common paths
    for (const path of fullConfig.commonPaths) {
      if (await this.verifyExecutable(path, fullConfig)) {
        executablePath = path;
        break;
      }
    }

    // 3. Search in PATH using which-like approach
    if (!executablePath) {
      executablePath = await this.searchInPath(name, fullConfig);
    }

    return this.createExecutableInfo(name, executablePath, fullConfig);
  }

  private async verifyExecutable(path: string, config: ExecutableConfig): Promise<boolean> {
    try {
      // Check if file exists
      if (!existsSync(path)) {
        return false;
      }

      // Try to execute version command
      if (config.versionCommand) {
        const result = await this.executeCommand(`${path} ${config.versionCommand.split(' ').slice(1).join(' ')}`);
        return result.success;
      }

      // Fallback: try to execute the binary directly
      const result = await this.executeCommand(`"${path}" --help`);
      return result.success || result.code === 1; // Some binaries return 1 for --help

    } catch (error) {
      return false;
    }
  }

  private async searchInPath(name: string, config: ExecutableConfig): Promise<string> {
    const searchName = process.platform === 'win32' && config.windowsName ? config.windowsName : name;

    for (const dir of this.searchPaths) {
      const fullPath = `${dir}/${searchName}`;

      if (await this.verifyExecutable(fullPath, config)) {
        return fullPath;
      }
    }

    return '';
  }

  private async createExecutableInfo(name: string, path: string, config: ExecutableConfig): Promise<ExecutableInfo> {
    const info: ExecutableInfo = {
      name,
      path,
      available: !!path,
      lastChecked: new Date()
    };

    // Get version if available
    if (path && config.versionCommand && config.versionRegex) {
      try {
        const result = await this.executeCommand(`"${path}" ${config.versionCommand.split(' ').slice(1).join(' ')}`);
        if (result.success && result.stdout) {
          const match = result.stdout.match(config.versionRegex);
          if (match) {
            info.version = match[1];
          }
        }
      } catch (error) {
        // Version detection failed, but executable is still available
      }
    }

    this.executables.set(name, info);
    return info;
  }

  private async executeCommand(command: string): Promise<{ success: boolean; code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      try {
        const result = execSync(command, {
          timeout: 5000,
          encoding: 'utf8',
          stdio: 'pipe'
        });

        resolve({
          success: true,
          code: 0,
          stdout: result.toString(),
          stderr: ''
        });
      } catch (error: any) {
        resolve({
          success: false,
          code: error.status || 1,
          stdout: error.stdout?.toString() || '',
          stderr: error.stderr?.toString() || ''
        });
      }
    });
  }

  // Get all detected executables
  getAllExecutables(): Map<string, ExecutableInfo> {
    return new Map(this.executables);
  }

  // Clear cache
  clearCache(): void {
    this.executables.clear();
  }
}

// Main API functions
export async function findExecutable(name: string, config?: Partial<ExecutableConfig>): Promise<ExecutableInfo> {
  const registry = ExecutableRegistry.getInstance();
  return registry.findExecutable(name, config);
}

export async function findExecutables(names: string[]): Promise<Map<string, ExecutableInfo>> {
  const registry = ExecutableRegistry.getInstance();
  const results = new Map<string, ExecutableInfo>();

  for (const name of names) {
    const info = await registry.findExecutable(name);
    results.set(name, info);
  }

  return results;
}

export async function checkSystemExecutables(): Promise<Map<string, ExecutableInfo>> {
  const executableNames = Object.keys(COMMON_EXECUTABLES);
  return findExecutables(executableNames);
}

export function getExecutableRegistry(): ExecutableRegistry {
  return ExecutableRegistry.getInstance();
}

// Utility functions for common operations
export async function hasExecutable(name: string): Promise<boolean> {
  const info = await findExecutable(name);
  return info.available;
}

export async function getExecutableVersion(name: string): Promise<string | undefined> {
  const info = await findExecutable(name);
  return info.version;
}

export async function getExecutablePath(name: string): Promise<string | undefined> {
  const info = await findExecutable(name);
  return info.available ? info.path : undefined;
}

// Export default
export default {
  findExecutable,
  findExecutables,
  checkSystemExecutables,
  hasExecutable,
  getExecutableVersion,
  getExecutablePath
};