# 📚 Risk Assessment Command User Guide
## FactoryWager Ultimate Inspection CLI

Welcome! This guide will help you use the `risk-assessment` command to identify threats, detect vulnerabilities, score risks, and get actionable remediation recommendations.

---

## 🚀 Quick Start

### Run Quick Risk Assessment
```bash
fw risk-assessment assess
```

### Generate Risk Report
```bash
fw risk-assessment report --export=risk-report.html
```

### Detect Threats
```bash
fw risk-assessment threats
```

---

## 📋 Available Sub-Commands

### 1. `fw risk-assessment assess` - Run Risk Assessment
**Purpose**: Conduct a comprehensive risk assessment of your systems

**Usage**:
```bash
fw risk-assessment assess
fw risk-assessment assess --sensitivity=8 --format=json
```

**Output Example**:
```text
🔍 RISK ASSESSMENT SUMMARY
═════════════════════════════════════════════════

Assessment Date: 2026-01-15T10:30:00Z
Overall Risk Score: 562/1000
Overall Risk Rating: HIGH

📊 RISK BREAKDOWN:
  🔴 CRITICAL: 3 risks
  🟠 HIGH: 8 risks
  🟡 MEDIUM: 12 risks
  🟢 LOW: 5 risks

⚠️  CRITICAL THREATS (3):
  1. SQL Injection Vulnerability
     Likelihood: 8/10 | Impact: 9/10 | Exploitability: 8/10
     Risk Score: 576/1000
     Recommendation: Implement parameterized queries immediately

  2. Unpatched OpenSSL
     Likelihood: 7/10 | Impact: 10/10 | Exploitability: 9/10
     Risk Score: 630/1000
     Recommendation: Update OpenSSL to v3.0.8+ within 24 hours

  3. Default Credentials
     Likelihood: 9/10 | Impact: 8/10 | Exploitability: 9/10
     Risk Score: 648/1000
     Recommendation: Change all default passwords immediately

⏱️  Assessment Time: 1.2s
```

**Options**:
- `--sensitivity=<1-10>` - Data sensitivity rating (default: 5)
- `--format=<FORMAT>` - Output format (json, csv, html, human, default: human)
- `--export=<FILE>` - Export to file

---

### 2. `fw risk-assessment report` - Generate Risk Report
**Purpose**: Create detailed risk report with recommendations and remediation timeline

**Usage**:
```bash
fw risk-assessment report
fw risk-assessment report --format=html --export=executive-risk-summary.html
```

**Report Contents**:
- Executive summary
- Risk scoring breakdown
- Threat analysis
- Vulnerability findings
- Prioritized recommendations
- Remediation roadmap
- Timeline and effort estimates

---

### 3. `fw risk-assessment threats` - Detect Active Threats
**Purpose**: Identify specific threats present in your environment

**Usage**:
```bash
fw risk-assessment threats
fw risk-assessment threats --format=json --confidence=0.8
```

**Output Example**:
```text
🎯 THREAT DETECTION REPORT
═════════════════════════════════════════════════

Threats Scanned: 6
Threats Detected: 3
Assessment Confidence: 91%

🔴 DETECTED THREATS:

1. SQL Injection (THREAT-001)
   Category: EXTERNAL
   Status: ✅ DETECTED
   Confidence: 98%
   Likelihood: 8/10 | Impact: 9/10 | Exploitability: 8/10
   Description: Attacker injects malicious SQL code
   Evidence: Unvalidated user input in database queries
   
2. Cross-Site Scripting - XSS (THREAT-002)
   Category: EXTERNAL
   Status: ✅ DETECTED
   Confidence: 85%
   Likelihood: 7/10 | Impact: 8/10 | Exploitability: 7/10
   Description: Injection of malicious scripts into web pages
   Evidence: HTML/JavaScript patterns in user input
   
3. Privilege Escalation (THREAT-006)
   Category: EXTERNAL
   Status: ✅ DETECTED
   Confidence: 72%
   Likelihood: 6/10 | Impact: 9/10 | Exploitability: 8/10
   Description: Attacker gains elevated access
   Evidence: Unusual permission changes detected

🟢 THREATS NOT DETECTED:
  • Brute Force Attack (THREAT-003)
  • Insider Threat (THREAT-004)
  • Data Exfiltration (THREAT-005)
```

