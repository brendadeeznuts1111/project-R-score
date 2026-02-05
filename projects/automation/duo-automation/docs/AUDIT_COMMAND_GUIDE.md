# 📚 Audit Command User Guide
## FactoryWager Ultimate Inspection CLI

Welcome! This guide will help you use the `audit` command to track, monitor, and report on system activity with comprehensive audit logging capabilities.

---

## 🚀 Quick Start

### Basic Audit Command
```bash
fw audit
```

This runs a basic audit check on your system and displays summary statistics.

### View Audit Log
```bash
fw audit log
```

Displays all audit events in a human-readable format.

### Export Audit Data
```bash
fw audit log --export=audit-report.json
```

Exports audit logs to a JSON file for further analysis.

---

## 📋 Available Sub-Commands

### 1. `fw audit` - Main Audit Report
**Purpose**: Generate a comprehensive audit report with summary statistics

**Usage**:
```bash
fw audit
fw audit --start=2026-01-01 --end=2026-01-31
fw audit --format=json
```

**Output Example**:
```
📋 AUDIT LOG REPORT
═════════════════════════════════════════
Total Events: 1,245

ACCESS Events: 523
MODIFY Events: 487
DELETE Events: 156
EXPORT Events: 79

📊 STATUS:
  SUCCESS: 1,180 (94.8%)
  FAILED: 45 (3.6%)
  REJECTED: 20 (1.6%)
```

**Options**:
- `--start=<DATE>` - Start date (ISO8601 format, default: 7 days ago)
- `--end=<DATE>` - End date (ISO8601 format, default: today)
- `--format=<FORMAT>` - Output format (json, csv, html, human, default: human)

---

### 2. `fw audit log` - View Audit Logs
**Purpose**: Display audit log entries with filtering options

**Usage**:
```bash
fw audit log
fw audit log --user=admin123
fw audit log --action=DELETE --limit=50
fw audit log --export=logs.csv --format=csv
```

**Examples**:

**Get all audit logs**:
```bash
fw audit log
```

**Find all failed attempts**:
```bash
fw audit log --status=FAILED
```

**Export last 100 access events as CSV**:
```bash
fw audit log --action=ACCESS --limit=100 --format=csv --export=access-log.csv
```

**Options**:
- `--user=<ID>` - Filter by user
- `--action=<ACTION>` - Filter by action (ACCESS, MODIFY, DELETE, EXPORT)
- `--status=<STATUS>` - Filter by status (SUCCESS, FAILED, REJECTED)
- `--resource=<PATH>` - Filter by resource path
- `--limit=<NUMBER>` - Maximum events to return (default: 1000)
- `--offset=<NUMBER>` - Skip N events (default: 0)
- `--format=<FORMAT>` - Output format (json, csv, html, syslog, human, default: human)
- `--export=<FILE>` - Export to file

---

### 3. `fw audit timeline` - View Audit Timeline
**Purpose**: Visualize audit events over a time period

**Usage**:
```bash
fw audit timeline
fw audit timeline --start=2026-01-01 --end=2026-01-31
```

**Output Example**:
```
📅 AUDIT TIMELINE (Jan 2026)
═══════════════════════════════════════════

Jan 1:  ▓▓▓░░░░░░ (45 events)
Jan 2:  ▓▓▓▓░░░░░ (67 events)
Jan 3:  ▓▓▓▓▓░░░░ (89 events)
Jan 4:  ▓▓▓▓▓▓░░░ (123 events)
...
Jan 31: ▓▓▓▓░░░░░ (78 events)

Total: 1,245 events over 31 days
```

---

### 4. `fw audit user` - User Activity Report
**Purpose**: View all activity for a specific user

**Usage**:
```bash
fw audit user --user=admin123
fw audit user --user=john.doe --format=json
```

**Output Example**:
```
👤 USER ACTIVITY: admin123
═══════════════════════════════════════════

Total Actions: 234
Activity Span: 2026-01-01 to 2026-01-15

📊 ACTION BREAKDOWN:
  ACCESS:  123 (52.6%)
  MODIFY:  78  (33.3%)
  DELETE:  25  (10.7%)
  EXPORT:  8   (3.4%)

⏰ BUSIEST HOURS:
  09:00-10:00: 34 events
  14:00-15:00: 28 events
  16:00-17:00: 25 events

🔴 WARNINGS:
  - 12 failed authentication attempts
  - 3 mass delete operations detected
```

**Options**:
- `--user=<ID>` - User to analyze (required)
- `--start=<DATE>` - Start date
- `--end=<DATE>` - End date
- `--format=<FORMAT>` - Output format (json, csv, html, human, default: human)

---

### 5. `fw audit diff` - Compare Audit Events
**Purpose**: Show differences between two time periods or resources

**Usage**:
```bash
fw audit diff --start=2026-01-01 --end=2026-01-15
fw audit diff --resource=/api/users
```

**Output Example**:
```
🔄 AUDIT DIFFERENCE REPORT
═══════════════════════════════════════════

Period 1: 2025-12-01 to 2025-12-31
Period 2: 2026-01-01 to 2026-01-15

📈 CHANGES:
  Total Events:  1,200 → 1,245 (+3.8%)
  Failures:      40 → 45 (+12.5%)
  User Count:    15 → 18 (+20%)
  Active Hours:  8h → 9h (+12.5%)

🔍 NEW PATTERNS:
  - Increased evening activity (6 PM - 8 PM)
  - New user: sarah.smith started 2026-01-10
  - DELETE actions increased 5x
```

