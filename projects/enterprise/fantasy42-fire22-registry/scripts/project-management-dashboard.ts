#!/usr/bin/env bun

/**
 * 🚀 Project Management Dashboard
 *
 * Unified task management, RSS feed coordination, and issue tracking system
 * for Fantasy42-Fire22 enterprise platform
 */

import * as fs from 'fs';
import { join, basename } from 'path';
import { Database } from 'bun:sqlite';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'bug' | 'feature' | 'enhancement' | 'documentation' | 'security' | 'performance';
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  assignee?: string;
  due_date?: string;
  tags: string[];
  file_path: string;
  line_number: number;
  created_at: string;
  updated_at: string;
}

interface RSSFeed {
  id: string;
  department: string;
  title: string;
  rss_url: string;
  atom_url: string;
  last_updated: string;
  item_count: number;
  status: 'active' | 'inactive' | 'error';
}

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  assignee?: string;
  created_at: string;
  resolved_at?: string;
  tags: string[];
  error_code?: string;
  error_category?: string;
  cwe?: string;
  owasp?: string;
}

interface ErrorCode {
  code: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  remediation: string;
  cwe?: string;
  owasp?: string;
  created_at: string;
}

// Database row interfaces for proper typing
interface TaskRow extends Omit<Task, 'tags'> {
  tags: string;
}

interface IssueRow extends Omit<Issue, 'tags'> {
  tags: string;
}

interface RSSFeedRow extends RSSFeed { }

interface ErrorCodeRow extends ErrorCode { }

interface DashboardConfig {
  maxConcurrentScans: number;
  scanTimeout: number;
  cacheEnabled: boolean;
  cacheExpiryMinutes: number;
  autoRefreshInterval: number;
  verbose: boolean;
}