**Options**:
- `--confidence=<0.0-1.0>` - Minimum confidence threshold (default: 0.5)
- `--format=<FORMAT>` - Output format (json, csv, html, human, default: human)
- `--category=<CATEGORY>` - Filter by threat category (EXTERNAL, INTERNAL, MALICIOUS, ACCIDENTAL)

---

### 4. `fw risk-assessment vulnerabilities` - Scan for Vulnerabilities
**Purpose**: Identify known vulnerabilities in your systems

**Usage**:
```bash
fw risk-assessment vulnerabilities
fw risk-assessment vulnerabilities --severity=critical
fw risk-assessment vulnerabilities --format=csv --export=vuln-scan.csv
```

**Output Example**:
```text
🛡️  VULNERABILITY SCAN REPORT
═════════════════════════════════════════════════

Scan Date: 2026-01-15T10:30:00Z
Vulnerabilities Found: 4
CVSS Score Range: 6.1 - 9.9

🔴 CRITICAL (2):
  CVE-2023-0002: SQL Injection in Legacy Code
  CVSS Score: 9.9
  Description: Unsanitized user input in database queries
  Affected Systems: Database Layer
  Remediation Steps:
    1. Implement parameterized queries
    2. Code review of query construction
    3. Comprehensive testing

  CVE-2023-0001: Unpatched OpenSSL Vulnerability
  CVSS Score: 9.8
  Description: Remote code execution in OpenSSL
  Affected Systems: Linux, Windows
  Remediation Steps:
    1. Update OpenSSL to v3.0.8+
    2. Restart services
    3. Verify functionality

🟠 HIGH (1):
  CVE-2023-0003: Weak Password Policy
  CVSS Score: 7.5
  Description: Insufficient password requirements
  Affected Systems: Authentication
  Remediation Steps:
    1. Enforce strong password policy (min 12 chars)
    2. Implement multi-factor authentication
    3. Regular password rotation

🟡 MEDIUM (1):
  CVE-2023-0004: Missing Security Headers
  CVSS Score: 6.1
  Description: HTTP security headers not configured
  Affected Systems: Web Application
  Remediation Steps:
    1. Configure Content Security Policy (CSP)
    2. Add X-Frame-Options header
    3. Add X-Content-Type-Options header
```

**Options**:
- `--severity=<critical|high|medium|low>` - Filter by severity
- `--format=<FORMAT>` - Output format (json, csv, html, syslog, human, default: human)
- `--export=<FILE>` - Export to file

---

### 5. `fw risk-assessment history` - View Risk History
**Purpose**: Track how risk scores change over time

**Usage**:
```bash
fw risk-assessment history
fw risk-assessment history --months=6 --format=json
```

**Output Example**:
```text
📈 RISK ASSESSMENT HISTORY
═════════════════════════════════════════════════

Jan 2026: 562/1000 (HIGH) ⚠️  ↓ -18pts
Dec 2025: 580/1000 (HIGH) ⚠️  ↑ +12pts
Nov 2025: 568/1000 (HIGH) ⚠️  ↔ Same
Oct 2025: 568/1000 (HIGH) ⚠️  ↑ +45pts
Sep 2025: 523/1000 (HIGH) ⚠️  ↓ -8pts
Aug 2025: 531/1000 (MEDIUM) 🟡

Trend: IMPROVING (but still HIGH risk)
```

---

## 🎯 Risk Scoring Model

### The Formula
```text
Risk Score = (Likelihood × Impact × Exploitability) × Data Sensitivity
```

### Components Explained

**Likelihood (1-10)**
- How probable is the threat?
- 1-2: Very unlikely
- 3-4: Unlikely
- 5-6: Moderate chance
- 7-8: Likely
- 9-10: Very likely

**Impact (1-10)**
- How severe would the damage be?
- 1-2: Minimal impact
- 3-4: Minor damage
- 5-6: Significant impact
- 7-8: Major damage
- 9-10: Critical/catastrophic

**Exploitability (1-10)**
- How easy is it to exploit?
- 1-2: Very difficult
- 3-4: Difficult
- 5-6: Moderate difficulty
- 7-8: Easy
- 9-10: Very easy

**Data Sensitivity (1-10)**
- How sensitive is the data at risk?
- 1-2: Public data
- 3-4: Internal data
- 5-6: Confidential data
- 7-8: Sensitive personal data
- 9-10: Critical PII/financial data

