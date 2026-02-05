#!/usr/bin/env bun

// [AUDIT][LOGGING][IMMUTABLE][AUDIT-LOG-001][v2.11][ACTIVE]

import { readFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

interface AuditEntry {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  ip?: string;
  userAgent?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: any;
  hash: string; // For immutability
}

export class AuditLogger {
  private logFile = 'logs/audit/audit.log';
  private hashChain: string[] = [];
  private lastHash = '';

  constructor() {
    this.initializeLogFile();
    this.loadHashChain();
  }

  private initializeLogFile(): void {
    const logDir = join(process.cwd(), 'logs', 'audit');
    if (!existsSync(logDir)) {
      Bun.$`mkdir -p ${logDir}`.quiet();
    }

    if (!existsSync(this.logFile)) {
      appendFileSync(this.logFile, '# Syndicate Audit Log v2.11\n');
      appendFileSync(this.logFile, '# Format: timestamp|user|action|resource|ip|result|hash\n');
    }
  }

  private loadHashChain(): void {
    if (existsSync(this.logFile)) {
      try {
        const content = readFileSync(this.logFile, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        for (const line of lines) {
          const parts = line.split('|');
          if (parts.length >= 7) {
            this.hashChain.push(parts[6]);
          }
        }

        this.lastHash = this.hashChain[this.hashChain.length - 1] || '';
      } catch (error) {
        console.error('Failed to load hash chain:', error);
      }
    }
  }

  async logAccess(entry: Omit<AuditEntry, 'hash' | 'timestamp'>): Promise<void> {
    const timestamp = new Date().toISOString();
    const entryData = { timestamp, ...entry };

    // Create hash chain
    const dataString = JSON.stringify(entryData);
    const hash = crypto.createHash('sha256')
      .update(this.lastHash + dataString)
      .digest('hex');

    const auditEntry: AuditEntry = { ...entryData, hash };

    // Append to log file
    const logLine = `${auditEntry.timestamp}|${auditEntry.userId}|${auditEntry.action}|${auditEntry.resource}|${auditEntry.ip || ''}|${auditEntry.result}|${auditEntry.hash}\n`;
    appendFileSync(this.logFile, logLine);

    // Update hash chain
    this.hashChain.push(hash);
    this.lastHash = hash;

    // Log to console for immediate visibility
    const status = auditEntry.result === 'SUCCESS' ? '✅' : auditEntry.result === 'FAILURE' ? '❌' : '🚫';
    console.log(`${status} AUDIT: ${auditEntry.userId} ${auditEntry.action} ${auditEntry.resource} (${auditEntry.result})`);
  }

  verifyLogIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    let currentHash = '';

    if (!existsSync(this.logFile)) {
      return { valid: false, issues: ['Log file does not exist'] };
    }

    try {
      const content = readFileSync(this.logFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('|');
        if (parts.length < 7) continue;

        const [timestamp, userId, action, resource, ip, result, storedHash] = parts;

        // Recalculate hash
        const entryData = { timestamp, userId, action, resource, ip: ip || undefined, result: result as any };
        const calculatedHash = crypto.createHash('sha256')
          .update(currentHash + JSON.stringify(entryData))
          .digest('hex');

        if (calculatedHash !== storedHash) {
          issues.push(`Hash mismatch at line ${i + 1}: expected ${calculatedHash}, got ${storedHash}`);
        }

        currentHash = storedHash;
      }

      return { valid: issues.length === 0, issues };
    } catch (error) {
      return { valid: false, issues: [`Error reading log: ${error.message}`] };
    }
  }

  getRecentEntries(limit: number = 10): AuditEntry[] {
    if (!existsSync(this.logFile)) return [];

    try {
      const content = readFileSync(this.logFile, 'utf-8');
      const lines = content.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .slice(-limit);

      return lines.map(line => {
        const [timestamp, userId, action, resource, ip, result, hash] = line.split('|');
        return {
          timestamp,
          userId,
          action,
          resource,
          ip: ip || undefined,
          result: result as any,
          hash
        };
      });
    } catch {
      return [];
    }
  }

  searchEntries(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    result?: string;
    since?: Date;
  }): AuditEntry[] {
    const entries = this.getRecentEntries(1000); // Get last 1000 entries

    return entries.filter(entry => {
      if (filters.userId && !entry.userId.includes(filters.userId)) return false;
      if (filters.action && !entry.action.includes(filters.action)) return false;
      if (filters.resource && !entry.resource.includes(filters.resource)) return false;
      if (filters.result && entry.result !== filters.result) return false;
      if (filters.since && new Date(entry.timestamp) < filters.since) return false;
      return true;
    });
  }

  generateReport(since?: Date): string {
    const entries = since ? this.searchEntries({ since }) : this.getRecentEntries(50);

    let report = `# Audit Report - ${new Date().toISOString()}\n\n`;
    report += `Total entries: ${entries.length}\n\n`;

    // Summary statistics
    const stats = {
      total: entries.length,
      success: entries.filter(e => e.result === 'SUCCESS').length,
      failure: entries.filter(e => e.result === 'FAILURE').length,
      denied: entries.filter(e => e.result === 'DENIED').length
    };

    report += `## Summary\n`;
    report += `- Total: ${stats.total}\n`;
    report += `- Success: ${stats.success}\n`;
    report += `- Failures: ${stats.failure}\n`;
    report += `- Denied: ${stats.denied}\n\n`;

    // Recent entries
    report += `## Recent Entries\n\n`;
    report += `| Time | User | Action | Resource | Result |\n`;
    report += `|------|------|--------|----------|--------|\n`;

    entries.slice(0, 20).forEach(entry => {
      const time = new Date(entry.timestamp).toLocaleString();
      report += `| ${time} | ${entry.userId} | ${entry.action} | ${entry.resource} | ${entry.result} |\n`;
    });

    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const logger = new AuditLogger();

  if (args.length === 0) {
    console.log(`📋 Audit Logging System v2.11

USAGE:
  bun audit:log <user> <action> <resource> [result] [ip]    # Log access
  bun audit:verify                                            # Verify log integrity
  bun audit:recent [limit]                                    # Show recent entries
  bun audit:search <filter> <value>                          # Search entries
  bun audit:report [--since YYYY-MM-DD]                      # Generate report

EXAMPLES:
  bun audit:log user123 READ dashboard SUCCESS 192.168.1.1
  bun audit:verify
  bun audit:recent 5
  bun audit:search user user123
  bun audit:report --since 2024-01-01
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'log':
        if (args.length < 4) {
          console.error('Usage: bun audit:log <user> <action> <resource> [result] [ip]');
          process.exit(1);
        }
        const userId = args[1];
        const action = args[2];
        const resource = args[3];
        const result = (args[4] as 'SUCCESS' | 'FAILURE' | 'DENIED') || 'SUCCESS';
        const ip = args[5];

        await logger.logAccess({ userId, action, resource, result, ip });
        console.log(`✅ Audit entry logged`);
        break;

      case 'verify':
        const verification = logger.verifyLogIntegrity();
        if (verification.valid) {
          console.log(`✅ Log integrity verified`);
        } else {
          console.log(`❌ Log integrity compromised:`);
          verification.issues.forEach(issue => console.log(`   ${issue}`));
          process.exit(1);
        }
        break;

      case 'recent':
        const limit = args[1] ? parseInt(args[1]) : 10;
        const entries = logger.getRecentEntries(limit);
        console.log(`📋 Recent ${limit} audit entries:`);
        entries.forEach((entry, i) => {
          console.log(`${i + 1}. ${entry.timestamp} ${entry.userId} ${entry.action} ${entry.resource} ${entry.result}`);
        });
        break;

      case 'search':
        if (args.length < 3) {
          console.error('Usage: bun audit:search <filter> <value>');
          process.exit(1);
        }
        const filter = args[1];
        const value = args[2];
        const searchResults = logger.searchEntries({ [filter]: value });
        console.log(`🔍 Found ${searchResults.length} entries:`);
        searchResults.forEach(entry => {
          console.log(`  ${entry.timestamp} ${entry.userId} ${entry.action} ${entry.resource} ${entry.result}`);
        });
        break;

      case 'report':
        const since = args.includes('--since') ? new Date(args[args.indexOf('--since') + 1]) : undefined;
        const report = logger.generateReport(since);
        console.log(report);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun audit --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
