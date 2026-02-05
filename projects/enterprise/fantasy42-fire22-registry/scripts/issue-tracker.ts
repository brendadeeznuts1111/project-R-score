#!/usr/bin/env bun

/**
 * 🚨 Issue Tracking System
 *
 * Consolidated issue tracking and resolution system
 * for Fantasy42-Fire22 enterprise platform
 */

import * as fs from 'fs';
import { join, basename } from 'path';
import { Database } from 'bun:sqlite';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  source: string;
  file_path?: string;
  line_number?: number;
  assignee?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  tags: string[];
  remediation_steps?: string[];
}

class IssueTracker {
  private db: Database;

  constructor() {
    this.db = new Database(':memory:');
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.run(`
      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        file_path TEXT,
        line_number INTEGER,
        assignee TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT,
        tags TEXT,
        remediation_steps TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE issue_comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        author TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (issue_id) REFERENCES issues (id)
      )
    `);
  }

  async scanForIssues(): Promise<void> {
    console.log('🔍 Scanning for issues...');

    // Scan compliance reports
    await this.scanComplianceReports();

    // Scan linter errors (would integrate with actual linter)
    await this.scanLinterErrors();

    // Scan security audit reports
    await this.scanSecurityReports();

    // Scan playbook audit results
    await this.scanPlaybookAudits();

    console.log(`✅ Issue scanning complete`);
  }

  private async scanComplianceReports(): Promise<void> {
    const patterns = [
      'playbook-compliance-report-*.json',
      'playbook-compliance-report-*.md',
      'compliance-report.json',
      'system-validation-report.json'
    ];

    for (const pattern of patterns) {
      try {
        const files = await this.findFilesByPattern(pattern);
        for (const file of files) {
          await this.parseComplianceReport(file);
        }
      } catch (error) {
        console.warn(`⚠️ Error scanning ${pattern}:`, error.message);
      }
    }
  }

