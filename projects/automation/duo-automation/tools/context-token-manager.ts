#!/usr/bin/env bun

/**
 * Context Token Manager - Optimized for AI/LLM Context Retrieval
 * 
 * This utility manages project-scoped context tokens for optimal
 * AI context understanding and file organization.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ContextToken {
  token: string;
  paths: string[];
  priority: number;
  description: string;
  keywords: string[];
  context: string;
  parent?: string;
}

interface ContextConfig {
  version: string;
  project: string;
  tokens: Record<string, ContextToken>;
  mappings: {
    file_patterns: Record<string, string>;
    directory_patterns: Record<string, string>;
    context_rules: Record<string, string[]>;
  };
}

class ContextTokenManager {
  private config: ContextConfig;
  private configPath: string;

  constructor(configPath: string = '.context-tokens.json') {
    this.configPath = configPath;
    this.loadConfig();
  }

  private loadConfig(): void {
    if (!existsSync(this.configPath)) {
      throw new Error(`Context config not found: ${this.configPath}`);
    }
    
    const configData = readFileSync(this.configPath, 'utf-8');
    this.config = JSON.parse(configData);
  }

  /**
   * Get context token for a file path
   */
  public getTokenForPath(filePath: string): string | null {
    const normalizedPath = filePath.replace(/^\.?\//, '');
    
    // Check directory patterns
    for (const [pattern, token] of Object.entries(this.config.mappings.directory_patterns)) {
      if (normalizedPath.includes(pattern)) {
        return token;
      }
    }

    // Check file patterns
    const fileName = normalizedPath.split('/').pop() || '';
    for (const [pattern, token] of Object.entries(this.config.mappings.file_patterns)) {
      if (this.matchesPattern(fileName, pattern)) {
        return token;
      }
    }

    // Check token paths
    for (const [token, tokenConfig] of Object.entries(this.config.tokens)) {
      for (const path of tokenConfig.paths) {
        if (normalizedPath.startsWith(path.replace('@', ''))) {
          return token;
        }
      }
    }

    return null;
  }

  /**
   * Get related context tokens for a given token
   */
  public getRelatedTokens(token: string): string[] {
    const tokenConfig = this.config.tokens[token];
    if (!tokenConfig) return [];

    const related: string[] = [];

    // Add parent token
    if (tokenConfig.parent) {
      related.push(tokenConfig.parent);
    }

    // Add child tokens
    for (const [childToken, childConfig] of Object.entries(this.config.tokens)) {
      if (childConfig.parent === token) {
        related.push(childToken);
      }
    }

    // Add context rule tokens
    for (const [context, tokens] of Object.entries(this.config.mappings.context_rules)) {
      if (tokenConfig.keywords.includes(context)) {
        related.push(...tokens);
      }
    }

    return [...new Set(related)];
  }

  /**
   * Get context priority for sorting
   */
  public getTokenPriority(token: string): number {
    const tokenConfig = this.config.tokens[token];
    return tokenConfig?.priority || 999;
  }

  /**
   * Get all tokens sorted by priority
   */
  public getTokensByPriority(): string[] {
    return Object.keys(this.config.tokens)
      .sort((a, b) => this.getTokenPriority(a) - this.getTokenPriority(b));
  }

  /**
   * Generate context map for a directory
   */
  public generateContextMap(directory: string): Record<string, string[]> {
    const contextMap: Record<string, string[]> = {};

    // This would integrate with file system scanning
    // For now, return the token mapping
    for (const [token, config] of Object.entries(this.config.tokens)) {
      contextMap[token] = config.paths;
    }

    return contextMap;
  }

  /**
   * Optimize file paths for context retrieval
   */
  public optimizePathForContext(filePath: string): string {
    const token = this.getTokenForPath(filePath);
    if (!token) return filePath;

    const tokenConfig = this.config.tokens[token];
    if (!tokenConfig) return filePath;

    // Replace path with token-prefixed version
    for (const path of tokenConfig.paths) {
      if (filePath.includes(path)) {
        return filePath.replace(path, `${token}/`);
      }
    }

    return filePath;
  }

  /**
   * Get context description for token
   */
  public getTokenDescription(token: string): string {
    const tokenConfig = this.config.tokens[token];
    return tokenConfig?.description || '';
  }

  /**
   * Get keywords for token
   */
  public getTokenKeywords(token: string): string[] {
    const tokenConfig = this.config.tokens[token];
    return tokenConfig?.keywords || [];
  }

  /**
   * Check if file matches pattern
   */
  private matchesPattern(fileName: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`).test(fileName);
  }

  /**
   * Export context configuration for AI systems
   */
  public exportForAI(): string {
    const exportData = {
      tokens: this.config.tokens,
      mappings: this.config.mappings,
      priorities: this.getTokensByPriority(),
      context_rules: this.config.mappings.context_rules,
      optimization: this.config.optimization
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate TypeScript types for context tokens
   */
  public generateTypes(): string {
    const tokenTypes = Object.keys(this.config.tokens)
      .map(token => `  '${token}': string;`)
      .join('\n');

    return `
// Generated context token types
export interface ContextTokens {
${tokenTypes}
}

export interface ContextMapping {
  [key: string]: string[];
}

export const CONTEXT_TOKENS = ${JSON.stringify(this.config.tokens, null, 2)};
`;
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const manager = new ContextTokenManager();

  switch (command) {
    case 'export':
      console.log(manager.exportForAI());
      break;
    case 'types':
      console.log(manager.generateTypes());
      break;
    case 'map':
      const directory = process.argv[3] || '.';
      console.log(JSON.stringify(manager.generateContextMap(directory), null, 2));
      break;
    case 'token':
      const filePath = process.argv[3];
      if (filePath) {
        const token = manager.getTokenForPath(filePath);
        console.log(`Token for ${filePath}: ${token}`);
        if (token) {
          console.log(`Description: ${manager.getTokenDescription(token)}`);
          console.log(`Related: ${manager.getRelatedTokens(token).join(', ')}`);
        }
      }
      break;
    default:
      console.log(`
Context Token Manager CLI

Usage:
  context-tokens export     - Export configuration for AI systems
  context-tokens types      - Generate TypeScript types
  context-tokens map [dir]  - Generate context map for directory
  context-tokens token <file> - Get token for file path

Available tokens: ${manager.getTokensByPriority().join(', ')}
      `);
  }
}

export default ContextTokenManager;