class ProjectManagementDashboard {
  private db: Database;
  private rssFeeds: RSSFeed[] = [];
  private tasks: Task[] = [];
  private issues: Issue[] = [];
  private errorCodes: ErrorCode[] = [];
  private config: DashboardConfig;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private lastScanTime: number = 0;
  private metrics: {
    totalScans: number;
    averageScanTime: number;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  } = {
    totalScans: 0,
    averageScanTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0
  };

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      maxConcurrentScans: 5,
      scanTimeout: 30000,
      cacheEnabled: true,
      cacheExpiryMinutes: 30,
      autoRefreshInterval: 60000, // 1 minute
      verbose: false,
      ...config
    };

    this.db = new Database('project-management.db');
    this.initializeDatabase();
    // Note: loadExistingData() is now called explicitly when needed to avoid async issues

    // Start auto-refresh if enabled
    if (this.config.autoRefreshInterval > 0) {
      this.startAutoRefresh();
    }
  }

  // Public method to initialize/load all data
  async initialize(): Promise<void> {
    await this.loadExistingData();
  }

  // Cache management methods
  private getCachedData<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    this.metrics.cacheHits++;
    return cached.data as T;
  }

  private setCachedData(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;

    const expiry = Date.now() + (this.config.cacheExpiryMinutes * 60 * 1000);
    this.cache.set(key, { data, expiry });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  // Auto-refresh functionality
  private startAutoRefresh(): void {
    setInterval(async () => {
      try {
        await this.loadExistingData();
        if (this.config.verbose) {
          console.info('🔄 Auto-refreshed project data');
        }
      } catch (error) {
        console.warn('⚠️ Auto-refresh failed:', error.message);
        this.metrics.errors++;
      }
    }, this.config.autoRefreshInterval);
  }

  // Enhanced task management
  completeTask(taskId: string, assignee?: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    task.status = 'completed';
    task.assignee = assignee || task.assignee;
    task.updated_at = new Date().toISOString();

    this.updateTaskInDB(task);
    this.clearCache();
    return true;
  }

  assignTask(taskId: string, assignee: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    task.assignee = assignee;
    task.updated_at = new Date().toISOString();

    this.updateTaskInDB(task);
    return true;
  }

  // Enhanced issue management
  resolveIssue(issueId: string, resolution?: string): boolean {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue) return false;

    issue.status = 'resolved';
    issue.resolved_at = new Date().toISOString();

    this.updateIssueInDB(issue);
    this.clearCache();
    return true;
  }

  // Metrics and statistics
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  getDashboardStats(): {
    tasksByPriority: Record<string, number>;
    tasksByCategory: Record<string, number>;
    tasksByStatus: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    issuesByStatus: Record<string, number>;
    rssFeedStats: Record<string, number>;
    performanceMetrics: typeof this.metrics;
  } {
    const tasksByPriority = this.tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByCategory = this.tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByStatus = this.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesBySeverity = this.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesByStatus = this.issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rssFeedStats = this.rssFeeds.reduce((acc, feed) => {
      acc[feed.status] = (acc[feed.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      tasksByPriority,
      tasksByCategory,
      tasksByStatus,
      issuesBySeverity,
      issuesByStatus,
      rssFeedStats,
      performanceMetrics: this.getMetrics()
    };
  }

  private initializeDatabase(): void {
    try {
      // Tasks table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT NOT NULL,
          assignee TEXT,
          due_date TEXT,
          tags TEXT,
          file_path TEXT NOT NULL,
          line_number INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // RSS feeds table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS rss_feeds (
          id TEXT PRIMARY KEY,
          department TEXT NOT NULL,
          title TEXT NOT NULL,
          rss_url TEXT NOT NULL,
          atom_url TEXT,
          last_updated TEXT,
          item_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active'
        )
      `);

      // Issues table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS issues (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          severity TEXT NOT NULL,
          status TEXT NOT NULL,
          category TEXT NOT NULL,
          assignee TEXT,
          created_at TEXT NOT NULL,
          resolved_at TEXT,
          tags TEXT,
          error_code TEXT,
          error_category TEXT,
          cwe TEXT,
          owasp TEXT
        )
      `);

      // Error codes table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS error_codes (
          code TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          severity TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          remediation TEXT,
          cwe TEXT,
          owasp TEXT,
          created_at TEXT NOT NULL
        )
      `);
    } catch (error) {
      console.warn('⚠️ Database initialization warning:', error.message);
    }
  }

  private async loadExistingData(): Promise<void> {
    await this.scanForTasks();
    await this.scanForRSSFeeds();
    await this.scanForIssues();
    await this.scanForErrorCodes();
  }

  private async scanForTasks(): Promise<void> {
    console.info('🔍 Scanning for tasks (TODO/FIXME/XXX/HACK)...');

    const patterns = [
      '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
      '**/*.md', '**/*.txt', '**/*.json', '**/*.yml', '**/*.yaml'
    ];

    const todoPatterns = [
      /TODO[:\s]*(.+)/gi,
      /FIXME[:\s]*(.+)/gi,
      /XXX[:\s]*(.+)/gi,
      /HACK[:\s]*(.+)/gi
    ];

    for (const pattern of patterns) {
      try {
        const files = await this.findFilesByPattern(pattern);
        for (const file of files) {
          const content = await Bun.file(file).text();
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of todoPatterns) {
              const matches = [...line.matchAll(pattern)];
              for (const match of matches) {
                const taskId = `${file}:${i + 1}:${match[1].substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`;
                const task: Task = {
                  id: taskId,
                  title: match[1].trim(),
                  description: this.extractTaskDescription(lines, i),
                  priority: this.determinePriority(match[1]),
                  category: this.determineCategory(match[1]),
                  status: 'todo',
                  tags: this.extractTags(match[1]),
                  file_path: file,
                  line_number: i + 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };

                this.tasks.push(task);
                this.db.run(
                  `INSERT OR REPLACE INTO tasks
                   (id, title, description, priority, category, status, tags, file_path, line_number, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    task.id, task.title, task.description, task.priority, task.category, task.status,
                    JSON.stringify(task.tags), task.file_path, task.line_number, task.created_at, task.updated_at
                  ]
                );
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error scanning pattern ${pattern}:`, error.message);
      }
    }

    console.info(`✅ Found ${this.tasks.length} tasks`);
  }

  private async scanForRSSFeeds(): Promise<void> {
    console.info('📡 Scanning for RSS feeds...');

    const feedFiles = [
      'feeds/technology.rss', 'feeds/technology.atom',
      'feeds/support.rss', 'feeds/support.atom',
      'feeds/operations.rss', 'feeds/operations.atom',
      'feeds/marketing.rss', 'feeds/marketing.atom',
      'feeds/management.rss', 'feeds/management.atom',
      'feeds/finance.rss', 'feeds/finance.atom',
      'feeds/design.rss', 'feeds/design.atom',
      'feeds/contributors.rss', 'feeds/contributors.atom',
      'feeds/compliance.rss', 'feeds/compliance.atom',
      'feeds/communications.rss', 'feeds/communications.atom'
    ];

    for (const feedFile of feedFiles) {
      try {
        const exists = await Bun.file(feedFile).exists();
        if (exists) {
          const content = await Bun.file(feedFile).text();
          const department = feedFile.split('/')[1].split('.')[0];
          const isAtom = feedFile.endsWith('.atom');

          // Count items in feed
          const itemCount = (content.match(/<item>/g) || []).length ||
                           (content.match(/<entry>/g) || []).length;

          const feed: RSSFeed = {
            id: `${department}-${isAtom ? 'atom' : 'rss'}`,
            department,
            title: `${department.charAt(0).toUpperCase() + department.slice(1)} Updates`,
            rss_url: feedFile.replace('.atom', '.rss'),
            atom_url: feedFile.replace('.rss', '.atom'),
            last_updated: this.extractLastUpdated(content),
            item_count: itemCount,
            status: 'active'
          };

          this.rssFeeds.push(feed);
          this.db.run(
            `INSERT OR REPLACE INTO rss_feeds
             (id, department, title, rss_url, atom_url, last_updated, item_count, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [feed.id, feed.department, feed.title, feed.rss_url, feed.atom_url,
             feed.last_updated, feed.item_count, feed.status]
          );
        }
      } catch (error) {
        console.warn(`⚠️ Error processing feed ${feedFile}:`, error.message);
      }
    }

    console.info(`✅ Found ${this.rssFeeds.length} RSS feeds`);
  }

  private async scanForIssues(): Promise<void> {
    console.info('🔧 Scanning for issues and error reports...');

    // Look for common issue patterns
    const issueFiles = [
      'playbook-compliance-report-*.md',
      'playbook-compliance-report-*.json',
      'system-validation-report.json',
      'compliance-report.json',
      'security-audit-report.json'
    ];

    for (const pattern of issueFiles) {
      try {
        const files = await this.findFilesByPattern(pattern);
        for (const file of files) {
          const content = await Bun.file(file).text();
          const issues = this.extractIssuesFromFile(file, content);
          this.issues.push(...issues);
        }
      } catch (error) {
        console.warn(`⚠️ Error scanning issues:`, error.message);
      }
    }

    console.info(`✅ Found ${this.issues.length} tracked issues`);
  }

  private async scanForErrorCodes(): Promise<void> {
    console.info('🔍 Scanning for error codes and security issues...');

    // Look for error code files
    const errorCodeFiles = [
      'packages/security-audit/src/error-codes.ts',
      'dashboard-worker/workspaces/@fire22-security-registry/src/error-codes.ts',
      'packages/compliance-checker/src/error-codes.ts',
      'dashboard-worker/src/validation/error-codes.ts'
    ];

    for (const file of errorCodeFiles) {
      try {
        if (await this.fileExists(file)) {
          const content = await Bun.file(file).text();
          const codes = this.extractErrorCodesFromFile(file, content);
          this.errorCodes.push(...codes);
        }
      } catch (error) {
        console.warn(`⚠️ Error scanning error codes in ${file}:`, error.message);
      }
    }

    console.info(`✅ Found ${this.errorCodes.length} error codes`);
  }

  private extractErrorCodesFromFile(filePath: string, content: string): ErrorCode[] {
    const errorCodes: ErrorCode[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for error code patterns like: PKG001:, COD001:, etc.
      const errorCodeMatch = line.match(/^\s*([A-Z]{3}\d{3}):/);
      if (errorCodeMatch) {
        const code = errorCodeMatch[1];
        const errorCode: ErrorCode = {
          code,
          category: this.extractErrorCategory(code),
          severity: 'medium', // default, will be updated from content
          title: '',
          description: '',
          remediation: '',
          created_at: new Date().toISOString()
        };

        // Extract additional details from subsequent lines
        let j = i + 1;
        while (j < lines.length && j < i + 20) { // Look up to 20 lines ahead
          const detailLine = lines[j];

          if (detailLine.includes('severity:')) {
            const severityMatch = detailLine.match(/severity:\s*['"]([^'"]+)['"]/);
            if (severityMatch) {
              errorCode.severity = severityMatch[1].toLowerCase() as ErrorCode['severity'];
            }
          } else if (detailLine.includes('title:')) {
            const titleMatch = detailLine.match(/title:\s*['"]([^'"]+)['"]/);
            if (titleMatch) {
              errorCode.title = titleMatch[1];
            }
          } else if (detailLine.includes('description:')) {
            const descMatch = detailLine.match(/description:\s*['"]([^'"]+)['"]/);
            if (descMatch) {
              errorCode.description = descMatch[1];
            }
          } else if (detailLine.includes('remediation:')) {
            const remMatch = detailLine.match(/remediation:\s*['"]([^'"]+)['"]/);
            if (remMatch) {
              errorCode.remediation = remMatch[1];
            }
          } else if (detailLine.includes('cwe:')) {
            const cweMatch = detailLine.match(/cwe:\s*['"]([^'"]+)['"]/);
            if (cweMatch) {
              errorCode.cwe = cweMatch[1];
            }
          } else if (detailLine.includes('owasp:')) {
            const owaspMatch = detailLine.match(/owasp:\s*['"]([^'"]+)['"]/);
            if (owaspMatch) {
              errorCode.owasp = owaspMatch[1];
            }
          } else if (detailLine.trim() === '},' || detailLine.trim() === '}') {
            break; // End of error code definition
          }

          j++;
        }

        errorCodes.push(errorCode);
      }
    }

    return errorCodes;
  }

  private extractErrorCategory(code: string): string {
    const prefix = code.substring(0, 3);
    switch (prefix) {
      case 'PKG': return 'Package Security';
      case 'COD': return 'Code Security';
      case 'CFG': return 'Configuration Security';
      case 'INF': return 'Infrastructure Security';
      case 'CMP': return 'Compliance';
      case 'VAL': return 'Validation';
      default: return 'General';
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await Bun.file(filePath).text();
      return true;
    } catch {
      return false;
    }
  }

  private extractTaskDescription(lines: string[], startIndex: number): string {
    let description = '';
    for (let i = startIndex + 1; i < Math.min(startIndex + 5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*')) {
        description += line.replace(/^\/\/|^#|^\s*\*\s*/, '').trim() + ' ';
      } else if (line === '') {
        continue;
      } else {
        break;
      }
    }
    return description.trim() || 'No description provided';
  }

  private determinePriority(text: string): Task['priority'] {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('p0')) {
      return 'critical';
    } else if (lowerText.includes('high') || lowerText.includes('important') || lowerText.includes('p1')) {
      return 'high';
    } else if (lowerText.includes('medium') || lowerText.includes('normal') || lowerText.includes('p2')) {
      return 'medium';
    }
    return 'low';
  }

  private determineCategory(text: string): Task['category'] {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('security') || lowerText.includes('vulnerability')) {
      return 'security';
    } else if (lowerText.includes('performance') || lowerText.includes('speed') || lowerText.includes('optimize')) {
      return 'performance';
    } else if (lowerText.includes('document') || lowerText.includes('readme') || lowerText.includes('guide')) {
      return 'documentation';
    } else if (lowerText.includes('feature') || lowerText.includes('add') || lowerText.includes('implement')) {
      return 'feature';
    } else if (lowerText.includes('bug') || lowerText.includes('fix') || lowerText.includes('error')) {
      return 'bug';
    }
    return 'enhancement';
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    const tagPatterns = [
      /#(\w+)/g,
      /\[([^\]]+)\]/g,
      /@(\w+)/g
    ];

    for (const pattern of tagPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        tags.push(match[1]);
      }
    }

    return [...new Set(tags)];
  }

  private extractLastUpdated(content: string): string {
    const pubDateMatch = content.match(/<pubDate>([^<]+)<\/pubDate>/);
    const updatedMatch = content.match(/<updated>([^<]+)<\/updated>/);

    if (pubDateMatch) return pubDateMatch[1];
    if (updatedMatch) return updatedMatch[1];

    return new Date().toISOString();
  }

  private extractIssuesFromFile(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];

    // Extract issues from compliance reports
    if (filePath.includes('compliance')) {
      const violationPattern = /### (\w+): ([^\n]+)/g;
      const matches = [...content.matchAll(violationPattern)];

      for (const match of matches) {
        const severity = match[1] as Issue['severity'];
        const title = match[2];

        issues.push({
          id: `${filePath}-${severity}-${title.replace(/[^a-zA-Z0-9]/g, '_')}`,
          title,
          description: this.extractIssueDescription(content, match.index || 0),
          severity,
          status: 'open',
          category: 'compliance',
          created_at: new Date().toISOString(),
          tags: ['compliance', severity.toLowerCase()]
        });
      }
    }

    return issues;
  }

  private extractIssueDescription(content: string, startIndex: number): string {
    const lines = content.split('\n');
    const descriptionLines: string[] = [];

    for (let i = startIndex + 1; i < Math.min(startIndex + 10, lines.length); i++) {
      const line = lines[i];
      if (line.startsWith('**Remediation:**') || line.startsWith('###')) {
        break;
      }
      if (line.trim()) {
        descriptionLines.push(line.trim());
      }
    }

    return descriptionLines.join(' ') || 'No description available';
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

  // Public API methods
  getTasks(options: { status?: Task['status'], priority?: Task['priority'], category?: Task['category'] } = {}): Task[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.priority) {
      query += ' AND priority = ?';
      params.push(options.priority);
    }

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const results = this.db.query(query).all(...params) as TaskRow[];
    return results.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    })) as Task[];
  }

  getRSSFeeds(department?: string): RSSFeed[] {
    let query = 'SELECT * FROM rss_feeds WHERE 1=1';
    const params: any[] = [];

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    query += ' ORDER BY department, last_updated DESC';

    return this.db.query(query).all(...params) as RSSFeed[];
  }

  getIssues(options: { status?: Issue['status'], severity?: Issue['severity'] } = {}): Issue[] {
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

    query += ' ORDER BY severity DESC, created_at DESC';

    const results = this.db.query(query).all(...params) as IssueRow[];
    return results.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    })) as Issue[];
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    Object.assign(task, updates);
    task.updated_at = new Date().toISOString();

    this.updateTaskInDB(task);
  }

  private updateTaskInDB(task: Task): void {
    const updateFields = Object.keys(task).filter(key => key !== 'tags' && key !== 'id');
    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const params = updateFields.map(field => {
      if (field === 'tags') {
        return JSON.stringify((task as any)[field]);
      }
      return (task as any)[field];
    });

    this.db.run(
      `UPDATE tasks SET ${setClause} WHERE id = ?`,
      [...params, task.id]
    );
  }

  private updateIssueInDB(issue: Issue): void {
    const updateFields = Object.keys(issue).filter(key => key !== 'tags' && key !== 'id');
    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const params = updateFields.map(field => {
      if (field === 'tags') {
        return JSON.stringify((issue as any)[field]);
      }
      return (issue as any)[field];
    });

    this.db.run(
      `UPDATE issues SET ${setClause} WHERE id = ?`,
      [...params, issue.id]
    );
  }

  generateDashboardReport(): string {
    const criticalTasks = this.getTasks({ priority: 'critical', status: 'todo' });
    const highTasks = this.getTasks({ priority: 'high', status: 'todo' });
    const activeFeeds = this.rssFeeds.filter(f => f.status === 'active');
    const openIssues = this.getIssues({ status: 'open' });

    let report = '# 🚀 Project Management Dashboard\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Summary
    report += '## 📊 Summary\n\n';
    report += `- 🔧 **Tasks:** ${this.tasks.length} total, ${criticalTasks.length} critical, ${highTasks.length} high priority\n`;
    report += `- 📡 **RSS Feeds:** ${this.rssFeeds.length} total, ${activeFeeds.length} active\n`;
    report += `- 🚨 **Issues:** ${this.issues.length} total, ${openIssues.length} open\n\n`;

    // Critical Tasks
    if (criticalTasks.length > 0) {
      report += '## 🚨 Critical Tasks\n\n';
      criticalTasks.slice(0, 10).forEach(task => {
        report += `- **${task.title}**\n`;
        report += `  - File: ${task.file_path}:${task.line_number}\n`;
        report += `  - Priority: ${task.priority}\n`;
        report += `  - Category: ${task.category}\n`;
        if (task.tags.length > 0) {
          report += `  - Tags: ${task.tags.join(', ')}\n`;
        }
        report += '\n';
      });
    }

    // RSS Feed Status
    if (activeFeeds.length > 0) {
      report += '## 📡 RSS Feed Status\n\n';
      const feedStats = activeFeeds.reduce((acc, feed) => {
        acc[feed.department] = (acc[feed.department] || 0) + feed.item_count;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(feedStats).forEach(([dept, count]) => {
        report += `- **${dept}**: ${count} items\n`;
      });
      report += '\n';
    }

    // Open Issues
    if (openIssues.length > 0) {
      report += '## 🚨 Open Issues\n\n';
      openIssues.slice(0, 10).forEach(issue => {
        report += `- **${issue.title}** (${issue.severity})\n`;
        report += `  - Category: ${issue.category}\n`;
        if (issue.tags.length > 0) {
          report += `  - Tags: ${issue.tags.join(', ')}\n`;
        }
        report += '\n';
      });
    }

    // Task Distribution by Category
    report += '## 📈 Task Distribution\n\n';
    const categoryStats = this.tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categoryStats).forEach(([category, count]) => {
      report += `- **${category}**: ${count} tasks\n`;
    });
    report += '\n';

    // Recommendations
    report += '## 💡 Recommendations\n\n';

    if (criticalTasks.length > 0) {
      report += `- 🚨 **Address ${criticalTasks.length} critical tasks immediately**\n`;
    }

    if (openIssues.length > 0) {
      report += `- 🔧 **Resolve ${openIssues.length} open issues**\n`;
    }

    if (activeFeeds.length < 10) {
      report += `- 📡 **Consider adding more RSS feeds for better communication**\n`;
    }

    if (Object.keys(categoryStats).length < 5) {
      report += `- 📊 **Diversify task categories for better organization**\n`;
    }

    return report;
  }

  close(): void {
    this.db.close();
  }
}

