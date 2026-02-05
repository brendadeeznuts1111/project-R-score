#!/usr/bin/env bun

// [MCP][TOOLS][HEADER][HDR-001][v2.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-HD1][v2.0.0][ACTIVE]

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import crypto from 'crypto';

interface HeaderInfo {
  domain: string;
  type: string;
  scope?: string;
  id: string;
  version: string;
  status: string;
}

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  header?: HeaderInfo;
}

class HeaderGenerator {
  private static readonly DOMAINS = [
    'GOV', 'AGENT', 'DATAPIPE', 'TELEGRAM', 'MCP', 'GIT', 'DEPLOY',
    'SECURITY', 'MONITOR', 'BACKUP', 'UTILITIES', 'CONFIG'
  ];

  private static readonly TYPES = [
    'RULES', 'TOOLS', 'LIST', 'FULL', 'DASHBOARD', 'SCRIPT', 'COMMAND',
    'VALIDATION', 'GENERATOR', 'MANAGER', 'PIPELINE', 'SYNC'
  ];

  private static readonly SCOPES = [
    'GLOBAL', 'LOCAL', 'CORE', 'UTILITY', 'EXTERNAL', 'INTERNAL'
  ];

  private static readonly STATUSES = [
    'ACTIVE', 'STABLE', 'BETA', 'EXPERIMENTAL', 'DEPRECATED'
  ];

