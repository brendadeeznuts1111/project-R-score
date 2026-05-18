# 📋 TASK 1: Audit Engine Implementation
## FactoryWager Ultimate Inspection CLI - Audit Command

**Task ID**: TASK-1  
**Phase**: Phase 1 - Foundation  
**Priority**: HIGH  
**Estimated Hours**: 16-20  
**Status**: READY FOR IMPLEMENTATION  

---

## 📌 Task Overview

Implement the `audit` command engine with comprehensive data audit logging, change tracking, and compliance reporting capabilities.

### Deliverables
- ✅ AuditEngine class with full audit logging
- ✅ SQLite persistence layer
- ✅ Multiple output formatters
- ✅ Sub-command support (log, timeline, user, diff)
- ✅ Integration with SecurityRedactionEngine

---

## 🎯 Implementation Requirements

### File Location
```text
src/@inspection/commands/audit-engine.ts
```

### Dependencies
- `bun:sqlite` - Native SQLite access (no external package)
- `SecurityRedactionEngine` - For PII redaction
- `ScopeAnalytics` - For change analysis
- `ScopeFormatter` - For output formatting
- Built-in Node/Bun APIs (crypto, fs)

### Size Constraints
- Max file size: 400 lines
- Must stay within <10MB binary total

---

## 🏗️ Architecture Design

### Core Classes

```typescript
// Main audit engine
export class AuditEngine {
  private db: Database;
  private redactionEngine: SecurityRedactionEngine;
  
  async initialize(): Promise<void>
  async logEvent(entry: AuditEntry): Promise<void>
  async queryEvents(criteria: AuditQuery): Promise<AuditEntry[]>
  async exportLogs(format: AuditFormat): Promise<string>
  async generateReport(timeRange: TimeRange): Promise<AuditReport>
}

// Helper for audit entries
interface AuditEntry {
  id: string;           // UUID
  timestamp: string;    // ISO8601
  action: AuditAction;  // ACCESS|MODIFY|DELETE|EXPORT
  resource: string;     // Path or identifier
  user?: string;        // User who performed action
  status: AuditStatus;  // SUCCESS|FAILED|REJECTED
  changes?: {
    before?: any;
    after?: any;
    diff?: string[];
  };
  context?: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
  metadata?: Record<string, any>;
}

// Query interface
interface AuditQuery {
  startTime?: string;
  endTime?: string;
  user?: string;
  action?: AuditAction;
  resource?: string;
  status?: AuditStatus;
  limit?: number;
  offset?: number;
}

// Time range for reports
interface TimeRange {
  start: string;      // ISO8601
  end: string;        // ISO8601
}

// Audit report
interface AuditReport {
  period: TimeRange;
  summary: {
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByStatus: Record<string, number>;
    eventsByUser: Record<string, number>;
  };
  events: AuditEntry[];
  warnings: string[];
  recommendations: string[];
}

// Supported output formats
type AuditFormat = 'human' | 'json' | 'csv' | 'html' | 'sql' | 'syslog';
type AuditAction = 'ACCESS' | 'MODIFY' | 'DELETE' | 'EXPORT';
type AuditStatus = 'SUCCESS' | 'FAILED' | 'REJECTED';
```

---

## 📝 Detailed Implementation Steps

### Step 1: Database Initialization

**File**: `src/@inspection/commands/audit-engine.ts`

