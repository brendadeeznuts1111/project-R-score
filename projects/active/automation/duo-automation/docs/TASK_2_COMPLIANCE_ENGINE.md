# 📋 TASK 2: Compliance Engine Implementation
## FactoryWager Ultimate Inspection CLI - Compliance Check Command

**Task ID**: TASK-2  
**Phase**: Phase 2 - Enterprise Compliance  
**Priority**: HIGH  
**Estimated Hours**: 18-22  
**Status**: READY FOR IMPLEMENTATION  

---

## 📌 Task Overview

Implement the `compliance-check` command engine with multi-standard compliance validation, policy enforcement, and compliance reporting for PCI-DSS, GDPR, HIPAA, SOC 2, ISO 27001, and CCPA standards.

### Deliverables
- ✅ ComplianceEngine class with multi-standard validation
- ✅ Compliance framework implementations (6+ standards)
- ✅ Policy enforcement and violation detection
- ✅ Compliance scoring and risk grading
- ✅ SQLite persistence for compliance history
- ✅ Multi-format compliance reports

---

## 🎯 Implementation Requirements

### File Location
```text
src/@inspection/commands/compliance-engine.ts
```

### Dependencies
- `bun:sqlite` - Native SQLite access
- `SecurityRedactionEngine` - PII/credential detection
- `ScopeAnalytics` - Statistical compliance analysis
- `ScopeFormatter` - Report formatting
- Built-in Node/Bun APIs (crypto, fs)

### Size Constraints
- Max file size: 450 lines
- Must stay within <10MB binary total

---

## 🏗️ Architecture Design

### Core Classes

```typescript
// Main compliance engine
export class ComplianceEngine {
  private db: Database;
  private frameworks: Map<ComplianceStandard, ComplianceFramework>;
  private redactionEngine: SecurityRedactionEngine;
  
  async initialize(): Promise<void>
  async validateResource(resource: any, standard: ComplianceStandard): Promise<ComplianceAssessment>
  async validateAll(resource: any): Promise<Map<ComplianceStandard, ComplianceAssessment>>
  async generateReport(assessments: Map<ComplianceStandard, ComplianceAssessment>): Promise<ComplianceReport>
  async enforcePolicy(policy: CompliancePolicy): Promise<PolicyEnforcementResult>
}

// Compliance standards
type ComplianceStandard = 'PCI-DSS' | 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'CCPA';

// Compliance framework
interface ComplianceFramework {
  standard: ComplianceStandard;
  version: string;
  controls: ComplianceControl[];
  validate(resource: any): Promise<ComplianceAssessment>;
}

// Individual control
interface ComplianceControl {
  id: string;                    // e.g., "PCI-DSS-1.1"
  name: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  testFunction: (resource: any) => boolean | Promise<boolean>;
  remediation: string;
}

// Assessment result
interface ComplianceAssessment {
  standard: ComplianceStandard;
  timestamp: string;
  compliant: boolean;
  score: number;                 // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passedControls: number;
  failedControls: number;
  violations: ComplianceViolation[];
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

// Violation details
interface ComplianceViolation {
  controlId: string;
  controlName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  remediation: string;
  evidenceOfViolation?: any;
}

// Policy definition
interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  standards: ComplianceStandard[];
  rules: PolicyRule[];
  enforced: boolean;
}

// Policy rule
interface PolicyRule {
  id: string;
  condition: (resource: any) => boolean;
  action: 'WARN' | 'BLOCK' | 'LOG' | 'REMEDIATE';
  message: string;
}

// Compliance report
interface ComplianceReport {
  timestamp: string;
  resourceId: string;
  assessments: Map<ComplianceStandard, ComplianceAssessment>;
  overallCompliance: number;     // 0-100
  overallGrade: string;
  criticalViolations: ComplianceViolation[];
  recommendations: string[];
  nextAuditDate: string;
}

// Policy enforcement result
interface PolicyEnforcementResult {
  policyId: string;
  enforced: boolean;
  violations: string[];
  actions: string[];
  timestamp: string;
}
```

---

## 📝 Detailed Implementation Steps

### Step 1: Database Schema for Compliance History

