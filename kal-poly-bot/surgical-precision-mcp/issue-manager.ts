// surgical-precision-mcp/issue-manager.ts - Surgical Precision Issue Manager
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// Issue Data Types
export interface Issue {
  id: string;                    // SP-2024-001 (Surgical Precision format)
  type: 'bug' | 'feature' | 'task' | 'enhancement' | 'question';
  status: 'open' | 'in-progress' | 'review' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  assignee?: string;
  labels: string[];
  created: Date;
  updated: Date;
  closed?: Date;
  relatedFiles?: string[];       // Code files related to issue
  relatedCommits?: string[];     // Git commits related to issue
  githubIssue?: number;          // Linked GitHub issue ID
}

export interface IssueCreateOptions {
  title: string;
  description?: string;
  type?: 'bug' | 'feature' | 'task' | 'enhancement' | 'question';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
}

export interface IssueUpdateOptions {
  title?: string;
  description?: string;
  type?: 'bug' | 'feature' | 'task' | 'enhancement' | 'question';
  status?: 'open' | 'in-progress' | 'review' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
}

export interface IssueSearchOptions {
  status?: string;
  type?: string;
  assignee?: string;
  priority?: string;
}

export interface IssueStats {
  total: number;
  open: number;
  closed: number;
  avgResolutionTime: number;
  byStatus?: Record<string, number>;
  byPriority?: Record<string, number>;
  byType?: Record<string, number>;
  byAssignee?: Record<string, number>;
}

// Issue Manager Class
export class IssueManager {
  private dataDir: string;
  private issuesFile: string;
  private issues: Map<string, Issue> = new Map();
  private nextId: number = 1;

  constructor(dataDir: string = 'data/issues') {
    this.dataDir = resolve(dataDir);
    this.issuesFile = join(this.dataDir, 'issues.json');
  }

  async initialize(): Promise<void> {
    // Create data directory if it doesn't exist
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    // Load existing issues
    await this.loadIssues();

    // Initialize next ID
    this.calculateNextId();
  }

  private async loadIssues(): Promise<void> {
    if (!existsSync(this.issuesFile)) {
      this.issues = new Map();
      return;
    }

    try {
      const data = readFileSync(this.issuesFile, 'utf-8');
      const issuesArray: Issue[] = JSON.parse(data);

      // Convert date strings back to Date objects
      issuesArray.forEach(issue => {
        issue.created = new Date(issue.created);
        issue.updated = new Date(issue.updated);
        if (issue.closed) {
          issue.closed = new Date(issue.closed);
        }
      });

      // Store in Map for efficient lookup
      this.issues = new Map(issuesArray.map(issue => [issue.id, issue]));
    } catch (error) {
      console.warn('Failed to load issues:', error);
      this.issues = new Map();
    }
  }