```typescript
import { Database } from 'bun:sqlite';

class AuditEngine {
  private db: Database;
  private dbPath: string;
  private redactionEngine: SecurityRedactionEngine;
  
  constructor(redactionEngine: SecurityRedactionEngine, dbPath = 'audit.db') {
    this.redactionEngine = redactionEngine;
    this.dbPath = dbPath;
  }
  
  async initialize(): Promise<void> {
    // Open database connection
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
    
    // Create schema
    this.createSchema();
  }
  
  private createSchema(): void {
    // Main audit logs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('ACCESS', 'MODIFY', 'DELETE', 'EXPORT')),
        resource TEXT NOT NULL,
        user TEXT,
        status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED', 'REJECTED')),
        changes_before JSON,
        changes_after JSON,
        diff_text TEXT,
        context_ip TEXT,
        context_user_agent TEXT,
        context_session_id TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_timestamp (timestamp),
        INDEX idx_action (action),
        INDEX idx_user (user),
        INDEX idx_resource (resource),
        INDEX idx_status (status)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS audit_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
    `);
  }
}
```

### Step 2: Event Logging

**Implement core logging functionality**:

```typescript
async logEvent(entry: AuditEntry): Promise<void> {
  // Validate input
  if (!entry.id || !entry.timestamp || !entry.action) {
    throw new Error('Invalid audit entry: missing required fields');
  }
  
  // Apply redaction if needed
  let redactedEntry = { ...entry };
  if (entry.user || entry.changes) {
    const redaction = this.redactionEngine.applyRedaction(entry, {
      categories: ['pii', 'security'],
      severity: 'low',
      preserveStructure: true
    });
    redactedEntry = redaction.redacted;
  }
  
  // Insert into database
  const stmt = this.db.prepare(`
    INSERT INTO audit_logs (
      id, timestamp, action, resource, user, status,
      changes_before, changes_after, diff_text,
      context_ip, context_user_agent, context_session_id,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    redactedEntry.id,
    redactedEntry.timestamp,
    redactedEntry.action,
    redactedEntry.resource,
    redactedEntry.user || null,
    redactedEntry.status,
    redactedEntry.changes?.before ? JSON.stringify(redactedEntry.changes.before) : null,
    redactedEntry.changes?.after ? JSON.stringify(redactedEntry.changes.after) : null,
    redactedEntry.changes?.diff?.join('\n') || null,
    redactedEntry.context?.ip || null,
    redactedEntry.context?.userAgent || null,
    redactedEntry.context?.sessionId || null,
    redactedEntry.metadata ? JSON.stringify(redactedEntry.metadata) : null
  );
}
```

### Step 3: Query Events

**Implement audit log retrieval**:

```typescript
async queryEvents(criteria: AuditQuery): Promise<AuditEntry[]> {
  // Build WHERE clause
  const whereConditions: string[] = [];
  const params: any[] = [];
  
  if (criteria.startTime) {
    whereConditions.push('timestamp >= ?');
    params.push(criteria.startTime);
  }
  
  if (criteria.endTime) {
    whereConditions.push('timestamp <= ?');
    params.push(criteria.endTime);
  }
  
  if (criteria.user) {
    whereConditions.push('user = ?');
    params.push(criteria.user);
  }
  
  if (criteria.action) {
    whereConditions.push('action = ?');
    params.push(criteria.action);
  }
  
  if (criteria.resource) {
    whereConditions.push('resource LIKE ?');
    params.push(`%${criteria.resource}%`);
  }
  
  if (criteria.status) {
    whereConditions.push('status = ?');
    params.push(criteria.status);
  }
  
  // Build query
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';
    
  const limit = criteria.limit || 1000;
  const offset = criteria.offset || 0;
  
  const query = `
    SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;
  
  const stmt = this.db.prepare(query);
  const rows = stmt.all(...params, limit, offset);
  
  // Convert rows back to AuditEntry objects
  return rows.map(row => this.rowToEntry(row));
}

private rowToEntry(row: any): AuditEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action as AuditAction,
    resource: row.resource,
    user: row.user,
    status: row.status as AuditStatus,
    changes: {
      before: row.changes_before ? JSON.parse(row.changes_before) : undefined,
      after: row.changes_after ? JSON.parse(row.changes_after) : undefined,
      diff: row.diff_text ? row.diff_text.split('\n') : undefined
    },
    context: {
      ip: row.context_ip,
      userAgent: row.context_user_agent,
      sessionId: row.context_session_id
    },
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  };
}
```

### Step 4: Export Functionality

**Implement multi-format export**:

```typescript
async exportLogs(format: AuditFormat, criteria?: AuditQuery): Promise<string> {
  const events = await this.queryEvents(criteria || {});
  
  switch (format) {
    case 'json':
      return JSON.stringify(events, null, 2);
    
    case 'csv':
      return this.formatCSV(events);
    
    case 'html':
      return this.formatHTML(events);
    
    case 'sql':
      return this.formatSQL(events);
    
    case 'syslog':
      return this.formatSyslog(events);
    
    case 'human':
    default:
      return this.formatHuman(events);
  }
}

