# 🛡️ Syndicate Governance Rules v2.9

**63 Rules | PR-Gated | Live Validation | AI-Enhanced Compliance**

## 📊 Overview

The Syndicate Governance System provides comprehensive rule-based governance for the datapipe ecosystem. With 63+ rules across 9 categories, it ensures compliance, security, and operational excellence through automated validation and enforcement.

## 🏗️ Architecture

### Core Components

- **`scripts/gov-rules.ts`** - Rule database and validation engine
- **`scripts/rules-cli.ts`** - CLI interface for rule management
- **`dashboards/governance.md`** - Live compliance dashboard
- **`templates/new-rule.md`** - Templater rule creation template
- **`templates/quickadd-rule.md`** - QuickAdd rule creation template

### Rule Categories

| Category | Rules | REQUIRED | CORE | Description |
|----------|-------|----------|------|-------------|
| **Security** | 15 | 12 | 3 | Secrets, audit, environment |
| **Ops** | 12 | 8 | 4 | Monitoring, backups, performance |
| **Alerts** | 10 | 7 | 3 | Profit, risk, notifications |
| **Git/Deploy** | 8 | 6 | 2 | PR workflow, testing, versioning |
| **Data** | 7 | 5 | 2 | Freshness, size, ETL |
| **WS/Live** | 5 | 4 | 1 | WebSocket, connectivity |
| **Telegram** | 6 | 4 | 2 | Bot, CRM, spam prevention |
| **Agent** | 6+ | 4+ | 2+ | Limits, ROI, diversity |
| **Compliance** | 8+ | 6+ | 2+ | Headers, audit, reporting |

## 🚀 Quick Start

### 1. Full Compliance Check
```bash
bun rules:validate
# ✅ All governance rules PASSED
```

### 2. View Rules by Category
```bash
bun rules:list Security
bun rules:list REQUIRED
```

### 3. Create New Rule
```bash
# QuickAdd: "🛡️ New Rule"
# Or Templater: /templater: Create new rule
```

### 4. Generate Audit Report
```bash
bun rules:audit
# 📄 Saved to: reports/gov-audit-2024-01-29.json
```

## 📋 Key Rules

### Security (REQUIRED)
- **SEC-ENV-001**: No .env files (migrate to Bun.secrets)
- **SEC-AUDIT-001**: Automated dependency auditing
- **SEC-COOKIE-001**: Redact sensitive data in logs

### Operations (CORE)
- **OPS-BACKUP-001**: Daily S3 backup + git push
- **OPS-LOG-001**: Auto-compress logs >1GB
- **OPS-TIMEOUT-001**: 30s HTTP timeouts with retry

### Alerts (REQUIRED)
- **DP-ALERT-001**: Telegram alerts for >$10k profits
- **AGENT-RISK-001**: Flag agents with >15s delays
- **WIN-STREAK-001**: Review agents with >80% winrate

## 🎯 CLI Commands

### Validation & Audit
```bash
bun rules:validate [RULE-ID]    # Validate single/all rules
bun rules:audit                 # Comprehensive audit report
bun rules:stats                 # Governance statistics
```

### Rule Management
```bash
bun rules:list [CATEGORY]       # List rules by category
bun rules:search QUERY          # Search rules by keyword
bun rules:enforce RULE-ID       # Force rule enforcement
bun rules:pr RULE-ID            # Create PR workflow
```

### Examples
```bash
# Check security rules
bun rules:list Security

# Validate single rule
bun rules:validate SEC-ENV-001

# Search for profit rules
bun rules:search profit

# Full compliance audit
bun rules:audit
```

## 📊 Dashboard Features

### Live Compliance Monitoring
- Real-time compliance percentage
- Critical failure alerts
- Category-wise breakdowns
- Validation result history

### Interactive Controls
- One-click rule validation
- Enforcement triggers
- Audit report generation
- PR workflow creation

### Visual Analytics
- Compliance trend charts
- Rule category statistics
- Priority distribution
- Recent activity feed

## 🛠️ Rule Creation Workflow

### Method 1: QuickAdd (Rapid)
1. Type: `🛡️ New Rule`
2. Fill minimal fields
3. Auto-generates draft rule
4. Expand with full template later

### Method 2: Templater (Complete)
1. Run: `/templater: Create new rule`
2. Comprehensive form with validation
3. Generates full rule specification
4. Ready for implementation