---

## 📊 Common Use Cases

### Use Case 1: Compliance Audit
**Requirement**: Generate audit log for SOC 2 compliance

```bash
# Generate monthly audit report
fw audit log \
  --start=2025-12-01 \
  --end=2025-12-31 \
  --format=html \
  --export=soc2-audit-december.html

# Get access logs for sensitive resources
fw audit log \
  --resource=/api/admin \
  --format=csv \
  --export=admin-access-log.csv
```

### Use Case 2: Security Investigation
**Requirement**: Investigate failed login attempts

```bash
# Find all failed authentication events
fw audit log \
  --action=ACCESS \
  --status=FAILED \
  --start=2026-01-14 \
  --format=json \
  --export=failed-logins.json

# Analyze specific user activity
fw audit user --user=suspect-user --format=html
```

### Use Case 3: Data Access Monitoring
**Requirement**: Track data export events

```bash
# Generate GDPR data access report
fw audit log \
  --action=EXPORT \
  --format=syslog \
  --export=data-access.log

# Find large data transfers
fw audit log --action=EXPORT --user=analyst1
```

### Use Case 4: Performance Analysis
**Requirement**: Understand peak activity times

```bash
# Get activity timeline
fw audit timeline --start=2026-01-01 --end=2026-01-31

# Compare monthly trends
fw audit diff \
  --start=2025-11-01 \
  --end=2025-11-30 \
  --format=json
```

---

## 🔍 Output Formats

### JSON Format
**Best for**: Programmatic processing, dashboards

```bash
fw audit log --format=json
```

**Output**:
```json
{
  "events": [
    {
      "id": "evt_12345",
      "timestamp": "2026-01-15T10:30:00Z",
      "action": "MODIFY",
      "resource": "/api/users/123",
      "user": "admin@example.com",
      "status": "SUCCESS",
      "changes": {
        "before": {"role": "user"},
        "after": {"role": "admin"}
      }
    }
  ],
  "summary": {
    "total": 1245,
    "byAction": {"ACCESS": 523, "MODIFY": 487, ...}
  }
}
```

### CSV Format
**Best for**: Excel, data analysis

```bash
fw audit log --format=csv --export=audit.csv
```

**Sample**:
```
timestamp,action,resource,user,status,result
2026-01-15T10:30:00Z,MODIFY,/api/users/123,admin@example.com,SUCCESS,modified
2026-01-15T10:29:45Z,ACCESS,/api/users,viewer@example.com,SUCCESS,unchanged
2026-01-15T10:29:30Z,DELETE,/api/sessions/abc,admin@example.com,SUCCESS,deleted
```

### HTML Format
**Best for**: Reports, presentations

```bash
fw audit log --format=html --export=audit-report.html
```

Generates a styled HTML report with:
- Summary statistics
- Interactive tables
- Charts
- Color-coded status

### Syslog Format
**Best for**: SIEM integration, log aggregation

```bash
fw audit log --format=syslog --export=audit.log
```

**Sample**:
```
2026-01-15T10:30:00Z audit[evt_12345]: ACTION=MODIFY RESOURCE=/api/users/123 USER=admin@example.com STATUS=SUCCESS
2026-01-15T10:29:45Z audit[evt_12346]: ACTION=ACCESS RESOURCE=/api/users USER=viewer@example.com STATUS=SUCCESS
```

---

## 🔐 Security Considerations

### PII Redaction
All personally identifiable information is automatically redacted in audit logs:
- Email addresses: `user@example.com` → `user@e*****.*`
- Full names: `John Smith` → `J*** S***`
- Phone numbers: `555-1234` → `555-****`
- Credit cards: `4111-1111-1111-1111` → `****-****-****-1111`

### Data Protection
- All audit data is encrypted at rest
- Sensitive data is masked in exports by default
- Use `--redact=false` to include full data (admin only)

---

## 📈 Performance Tips

### Large Log Sets
If you have millions of events, use pagination:

```bash
# Get events in chunks
fw audit log --limit=1000 --offset=0
fw audit log --limit=1000 --offset=1000
fw audit log --limit=1000 --offset=2000
```

### Archive Old Logs
```bash
# Export and archive logs older than 90 days
fw audit log --end=2025-10-15 --export=archive-q4-2025.json
```

### Database Optimization
```bash
# Vacuum database after large deletions (admin only)
fw audit maintenance --vacuum
```

---

## 🐛 Troubleshooting

### Issue: "No events found"
**Solution**:
```bash
# Check date range
fw audit --start=2026-01-01 --end=2026-01-31

# Verify user exists
fw audit user --user=known-user
```

### Issue: Export file too large
**Solution**:
```bash
# Export in smaller chunks
fw audit log --start=2026-01-15 --end=2026-01-16 --export=daily.json

# Use CSV format (smaller than JSON)
fw audit log --format=csv --export=audit.csv
```

### Issue: Database locked
**Solution**:
```bash
# Wait a few seconds and retry (audit operations are brief)
sleep 5
fw audit log
```

---

## 📚 Related Commands

- `fw inspect` - System inspection
- `fw compliance-check` - Compliance validation
- `fw risk-assessment` - Risk analysis

---

**For more help**: `fw audit --help`