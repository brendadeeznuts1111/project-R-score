/**
 * Component #62: Bun-List-Alias
 * Logic Tier: Level 3 (CLI)
 * Resource Tax: I/O <1ms
 * Parity Lock: 9i0j...1k2l
 * Protocol: bun pm ls
 *
 * Alias for dependency tree inspection.
 * Maps `bun list` to `bun pm ls` for convenience.
 *
 * @module infrastructure/bun-list-alias
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Alias command mappings
 */
export const ALIAS_COMMANDS = {
  'bun list': 'bun pm ls',
  'bun list --all': 'bun pm ls --all',
  'bun list --depth=0': 'bun pm ls --depth=0',
  'bun list --depth=1': 'bun pm ls --depth=1',
  'bun list --json': 'bun pm ls --json',
  'bun list --dev': 'bun pm ls --dev',
  'bun list --prod': 'bun pm ls --prod',
} as const;

export type AliasCommand = keyof typeof ALIAS_COMMANDS;

/**
 * Parsed command result
 */
export interface ParsedCommand {
  command: string;
  args: string[];
  wasAliased: boolean;
  originalCommand?: string;
}

/**
 * Alias resolution result
 */
export interface AliasResult {
  resolved: boolean;
  original: string;
  target: string;
  args: string[];
}

/**
 * Bun List Alias for CLI convenience
 * Provides shortcuts for common package manager commands
 */
export class BunListAlias {
  private static aliasUsageCount = new Map<string, number>();

  /**
   * Execute alias resolution
   */
  static executeAlias(args: string[]): ParsedCommand {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      return { command: 'bun', args, wasAliased: false };
    }

    const fullCommand = ['bun', ...args].join(' ');

    // Check for exact alias match
    for (const [alias, realCommand] of Object.entries(ALIAS_COMMANDS)) {
      if (fullCommand === alias || fullCommand.startsWith(alias + ' ')) {
        // Extract additional args beyond the alias
        const extraArgs = fullCommand.slice(alias.length).trim();
        const parsedReal = this.parseCommand(realCommand);

        if (extraArgs) {
          parsedReal.args.push(...extraArgs.split(' ').filter(Boolean));
        }

        // Track usage
        this.trackAliasUsage(alias);

        // Log alias resolution
        this.logAliasUsage(alias, realCommand);

        return {
          ...parsedReal,
          wasAliased: true,
          originalCommand: fullCommand,
        };
      }
    }

    // No alias match
    return { command: 'bun', args, wasAliased: false };
  }

  /**
   * Resolve alias to target command
   */
  static resolveAlias(alias: string): AliasResult {
    // Normalize input
    const normalized = alias.trim().toLowerCase();

    // Check if it's a known alias
    for (const [key, value] of Object.entries(ALIAS_COMMANDS)) {
      if (normalized === key.toLowerCase() || normalized.startsWith(key.toLowerCase() + ' ')) {
        const extraArgs = normalized.slice(key.length).trim();
        const parsed = this.parseCommand(value);

        return {
          resolved: true,
          original: alias,
          target: value,
          args: extraArgs ? [...parsed.args, ...extraArgs.split(' ')] : parsed.args,
        };
      }
    }

    return {
      resolved: false,
      original: alias,
      target: alias,
      args: [],
    };
  }

  /**
   * Check if command is an alias
   */
  static isAlias(command: string): boolean {
    const normalized = command.trim().toLowerCase();
    return Object.keys(ALIAS_COMMANDS).some(
      alias => normalized === alias.toLowerCase() || normalized.startsWith(alias.toLowerCase() + ' ')
    );
  }

  /**
   * Get all available aliases
   */
  static getAliases(): Record<string, string> {
    return { ...ALIAS_COMMANDS };
  }

  /**
   * Get alias usage statistics
   */
  static getUsageStats(): Map<string, number> {
    return new Map(this.aliasUsageCount);
  }

  /**
   * Get most used alias
   */
  static getMostUsedAlias(): { alias: string; count: number } | null {
    let maxAlias = '';
    let maxCount = 0;

    for (const [alias, count] of this.aliasUsageCount) {
      if (count > maxCount) {
        maxCount = count;
        maxAlias = alias;
      }
    }

    return maxAlias ? { alias: maxAlias, count: maxCount } : null;
  }

  /**
   * Parse command string into parts
   */
  private static parseCommand(cmd: string): ParsedCommand {
    const parts = cmd.split(' ').filter(Boolean);
    return {
      command: parts[0] || 'bun',
      args: parts.slice(1),
      wasAliased: false,
    };
  }

  /**
   * Track alias usage
   */
  private static trackAliasUsage(alias: string): void {
    const current = this.aliasUsageCount.get(alias) || 0;
    this.aliasUsageCount.set(alias, current + 1);
  }

  /**
   * Log alias usage for audit
   */
  private static logAliasUsage(alias: string, resolved: string): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) return;

    console.debug('[BunListAlias]', {
      component: 62,
      alias,
      resolved,
      usageCount: this.aliasUsageCount.get(alias),
      timestamp: Date.now(),
    });
  }

  /**
   * Reset usage statistics (for testing)
   */
  static resetStats(): void {
    this.aliasUsageCount.clear();
  }
}

/**
 * Zero-cost exports
 */
export const executeAlias = isFeatureEnabled('CATALOG_RESOLUTION')
  ? BunListAlias.executeAlias.bind(BunListAlias)
  : (args: string[]) => ({ command: 'bun', args, wasAliased: false });

export const resolveAlias = isFeatureEnabled('CATALOG_RESOLUTION')
  ? BunListAlias.resolveAlias.bind(BunListAlias)
  : (alias: string) => ({ resolved: false, original: alias, target: alias, args: [] });

export const isAlias = BunListAlias.isAlias.bind(BunListAlias);
export const getAliases = BunListAlias.getAliases.bind(BunListAlias);
export const getAliasUsageStats = BunListAlias.getUsageStats.bind(BunListAlias);