```typescript
import { Database } from 'bun:sqlite';

class ComplianceEngine {
  private db: Database;
  private dbPath: string;
  private frameworks: Map<ComplianceStandard, ComplianceFramework>;
  private redactionEngine: SecurityRedactionEngine;
  
  constructor(redactionEngine: SecurityRedactionEngine, dbPath = 'compliance.db') {
    this.redactionEngine = redactionEngine;
    this.dbPath = dbPath;
    this.frameworks = new Map();
  }
  
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.db.run('PRAGMA foreign_keys = ON');
    this.createSchema();
    await this.loadFrameworks();
  }
  
  private createSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS compliance_assessments (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        standard TEXT NOT NULL CHECK(standard IN ('PCI-DSS', 'GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'CCPA')),
        compliant BOOLEAN NOT NULL,
        score INTEGER NOT NULL,
        grade TEXT NOT NULL,
        passed_controls INTEGER,
        failed_controls INTEGER,
        risk_level TEXT,
        violations JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_timestamp (timestamp),
        INDEX idx_standard (standard),
        INDEX idx_resource (resource_id),
        INDEX idx_compliant (compliant)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS compliance_policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        standards JSON NOT NULL,
        rules JSON NOT NULL,
        enforced BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS compliance_violations (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        control_id TEXT NOT NULL,
        control_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT,
        remediation TEXT,
        evidence JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(assessment_id) REFERENCES compliance_assessments(id)
      ) STRICT;
    `);
  }
  
  private async loadFrameworks(): Promise<void> {
    // Load compliance frameworks
    this.frameworks.set('PCI-DSS', new PCIDSSFramework());
    this.frameworks.set('GDPR', new GDPRFramework());
    this.frameworks.set('HIPAA', new HIPAAFramework());
    this.frameworks.set('SOC2', new SOC2Framework());
    this.frameworks.set('ISO27001', new ISO27001Framework());
    this.frameworks.set('CCPA', new CCPAFramework());
  }
}
```

### Step 2: PCI-DSS Framework Implementation

```typescript
class PCIDSSFramework implements ComplianceFramework {
  standard: ComplianceStandard = 'PCI-DSS';
  version = '3.2.1';
  controls: ComplianceControl[] = [
    {
      id: 'PCI-DSS-1.1',
      name: 'Network Segmentation',
      description: 'Establish and implement a firewall configuration',
      severity: 'CRITICAL',
      testFunction: (resource) => this.testNetworkSegmentation(resource),
      remediation: 'Implement network segments and access controls'
    },
    {
      id: 'PCI-DSS-2.1',
      name: 'Default Credentials',
      description: 'Remove default vendor-supplied credentials',
      severity: 'CRITICAL',
      testFunction: (resource) => this.testDefaultCredentials(resource),
      remediation: 'Change all default passwords and credentials'
    },
    {
      id: 'PCI-DSS-3.2',
      name: 'Data Encryption',
      description: 'Render PAN unreadable in all environments',
      severity: 'CRITICAL',
      testFunction: (resource) => this.testDataEncryption(resource),
      remediation: 'Implement encryption for cardholder data'
    },
    {
      id: 'PCI-DSS-6.2',
      name: 'Security Updates',
      description: 'Install security patches within defined timeframe',
      severity: 'HIGH',
      testFunction: (resource) => this.testSecurityUpdates(resource),
      remediation: 'Apply latest security patches within 30 days'
    },
    {
      id: 'PCI-DSS-8.1',
      name: 'Access Control',
      description: 'Implement strong access control measures',
      severity: 'HIGH',
      testFunction: (resource) => this.testAccessControl(resource),
      remediation: 'Implement MFA and role-based access controls'
    },
    {
      id: 'PCI-DSS-10.1',
      name: 'Audit Logging',
      description: 'Implement logging for all access to systems',
      severity: 'HIGH',
      testFunction: (resource) => this.testAuditLogging(resource),
      remediation: 'Enable comprehensive audit logging'
    }
  ];
  
