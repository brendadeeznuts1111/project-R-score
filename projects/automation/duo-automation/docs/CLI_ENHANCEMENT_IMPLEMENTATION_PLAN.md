# 🎯 Enhanced CLI Features Implementation Plan
## FactoryWager Ultimate Inspection CLI - v2.1.0

**Document Version**: 1.0  
**Created**: January 15, 2026  
**Status**: Ready for Implementation  
**Priority**: High  

---

## 📋 Executive Summary

This document outlines the comprehensive implementation plan for enhancing the FactoryWager Ultimate Inspection CLI with three new enterprise-grade commands focused on security compliance:

### **New Commands to Add**
1. **audit** - Comprehensive data audit with detailed logging and insights
2. **compliance-check** - Multi-standard compliance validation (PCI-DSS, GDPR, HIPAA)
3. **risk-assessment** - Advanced threat modeling and risk scoring

### **Key Constraints**
- ✅ **Bun-native only** - No external dependencies
- ✅ **Zero dependencies** - Only Bun native APIs (bun:sqlite, HTTP, filesystem)
- ✅ **Lightweight** - Binary size must remain < 10MB
- ✅ **Full enterprise integration** - Integrate with existing inspection components

---

## 🏗️ Architecture Overview

### Current State
```
Ultimate CLI (v2.0)
├── inspect command
│   ├── Query Engines (JSONPath, JQ-lite)
│   ├── Security Redaction
│   ├── Output Formatters (7 formats)
│   ├── Analytics Engine
│   ├── Interactive TUI
│   └── Pattern Extraction
└── Support subsystems
    ├── Enhanced Query Engine
    ├── Security Redaction Engine
    ├── Scope Analytics
    └── Scope Formatter
```

### Enhanced State
```
Ultimate CLI (v2.1)
├── inspect command (existing)
├── audit command (NEW)
│   ├── Full data audit trail
│   ├── Change tracking
│   ├── Export audit logs
│   └── Compliance reporting
├── compliance-check command (NEW)
│   ├── PCI-DSS validation
│   ├── GDPR compliance check
│   ├── HIPAA assessment
│   ├── SOC 2 compliance
│   └── Custom policies
└── risk-assessment command (NEW)
    ├── Risk scoring engine
    ├── Threat modeling
    ├── Vulnerability detection
    ├── Remediation suggestions
    └── Risk reports
```

---

## 🎯 Phase 1: New Commands Architecture

### 1.1 Audit Command

**Purpose**: Create comprehensive audit trails for data access and modifications

**Core Functionality**:
```typescript
// Command: fw audit --data=<path> --output=<format> --timeline=<range>

interface AuditEntry {
  timestamp: ISO8601;
  action: 'ACCESS' | 'MODIFY' | 'DELETE' | 'EXPORT';
  user: string;
  resource: string;
  changes?: {
    before: any;
    after: any;
    diff: string[];
  };
  context: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  metadata: Record<string, any>;
}
```

**Sub-commands**:
- `fw audit log --export=<file>` - Export audit logs
- `fw audit timeline --start=<date> --end=<date>` - Time-range analysis
- `fw audit user --user=<id>` - User activity tracking
- `fw audit diff --file1=<path> --file2=<path>` - Change comparison

**Output Formats**:
- Standard: Human-readable audit report
- JSON: Machine-readable log dump
- CSV: Spreadsheet analysis
- HTML: Interactive audit dashboard
- SQL: Database insert statements

**Implementation Location**: `src/@inspection/commands/audit-engine.ts`

---

### 1.2 Compliance-Check Command

**Purpose**: Validate data against compliance frameworks

**Core Functionality**:
```typescript
// Command: fw compliance-check --standard=<standard> --data=<path> --detailed

enum ComplianceStandard {
  PCI_DSS = 'pci-dss',      // Payment Card Industry
  GDPR = 'gdpr',            // General Data Protection Regulation
  HIPAA = 'hipaa',          // Health Insurance Portability
  SOC2 = 'soc2',            // Service Organization Control
  ISO27001 = 'iso27001',    // Information Security Management
  CCPA = 'ccpa'             // California Consumer Privacy Act
}

interface ComplianceReport {
  standard: ComplianceStandard;
  score: number;            // 0-100
  status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
  checks: ComplianceCheck[];
  recommendations: string[];
  auditTimestamp: ISO8601;
  validUntil?: ISO8601;
}

interface ComplianceCheck {
  id: string;
  name: string;
  requirement: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'N/A';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: string[];
  remediation: string;
  evidence: any;
}
```