### Risk Score Interpretation

| Score | Rating | Color | Action Required |
|-------|--------|-------|-----------------|
| 800+ | CRITICAL | 🔴 | Immediate remediation (1-7 days) |
| 500-799 | HIGH | 🟠 | Urgent remediation (1-4 weeks) |
| 200-499 | MEDIUM | 🟡 | Plan remediation (1-3 months) |
| <200 | LOW | 🟢 | Schedule remediation (3-6 months) |

---

## 📊 Common Threat Models

### External Threats

**SQL Injection (THREAT-001)**
- Likelihood: 8/10
- Impact: 9/10
- Exploitability: 8/10
- Description: Attacker injects malicious SQL code
- Example: `'; DROP TABLE users; --`

**Cross-Site Scripting (THREAT-002)**
- Likelihood: 7/10
- Impact: 8/10
- Exploitability: 7/10
- Description: Malicious scripts injected into web pages
- Example: `<script>alert('XSS')</script>`

**Brute Force Attack (THREAT-003)**
- Likelihood: 6/10
- Impact: 7/10
- Exploitability: 9/10
- Description: Repeated login attempts to guess credentials
- Prevention: MFA, rate limiting

**Privilege Escalation (THREAT-006)**
- Likelihood: 6/10
- Impact: 9/10
- Exploitability: 8/10
- Description: Attacker gains elevated access
- Prevention: Principle of least privilege

### Internal Threats

**Insider Threat (THREAT-004)**
- Likelihood: 3/10
- Impact: 9/10
- Exploitability: 6/10
- Description: Malicious actions by authorized users
- Prevention: Access controls, auditing

### Malicious Threats

**Data Exfiltration (THREAT-005)**
- Likelihood: 5/10
- Impact: 10/10
- Exploitability: 7/10
- Description: Unauthorized data extraction
- Prevention: DLP, monitoring

---

## 💡 Common Use Cases

### Use Case 1: Pre-Deployment Risk Assessment
**Goal**: Verify system is ready for production

```bash
# Run comprehensive risk assessment
fw risk-assessment assess --sensitivity=9 --format=html --export=pre-deployment-risk.html

# Identify critical threats
fw risk-assessment threats --confidence=0.8

# Scan for known vulnerabilities
fw risk-assessment vulnerabilities --severity=critical
```

**Exit Criteria**: Overall risk score < 400 (MEDIUM) with 0 CRITICAL vulnerabilities

---

### Use Case 2: Threat Hunting Investigation
**Goal**: Detect specific threats in environment

```bash
# Detect all threats
fw risk-assessment threats --format=json

# Focus on external threats
fw risk-assessment threats --category=EXTERNAL --confidence=0.8

# Export for incident response team
fw risk-assessment threats --format=json --export=threat-analysis.json
```

---

### Use Case 3: Vulnerability Management Program
**Goal**: Track and remediate vulnerabilities systematically

```bash
# Get vulnerability baseline
fw risk-assessment vulnerabilities --format=csv > baseline.csv

# After remediation efforts
fw risk-assessment vulnerabilities --format=csv > after-remediation.csv

# Compare improvements
diff baseline.csv after-remediation.csv
```

---

### Use Case 4: Compliance Risk Assessment
**Goal**: Satisfy audit requirements for risk management

```bash
# Executive risk report
fw risk-assessment report --format=html --export=audit-risk-report.html

# Track improvements over time
fw risk-assessment history --months=12 --format=json

# Detailed vulnerability inventory
fw risk-assessment vulnerabilities --format=csv --export=vuln-inventory.csv
```

---

## 📈 Risk Management Dashboard

### Daily Monitoring
```bash
# Quick risk check
fw risk-assessment assess --format=json | jq '.overallRiskScore'
```

### Weekly Summary
```bash
# Generate weekly report
fw risk-assessment report --export=weekly-risk-$(date +%Y-%m-%d).html
```

### Monthly Trend
```bash
# Track monthly progress
fw risk-assessment history --months=1 --format=json
```

---

## 🔧 Remediation Workflow

### Step 1: Identify Risks
```bash
fw risk-assessment assess --format=json > risks.json
```

