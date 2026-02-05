#!/usr/bin/env bun

// [UTILITIES][TOOLS][GREP][GREP-001][v3.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-GR1][v3.0.0][ACTIVE]

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

interface GrepResult {
  file: string;
  line: number;
  content: string;
  context: string[];
}

class GrepAssistant {
  private static readonly patterns: Record<string, string> = {
    // Domain-based searches
    "setup": `[SETUP]`,
    "config": `[CONFIG]`,
    "code": `[CODE]`,
    "deploy": `[DEPLOY]`,
    "usage": `[USAGE]`,
    "monitor": `[MONITOR]`,
    "extend": `[EXTEND]`,
    "arch": `[ARCHITECTURE]`,

    // Importance-based searches
    "required": `[REQUIRED]`,
    "optional": `[OPTIONAL]`,
    "advanced": `[ADVANCED]`,
    "core": `[CORE]`,
    "meta": `[META]`,

    // Type-based searches
    "guide": `[GUIDE]`,
    "implementation": `[IMPLEMENTATION]`,
    "response": `[RESPONSE]`,

    // Combined shortcuts
    "setup-required": `[SETUP][REQUIRED]`,
    "code-core": `[CODE][CORE]`,
    "code-impl": `[CODE][CORE][IMPLEMENTATION]`,
    "deploy-optional": `[DEPLOY].*[OPTIONAL]`,
    "deploy-required": `[DEPLOY].*[REQUIRED]`,
    "monitor-advanced": `[MONITOR][ADVANCED]`,
    "extend-advanced": `[EXTEND][ADVANCED]`,
    "usage-core": `[USAGE][CORE]`,
    "usage-guide": `[USAGE][GUIDE]`,

    // Special queries
    "all-code": `[CODE].*[CODE]`,
    "all-guides": `.*[GUIDE]`,
    "all-advanced": `.*[ADVANCED]`,
    "production": `[DEPLOY][PRODUCTION]`,
    "health": `[MONITOR][HEALTH]`,
    "connections": `[EXTEND][CONNECTIONS]`,
    "commands": `[USAGE][COMMANDS]`
  };

  static suggest(query: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const pattern = this.patterns[normalizedQuery];

    if (pattern) {
      return `grep "${pattern}" guide.md`;
    }

    // Try fuzzy matching for partial matches
    const matches = Object.keys(this.patterns)
      .filter(key => key.includes(normalizedQuery) || normalizedQuery.includes(key))
      .map(key => ({ key, pattern: this.patterns[key] }));

    if (matches.length === 1) {
      return `grep "${matches[0].pattern}" guide.md`;
    }

    if (matches.length > 1) {
      return `Multiple matches found:\n${matches
        .map(({ key, pattern }) => `  ${key}: grep "${pattern}" guide.md`)
        .join('\n')}`;
    }

    // Fallback to direct query
    return `grep "${query}" guide.md`;
  }

  static list(): string {
    const categories = {
      "Domain Searches": ["setup", "config", "code", "deploy", "usage", "monitor", "extend", "arch"],
      "Importance Levels": ["required", "optional", "advanced", "core", "meta"],
      "Content Types": ["guide", "implementation", "response"],
      "Combined Shortcuts": ["setup-required", "code-core", "code-impl", "deploy-optional", "deploy-required", "monitor-advanced", "extend-advanced", "usage-core", "usage-guide"],
      "Special Queries": ["all-code", "all-guides", "all-advanced", "production", "health", "connections", "commands"]
    };

    let output = "Available GrepAssistant patterns:\n\n";

    for (const [category, patterns] of Object.entries(categories)) {
      output += `${category}:\n`;
      for (const pattern of patterns) {
        output += `  ${pattern} → ${this.patterns[pattern]}\n`;
      }
      output += "\n";
    }

    output += "Usage: bun grep <pattern>\n";
    output += "Example: bun grep setup-required\n";
    return output;
  }

  async search(query: string, path: string = '.', fzf: boolean = false): Promise<GrepResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    let searchPattern = query;

    // Check if it's a known pattern
    if (this.patterns[normalizedQuery]) {
      searchPattern = this.patterns[normalizedQuery];
    }

    const results: GrepResult[] = [];

    try {
      // Get all files recursively
      const files = this.getAllFiles(path);

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(searchPattern.toLowerCase())) {
              // Security check - redact sensitive data
              const redactedLine = this.redactSensitive(line);

              // Get context (3 lines before and after)
              const context = [];
              for (let i = Math.max(0, index - 3); i <= Math.min(lines.length - 1, index + 3); i++) {
                if (i !== index) {
                  context.push(this.redactSensitive(lines[i]));
                }
              }

              results.push({
                file,
                line: index + 1,
                content: redactedLine,
                context
              });
            }
          });
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    } catch (error) {
      console.error(`Search error: ${error.message}`);
    }

    if (fzf && results.length > 0) {
      return this.fzfSelect(results);
    }

    return results;
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const items = readdirSync(dirPath);

      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other ignored directories
          if (!['node_modules', '.git', 'logs', 'dist'].includes(item)) {
            files.push(...this.getAllFiles(fullPath));
          }
        } else if (stat.isFile()) {
          // Only include text files
          const ext = extname(item).toLowerCase();
          if (['.md', '.txt', '.ts', '.js', '.json', '.yaml', '.yml'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return files;
  }

  private redactSensitive(line: string): string {
    // Redact cookies, API keys, secrets, etc.
    return line
      .replace(/cookie\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, 'cookie: [REDACTED]')
      .replace(/api[_-]?key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, 'api_key: [REDACTED]')
      .replace(/secret\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, 'secret: [REDACTED]')
      .replace(/token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, 'token: [REDACTED]')
      .replace(/password\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, 'password: [REDACTED]');
  }

  private async fzfSelect(results: GrepResult[]): Promise<GrepResult[]> {
    // For now, return top 10 results. In a real implementation,
    // this would launch fzf for interactive selection
    return results.slice(0, 10);
  }

  formatResults(results: GrepResult[], maxResults: number = 20): string {
    if (results.length === 0) {
      return 'No results found.';
    }

    const limited = results.slice(0, maxResults);
    let output = `Found ${results.length} results (${limited.length} shown):\n\n`;

    for (const result of limited) {
      output += `${result.file}:${result.line}\n`;
      output += `  ${result.content}\n`;

      if (result.context.length > 0) {
        output += `  ${result.context.join('\n  ')}\n`;
      }

      output += '\n';
    }

    if (results.length > maxResults) {
      output += `... and ${results.length - maxResults} more results.\n`;
    }

    return output;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(GrepAssistant.list());
    return;
  }

  const command = args[0];
  const assistant = new GrepAssistant();

  switch (command) {
    case 'suggest':
      if (args.length < 2) {
        console.error('Usage: bun grep suggest <query>');
        process.exit(1);
      }
      console.log(GrepAssistant.suggest(args[1]));
      break;

    case 'list':
      console.log(GrepAssistant.list());
      break;

    default:
      // Treat as search query
      const query = command;
      const path = args[1] || '.';
      const fzf = args.includes('--fzf');

      try {
        const results = await assistant.search(query, path, fzf);
        console.log(assistant.formatResults(results));
      } catch (error) {
        console.error(`Search failed: ${error.message}`);
        process.exit(1);
      }
      break;
  }
}

// Export for use in other scripts
export { GrepAssistant };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