**Sub-commands**:
- `fw compliance-check --all` - Check all standards
- `fw compliance-check pci-dss` - PCI-DSS specific
- `fw compliance-check gdpr` - GDPR specific
- `fw compliance-check custom --policy=<file>` - Custom policies

**Compliance Mappings**:

| Standard | Focus Areas | Key Checks |
|----------|------------|-----------|
| **PCI-DSS** | Payment data protection | Encryption, access control, audit logs |
| **GDPR** | Data privacy, consent | Right to be forgotten, data minimization, consent |
| **HIPAA** | Health data protection | ePHI security, audit controls, breach notification |
| **SOC 2** | Security controls | Availability, processing integrity, confidentiality |
| **ISO 27001** | Information security | Asset management, access control, cryptography |
| **CCPA** | California privacy | Data access rights, deletion, sale prohibition |

**Implementation Location**: `src/@inspection/commands/compliance-engine.ts`

---

### 1.3 Risk-Assessment Command

**Purpose**: Identify, analyze, and score security risks

**Core Functionality**:
```typescript
// Command: fw risk-assessment --data=<path> --model=<model> --output=<format>

enum RiskSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

interface RiskAssessment {
  summary: {
    timestamp: ISO8601;
    overallRisk: RiskSeverity;
    riskScore: number;      // 0-100
    totalFindings: number;
  };
  risks: RiskFinding[];
  threats: ThreatModel[];
  vulnerabilities: Vulnerability[];
  recommendations: Recommendation[];
}

interface RiskFinding {
  id: string;
  type: string;
  severity: RiskSeverity;
  likelihood: number;      // 0-1
  impact: number;          // 0-1
  riskScore: number;       // likelihood * impact * 100
  description: string;
  location: string;
  affectedData: string[];
}

interface ThreatModel {
  threat: string;
  actor: string;
  motivation: string;
  capability: string;
  likelihood: number;
  mitigations: string[];
}

interface Vulnerability {
  cve?: string;
  type: string;
  severity: RiskSeverity;
  description: string;
  remediation: string;
  priority: 'IMMEDIATE' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Recommendation {
  priority: 'IMMEDIATE' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: string;
}
```

**Sub-commands**:
- `fw risk-assessment analyze` - Full risk analysis
- `fw risk-assessment threats --model=<model>` - Threat modeling
- `fw risk-assessment scan --pattern=<regex>` - Pattern-based scan
- `fw risk-assessment report --export=<file>` - Generate report

**Risk Scoring Model**:
```
Risk Score = (Likelihood × Impact × Exploitability) × Data Sensitivity

- Likelihood: 0.1 (rare) to 1.0 (certain)
- Impact: 0.1 (minor) to 1.0 (catastrophic)
- Exploitability: 0.1 (difficult) to 1.0 (trivial)
- Data Sensitivity: 0.5 (low) to 1.0 (critical)
```

**Threat Models**:
- Insider threat
- External attacker
- Accidental exposure
- Third-party compromise
- Supply chain attack

**Implementation Location**: `src/@inspection/commands/risk-assessment-engine.ts`

---

## 🔌 Phase 2: Integration with Existing Components

### 2.1 Integration Points

```typescript
// Integration Architecture
UltimateInspectCLI (v2.1)
├── Enhanced Query Engine
│   └── Used by: audit, compliance-check, risk-assessment
├── Security Redaction Engine
│   └── Used by: all commands (privacy protection)
├── Scope Analytics
│   └── Used by: audit (change analysis), risk-assessment (scoring)
├── Scope Formatter
│   └── Used by: all commands (output formatting)
└── Enhanced Interactive TUI
    └── Used by: compliance-check, risk-assessment (interactive reports)
```

### 2.2 Shared Services

**AuditLogger Service**:
```typescript
class AuditLogger {
  // Store audit entries in SQLite (bun:sqlite)
  private db: Database;
  
  log(entry: AuditEntry): void {
    // Persists audit entries for compliance
  }
  
  query(criteria: AuditQuery): AuditEntry[] {
    // Retrieve audit logs
  }
  
  export(format: 'json' | 'csv' | 'sql'): string {
    // Export for compliance reports
  }
}
```

**ComplianceService**:
```typescript
class ComplianceService {
  checkCompliance(data: any, standard: ComplianceStandard): ComplianceReport {
    // Uses existing redaction engine
    // Uses pattern extraction for evidence
  }
  
  validatePolicy(data: any, policy: Policy): ValidationResult {
    // Custom policy validation
  }
}
```

