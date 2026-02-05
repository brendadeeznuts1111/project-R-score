# 📋 TASK 3: Risk Assessment Engine Implementation
## FactoryWager Ultimate Inspection CLI - Risk Assessment Command

**Task ID**: TASK-3  
**Phase**: Phase 3 - Risk Management  
**Priority**: HIGH  
**Estimated Hours**: 20-24  
**Status**: READY FOR IMPLEMENTATION  

---

## 📌 Task Overview

Implement the `risk-assessment` command engine with threat modeling, vulnerability detection, risk scoring, and remediation recommendations using the formula: (Likelihood × Impact × Exploitability) × Data Sensitivity.

### Deliverables
- ✅ RiskAssessmentEngine class with risk scoring
- ✅ Threat model definitions and detection
- ✅ Vulnerability scanning and classification
- ✅ Risk scoring and grading system
- ✅ SQLite persistence for risk history
- ✅ Remediation recommendation engine
- ✅ Multi-format risk reports

---

## 🎯 Implementation Requirements

### File Location
```
src/@inspection/commands/risk-assessment-engine.ts
```

### Dependencies
- `bun:sqlite` - Native SQLite access
- `SecurityRedactionEngine` - Vulnerability data protection
- `ScopeAnalytics` - Risk analysis and statistics
- `ScopeFormatter` - Report formatting
- Built-in Node/Bun APIs (crypto, fs)

### Size Constraints
- Max file size: 500 lines
- Must stay within <10MB binary total

---

## 🏗️ Architecture Design

### Core Classes

```typescript
// Main risk assessment engine
export class RiskAssessmentEngine {
  private db: Database;
  private threatModels: ThreatModel[];
  private vulnerabilityDatabase: VulnerabilityEntry[];
  private redactionEngine: SecurityRedactionEngine;
  
  async initialize(): Promise<void>
  async assessRisks(resource: any): Promise<RiskAssessment>
  async detectThreats(resource: any): Promise<ThreatDetection[]>
  async scanVulnerabilities(resource: any): Promise<Vulnerability[]>
  async generateRiskReport(assessment: RiskAssessment): Promise<RiskReport>
  async recommendRemediations(risks: RiskAssessment): Promise<Remediation[]>
}

// Threat model definition
interface ThreatModel {
  id: string;                    // e.g., "THREAT-001"
  name: string;
  description: string;
  category: 'EXTERNAL' | 'INTERNAL' | 'ACCIDENTAL' | 'MALICIOUS';
  likelihood: number;            // 1-10
  impact: number;                // 1-10
  exploitability: number;        // 1-10
  detectability: (resource: any) => boolean;
}

// Threat detection result
interface ThreatDetection {
  threatModelId: string;
  threatName: string;
  detected: boolean;
  timestamp: string;
  confidence: number;            // 0-1
  context?: any;
}

// Vulnerability entry
interface Vulnerability {
  id: string;                    // CVE-XXXX-XXXXX
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;                 // CVSS score
  description: string;
  affectedSystems: string[];
  remediationSteps: string[];
  detectorFunction?: (resource: any) => boolean;
}

// Individual risk
interface Risk {
  id: string;
  source: string;                // threat or vulnerability
  likelihood: number;            // 1-10
  impact: number;                // 1-10
  exploitability: number;        // 1-10
  dataSensitivity: number;       // 1-10
  riskScore: number;             // calculated
  riskRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

// Risk assessment
interface RiskAssessment {
  timestamp: string;
  resourceId: string;
  overallRiskScore: number;      // 0-1000
  overallRiskRating: string;
  threats: ThreatDetection[];
  vulnerabilities: Vulnerability[];
  risks: Risk[];
  criticalRisks: Risk[];
}

// Risk report
interface RiskReport {
  timestamp: string;
  resourceId: string;
  assessment: RiskAssessment;
  summary: {
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
  recommendations: Remediation[];
  prioritizedActions: string[];
  nextReviewDate: string;
}

// Remediation
interface Remediation {
  riskId: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  estimatedEffort: string;       // e.g., "2-4 hours"
  expectedOutcome: string;
  resources: string[];
}
```

---

## 📝 Detailed Implementation Steps

### Step 1: Database Schema for Risk History

