# 📚 Compliance Check Command User Guide
## FactoryWager Ultimate Inspection CLI

Welcome! This guide will help you use the `compliance-check` command to validate your systems against industry compliance standards including PCI-DSS, GDPR, HIPAA, SOC 2, ISO 27001, and CCPA.

---

## 🚀 Quick Start

### Check Single Standard
```bash
fw compliance-check validate --standard=pci-dss
```

### Check All Standards
```bash
fw compliance-check all
```

### Generate Compliance Report
```bash
fw compliance-check report --export=compliance-report.html
```

---

## 📋 Available Sub-Commands

### 1. `fw compliance-check validate` - Validate Single Standard
**Purpose**: Test compliance against a specific standard

**Usage**:
```bash
fw compliance-check validate --standard=pci-dss
fw compliance-check validate --standard=gdpr --format=json
```

**Supported Standards**:
- `pci-dss` - Payment Card Industry Data Security Standard
- `gdpr` - General Data Protection Regulation
- `hipaa` - Health Insurance Portability and Accountability Act
- `soc2` - Service Organization Control 2
- `iso27001` - ISO/IEC 27001 Information Security Management
- `ccpa` - California Consumer Privacy Act

**Output Example**:
```text
✅ PCI-DSS 3.2.1 COMPLIANCE CHECK
═════════════════════════════════════════════════

Overall Score: 85/100  [Grade: B]
Status: COMPLIANT (with exceptions)
Risk Level: MEDIUM

📋 CONTROL SUMMARY:
  ✅ Passed: 15 controls
  ❌ Failed: 3 controls
  ⚠️  Unknown: 0 controls

🔴 VIOLATIONS (3):
  1. PCI-DSS-1.1: Network Segmentation
     Status: FAILED
     Severity: CRITICAL
     Message: No firewall configuration found
     Remediation: Implement network segments and access controls

  2. PCI-DSS-3.2: Data Encryption
     Status: FAILED
     Severity: CRITICAL
     Message: Data encryption not enabled
     Remediation: Implement encryption for cardholder data

  3. PCI-DSS-6.2: Security Updates
     Status: FAILED
     Severity: HIGH
     Message: Security patches not current
     Remediation: Apply latest security patches within 30 days

⏱️  Assessment Time: 245ms
```

**Options**:
- `--standard=<STANDARD>` - Compliance standard (required)
- `--format=<FORMAT>` - Output format (json, csv, html, human, default: human)
- `--export=<FILE>` - Export to file

---

### 2. `fw compliance-check all` - Check All Standards
**Purpose**: Run comprehensive compliance check against all 6 standards

**Usage**:
```bash
fw compliance-check all
fw compliance-check all --format=html --export=comprehensive-audit.html
```

**Output Example**:
```text
🔍 COMPREHENSIVE COMPLIANCE ASSESSMENT
═════════════════════════════════════════════════

Assessment Date: 2026-01-15T10:30:00Z
Overall Compliance: 78% (Grade: C)

📊 STANDARD BREAKDOWN:
┌──────────────┬──────────┬───────┬──────────────────┐
│ Standard     │ Score    │ Grade │ Status           │
├──────────────┼──────────┼───────┼──────────────────┤
│ PCI-DSS      │ 85/100   │ B     │ ✅ Mostly Pass   │
│ GDPR         │ 72/100   │ C     │ ⚠️  Needs Work   │
│ HIPAA        │ 68/100   │ D     │ ⚠️  Needs Work   │
│ SOC2         │ 82/100   │ B     │ ✅ Mostly Pass   │
│ ISO 27001    │ 75/100   │ C     │ ⚠️  Needs Work   │
│ CCPA         │ 91/100   │ A     │ ✅ Passes        │
└──────────────┴──────────┴───────┴──────────────────┘

🎯 CRITICAL VIOLATIONS (5):
  • GDPR-32: Security Measures not fully implemented
  • HIPAA-164.308: Access controls incomplete
  • ISO 27001-A.9: Access rights management issues
  • PCI-DSS-3.2: Cardholder data encryption required
  • HIPAA-164.312: Technical safeguards needed

⏰ Next Audit Date: 2026-02-14 (30 days)
```

---

### 3. `fw compliance-check report` - Generate Executive Report
**Purpose**: Create a detailed compliance report for stakeholders

**Usage**:
```bash
fw compliance-check report
fw compliance-check report --format=html --export=q4-compliance.html
```