**RiskScoringService**:
```typescript
class RiskScoringService {
  assessRisk(data: any): RiskAssessment {
    // Uses analytics for baseline
    // Uses pattern extraction for threat identification
    // Uses redaction engine for sensitivity scoring
  }
  
  scorePattern(pattern: string, matches: any[]): RiskScore {
    // Pattern-specific risk calculation
  }
}
```

---

## 📦 Phase 3: Bun-Native Implementation Details

### 3.1 SQLite Integration (No External Dependencies)

```typescript
// Use Bun's native SQLite via bun:sqlite
import { Database } from 'bun:sqlite';

class AuditDatabase {
  private db: Database;
  
  constructor(dbPath: string = 'audit.db') {
    this.db = new Database(dbPath);
    this.initSchema();
  }
  
  private initSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        user TEXT,
        status TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_timestamp (timestamp),
        INDEX idx_action (action),
        INDEX idx_user (user)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS compliance_reports (
        id TEXT PRIMARY KEY,
        standard TEXT NOT NULL,
        score INTEGER,
        status TEXT,
        report JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id TEXT PRIMARY KEY,
        overall_risk TEXT,
        risk_score INTEGER,
        assessment JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      ) STRICT;
    `);
  }
}
```

### 3.2 Performance Optimization

**Constraints**:
- Binary size: < 10MB
- Memory usage: < 100MB for typical datasets
- Startup time: < 500ms
- Query time: < 1s for 10K records

**Optimization Strategies**:
1. **Lazy loading** - Don't load all data upfront
2. **Streaming** - Process large datasets in chunks
3. **Caching** - Cache compliance checks and risk scores
4. **Indexing** - SQLite indexes for common queries
5. **Minification** - Strip unnecessary code in production build

```typescript
// Example: Streaming large audit logs
async function* streamAuditLogs(query: string) {
  const db = new Database('audit.db');
  const stmt = db.prepare(query);
  const BATCH_SIZE = 1000;
  
  let offset = 0;
  while (true) {
    const rows = stmt.all({ 
      limit: BATCH_SIZE, 
      offset 
    });
    
    if (rows.length === 0) break;
    
    for (const row of rows) {
      yield row;
    }
    
    offset += BATCH_SIZE;
  }
}
```

### 3.3 File System Operations (bun:fs)

```typescript
// Use Bun's native file operations
async function exportAuditLogs(outputPath: string, format: 'json' | 'csv') {
  const content = format === 'json'
    ? JSON.stringify(logs, null, 2)
    : convertToCSV(logs);
  
  await Bun.write(outputPath, content);
}

// Read large files efficiently
async function readDataFile(path: string) {
  const file = Bun.file(path);
  return await file.json(); // Auto-detects format
}
```

---

## 📊 Phase 4: Output Formats

### 4.1 New Output Formats for New Commands

**Audit Command Formats**:
- `--format=human` - Readable audit timeline
- `--format=json` - Machine-readable log dump
- `--format=csv` - Spreadsheet format
- `--format=html` - Interactive dashboard with filters
- `--format=sql` - SQL INSERT statements for import
- `--format=syslog` - Syslog-compatible format

**Example Output**:
```
# Human Format
📋 AUDIT LOG REPORT
═══════════════════════════════════════
Period: 2024-01-15 00:00:00 - 2024-01-15 23:59:59
Total Events: 1,247

🔒 ACCESS Events (643):
  - 2024-01-15 10:30:45 | john.doe | accessed users table
  - 2024-01-15 10:31:12 | jane.smith | accessed audit logs
  ...

✏️  MODIFY Events (312):
  - 2024-01-15 11:15:30 | admin | updated user_roles
  ...

🗑️  DELETE Events (12):
  - 2024-01-15 14:45:20 | admin | deleted test_data
  ...

📊 SUMMARY:
   Success: 1,235 (98.9%)
   Failed: 12 (0.9%)
   Rejected: 0 (0%)