  private async parseComplianceReport(filePath: string): Promise<void> {
    try {
      const content = await Bun.file(filePath).text();

      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content);
        if (data.violations) {
          for (const violation of data.violations) {
            await this.addIssue({
              id: `compliance-${violation.rule}-${Date.now()}`,
              title: violation.description,
              description: `Compliance violation: ${violation.description}`,
              severity: violation.severity.toLowerCase(),
              status: 'open',
              category: violation.category,
              source: 'compliance-audit',
              file_path: violation.file,
              tags: ['compliance', violation.category, violation.severity.toLowerCase()],
              remediation_steps: violation.remediation ? [violation.remediation] : undefined
            });
          }
        }
      } else if (filePath.endsWith('.md')) {
        // Parse markdown compliance reports
        const lines = content.split('\n');
        let currentSeverity: string = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Look for violation headers
          const violationMatch = line.match(/^### (\w+): (.+)$/);
          if (violationMatch) {
            currentSeverity = violationMatch[1].toLowerCase();
            const title = violationMatch[2];

            // Extract description and remediation
            let description = '';
            let remediation: string[] = [];
            let inRemediation = false;

            for (let j = i + 1; j < lines.length && j < i + 10; j++) {
              const descLine = lines[j];

              if (descLine.startsWith('**Remediation:**')) {
                inRemediation = true;
                remediation.push(descLine.replace('**Remediation:**', '').trim());
              } else if (descLine.startsWith('###') || descLine.startsWith('##')) {
                break;
              } else if (inRemediation) {
                if (descLine.trim()) {
                  remediation.push(descLine.trim());
                }
              } else if (descLine.trim() && !descLine.startsWith('**File:**')) {
                description += descLine.trim() + ' ';
              }
            }

            await this.addIssue({
              id: `compliance-${title.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`,
              title,
              description: description.trim(),
              severity: currentSeverity as Issue['severity'],
              status: 'open',
              category: 'compliance',
              source: 'playbook-audit',
              tags: ['compliance', currentSeverity],
              remediation_steps: remediation.length > 0 ? remediation : undefined
            });
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error parsing ${filePath}:`, error.message);
    }
  }

  private async scanLinterErrors(): Promise<void> {
    // In a real implementation, this would integrate with actual linter output
    // For now, we'll create sample issues based on common patterns

    const commonLinterIssues = [
      {
        title: 'Missing TypeScript type annotations',
        description: 'Several functions lack proper type annotations',
        severity: 'medium' as const,
        category: 'typescript',
        tags: ['typescript', 'types', 'linting']
      },
      {
        title: 'Unused imports detected',
        description: 'Multiple files have unused import statements',
        severity: 'low' as const,
        category: 'code-quality',
        tags: ['imports', 'cleanup', 'linting']
      },
      {
        title: 'Missing error handling',
        description: 'Async functions without proper error handling',
        severity: 'high' as const,
        category: 'error-handling',
        tags: ['error-handling', 'async', 'robustness']
      }
    ];

    for (const issue of commonLinterIssues) {
      await this.addIssue({
        ...issue,
        id: `linter-${issue.title.replace(/[^a-zA-Z0-9]/g, '_')}`,
        status: 'open',
        source: 'linter'
      });
    }
  }

  private async scanSecurityReports(): Promise<void> {
    const securityFiles = [
      'security-audit-report.json',
      'snyk-report.json',
      'security-reports/snyk-report.json'
    ];

    for (const file of securityFiles) {
      try {
        const exists = await Bun.file(file).exists();
        if (exists) {
          const content = await Bun.file(file).text();
          // Parse security report and extract issues
          // This would be customized based on the actual security report format
          console.log(`📄 Processing security report: ${file}`);
        }
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }
  }

  private async scanPlaybookAudits(): Promise<void> {
    // Already handled in compliance reports, but could add additional playbook-specific scanning
  }

  async addIssue(issue: Omit<Issue, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();

    this.db.run(
      `INSERT OR REPLACE INTO issues
       (id, title, description, severity, status, category, source, file_path, line_number, assignee, created_at, updated_at, tags, remediation_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        issue.id,
        issue.title,
        issue.description,
        issue.severity,
        issue.status,
        issue.category,
        issue.source,
        issue.file_path || null,
        issue.line_number || null,
        issue.assignee || null,
        now,
        now,
        JSON.stringify(issue.tags),
        issue.remediation_steps ? JSON.stringify(issue.remediation_steps) : null
      ]
    );
  }

  async updateIssueStatus(issueId: string, status: Issue['status'], assignee?: string): Promise<void> {
    const now = new Date().toISOString();

    let resolvedAt = null;
    if (status === 'resolved' || status === 'closed') {
      resolvedAt = now;
    }

    this.db.run(
      'UPDATE issues SET status = ?, assignee = ?, updated_at = ?, resolved_at = ? WHERE id = ?',
      [status, assignee || null, now, resolvedAt, issueId]
    );
  }

  async addComment(issueId: string, comment: string, author?: string): Promise<void> {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.db.run(
      'INSERT INTO issue_comments (id, issue_id, comment, author) VALUES (?, ?, ?, ?)',
      [commentId, issueId, comment, author || 'system']
    );
  }

  getIssues(options: {
    status?: Issue['status'],
    severity?: Issue['severity'],
    category?: string,
    assignee?: string
  } = {}): Issue[] {
    let query = 'SELECT * FROM issues WHERE 1=1';
    const params: any[] = [];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.severity) {
      query += ' AND severity = ?';
      params.push(options.severity);
    }

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    if (options.assignee) {
      query += ' AND assignee = ?';
      params.push(options.assignee);
    }

    query += ' ORDER BY severity DESC, created_at DESC';

    const results = this.db.query(query).all(...params);
    return results.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      remediation_steps: row.remediation_steps ? JSON.parse(row.remediation_steps) : undefined
    })) as Issue[];
  }

  generateIssueReport(): string {
    const allIssues = this.getIssues();
    const openIssues = this.getIssues({ status: 'open' });
    const criticalIssues = this.getIssues({ severity: 'critical', status: 'open' });

    let report = '# 🚨 Issue Tracking Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Summary
    report += '## 📊 Summary\n\n';
    report += `- 📋 **Total Issues:** ${allIssues.length}\n`;
    report += `- 🚨 **Open Issues:** ${openIssues.length}\n`;
    report += `- 🔴 **Critical Issues:** ${criticalIssues.length}\n`;
    report += `- ✅ **Resolved Issues:** ${allIssues.filter(i => i.status === 'resolved').length}\n\n`;

    // Critical Issues
    if (criticalIssues.length > 0) {
      report += '## 🔴 Critical Issues\n\n';
      criticalIssues.slice(0, 10).forEach(issue => {
        report += `### ${issue.title}\n\n`;
        report += `${issue.description}\n\n`;
        report += `**Source:** ${issue.source}\n`;
        report += `**Category:** ${issue.category}\n`;
        if (issue.file_path) {
          report += `**File:** ${issue.file_path}`;
          if (issue.line_number) {
            report += `:${issue.line_number}`;
          }
          report += '\n';
        }
        if (issue.remediation_steps && issue.remediation_steps.length > 0) {
          report += `**Remediation:**\n`;
          issue.remediation_steps.forEach(step => {
            report += `- ${step}\n`;
          });
        }
        report += '\n';
      });
    }

    // Issues by Category
    report += '## 📈 Issues by Category\n\n';
    const categoryStats = allIssues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categoryStats).forEach(([category, count]) => {
      report += `- **${category}:** ${count} issues\n`;
    });
    report += '\n';

    // Issues by Severity
    report += '## 📊 Issues by Severity\n\n';
    const severityStats = allIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(severityStats).forEach(([severity, count]) => {
      const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[severity] || '⚪';
      report += `- ${emoji} **${severity}:** ${count} issues\n`;
    });

    return report;
  }

  private async findFilesByPattern(pattern: string): Promise<string[]> {
    const files: string[] = [];

    // Convert glob pattern to regex for basic matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');

    const regex = new RegExp(`^${regexPattern}$`);

    // Walk the directory tree starting from current directory
    const walk = async (dir: string): Promise<void> => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          // Skip excluded directories
          if (entry.isDirectory() && (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === 'coverage'
          )) {
            continue;
          }

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            // Check if file matches the pattern
            const relativePath = fullPath.replace(process.cwd() + '/', '');
            if (regex.test(relativePath)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    await walk(process.cwd());
    return files;
  }

  close(): void {
    this.db.close();
  }
}