  async validate(resource: any): Promise<ComplianceAssessment> {
    const violations: ComplianceViolation[] = [];
    let passed = 0;
    
    for (const control of this.controls) {
      try {
        const result = await control.testFunction(resource);
        if (!result) {
          violations.push({
            controlId: control.id,
            controlName: control.name,
            severity: control.severity,
            message: `Failed: ${control.description}`,
            remediation: control.remediation
          });
        } else {
          passed++;
        }
      } catch (error) {
        violations.push({
          controlId: control.id,
          controlName: control.name,
          severity: control.severity,
          message: `Error testing: ${error.message}`,
          remediation: control.remediation
        });
      }
    }
    
    const score = Math.round((passed / this.controls.length) * 100);
    const grade = this.calculateGrade(score);
    
    return {
      standard: 'PCI-DSS',
      timestamp: new Date().toISOString(),
      compliant: violations.length === 0,
      score,
      grade,
      passedControls: passed,
      failedControls: violations.length,
      violations,
      riskLevel: this.calculateRiskLevel(violations)
    };
  }
  
  private testNetworkSegmentation(resource: any): boolean {
    return resource.firewall !== undefined && resource.firewall.enabled === true;
  }
  
  private testDefaultCredentials(resource: any): boolean {
    const defaultPasswords = ['admin', 'password', '12345', 'root'];
    if (resource.credentials) {
      return !defaultPasswords.includes(resource.credentials.password?.toLowerCase());
    }
    return true;
  }
  
  private testDataEncryption(resource: any): boolean {
    return resource.encryption !== undefined && resource.encryption.enabled === true;
  }
  
  private testSecurityUpdates(resource: any): boolean {
    if (!resource.lastSecurityUpdate) return false;
    const daysSinceUpdate = (Date.now() - new Date(resource.lastSecurityUpdate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 30;
  }
  
  private testAccessControl(resource: any): boolean {
    return resource.mfaEnabled === true && resource.rbacEnabled === true;
  }
  
  private testAuditLogging(resource: any): boolean {
    return resource.auditLog !== undefined && resource.auditLog.enabled === true;
  }
  
  private calculateGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  private calculateRiskLevel(violations: ComplianceViolation[]): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
    const hasCritical = violations.some(v => v.severity === 'CRITICAL');
    if (hasCritical) return 'CRITICAL';
    
    const hasHigh = violations.some(v => v.severity === 'HIGH');
    if (hasHigh) return 'HIGH';
    
    const hasMedium = violations.some(v => v.severity === 'MEDIUM');
    if (hasMedium) return 'MEDIUM';
    
    return violations.length > 0 ? 'LOW' : 'NONE';
  }
}
```

### Step 3: GDPR Framework Implementation

```typescript
class GDPRFramework implements ComplianceFramework {
  standard: ComplianceStandard = 'GDPR';
  version = '2018/679';
  controls: ComplianceControl[] = [
    {
      id: 'GDPR-5.1',
      name: 'Data Minimization',
      description: 'Process only necessary personal data',
      severity: 'HIGH',
      testFunction: (resource) => this.testDataMinimization(resource),
      remediation: 'Review and limit data collection policies'
    },
    {
      id: 'GDPR-13',
      name: 'Transparency',
      description: 'Provide clear privacy notices',
      severity: 'HIGH',
      testFunction: (resource) => this.testTransparency(resource),
      remediation: 'Implement transparent privacy policies'
    },
    {
      id: 'GDPR-32',
      name: 'Security Measures',
      description: 'Implement appropriate technical and organizational measures',
      severity: 'CRITICAL',
      testFunction: (resource) => this.testSecurityMeasures(resource),
      remediation: 'Implement GDPR-compliant security measures'
    },
    {
      id: 'GDPR-33',
      name: 'Breach Notification',
      description: 'Notify authorities within 72 hours',
      severity: 'CRITICAL',
      testFunction: (resource) => this.testBreachNotification(resource),
      remediation: 'Establish breach notification procedures'
    },
    {
      id: 'GDPR-17',
      name: 'Right to Be Forgotten',
      description: 'Enable data subject deletion requests',
      severity: 'HIGH',
      testFunction: (resource) => this.testRightToBeForgotten(resource),
      remediation: 'Implement data deletion mechanisms'
    }
  ];
  