**Report Includes**:
- Executive summary
- Compliance scores for each standard
- All violations with severity
- Risk assessment
- Remediation roadmap
- Timeline

---

### 4. `fw compliance-check history` - View Compliance History
**Purpose**: Compare compliance over time

**Usage**:
```bash
fw compliance-check history
fw compliance-check history --standard=pci-dss --months=6
fw compliance-check history --format=json
```

**Output Example**:
```text
📈 COMPLIANCE HISTORY - PCI-DSS
═════════════════════════════════════════════════

Jan 2026: 85/100 (Grade: B) ✅ ↑ +3pts
Dec 2025: 82/100 (Grade: B) ✅ ↓ -2pts
Nov 2025: 84/100 (Grade: B) ✅ ↔ Same
Oct 2025: 84/100 (Grade: B) ✅ ↑ +4pts
Sep 2025: 80/100 (Grade: B) ✅ ↓ -1pts
Aug 2025: 81/100 (Grade: B) ✅ ↑ +2pts

Trend: IMPROVING (trend line chart would show progression)
```

---

### 5. `fw compliance-check enforce` - Apply Compliance Policy
**Purpose**: Enforce compliance policies on resources

**Usage**:
```bash
fw compliance-check enforce --policy=default
fw compliance-check enforce --policy=custom-policy.json
```

---

## 🏛️ Understanding Compliance Standards

### PCI-DSS (Payment Card Industry Data Security Standard)
**Version**: 3.2.1  
**Purpose**: Protect credit card holder data

**Key Controls**:
- Network segmentation and firewalls
- Default credential removal
- Cardholder data encryption
- Regular security updates
- Access control and MFA
- Comprehensive audit logging

**When to Use**: If you process, store, or transmit credit card data

**Example**:
```bash
fw compliance-check validate --standard=pci-dss
```

---

### GDPR (General Data Protection Regulation)
**Version**: 2018/679  
**Purpose**: Protect personal data of EU residents

**Key Controls**:
- Data minimization (collect only necessary data)
- Transparency (clear privacy notices)
- Appropriate security measures
- Breach notification (72 hours)
- Right to be forgotten (data deletion)

**When to Use**: If you process data of EU residents

**Example**:
```bash
fw compliance-check validate --standard=gdpr
```

---

### HIPAA (Health Insurance Portability and Accountability Act)
**Version**: Security Rule & Privacy Rule  
**Purpose**: Protect healthcare information

**Key Controls**:
- Encryption of health information
- Access controls and authentication
- Audit controls and logging
- Integrity controls
- Transmission security

**When to Use**: If you handle healthcare data

---

### SOC 2 (Service Organization Control 2)
**Type**: Compliance framework for service providers  
**Purpose**: Verify service provider security

**Trust Principles**:
- Security
- Availability
- Processing Integrity
- Confidentiality
- Privacy

**When to Use**: If you provide cloud services or data processing

---

### ISO 27001 (Information Security Management)
**Version**: 2022  
**Purpose**: Establish information security management system

**Key Areas**:
- Asset management
- Access control
- Cryptography
- Incident management
- Business continuity

**When to Use**: As comprehensive information security standard

---

### CCPA (California Consumer Privacy Act)
**Version**: 2018  
**Purpose**: Protect California residents' data privacy

**Key Requirements**:
- Consumer rights (access, delete, opt-out)
- Data minimization
- Security safeguards
- Breach notification
- Privacy policy requirements

**When to Use**: If you serve California residents

---

## 📊 Common Use Cases

### Use Case 1: Initial Compliance Assessment
**Goal**: Determine current compliance status across all standards

```bash
# Run comprehensive assessment
fw compliance-check all --format=html --export=initial-assessment.html

# Review violations in JSON format
fw compliance-check all --format=json > assessment.json
```

**Next Steps**:
1. Review violations in priority order
2. Identify quick wins (low-effort fixes)
3. Plan major remediation efforts
4. Create remediation timeline

---

### Use Case 2: Annual Audit Preparation
**Goal**: Prepare documentation for external auditors

```bash
# Validate against specific standard
fw compliance-check validate --standard=soc2 --export=soc2-audit.html

# Create comprehensive report
fw compliance-check report --export=annual-compliance-report.html

# Export controls mapping
fw compliance-check validate --standard=iso27001 --format=csv > iso27001-controls.csv
```

---

### Use Case 3: Remediation Verification
**Goal**: Verify fixes after remediation work