```typescript
import { Database } from 'bun:sqlite';

class RiskAssessmentEngine {
  private db: Database;
  private dbPath: string;
  private threatModels: ThreatModel[];
  private vulnerabilityDatabase: VulnerabilityEntry[];
  private redactionEngine: SecurityRedactionEngine;
  
  constructor(redactionEngine: SecurityRedactionEngine, dbPath = 'risk-assessment.db') {
    this.redactionEngine = redactionEngine;
    this.dbPath = dbPath;
    this.threatModels = [];
    this.vulnerabilityDatabase = [];
  }
  
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.db.run('PRAGMA foreign_keys = ON');
    this.createSchema();
    await this.loadThreatModels();
    await this.loadVulnerabilityDatabase();
  }
  
  private createSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        overall_risk_score INTEGER NOT NULL,
        overall_risk_rating TEXT NOT NULL,
        threats_detected INTEGER,
        vulnerabilities_found INTEGER,
        total_risks INTEGER,
        critical_risks INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_timestamp (timestamp),
        INDEX idx_resource (resource_id),
        INDEX idx_risk_rating (overall_risk_rating)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS risks (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        source TEXT NOT NULL,
        likelihood INTEGER NOT NULL,
        impact INTEGER NOT NULL,
        exploitability INTEGER NOT NULL,
        data_sensitivity INTEGER NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_rating TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(assessment_id) REFERENCES risk_assessments(id)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS threat_detections (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        threat_model_id TEXT NOT NULL,
        threat_name TEXT NOT NULL,
        detected BOOLEAN NOT NULL,
        confidence REAL NOT NULL,
        context JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(assessment_id) REFERENCES risk_assessments(id)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS vulnerability_findings (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        cve_id TEXT,
        vulnerability_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        cvss_score REAL NOT NULL,
        description TEXT,
        remediation JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(assessment_id) REFERENCES risk_assessments(id)
      ) STRICT;
      
      CREATE TABLE IF NOT EXISTS remediations (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        risk_id TEXT NOT NULL,
        priority TEXT NOT NULL,
        action TEXT NOT NULL,
        estimated_effort TEXT,
        expected_outcome TEXT,
        resources JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(assessment_id) REFERENCES risk_assessments(id)
      ) STRICT;
    `);
  }
  
  private async loadThreatModels(): Promise<void> {
    this.threatModels = [
      {
        id: 'THREAT-001',
        name: 'SQL Injection',
        description: 'Attacker injects malicious SQL code',
        category: 'EXTERNAL',
        likelihood: 8,
        impact: 9,
        exploitability: 8,
        detectability: (resource) => this.detectSQLInjection(resource)
      },
      {
        id: 'THREAT-002',
        name: 'Cross-Site Scripting (XSS)',
        description: 'Injection of malicious scripts into web pages',
        category: 'EXTERNAL',
        likelihood: 7,
        impact: 8,
        exploitability: 7,
        detectability: (resource) => this.detectXSS(resource)
      },
      {
        id: 'THREAT-003',
        name: 'Brute Force Attack',
        description: 'Repeated attempts to guess credentials',
        category: 'EXTERNAL',
        likelihood: 6,
        impact: 7,
        exploitability: 9,
        detectability: (resource) => this.detectBruteForce(resource)
      },
      {
        id: 'THREAT-004',
        name: 'Insider Threat',
        description: 'Malicious actions by authorized users',
        category: 'INTERNAL',
        likelihood: 3,
        impact: 9,
        exploitability: 6,
        detectability: (resource) => this.detectInsiderThreat(resource)
      },
      {
        id: 'THREAT-005',
        name: 'Data Exfiltration',
        description: 'Unauthorized extraction of sensitive data',
        category: 'MALICIOUS',
        likelihood: 5,
        impact: 10,
        exploitability: 7,
        detectability: (resource) => this.detectDataExfiltration(resource)
      },
      {
        id: 'THREAT-006',
        name: 'Privilege Escalation',
        description: 'Attacker gains elevated access',
        category: 'EXTERNAL',
        likelihood: 6,
        impact: 9,
        exploitability: 8,
        detectability: (resource) => this.detectPrivilegeEscalation(resource)
      }
    ];
  }
  
  private async loadVulnerabilityDatabase(): Promise<void> {
    this.vulnerabilityDatabase = [
      {
        id: 'CVE-2023-0001',
        name: 'Unpatched OpenSSL Vulnerability',
        severity: 'CRITICAL',
        score: 9.8,
        description: 'Remote code execution in OpenSSL',
        affectedSystems: ['Linux', 'Windows'],
        remediationSteps: ['Update OpenSSL to v3.0.8+', 'Restart services']
      },
      {
        id: 'CVE-2023-0002',
        name: 'SQL Injection in Legacy Code',
        severity: 'CRITICAL',
        score: 9.9,
        description: 'Unsanitized user input in database queries',
        affectedSystems: ['Database Layer'],
        remediationSteps: ['Implement parameterized queries', 'Code review', 'Testing']
      },
      {
        id: 'CVE-2023-0003',
        name: 'Weak Password Policy',
        severity: 'HIGH',
        score: 7.5,
        description: 'Insufficient password requirements',
        affectedSystems: ['Authentication'],
        remediationSteps: ['Enforce strong password policy', 'Implement MFA']
      },
      {
        id: 'CVE-2023-0004',
        name: 'Missing Security Headers',
        severity: 'MEDIUM',
        score: 6.1,
        description: 'HTTP security headers not configured',
        affectedSystems: ['Web Application'],
        remediationSteps: ['Configure CSP', 'Add X-Frame-Options', 'Add X-Content-Type-Options']
      }
    ];
  }
}
```

### Step 2: Threat Detection Methods

```typescript
private detectSQLInjection(resource: any): boolean {
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bor\b.*=.*)/i,
    /(';.*--)/i,
    /(\bexec\b|\bexecute\b)/i
  ];
  
  const resourceStr = JSON.stringify(resource);
  return sqlPatterns.some(pattern => pattern.test(resourceStr));
}