  async validate(resource: any): Promise<ComplianceAssessment> {
    const violations: ComplianceViolation[] = [];
    let passed = 0;
    
    for (const control of this.controls) {
      try {
        const result = await control.testFunction(resource);
        if (!result) {
          violations.push({
            controlId: control.id,
            controlName: control.name,
            severity: control.severity,
            message: `Failed: ${control.description}`,
            remediation: control.remediation
          });
        } else {
          passed++;
        }
      } catch (error) {
        violations.push({
          controlId: control.id,
          controlName: control.name,
          severity: control.severity,
          message: `Error testing: ${error.message}`,
          remediation: control.remediation
        });
      }
    }
    
    const score = Math.round((passed / this.controls.length) * 100);
    const grade = this.calculateGrade(score);
    
    return {
      standard: 'GDPR',
      timestamp: new Date().toISOString(),
      compliant: violations.length === 0,
      score,
      grade,
      passedControls: passed,
      failedControls: violations.length,
      violations,
      riskLevel: this.calculateRiskLevel(violations)
    };
  }
  
  private testDataMinimization(resource: any): boolean {
    return resource.dataMinimization === true;
  }
  
  private testTransparency(resource: any): boolean {
    return resource.privacyNotice !== undefined && resource.privacyNotice.length > 0;
  }
  
  private testSecurityMeasures(resource: any): boolean {
    return resource.encryption !== undefined && resource.accessControl !== undefined;
  }
  
  private testBreachNotification(resource: any): boolean {
    return resource.breachNotificationPlan !== undefined;
  }
  
  private testRightToBeForgotten(resource: any): boolean {
    return resource.dataRetention !== undefined && resource.dataRetention.deletionCapability === true;
  }
  