  static generateHeader(info: HeaderInfo): string {
    const { domain, type, scope = 'CORE', id, version, status } = info;

    // Validate inputs
    if (!this.DOMAINS.includes(domain)) {
      throw new Error(`Invalid domain: ${domain}. Must be one of: ${this.DOMAINS.join(', ')}`);
    }

    if (!this.TYPES.includes(type)) {
      throw new Error(`Invalid type: ${type}. Must be one of: ${this.TYPES.join(', ')}`);
    }

    if (!this.SCOPES.includes(scope)) {
      throw new Error(`Invalid scope: ${scope}. Must be one of: ${this.SCOPES.join(', ')}`);
    }

    if (!this.STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${this.STATUSES.join(', ')}`);
    }

    return `[${domain}][${type}][${scope}][${id}][${version}][${status}]`;
  }

  static generateId(prefix: string = '', length: number = 3): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3);
    const id = `${prefix}${timestamp.slice(-3)}${random}`.toUpperCase();
    return id;
  }

  static parseHeader(header: string): HeaderInfo | null {
    const match = header.match(/\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]/);

    if (!match) return null;

    const [, domain, type, scope, id, version, status] = match;

    return { domain, type, scope, id, version, status };
  }

  static validateHeader(header: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!header.startsWith('[') || !header.endsWith(']')) {
      errors.push('Header must be enclosed in brackets');
      return { valid: false, errors };
    }

    const parsed = this.parseHeader(header);
    if (!parsed) {
      errors.push('Invalid header format');
      return { valid: false, errors };
    }

    if (!this.DOMAINS.includes(parsed.domain)) {
      errors.push(`Invalid domain: ${parsed.domain}`);
    }

    if (!this.TYPES.includes(parsed.type)) {
      errors.push(`Invalid type: ${parsed.type}`);
    }

    if (!this.SCOPES.includes(parsed.scope)) {
      errors.push(`Invalid scope: ${parsed.scope}`);
    }

    if (!this.STATUSES.includes(parsed.status)) {
      errors.push(`Invalid status: ${parsed.status}`);
    }

    // Validate version format (should be semantic)
    const versionRegex = /^\d+\.\d+(?:\.\d+)?$/;
    if (!versionRegex.test(parsed.version)) {
      errors.push(`Invalid version format: ${parsed.version}. Should be semantic (e.g., 1.0.0)`);
    }

    return { valid: errors.length === 0, errors };
  }

  async validateFiles(path: string = '.'): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const files = this.getAllFiles(path);

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Look for header in first few lines
        let headerLine = '';
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i].trim();
          if (line.startsWith('[') && line.includes('][') && line.endsWith(']')) {
            headerLine = line;
            break;
          }
        }

        if (headerLine) {
          const validation = HeaderGenerator.validateHeader(headerLine);
          const header = HeaderGenerator.parseHeader(headerLine);

          results.push({
            file,
            valid: validation.valid,
            errors: validation.errors,
            header: header || undefined
          });
        } else {
          // File doesn't have a header
          results.push({
            file,
            valid: false,
            errors: ['Missing header'],
            header: undefined
          });
        }
      } catch (error) {
        results.push({
          file,
          valid: false,
          errors: [`Read error: ${error.message}`],
          header: undefined
        });
      }
    }

    return results;
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const items = readdirSync(dirPath);

      for (const item of items) {
        const fullPath = join(dirPath, item);

        // Skip certain directories
        if (['node_modules', '.git', 'dist', 'build'].includes(item)) {
          continue;
        }

        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...this.getAllFiles(fullPath));
          } else if (stat.isFile()) {
            // Only check relevant file types
            const ext = extname(item).toLowerCase();
            if (['.ts', '.js', '.md', '.json', '.yaml', '.yml'].includes(ext)) {
              files.push(fullPath);
            }
          }
        } catch {
          // Skip files that can't be stat'd
          continue;
        }
      }
    } catch {
      // Skip directories that can't be read
    }

    return files;
  }

  async addHeaderToFile(filePath: string, header: string): Promise<boolean> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check if file already has a header
      const firstLine = lines[0]?.trim() || '';
      if (firstLine.startsWith('[') && firstLine.includes('][')) {
        console.log(`File ${filePath} already has a header`);
        return false;
      }

      // Add header as first line
      const newContent = `${header}\n\n${content}`;
      writeFileSync(filePath, newContent);

      console.log(`Added header to ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Failed to add header to ${filePath}: ${error.message}`);
      return false;
    }
  }

  formatValidationResults(results: ValidationResult[]): string {
    let output = `Header Validation Results (${results.length} files):\n\n`;

    const valid = results.filter(r => r.valid);
    const invalid = results.filter(r => !r.valid);

    output += `✅ Valid: ${valid.length}\n`;
    output += `❌ Invalid: ${invalid.length}\n\n`;

    if (invalid.length > 0) {
      output += 'Invalid files:\n';
      for (const result of invalid) {
        output += `❌ ${result.file}\n`;
        for (const error of result.errors) {
          output += `   • ${error}\n`;
        }
        output += '\n';
      }
    }

    return output;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new HeaderGenerator();

  if (args.length === 0) {
    console.log(`🚀 Header Generator & Validator v2.0

USAGE:
  bun header generate <domain> <type> [scope] [status] [version]
  bun header validate [path]
  bun header add <file> <domain> <type> [scope] [status] [version]
  bun header parse <header>
  bun header id [prefix]

EXAMPLES:
  bun header generate GOV RULES CORE ACTIVE 2.9
  bun header validate scripts/
  bun header add newfile.ts MCP TOOLS CORE ACTIVE 1.0
  bun header parse "[GOV][RULES][CORE][GOV-001][2.9][ACTIVE]"
  bun header id RULE

DOMAINS: ${HeaderGenerator['DOMAINS'].join(', ')}
TYPES: ${HeaderGenerator['TYPES'].join(', ')}
SCOPES: ${HeaderGenerator['SCOPES'].join(', ')}
STATUSES: ${HeaderGenerator['STATUSES'].join(', ')}
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'generate':
        if (args.length < 3) {
          console.error('Usage: bun header generate <domain> <type> [scope] [status] [version]');
          process.exit(1);
        }

        const domain = args[1];
        const type = args[2];
        const scope = args[3] || 'CORE';
        const status = args[4] || 'ACTIVE';
        const version = args[5] || '1.0';

        const header = HeaderGenerator.generateHeader({ domain, type, scope, id: 'AUTO', version, status });
        console.log(header);
        break;

      case 'validate':
        const path = args[1] || '.';
        const results = await generator.validateFiles(path);
        console.log(generator.formatValidationResults(results));
        break;

      case 'add':
        if (args.length < 4) {
          console.error('Usage: bun header add <file> <domain> <type> [scope] [status] [version]');
          process.exit(1);
        }

        const filePath = args[1];
        const addDomain = args[2];
        const addType = args[3];
        const addScope = args[4] || 'CORE';
        const addStatus = args[5] || 'ACTIVE';
        const addVersion = args[6] || '1.0';

        const addHeader = HeaderGenerator.generateHeader({
          domain: addDomain,
          type: addType,
          scope: addScope,
          id: HeaderGenerator.generateId(),
          version: addVersion,
          status: addStatus
        });

        const success = await generator.addHeaderToFile(filePath, addHeader);
        if (success) {
          console.log(`✅ Header added to ${filePath}`);
        } else {
          console.log(`❌ Failed to add header to ${filePath}`);
          process.exit(1);
        }
        break;

      case 'parse':
        if (args.length < 2) {
          console.error('Usage: bun header parse <header>');
          process.exit(1);
        }

        const headerToParse = args[1];
        const parsed = HeaderGenerator.parseHeader(headerToParse);

        if (parsed) {
          console.log('Parsed header:');
          console.log(`  Domain: ${parsed.domain}`);
          console.log(`  Type: ${parsed.type}`);
          console.log(`  Scope: ${parsed.scope}`);
          console.log(`  ID: ${parsed.id}`);
          console.log(`  Version: ${parsed.version}`);
          console.log(`  Status: ${parsed.status}`);
        } else {
          console.log('❌ Invalid header format');
          process.exit(1);
        }
        break;

      case 'id':
        const prefix = args[1] || '';
        const id = HeaderGenerator.generateId(prefix);
        console.log(id);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun header --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
export { HeaderGenerator };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}