```

**Compliance-Check Formats**:
- `--format=report` - Detailed compliance report
- `--format=scorecard` - Executive summary scorecard
- `--format=html` - Interactive compliance dashboard
- `--format=json` - Machine-readable results
- `--format=pdf` - (Generated via HTML export)

**Risk-Assessment Formats**:
- `--format=summary` - Executive summary
- `--format=detailed` - Full vulnerability breakdown
- `--format=heatmap` - Risk matrix visualization (ASCII/HTML)
- `--format=timeline` - Risk evolution over time
- `--format=json` - Machine-readable assessment

---

## 🗄️ Phase 5: Database Schema

### 5.1 SQLite Tables

```sql
-- Audit Logs Table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('ACCESS', 'MODIFY', 'DELETE', 'EXPORT')),
  resource TEXT NOT NULL,
  user TEXT,
  status TEXT CHECK(status IN ('SUCCESS', 'FAILED', 'REJECTED')),
  changes_before JSON,
  changes_after JSON,
  context_ip TEXT,
  context_user_agent TEXT,
  context_session_id TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_action (action),
  INDEX idx_user (user),
  INDEX idx_resource (resource)
) STRICT;

-- Compliance Reports Table
CREATE TABLE compliance_reports (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  standard TEXT NOT NULL CHECK(standard IN ('PCI_DSS', 'GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'CCPA')),
  score INTEGER CHECK(score >= 0 AND score <= 100),
  status TEXT CHECK(status IN ('COMPLIANT', 'WARNING', 'NON_COMPLIANT')),
  findings TEXT,
  report JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  INDEX idx_standard (standard),
  INDEX idx_score (score)
) STRICT;

-- Risk Assessments Table
CREATE TABLE risk_assessments (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  overall_risk TEXT CHECK(overall_risk IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score INTEGER CHECK(risk_score >= 0 AND risk_score <= 100),
  total_findings INTEGER,
  critical_count INTEGER,
  high_count INTEGER,
  medium_count INTEGER,
  low_count INTEGER,
  assessment JSON,
  recommendations JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_overall_risk (overall_risk)
) STRICT;

-- Audit Events Archive (for long-term storage)
CREATE TABLE audit_archive (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  event_count INTEGER,
  compressed_data BLOB,
  INDEX idx_month (month)
) STRICT;
```

---

## 🛡️ Phase 6: Security Considerations

### 6.1 Encryption

```typescript
// Sensitive audit data encryption
class AuditEncryption {
  // Use Bun's built-in crypto APIs
  async encryptEntry(entry: AuditEntry): Promise<EncryptedEntry> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    const cipher = crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(entry))
    );
    
    return { iv: crypto.getRandomValues(iv), data: cipher };
  }
}
```

### 6.2 Access Control

```typescript
// Role-based access control for audit logs
interface AuditACL {
  role: 'ADMIN' | 'AUDITOR' | 'ANALYST' | 'VIEWER';
  permissions: {
    READ_AUDIT_LOGS: boolean;
    EXPORT_AUDIT_LOGS: boolean;
    VIEW_SENSITIVE_DATA: boolean;
    DELETE_AUDIT_LOGS: boolean;
  };
}
```

### 6.3 PII Redaction in Logs

```typescript
// Automatically redact PII using existing SecurityRedactionEngine
const auditEntry = {
  user: 'john.doe@example.com',  // Will be redacted
  resource: 'users/user-123',
  changes: {
    phone: '555-123-4567',  // Will be redacted
    email: 'john@example.com'  // Will be redacted
  }
};

// After redaction applied by security engine
const redactedEntry = {
  user: '***@***.***',
  resource: 'users/user-123',
  changes: {
    phone: '***-***-****',
    email: '***@***.***'
  }
};
```

---

## 📝 Phase 7: File Structure

```
src/@inspection/commands/
├── audit-engine.ts              (NEW - 400 lines)
├── compliance-engine.ts         (NEW - 600 lines)
├── risk-assessment-engine.ts    (NEW - 500 lines)
├── audit-formatters.ts          (NEW - 300 lines)
├── compliance-report-builder.ts (NEW - 250 lines)
├── risk-report-builder.ts       (NEW - 300 lines)
├── security-audit-logger.ts     (NEW - 200 lines)
├── enhanced-interactive-tui.ts  (EXISTING - extended)
└── [existing files...]

src/cli/
├── ultimate-cli.ts              (MODIFIED - add new commands)
├── package.json                 (MODIFIED - CLI entry points)
└── [existing files...]

docs/
├── CLI_ENHANCEMENT_IMPLEMENTATION_PLAN.md (THIS FILE)
├── AUDIT_COMMAND_GUIDE.md       (NEW)
├── COMPLIANCE_CHECK_GUIDE.md    (NEW)
└── RISK_ASSESSMENT_GUIDE.md     (NEW)

examples/
├── audit-cli-demo.ts            (NEW)
├── compliance-check-demo.ts     (NEW)
└── risk-assessment-demo.ts      (NEW)