private detectXSS(resource: any): boolean {
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/i,
    /on\w+\s*=/i,
    /javascript:/i,
    /<iframe[^>]*>/i
  ];
  
  const resourceStr = JSON.stringify(resource);
  return xssPatterns.some(pattern => pattern.test(resourceStr));
}

private detectBruteForce(resource: any): boolean {
  if (!resource.failedLoginAttempts) return false;
  return resource.failedLoginAttempts > 10;
}

private detectInsiderThreat(resource: any): boolean {
  if (!resource.auditLog) return false;
  const suspiciousActions = resource.auditLog.filter((log: any) => 
    log.action === 'DELETE' || log.action === 'EXPORT'
  );
  return suspiciousActions.length > 5;
}

private detectDataExfiltration(resource: any): boolean {
  if (!resource.networkActivity) return false;
  const largeTransfers = resource.networkActivity.filter((activity: any) =>
    activity.dataTransferred > 1000000000  // > 1GB
  );
  return largeTransfers.length > 0;
}

private detectPrivilegeEscalation(resource: any): boolean {
  if (!resource.permissionHistory) return false;
  const escalations = resource.permissionHistory.filter((perm: any) =>
    perm.newLevel > perm.previousLevel
  );
  return escalations.length > 3;
}
```

### Step 3: Risk Assessment and Scoring

```typescript
async assessRisks(resource: any): Promise<RiskAssessment> {
  const timestamp = new Date().toISOString();
  const assessmentId = this.generateId();
  
  // Detect threats
  const threats = await this.detectThreats(resource);
  
  // Scan vulnerabilities
  const vulnerabilities = await this.scanVulnerabilities(resource);
  
  // Calculate risks
  const risks: Risk[] = [];
  
  // Threats to risks
  threats.forEach(threat => {
    const threatModel = this.threatModels.find(tm => tm.id === threat.threatModelId);
    if (threatModel && threat.detected) {
      const riskScore = this.calculateRiskScore(
        threatModel.likelihood,
        threatModel.impact,
        threatModel.exploitability,
        resource.dataSensitivity || 5
      );
      
      risks.push({
        id: `RISK-${this.generateId()}`,
        source: threat.threatModelId,
        likelihood: threatModel.likelihood,
        impact: threatModel.impact,
        exploitability: threatModel.exploitability,
        dataSensitivity: resource.dataSensitivity || 5,
        riskScore,
        riskRating: this.calculateRiskRating(riskScore),
        description: `Threat detected: ${threat.threatName}`
      });
    }
  });
  
  // Vulnerabilities to risks
  vulnerabilities.forEach(vuln => {
    const riskScore = Math.round(vuln.score * 10 * (resource.dataSensitivity || 5) / 10);
    risks.push({
      id: `RISK-${this.generateId()}`,
      source: vuln.id,
      likelihood: 7,
      impact: Math.round(vuln.score),
      exploitability: 6,
      dataSensitivity: resource.dataSensitivity || 5,
      riskScore,
      riskRating: this.calculateRiskRating(riskScore),
      description: `Vulnerability: ${vuln.name}`
    });
  });
  
  const criticalRisks = risks.filter(r => r.riskRating === 'CRITICAL');
  const overallScore = risks.length > 0 
    ? Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length)
    : 0;
  
  const assessment: RiskAssessment = {
    timestamp,
    resourceId: resource.id || 'unknown',
    overallRiskScore: overallScore,
    overallRiskRating: this.calculateRiskRating(overallScore),
    threats,
    vulnerabilities,
    risks,
    criticalRisks
  };
  
  // Persist to database
  this.persistAssessment(assessmentId, assessment);
  
  return assessment;
}