  private async saveIssues(): Promise<void> {
    try {
      const issuesArray = Array.from(this.issues.values());
      writeFileSync(this.issuesFile, JSON.stringify(issuesArray, null, 2));
    } catch (error) {
      throw new Error(`Failed to save issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateNextId(): void {
    let maxId = 0;
    for (const issue of this.issues.values()) {
      const idNumber = parseInt(issue.id.split('-').pop() || '0');
      maxId = Math.max(maxId, idNumber);
    }
    this.nextId = maxId + 1;
  }

  private generateId(): string {
    const year = new Date().getFullYear();
    const paddedId = String(this.nextId).padStart(3, '0');
    return `SP-${year}-${paddedId}`;
  }

  async createIssue(options: IssueCreateOptions): Promise<Issue> {
    const now = new Date();
    const issue: Issue = {
      id: this.generateId(),
      type: options.type || 'bug',
      status: 'open',
      priority: options.priority || 'medium',
      title: options.title,
      description: options.description || '',
      assignee: options.assignee,
      labels: options.labels || [],
      created: now,
      updated: now
    };

    this.issues.set(issue.id, issue);
    await this.saveIssues();
    this.nextId++;

    return issue;
  }

  async getIssue(id: string): Promise<Issue> {
    const issue = this.issues.get(id);
    if (!issue) {
      throw new Error(`Issue ${id} not found`);
    }
    return issue;
  }

  async listIssues(options: IssueSearchOptions = {}): Promise<Issue[]> {
    let issues = Array.from(this.issues.values());

    // Apply filters
    if (options.status && options.status !== 'all') {
      issues = issues.filter(issue => issue.status === options.status);
    }

    if (options.type) {
      issues = issues.filter(issue => issue.type === options.type);
    }

    if (options.assignee) {
      issues = issues.filter(issue => issue.assignee === options.assignee);
    }

    if (options.priority) {
      issues = issues.filter(issue => issue.priority === options.priority);
    }

    // Sort by creation date (newest first)
    issues.sort((a, b) => b.created.getTime() - a.created.getTime());

    return issues;
  }

  async updateIssue(id: string, updates: IssueUpdateOptions): Promise<Issue> {
    const issue = await this.getIssue(id);

    // Apply updates
    Object.assign(issue, updates);
    issue.updated = new Date();

    // Handle status changes
    if (updates.status === 'closed' && !issue.closed) {
      issue.closed = new Date();
    } else if (updates.status !== 'closed' && issue.closed) {
      issue.closed = undefined;
    }

    await this.saveIssues();
    return issue;
  }

  async closeIssue(id: string, reason?: string): Promise<Issue> {
    const issue = await this.updateIssue(id, { status: 'closed' });

    if (reason) {
      issue.description += `\n\nClosed: ${reason}`;
    }

    return issue;
  }

  async deleteIssue(id: string): Promise<void> {
    if (!this.issues.has(id)) {
      throw new Error(`Issue ${id} not found`);
    }

    this.issues.delete(id);
    await this.saveIssues();
  }

  async searchIssues(query: string, options: IssueSearchOptions = {}): Promise<Issue[]> {
    const issues = await this.listIssues(options);
    const lowercaseQuery = query.toLowerCase();

    return issues.filter(issue =>
      issue.title.toLowerCase().includes(lowercaseQuery) ||
      issue.description.toLowerCase().includes(lowercaseQuery) ||
      issue.labels.some(label => label.toLowerCase().includes(lowercaseQuery))
    );
  }

  async getStats(): Promise<IssueStats> {
    const issues = Array.from(this.issues.values());

    const stats: IssueStats = {
      total: issues.length,
      open: issues.filter(i => i.status !== 'closed').length,
      closed: issues.filter(i => i.status === 'closed').length,
      avgResolutionTime: 0
    };

    // Calculate average resolution time
    const closedIssues = issues.filter(i => i.closed && i.created);
    if (closedIssues.length > 0) {
      const totalResolutionTime = closedIssues.reduce((sum, issue) => {
        return sum + (issue.closed!.getTime() - issue.created.getTime());
      }, 0);
      stats.avgResolutionTime = Math.round(totalResolutionTime / closedIssues.length);
    }

    // Group by various dimensions
    stats.byStatus = this.groupBy(issues, 'status');
    stats.byPriority = this.groupBy(issues, 'priority');
    stats.byType = this.groupBy(issues, 'type');

    // Group by assignee (only for assigned issues)
    const assignedIssues = issues.filter(i => i.assignee);
    if (assignedIssues.length > 0) {
      stats.byAssignee = this.groupBy(assignedIssues, 'assignee');
    }

    return stats;
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    const groups: Record<string, number> = {};

    items.forEach(item => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
    });

    return groups;
  }

  // Advanced features for future implementation
  async linkToFile(issueId: string, filePath: string): Promise<Issue> {
    const issue = await this.getIssue(issueId);
    issue.relatedFiles = issue.relatedFiles || [];
    if (!issue.relatedFiles.includes(filePath)) {
      issue.relatedFiles.push(filePath);
      issue.updated = new Date();
      await this.saveIssues();
    }
    return issue;
  }

  async linkToCommit(issueId: string, commitHash: string): Promise<Issue> {
    const issue = await this.getIssue(issueId);
    issue.relatedCommits = issue.relatedCommits || [];
    if (!issue.relatedCommits.includes(commitHash)) {
      issue.relatedCommits.push(commitHash);
      issue.updated = new Date();
      await this.saveIssues();
    }
    return issue;
  }

  async linkToGitHub(issueId: string, githubIssueNumber: number): Promise<Issue> {
    const issue = await this.updateIssue(issueId, { githubIssue: githubIssueNumber });
    return issue;
  }

  // Export/Import functionality
  async exportIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values());
  }

  async importIssues(issues: Issue[]): Promise<void> {
    for (const issue of issues) {
      this.issues.set(issue.id, issue);
    }
    await this.saveIssues();
    this.calculateNextId();
  }

  // Data integrity verification
  async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const [id, issue] of this.issues) {
      // Check ID format
      if (!/^SP-\d{4}-\d{3}$/.test(id)) {
        errors.push(`Invalid ID format: ${id}`);
      }

      // Check required fields
      if (!issue.title) {
        errors.push(`Missing title for issue: ${id}`);
      }

      // Check date validity
      if (!(issue.created instanceof Date) || isNaN(issue.created.getTime())) {
        errors.push(`Invalid created date for issue: ${id}`);
      }

      if (!(issue.updated instanceof Date) || isNaN(issue.updated.getTime())) {
        errors.push(`Invalid updated date for issue: ${id}`);
      }

      // Check status transitions
      if (issue.status === 'closed' && !issue.closed) {
        errors.push(`Closed issue missing closed date: ${id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}