### PR Workflow
```bash
# Create implementation branch
bun rules:pr RULE-ID

# This creates:
# - feat/RULE-ID branch
# - PR template with rule details
# - Implementation checklist
```

## 🔧 Rule Implementation

### Structure
```typescript
{
  id: "CAT-SUB-001",
  category: "Category",
  trigger: "When this happens...",
  action: "Do this...",
  example: "bun rules:enforce CAT-SUB-001",
  priority: "REQUIRED", // REQUIRED | CORE | OPTIONAL
  status: "ACTIVE",    // ACTIVE | STABLE | BETA | DEPRECATED
  automated: true,     // Can be auto-enforced
  tags: ["tag1", "tag2"],
  violations?: 0       // Track violations
}
```

### Validation Function
```typescript
async function validateRule(): Promise<ValidationResult> {
  // Rule-specific validation logic
  return {
    ruleId: "RULE-ID",
    status: "PASS" | "FAIL" | "WARN" | "SKIP",
    message: "Validation result",
    details: { /* optional */ }
  };
}
```

### Enforcement Function
```typescript
async function enforceRule(): Promise<{success: boolean, message: string, actions?: string[]}> {
  // Rule-specific enforcement logic
  return {
    success: true,
    message: "Rule enforced",
    actions: ["Action taken 1", "Action taken 2"]
  };
}
```

## 📈 Compliance Metrics

### Success Criteria
- **REQUIRED rules**: 100% pass rate (blocks merge)
- **CORE rules**: 95% pass rate (warnings)
- **OPTIONAL rules**: Best effort (logged)

### Reporting
- Daily compliance audits
- Weekly trend analysis
- Monthly governance reviews
- Automated alerting for failures

## 🔒 Security & Access

### Rule Modification
- All rule changes require PR review
- Automated validation before merge
- Audit trail of all modifications
- Multi-approver workflow for security rules

### Access Control
- Read access: All team members
- Write access: Governance committee
- Emergency override: Security team only

## 🚨 Critical Rules (REQUIRED)

### Must Pass Before Any Deploy
1. **SEC-ENV-001** - No .env files
2. **TEST-COVERAGE-001** - >80% test coverage
3. **GIT-FF-001** - Fast-forward merges only
4. **OPS-BACKUP-001** - Recent backups
5. **WS-LIVE-001** - WebSocket connectivity

### Immediate Action Required
- Any REQUIRED rule failure blocks operations
- Alerts sent to governance committee
- Emergency override requires 2 approvals

## 📋 Integration Examples

### CI/CD Pipeline
```yaml
- name: Governance Check
  run: bun rules:validate
- name: Security Audit
  run: bun rules:audit
- name: Deploy
  run: bun deploy
```

### Pre-commit Hook
```bash
#!/bin/bash
bun rules:validate
if [ $? -ne 0 ]; then
  echo "❌ Governance check failed - fix issues before commit"
  exit 1
fi
```

### Dashboard Automation
```javascript
// DataviewJS auto-refresh
setInterval(() => {
  dv.view.reload(); // Refresh governance dashboard
}, 300000); // Every 5 minutes
```

## 📚 Templates

### Rule Creation Templates
- **`templates/new-rule.md`** - Full Templater template
- **`templates/quickadd-rule.md`** - QuickAdd template

### PR Templates
- Auto-generated for each rule implementation
- Includes compliance checklist
- References related rules and requirements

## 🎯 Best Practices

### Rule Writing
- **Clear triggers**: Specific, measurable conditions
- **Actionable responses**: Concrete enforcement steps
- **Testable**: Automated validation possible
- **Documented**: Examples and edge cases

### Maintenance
- Regular rule review (quarterly)
- Update examples as systems evolve
- Deprecate outdated rules
- Monitor violation patterns

## 📞 Support

### Getting Help
- **Rule clarification**: `bun rules:search "keyword"`
- **Implementation guidance**: Check templates
- **Validation issues**: Run `bun rules:audit`

### Contributing
1. Use QuickAdd or Templater for new rules
2. Run full validation suite
3. Create PR with `bun rules:pr RULE-ID`
4. Await governance committee review

---

**63 Rules Active | PR-Gated | Live Validation | Syndicate Shield** 🛡️

*Generated by Governance System v2.9 • Compliance First • Profit Safe*