```bash
# Get baseline
fw compliance-check validate --standard=pci-dss > baseline.json

# After remediation...
fw compliance-check validate --standard=pci-dss > after-fixes.json

# Compare results
diff baseline.json after-fixes.json
```

---

### Use Case 4: Regulatory Reporting
**Goal**: Generate reports for regulatory requirements

```bash
# GDPR annual report
fw compliance-check validate --standard=gdpr --format=html --export=gdpr-2026-report.html

# CCPA compliance verification
fw compliance-check validate --standard=ccpa --format=csv --export=ccpa-compliance.csv

# Multi-standard summary
fw compliance-check all --format=html --export=regulatory-summary.html
```

---

## 🔍 Compliance Grades

### Grade Scale

| Grade | Score | Status | Action Required |
|-------|-------|--------|-----------------|
| **A** | 90-100 | ✅ Compliant | Maintain controls; annual review |
| **B** | 80-89 | ✅ Mostly Compliant | Address minor issues; review quarterly |
| **C** | 70-79 | ⚠️ Partial Compliance | Create remediation plan; review monthly |
| **D** | 60-69 | ❌ Needs Work | Urgent remediation required; weekly review |
| **F** | <60 | ❌ Critical | Immediate action; daily monitoring |

### Risk Levels

| Level | Definition | Remediation Timeline |
|-------|------------|----------------------|
| **CRITICAL** | Immediate threat to operations | 1-7 days |
| **HIGH** | Significant compliance gap | 1-4 weeks |
| **MEDIUM** | Notable deficiency | 1-3 months |
| **LOW** | Minor issue | 3-6 months |

---

## ✅ Best Practices

### 1. Regular Compliance Checks
```bash
# Weekly check
0 9 * * 1 fw compliance-check all >> compliance-log.txt

# Monthly detailed report
0 9 1 * * fw compliance-check report --export=monthly-report.html
```

### 2. Prioritize Violations
```bash
# Export violations by severity
fw compliance-check all --format=json | grep '"severity": "CRITICAL"'
```

### 3. Document Remediation
```bash
# Track before/after state
fw compliance-check validate --standard=pci-dss > before.json
# ... perform remediation ...
fw compliance-check validate --standard=pci-dss > after.json
```

### 4. Continuous Improvement
- Schedule weekly compliance monitor
- Monthly remediation reviews
- Quarterly compliance assessments
- Annual third-party audits

---

## 🔐 Security Considerations

### Data Protection
- All compliance data is encrypted at rest
- Sensitive findings are redacted in exports by default
- PII is masked in compliance reports

### Access Control
- Restrict compliance reports to authorized personnel
- Log all compliance check access
- Use role-based access for compliance data

### Audit Trail
```bash
# View who ran compliance checks
fw audit log --resource=/compliance --format=json
```

---

## 📈 Performance Tips

### Large Environments
```bash
# Check single standard first
fw compliance-check validate --standard=pci-dss

# Then expand to others
fw compliance-check validate --standard=gdpr
```

### Parallel Checks
```bash
# Run checks in background
fw compliance-check all &
fw compliance-check validate --standard=pci-dss &
```

---

## 🐛 Troubleshooting

### Issue: "Standard not found"
**Solution**:
```bash
# Verify supported standards (case-sensitive, lowercase)
fw compliance-check validate --standard=pci-dss  # ✅ Correct
fw compliance-check validate --standard=PCI-DSS  # ❌ Wrong
```

### Issue: Unable to access resources
**Solution**:
```bash
# Check permissions
fw compliance-check all --verbose

# Verify service account has access
fw inspect --path=/  # Test basic access
```

### Issue: Compliance score fluctuates
**Solution**:
```bash
# Check compliance history
fw compliance-check history --standard=pci-dss

# Review recent changes
fw audit log --resource=/compliance
```

---

## 📚 Related Commands

- `fw audit` - View detailed audit logs
- `fw risk-assessment` - Evaluate security risks
- `fw inspect` - System inspection

---

## 📖 Additional Resources

- [PCI-DSS Official Documentation](https://www.pcisecuritystandards.org/)
- [GDPR Official Text](https://gdpr-info.eu/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/)
- [SOC 2 Framework](https://us.aicpa.org/interestareas/informationsystems/fsp)
- [ISO 27001 Standard](https://www.iso.org/isoiec-27001-information-security-management.html)
- [CCPA Regulations](https://oag.ca.gov/privacy/ccpa)

---

**For more help**: `fw compliance-check --help`