private formatCSV(events: AuditEntry[]): string {
  const headers = ['timestamp', 'action', 'resource', 'user', 'status', 'result'];
  const rows = events.map(e => [
    e.timestamp,
    e.action,
    e.resource,
    e.user || '',
    e.status,
    e.changes ? 'modified' : 'unchanged'
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${v}"`).join(','))
  ].join('\n');
  
  return csv;
}

private formatSQL(events: AuditEntry[]): string {
  const sql = events.map(e => `
    INSERT INTO audit_logs (id, timestamp, action, resource, user, status, metadata)
    VALUES ('${e.id}', '${e.timestamp}', '${e.action}', '${e.resource}', '${e.user || null}', '${e.status}', '${JSON.stringify(e.metadata || {})}');
  `).join('\n');
  
  return sql;
}

private formatHuman(events: AuditEntry[]): string {
  const summary = {
    total: events.length,
    byAction: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  };
  
  events.forEach(e => {
    summary.byAction[e.action] = (summary.byAction[e.action] || 0) + 1;
    summary.byStatus[e.status] = (summary.byStatus[e.status] || 0) + 1;
  });
  
  let output = '📋 AUDIT LOG REPORT\n';
  output += '═════════════════════════════════════════\n';
  output += `Total Events: ${summary.total}\n\n`;
  
  Object.entries(summary.byAction).forEach(([action, count]) => {
    output += `${action} Events: ${count}\n`;
  });
  
  output += '\n📊 STATUS:\n';
  Object.entries(summary.byStatus).forEach(([status, count]) => {
    const pct = ((count / summary.total) * 100).toFixed(1);
    output += `  ${status}: ${count} (${pct}%)\n`;
  });
  
  return output;
}

private formatSyslog(events: AuditEntry[]): string {
  return events.map(e => {
    const timestamp = new Date(e.timestamp).toISOString();
    return `${timestamp} audit[${e.id}]: ACTION=${e.action} RESOURCE=${e.resource} USER=${e.user} STATUS=${e.status}`;
  }).join('\n');
}

private formatHTML(events: AuditEntry[]): string {
  // Return basic HTML audit table
  let html = `<!DOCTYPE html>
<html>
<head><title>Audit Log</title><style>
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
.SUCCESS { color: green; }
.FAILED { color: red; }
.REJECTED { color: orange; }
</style></head>
<body>
<h1>Audit Log Report</h1>
<table>
<tr><th>Timestamp</th><th>Action</th><th>Resource</th><th>User</th><th>Status</th><th>Details</th></tr>
`;
  
  events.forEach(e => {
    html += `<tr>
    <td>${e.timestamp}</td>
    <td>${e.action}</td>
    <td>${e.resource}</td>
    <td>${e.user || '-'}</td>
    <td class="${e.status}">${e.status}</td>
    <td>${e.changes ? 'Modified' : 'Accessed'}</td>
  </tr>`;
  });
  
  html += '</table></body></html>';
  return html;
}
```

### Step 5: Report Generation

**Implement report builder**:

```typescript
async generateReport(timeRange: TimeRange): Promise<AuditReport> {
  const query: AuditQuery = {
    startTime: timeRange.start,
    endTime: timeRange.end,
    limit: 10000
  };
  
  const events = await this.queryEvents(query);
  
  const summary = {
    totalEvents: events.length,
    eventsByAction: {} as Record<string, number>,
    eventsByStatus: {} as Record<string, number>,
    eventsByUser: {} as Record<string, number>
  };
  
  const warnings: string[] = [];
  
  events.forEach(e => {
    summary.eventsByAction[e.action] = (summary.eventsByAction[e.action] || 0) + 1;
    summary.eventsByStatus[e.status] = (summary.eventsByStatus[e.status] || 0) + 1;
    if (e.user) {
      summary.eventsByUser[e.user] = (summary.eventsByUser[e.user] || 0) + 1;
    }
  });
  
  // Check for suspicious patterns
  const failedCount = summary.eventsByStatus['FAILED'] || 0;
  if (failedCount > events.length * 0.1) {
    warnings.push(`High failure rate: ${failedCount}/${events.length}`);
  }
  
  const deletedCount = summary.eventsByAction['DELETE'] || 0;
  if (deletedCount >= 10) {
    warnings.push(`Significant deletions detected: ${deletedCount} events`);
  }
  
  return {
    period: timeRange,
    summary,
    events,
    warnings,
    recommendations: this.generateRecommendations(summary)
  };
}

private generateRecommendations(summary: any): string[] {
  const recommendations: string[] = [];
  
  if (Object.keys(summary.eventsByUser).length < 3) {
    recommendations.push('Consider multi-user audit logging');
  }
  
  if ((summary.eventsByStatus['FAILED'] || 0) > 0) {
    recommendations.push('Review and remediate failed audit events');
  }
  
  return recommendations;
}
```

---

## 📋 Sub-Commands Implementation

### Command: `fw audit log --export=<file>`

```typescript
static async handleLogExport(options: any): Promise<void> {
  const engine = new AuditEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const logs = await engine.exportLogs(options.format || 'json');
  
  if (options.export) {
    await Bun.write(options.export, logs);
    console.log(`✅ Exported to ${options.export}`);
  } else {
    console.log(logs);
  }
}
```

### Command: `fw audit timeline --start=<date> --end=<date>`

```typescript
static async handleTimeline(options: any): Promise<void> {
  const engine = new AuditEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const report = await engine.generateReport({
    start: options.start,
    end: options.end
  });
  
  console.log(await engine.exportLogs('human'));
}
```

### Command: `fw audit user --user=<id>`

```typescript
static async handleUserAudit(options: any): Promise<void> {
  const engine = new AuditEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const events = await engine.queryEvents({
    user: options.user,
    limit: 500
  });
  
  console.log(`Found ${events.length} events for user: ${options.user}`);
  console.log(JSON.stringify(events, null, 2));
}
```

---

## ✅ Testing Checklist

- [ ] Database initialization works
- [ ] Audit entry logging succeeds
- [ ] Query with various criteria returns correct results
- [ ] All export formats generate valid output
- [ ] PII redaction applied to logs
- [ ] Report generation identifies patterns
- [ ] Sub-commands execute without errors
- [ ] Binary size remains < 10MB

---

## 🚀 Integration with Ultimate CLI

Add to `src/@inspection/ultimate-cli.ts`:

```typescript
import { AuditEngine } from './commands/audit-engine.js';

export class UltimateInspectCLI {
  async handleAuditCommand(args: string[]): Promise<void> {
    const subcommand = args[0] || 'default';
    const options = this.parseAuditArgs(args);
    
    const engine = new AuditEngine(SecurityRedactionEngine);
    await engine.initialize();
    
    switch (subcommand) {
      case 'log':
        return AuditEngine.handleLogExport(options);
      case 'timeline':
        return AuditEngine.handleTimeline(options);
      case 'user':
        return AuditEngine.handleUserAudit(options);
      case 'diff':
        return AuditEngine.handleDiff(options);
      default:
        const report = await engine.generateReport({
          start: options.startTime,
          end: options.endTime
        });
        console.log(JSON.stringify(report, null, 2));
    }
  }
}
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Log event write time | < 5ms |
| Query 1000 events | < 100ms |
| Export to JSON | < 200ms |
| Memory overhead | < 50MB |

---

## 📚 References

- Existing: `SecurityRedactionEngine` pattern
- Testing model: Look at `enhanced-query-engine.test.ts`
- Output examples: `ScopeFormatter` class

---

**Task Status**: READY FOR IMPLEMENTATION ✅