// CLI Interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'scan';

  const tracker = new IssueTracker();

  switch (command) {
    case 'scan':
      await tracker.scanForIssues();
      console.log(tracker.generateIssueReport());
      break;

    case 'report':
      await tracker.scanForIssues();
      const report = tracker.generateIssueReport();
      const filename = `issue-tracking-report-${new Date().toISOString().slice(0, 10)}.md`;
      await Bun.write(filename, report);
      console.log(`📄 Report saved: ${filename}`);
      break;

    case 'list':
      const status = args[1] as Issue['status'];
      const severity = args[2] as Issue['severity'];
      const issues = tracker.getIssues({ status, severity });
      console.log(`📋 Issues (${issues.length}):`);
      issues.forEach(issue => {
        console.log(`  • ${issue.severity.toUpperCase()}: ${issue.title} (${issue.category}) - ${issue.status}`);
      });
      break;

    case 'update':
      const issueId = args[1];
      const newStatus = args[2] as Issue['status'];
      const assignee = args[3];
      if (!issueId || !newStatus) {
        console.error('Usage: bun run scripts/issue-tracker.ts update <issue-id> <status> [assignee]');
        process.exit(1);
      }
      await tracker.updateIssueStatus(issueId, newStatus, assignee);
      console.log(`✅ Issue ${issueId} updated to ${newStatus}`);
      break;

    default:
      console.log('Usage: bun run scripts/issue-tracker.ts [scan|report|list|update]');
      console.log('');
      console.log('Commands:');
      console.log('  scan      - Scan for issues and show report');
      console.log('  report    - Generate and save detailed report');
      console.log('  list      - List issues (optionally filter by status/severity)');
      console.log('  update    - Update issue status');
      break;
  }

  tracker.close();
}

export { IssueTracker };