tests/
├── audit-engine.test.ts         (NEW)
├── compliance-engine.test.ts    (NEW)
└── risk-assessment-engine.test.ts (NEW)
```

---

## 🎨 Phase 8: Usage Examples

### 8.1 Audit Command

```bash
# Basic audit
fw audit --data=./data.json

# Time-range audit
fw audit --start=2024-01-01 --end=2024-01-31 --format=html --output=jan_audit.html

# User activity tracking
fw audit user --user=john.doe --days=7

# Change comparison
fw audit diff --file1=backup_v1.json --file2=backup_v2.json

# Export for compliance
fw audit log --export=audit_export.sql --format=sql > audit_import.sql
```

### 8.2 Compliance-Check Command

```bash
# Check multiple standards
fw compliance-check --all --data=./data.json

# PCI-DSS specific check
fw compliance-check pci-dss --data=payment_data.json --detailed

# GDPR compliance with warnings
fw compliance-check gdpr --data=user_db.json --include-warnings

# Custom policy check
fw compliance-check custom --policy=./company_policy.yaml --data=./data.json

# Interactive compliance dashboard
fw compliance-check --interactive --output=compliance_dashboard.html
```

### 8.3 Risk-Assessment Command

```bash
# Full risk assessment
fw risk-assessment --data=./sensitive_data.json

# Threat modeling
fw risk-assessment threats --model=insider --output=threat_model.json

# Pattern-based vulnerability scan
fw risk-assessment scan --pattern="\b\d{4}[-\s]?\d{4}" --severity=HIGH

# Generate executive report
fw risk-assessment report --export=risk_report.pdf --format=executive_summary

# Real-time risk monitoring
fw risk-assessment --watch --alert-threshold=HIGH
```

---

## 📈 Implementation Timeline

### Week 1: Foundation
- [ ] Create AuditEngine with SQLite persistence
- [ ] Implement AuditLogger service
- [ ] Build audit output formatters

### Week 2: Compliance
- [ ] Implement ComplianceEngine
- [ ] Add PCI-DSS validation rules
- [ ] Add GDPR validation rules
- [ ] Build compliance report builders

### Week 3: Risk Assessment
- [ ] Implement RiskAssessmentEngine
- [ ] Build risk scoring model
- [ ] Add threat modeling engine
- [ ] Create risk report formatters

### Week 4: Integration & Testing
- [ ] Integrate with UltimateInspectCLI
- [ ] Write comprehensive tests
- [ ] Performance optimization
- [ ] Documentation and examples

---

## ✅ Success Criteria

- [ ] All three commands implemented and tested
- [ ] Binary size < 10MB
- [ ] Zero external dependencies (Bun-only)
- [ ] All existing tests still passing
- [ ] Full Bun-native performance achieved
- [ ] Comprehensive documentation available
- [ ] 3+ example demos working
- [ ] All edge cases handled

---

## 🚀 Next Steps

1. **Review this plan** with stakeholders
2. **Approve implementation timeline**
3. **Create detailed task breakdown** (See next section)
4. **Begin Phase 1 implementation** (Audit Engine)

---

## 📋 Detailed Task Breakdown

### Task 1: Audit Engine Implementation
- File: `src/@inspection/commands/audit-engine.ts`
- Lines: ~400
- Dependencies: bun:sqlite, existing logger
- Deliverables: Full audit logging with persistence

### Task 2: Compliance Engine Implementation
- File: `src/@inspection/commands/compliance-engine.ts`
- Lines: ~600
- Dependencies: AdvancedScopeInspector, SecurityRedactionEngine
- Deliverables: 6+ compliance standards support

### Task 3: Risk Assessment Engine
- File: `src/@inspection/commands/risk-assessment-engine.ts`
- Lines: ~500
- Dependencies: ScopeAnalytics, pattern extraction
- Deliverables: Risk scoring model with threat modeling

### Task 4: CLI Integration
- File: `src/@inspection/ultimate-cli.ts` (modified)
- Changes: Add 3 new command handlers
- Impact: Minimal, follows existing pattern

### Task 5: Output Formatters
- Files: 3 files (~850 lines total)
- Deliverables: All output format implementations

### Task 6: Testing & Documentation
- Files: 6+ test files, 3+ guide documents
- Coverage: 100% of new code paths
- Documentation: Comprehensive user guides

---

## 📞 Contact & Support

For questions about this implementation plan, refer to:
- Architecture: Look at existing inspection components
- Performance: Check existing CLI benchmarks
- Integration: Reference SecurityRedactionEngine pattern

---

**Document signed off**: READY FOR IMPLEMENTATION ✅