  private calculateGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  private calculateRiskLevel(violations: ComplianceViolation[]): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
    const hasCritical = violations.some(v => v.severity === 'CRITICAL');
    if (hasCritical) return 'CRITICAL';
    const hasHigh = violations.some(v => v.severity === 'HIGH');
    if (hasHigh) return 'HIGH';
    return violations.length > 0 ? 'MEDIUM' : 'NONE';
  }
}
```

### Step 4: Compliance Assessment and Validation

```typescript
async validateResource(resource: any, standard: ComplianceStandard): Promise<ComplianceAssessment> {
  const framework = this.frameworks.get(standard);
  if (!framework) {
    throw new Error(`Unknown compliance standard: ${standard}`);
  }
  
  const assessment = await framework.validate(resource);
  
  // Persist to database
  const assessmentId = this.generateId();
  const stmt = this.db.prepare(`
    INSERT INTO compliance_assessments (
      id, timestamp, resource_id, standard, compliant, score, grade,
      passed_controls, failed_controls, risk_level, violations
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    assessmentId,
    assessment.timestamp,
    resource.id || 'unknown',
    standard,
    assessment.compliant ? 1 : 0,
    assessment.score,
    assessment.grade,
    assessment.passedControls,
    assessment.failedControls,
    assessment.riskLevel,
    JSON.stringify(assessment.violations)
  );
  
  return assessment;
}

async validateAll(resource: any): Promise<Map<ComplianceStandard, ComplianceAssessment>> {
  const assessments = new Map<ComplianceStandard, ComplianceAssessment>();
  
  for (const standard of ['PCI-DSS', 'GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'CCPA'] as ComplianceStandard[]) {
    try {
      const assessment = await this.validateResource(resource, standard);
      assessments.set(standard, assessment);
    } catch (error) {
      console.error(`Error validating ${standard}:`, error);
    }
  }
  
  return assessments;
}
```

### Step 5: Report Generation and Policy Enforcement

```typescript
async generateReport(assessments: Map<ComplianceStandard, ComplianceAssessment>): Promise<ComplianceReport> {
  const scores: number[] = [];
  const allViolations: ComplianceViolation[] = [];
  const criticalViolations: ComplianceViolation[] = [];
  
  assessments.forEach(assessment => {
    scores.push(assessment.score);
    allViolations.push(...assessment.violations);
    const critical = assessment.violations.filter(v => v.severity === 'CRITICAL');
    criticalViolations.push(...critical);
  });
  
  const overallScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  
  const overallGrade = this.calculateGrade(overallScore);
  
  const recommendations = this.generateRecommendations(allViolations);
  
  return {
    timestamp: new Date().toISOString(),
    resourceId: 'compliance-report',
    assessments,
    overallCompliance: overallScore,
    overallGrade,
    criticalViolations,
    recommendations,
    nextAuditDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

private calculateGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

private generateRecommendations(violations: ComplianceViolation[]): string[] {
  const recommendations: string[] = [];
  
  const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
  if (criticalViolations.length > 0) {
    recommendations.push(`Address ${criticalViolations.length} critical violations immediately`);
  }
  
  violations.forEach(v => {
    if (v.remediation && !recommendations.includes(v.remediation)) {
      recommendations.push(v.remediation);
    }
  });
  
  recommendations.push('Schedule compliance review in 30 days');
  recommendations.push('Update incident response procedures');
  
  return recommendations;
}

async enforcePolicy(policy: CompliancePolicy): Promise<PolicyEnforcementResult> {
  const violations: string[] = [];
  const actions: string[] = [];
  
  for (const rule of policy.rules) {
    try {
      const ruleViolated = rule.condition({});
      if (ruleViolated) {
        violations.push(`Policy rule ${rule.id}: ${rule.message}`);
        actions.push(`Action: ${rule.action}`);
      }
    } catch (error) {
      violations.push(`Error evaluating rule ${rule.id}: ${error.message}`);
    }
  }
  
  return {
    policyId: policy.id,
    enforced: policy.enforced,
    violations,
    actions,
    timestamp: new Date().toISOString()
  };
}

private generateId(): string {
  return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## 📋 Sub-Commands Implementation

### Command: `fw compliance-check validate --standard=<pci-dss|gdpr|hipaa|soc2|iso27001|ccpa>`

```typescript
static async handleValidate(options: any): Promise<void> {
  const engine = new ComplianceEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const assessment = await engine.validateResource({}, options.standard);
  console.log(JSON.stringify(assessment, null, 2));
}
```

### Command: `fw compliance-check all`

```typescript
static async handleAll(options: any): Promise<void> {
  const engine = new ComplianceEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const assessments = await engine.validateAll({});
  const report = await engine.generateReport(assessments);
  console.log(JSON.stringify(report, null, 2));
}
```

---

## ✅ Testing Checklist

- [ ] Database initialization works
- [ ] PCI-DSS controls validate correctly
- [ ] GDPR controls validate correctly
- [ ] HIPAA controls validate correctly
- [ ] SOC 2 controls validate correctly
- [ ] ISO 27001 controls validate correctly
- [ ] CCPA controls validate correctly
- [ ] Compliance assessments persist to database
- [ ] Reports generate with correct scoring
- [ ] Policy enforcement works
- [ ] Binary size remains < 10MB

---

## 🚀 Integration with Ultimate CLI

Add to `src/@inspection/ultimate-cli.ts`:

```typescript
import { ComplianceEngine } from './commands/compliance-engine.js';

export class UltimateInspectCLI {
  async handleComplianceCommand(args: string[]): Promise<void> {
    const subcommand = args[0] || 'all';
    const options = this.parseComplianceArgs(args);
    
    const engine = new ComplianceEngine(SecurityRedactionEngine);
    await engine.initialize();
    
    switch (subcommand) {
      case 'validate':
        return ComplianceEngine.handleValidate(options);
      case 'all':
        return ComplianceEngine.handleAll(options);
      case 'enforce':
        return ComplianceEngine.handleEnforcePolicy(options);
      case 'history':
        return ComplianceEngine.handleHistory(options);
      default:
        console.log('Unknown compliance sub-command');
    }
  }
}
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Single standard validation | < 50ms |
| All 6 standards validation | < 300ms |
| Report generation | < 100ms |
| Policy enforcement | < 20ms |
| Memory overhead | < 100MB |

---

## 📚 References

- TASK_1_AUDIT_ENGINE.md for implementation patterns
- SecurityRedactionEngine for data protection
- Compliance standards documentation (PCI-DSS, GDPR, HIPAA, SOC 2, ISO 27001, CCPA)

---

**Task Status**: READY FOR IMPLEMENTATION ✅