// CLI Interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'dashboard';

  const dashboard = new ProjectManagementDashboard();

  (async () => {
    try {
      switch (command) {
        case 'dashboard':
          // Ensure all data is loaded before generating report
          await dashboard.initialize();
          console.info(dashboard.generateDashboardReport());
          break;

        case 'tasks':
          const status = args[1] as Task['status'];
          await dashboard.initialize();
          const tasks = dashboard.getTasks(status ? { status } : {});
          console.info(`📋 Tasks (${tasks.length}):`);
          tasks.forEach(task => {
            console.info(`  • ${task.priority.toUpperCase()}: ${task.title} (${task.file_path}:${task.line_number})`);
          });
          break;

        case 'feeds':
          await dashboard.initialize();
          const feeds = dashboard.getRSSFeeds();
          console.info(`📡 RSS Feeds (${feeds.length}):`);
          feeds.forEach(feed => {
            console.info(`  • ${feed.department}: ${feed.item_count} items (${feed.status})`);
          });
          break;

        case 'issues':
          const severity = args[1] as Issue['severity'];
          await dashboard.initialize();
          const issues = dashboard.getIssues(severity ? { severity } : {});
          console.info(`🚨 Issues (${issues.length}):`);
          issues.forEach(issue => {
            console.info(`  • ${issue.severity.toUpperCase()}: ${issue.title} (${issue.category})`);
          });
          break;

        case 'report':
          await dashboard.initialize();
          const report = dashboard.generateDashboardReport();
          const filename = `project-management-report-${new Date().toISOString().slice(0, 10)}.md`;
          await Bun.write(filename, report);
          console.info(`📄 Report saved: ${filename}`);
          break;

        case 'complete':
          await dashboard.initialize();
          const taskId = args[1];
          const assignee = args[2];
          if (!taskId) {
            console.info('❌ Please provide a task ID to complete');
            break;
          }
          const completed = dashboard.completeTask(taskId, assignee);
          console.info(completed ? `✅ Task ${taskId} marked as completed` : `❌ Task ${taskId} not found`);
          break;

        case 'assign':
          await dashboard.initialize();
          const assignTaskId = args[1];
          const assignAssignee = args[2];
          if (!assignTaskId || !assignAssignee) {
            console.info('❌ Please provide task ID and assignee name');
            break;
          }
          const assigned = dashboard.assignTask(assignTaskId, assignAssignee);
          console.info(assigned ? `✅ Task ${assignTaskId} assigned to ${assignAssignee}` : `❌ Task ${assignTaskId} not found`);
          break;

        case 'resolve':
          await dashboard.initialize();
          const issueId = args[1];
          if (!issueId) {
            console.info('❌ Please provide an issue ID to resolve');
            break;
          }
          const resolved = dashboard.resolveIssue(issueId);
          console.info(resolved ? `✅ Issue ${issueId} marked as resolved` : `❌ Issue ${issueId} not found`);
          break;

        case 'stats':
          await dashboard.initialize();
          const stats = dashboard.getDashboardStats();
          console.info('📊 Project Statistics:');
          console.info('\n🔧 Tasks by Priority:', stats.tasksByPriority);
          console.info('📂 Tasks by Category:', stats.tasksByCategory);
          console.info('📋 Tasks by Status:', stats.tasksByStatus);
          console.info('🚨 Issues by Severity:', stats.issuesBySeverity);
          console.info('📊 Issues by Status:', stats.issuesByStatus);
          console.info('📡 RSS Feeds by Status:', stats.rssFeedStats);
          console.info('\n⚡ Performance Metrics:');
          console.info(`   Total Scans: ${stats.performanceMetrics.totalScans}`);
          console.info(`   Average Scan Time: ${stats.performanceMetrics.averageScanTime.toFixed(2)}ms`);
          console.info(`   Cache Hits: ${stats.performanceMetrics.cacheHits}`);
          console.info(`   Cache Misses: ${stats.performanceMetrics.cacheMisses}`);
          console.info(`   Errors: ${stats.performanceMetrics.errors}`);
          break;

        case 'metrics':
          await dashboard.initialize();
          const metrics = dashboard.getMetrics();
          console.info('⚡ Performance Metrics:');
          console.info(`   Total Scans: ${metrics.totalScans}`);
          console.info(`   Average Scan Time: ${metrics.averageScanTime.toFixed(2)}ms`);
          console.info(`   Cache Hits: ${metrics.cacheHits}`);
          console.info(`   Cache Misses: ${metrics.cacheMisses}`);
          console.info(`   Cache Hit Rate: ${metrics.cacheHits + metrics.cacheMisses > 0 ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1) : 0}%`);
          console.info(`   Errors: ${metrics.errors}`);
          break;

        case 'refresh':
          await dashboard.initialize();
          console.info('🔄 Data refreshed successfully');
          break;

        default:
          console.info('Usage: bun run scripts/project-management-dashboard.ts [command] [options]');
          console.info('');
          console.info('Commands:');
          console.info('  dashboard    - Show full project management dashboard');
          console.info('  tasks [status] - List all tasks (optionally filter by status)');
          console.info('  feeds        - List all RSS feeds');
          console.info('  issues [severity] - List all issues (optionally filter by severity)');
          console.info('  report       - Generate and save detailed report');
          console.info('  complete <taskId> [assignee] - Mark task as completed');
          console.info('  assign <taskId> <assignee> - Assign task to user');
          console.info('  resolve <issueId> - Mark issue as resolved');
          console.info('  stats        - Show detailed project statistics');
          console.info('  metrics      - Show performance metrics');
          console.info('  refresh      - Refresh all data from sources');
          console.info('');
          console.info('Examples:');
          console.info('  bun run scripts/project-management-dashboard.ts dashboard');
          console.info('  bun run scripts/project-management-dashboard.ts tasks todo');
          console.info('  bun run scripts/project-management-dashboard.ts complete TASK_001');
          console.info('  bun run scripts/project-management-dashboard.ts assign TASK_001 john.doe');
          console.info('  bun run scripts/project-management-dashboard.ts stats');
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      dashboard.close();
    }
  })();
}

export { ProjectManagementDashboard };