private calculateRiskScore(likelihood: number, impact: number, exploitability: number, dataSensitivity: number): number {
  return Math.round((likelihood * impact * exploitability) * dataSensitivity / 10);
}

private calculateRiskRating(score: number): string {
  if (score >= 800) return 'CRITICAL';
  if (score >= 500) return 'HIGH';
  if (score >= 200) return 'MEDIUM';
  return 'LOW';
}

async detectThreats(resource: any): Promise<ThreatDetection[]> {
  const detections: ThreatDetection[] = [];
  
  for (const threatModel of this.threatModels) {
    try {
      const detected = threatModel.detectability(resource);
      detections.push({
        threatModelId: threatModel.id,
        threatName: threatModel.name,
        detected,
        timestamp: new Date().toISOString(),
        confidence: detected ? 0.85 : 0.95
      });
    } catch (error) {
      detections.push({
        threatModelId: threatModel.id,
        threatName: threatModel.name,
        detected: false,
        timestamp: new Date().toISOString(),
        confidence: 0.5
      });
    }
  }
  
  return detections;
}

async scanVulnerabilities(resource: any): Promise<Vulnerability[]> {
  const found: Vulnerability[] = [];
  
  for (const vuln of this.vulnerabilityDatabase) {
    if (vuln.detectorFunction && vuln.detectorFunction(resource)) {
      found.push(vuln);
    }
  }
  
  return found;
}
```

### Step 4: Report Generation and Remediations

```typescript
async generateRiskReport(assessment: RiskAssessment): Promise<RiskReport> {
  const summary = {
    totalRisks: assessment.risks.length,
    criticalRisks: assessment.risks.filter(r => r.riskRating === 'CRITICAL').length,
    highRisks: assessment.risks.filter(r => r.riskRating === 'HIGH').length,
    mediumRisks: assessment.risks.filter(r => r.riskRating === 'MEDIUM').length,
    lowRisks: assessment.risks.filter(r => r.riskRating === 'LOW').length
  };
  
  const recommendations = await this.recommendRemediations(assessment);
  
  const prioritizedActions = recommendations
    .sort((a, b) => {
      const priorityOrder = { 'IMMEDIATE': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    })
    .slice(0, 10)
    .map(r => r.action);
  
  return {
    timestamp: new Date().toISOString(),
    resourceId: assessment.resourceId,
    assessment,
    summary,
    recommendations,
    prioritizedActions,
    nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}

async recommendRemediations(assessment: RiskAssessment): Promise<Remediation[]> {
  const remediations: Remediation[] = [];
  
  assessment.criticalRisks.forEach(risk => {
    remediations.push({
      riskId: risk.id,
      priority: 'IMMEDIATE',
      action: `Mitigate ${risk.source}: ${risk.description}`,
      estimatedEffort: '4-8 hours',
      expectedOutcome: `Reduce risk score to below 200`,
      resources: ['Security Team', 'DevOps']
    });
  });
  
  assessment.risks.filter(r => r.riskRating === 'HIGH').forEach(risk => {
    remediations.push({
      riskId: risk.id,
      priority: 'HIGH',
      action: `Address ${risk.source}: ${risk.description}`,
      estimatedEffort: '2-4 hours',
      expectedOutcome: `Reduce risk score by 30%`,
      resources: ['Security Team']
    });
  });
  
  return remediations;
}

private persistAssessment(assessmentId: string, assessment: RiskAssessment): void {
  const stmt = this.db.prepare(`
    INSERT INTO risk_assessments (
      id, timestamp, resource_id, overall_risk_score, overall_risk_rating,
      threats_detected, vulnerabilities_found, total_risks, critical_risks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    assessmentId,
    assessment.timestamp,
    assessment.resourceId,
    assessment.overallRiskScore,
    assessment.overallRiskRating,
    assessment.threats.filter(t => t.detected).length,
    assessment.vulnerabilities.length,
    assessment.risks.length,
    assessment.criticalRisks.length
  );
}

private generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
```

---

## 📋 Sub-Commands Implementation

### Command: `fw risk-assessment assess`

```typescript
static async handleAssess(options: any): Promise<void> {
  const engine = new RiskAssessmentEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const assessment = await engine.assessRisks({
    dataSensitivity: options.sensitivity || 5
  });
  
  console.log(JSON.stringify(assessment, null, 2));
}
```

### Command: `fw risk-assessment report`

```typescript
static async handleReport(options: any): Promise<void> {
  const engine = new RiskAssessmentEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const assessment = await engine.assessRisks({});
  const report = await engine.generateRiskReport(assessment);
  
  console.log(JSON.stringify(report, null, 2));
}
```

### Command: `fw risk-assessment threats`

```typescript
static async handleThreats(options: any): Promise<void> {
  const engine = new RiskAssessmentEngine(SecurityRedactionEngine);
  await engine.initialize();
  
  const threats = await engine.detectThreats({});
  console.log(JSON.stringify(threats, null, 2));
}
```

---

## ✅ Testing Checklist

- [ ] Database initialization works
- [ ] Threat models load correctly
- [ ] Vulnerability database loads
- [ ] SQL injection detection works
- [ ] XSS detection works
- [ ] Brute force detection works
- [ ] Insider threat detection works
- [ ] Data exfiltration detection works
- [ ] Privilege escalation detection works
- [ ] Risk scoring calculation is accurate
- [ ] Risk ratings assigned correctly
- [ ] Reports generate with correct format
- [ ] Remediations recommended appropriately
- [ ] Binary size remains < 10MB

---

## 🚀 Integration with Ultimate CLI

Add to `src/@inspection/ultimate-cli.ts`:

```typescript
import { RiskAssessmentEngine } from './commands/risk-assessment-engine.js';

export class UltimateInspectCLI {
  async handleRiskAssessmentCommand(args: string[]): Promise<void> {
    const subcommand = args[0] || 'assess';
    const options = this.parseRiskArgs(args);
    
    const engine = new RiskAssessmentEngine(SecurityRedactionEngine);
    await engine.initialize();
    
    switch (subcommand) {
      case 'assess':
        return RiskAssessmentEngine.handleAssess(options);
      case 'report':
        return RiskAssessmentEngine.handleReport(options);
      case 'threats':
        return RiskAssessmentEngine.handleThreats(options);
      case 'vulnerabilities':
        return RiskAssessmentEngine.handleVulnerabilities(options);
      default:
        console.log('Unknown risk-assessment sub-command');
    }
  }
}
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Threat detection | < 100ms |
| Vulnerability scan | < 150ms |
| Risk assessment | < 500ms |
| Report generation | < 200ms |
| Memory overhead | < 150MB |

---

## 📚 References

- TASK_1_AUDIT_ENGINE.md for database patterns
- TASK_2_COMPLIANCE_ENGINE.md for validation patterns
- OWASP Risk Assessment Framework
- CVSS Scoring Guide
- NIST Cybersecurity Framework

---

**Task Status**: READY FOR IMPLEMENTATION ✅