### Step 2: Prioritize by Severity
- Sort by risk score (highest first)
- Group by CRITICAL, HIGH, MEDIUM, LOW

### Step 3: Plan Remediation
- Estimate effort for each risk
- Allocate resources
- Create timeline

### Step 4: Execute Remediation
- Follow remediation steps
- Document changes
- Test thoroughly

### Step 5: Verify Fixes
```bash
fw risk-assessment assess --format=json > after-remediation.json
diff risks.json after-remediation.json
```

### Step 6: Monitor Progress
```bash
# Schedule weekly checks
fw risk-assessment history --months=1
```

---

## 🔐 Security Best Practices

### 1. Defense in Depth
- Don't rely on single control
- Layer multiple security measures
- Test each layer independently

### 2. Principle of Least Privilege
- Grant minimum necessary permissions
- Regularly audit access
- Remove unused accounts

### 3. Defense Strategy by Risk Level

**CRITICAL Risks**:
- Implement compensating control immediately
- Assign senior engineer
- Expected resolution: 1-7 days
- Daily monitoring

**HIGH Risks**:
- Create detailed mitigation plan
- Assign experienced engineer
- Expected resolution: 1-4 weeks
- Weekly status updates

**MEDIUM Risks**:
- Schedule within next quarter
- Standard development process
- Expected resolution: 1-3 months
- Monthly tracking

**LOW Risks**:
- Include in normal maintenance
- Standard process
- Expected resolution: 3-6 months
- Quarterly review

---

## 📚 Remediation Examples

### Example 1: SQL Injection (CRITICAL)
**Detection**: Risk Score 576/1000

**Remediation Steps**:
1. Identify all database queries with user input
2. Implement parameterized queries/prepared statements
3. Add input validation
4. Implement output encoding
5. Test with SQL injection test cases
6. Deploy to production
7. Monitor for exploitation attempts

**Verification**:
```bash
fw risk-assessment threats | grep "SQL Injection"
# Should show "NOT DETECTED" after remediation
```

### Example 2: Weak Password Policy (HIGH)
**Detection**: Risk Score 450/1000

**Remediation Steps**:
1. Enforce minimum 12-character passwords
2. Require mixed case, numbers, symbols
3. Implement password expiration policy
4. Deploy multi-factor authentication
5. Notify users and reset sensitive accounts
6. Monitor for failed login attempts

**Verification**:
```bash
fw risk-assessment vulnerabilities | grep "Password"
# Should be removed or downgraded after implementation
```

---

## 🐛 Troubleshooting

### Issue: Risk Score Doesn't Change
**Solution**:
```bash
# Verify data sensitivity is correctly set
fw risk-assessment assess --sensitivity=10

# Check if system state actually changed
fw risk-assessment history
```

### Issue: Too Many Vulnerabilities
**Solution**:
```bash
# Filter by severity and focus on critical
fw risk-assessment vulnerabilities --severity=critical

# Create phased remediation plan
# - Phase 1: Critical items (1-7 days)
# - Phase 2: High items (1-4 weeks)
# - Phase 3: Medium items (ongoing)
```

### Issue: Threat Detection False Positives
**Solution**:
```bash
# Increase confidence threshold
fw risk-assessment threats --confidence=0.9

# Review detected threat context
fw risk-assessment threats --format=json | jq '.threats[] | select(.confidence < 0.8)'
```

---

## 📊 Performance Tips

### Large Scale Assessments
```bash
# Run in background
nohup fw risk-assessment assess --format=json > risk-report.json &

# Monitor progress
tail -f risk-report.json
```

### Scheduled Assessments
```bash
# Daily risk check at 2 AM
0 2 * * * fw risk-assessment assess --format=json >> /var/log/risk-daily.log

# Weekly report
0 9 * * 1 fw risk-assessment report --export=/reports/weekly-risk-$(date +\%Y-\%m-\%d).html
```

---

## 📚 Related Commands

- `fw audit` - View system activity logs
- `fw compliance-check` - Validate compliance standards
- `fw inspect` - System inspection

---

## 📖 Additional Resources

- OWASP Risk Assessment Framework: https://owasp.org/
- CVSS Scoring Guide: https://www.first.org/cvss/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- CIS Controls: https://www.cisecurity.org/cis-controls/
- SANS Top 25: https://www.sans.org/

---

**For more help**: `fw risk-assessment --help`