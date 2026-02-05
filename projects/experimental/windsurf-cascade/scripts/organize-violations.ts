#!/usr/bin/env bun

// scripts/organize-violations.ts
import { GoldenRuleEnforcer } from '../packages/odds-core/src/standards/rule-enforcement.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface OrganizedViolation {
  rule: string;
  severity: 'error' | 'warning';
  file: string;
  line?: number;
  message: string;
  suggestion: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'complex';
  category: 'security' | 'performance' | 'maintainability' | 'compatibility' | 'monitoring';
}

interface ViolationSummary {
  total: number;
  bySeverity: { error: number; warning: number };
  byRule: Record<string, number>;
  byCategory: Record<string, number>;
  byEffort: Record<string, number>;
  critical: OrganizedViolation[];
  quickWins: OrganizedViolation[];
}

async function organizeViolations() {
  console.log('🔧 Organizing Golden Rules Violations...\n');
  
  const enforcer = new GoldenRuleEnforcer();
  const result = await enforcer.validateCodebase();
  
  const organized = organizeViolationData(result.violations);
  const summary = generateSummary(organized);
  
  // Generate organized reports
  await generateOrganizedReports(organized, summary);
  
  console.log('✅ Violations organized successfully!');
  console.log(`📊 ${summary.total} violations categorized and prioritized`);
}

function organizeViolationData(violations: any[]): OrganizedViolation[] {
  return violations.map(v => ({
    ...v,
    priority: determinePriority(v),
    effort: determineEffort(v),
    category: determineCategory(v)
  }));
}

function determinePriority(violation: any): 'critical' | 'high' | 'medium' | 'low' {
  if (violation.severity === 'error') {
    if (violation.rule === 'Error Handling' || violation.rule === 'Track API Usage') {
      return 'critical';
    }
    return 'high';
  }
  
  if (violation.rule === 'Use Bun Builtins' || violation.rule === 'Bun Optimizations') {
    return 'medium';
  }
  
  return 'low';
}

function determineEffort(violation: any): 'quick' | 'moderate' | 'complex' {
  const quickFixPatterns = [
    'require(',
    'process.cwd()',
    '__dirname',
    'module.exports',
    '--smol',
    '--sql-preconnect'
  ];
  
  const message = violation.message;
  
  if (quickFixPatterns.some(pattern => message.includes(pattern))) {
    return 'quick';
  }
  
  if (violation.rule === 'Error Handling' || violation.rule === 'Resource Management') {
    return 'complex';
  }
  
  return 'moderate';
}

function determineCategory(violation: any): 'security' | 'performance' | 'maintainability' | 'compatibility' | 'monitoring' {
  const rule = violation.rule;
  
  if (rule === 'Error Handling' || rule === 'Resource Management') return 'security';
  if (rule === 'Bun Optimizations' || rule === 'Performance Testing') return 'performance';
  if (rule === 'Type Safety' || rule === 'Use Bun Builtins') return 'maintainability';
  if (rule === 'Stay Updated') return 'compatibility';
  if (rule === 'Track API Usage' || rule === 'Logging & Monitoring') return 'monitoring';
  
  return 'maintainability';
}

function generateSummary(violations: OrganizedViolation[]): ViolationSummary {
  const summary = {
    total: violations.length,
    bySeverity: { error: 0, warning: 0 },
    byRule: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byEffort: {} as Record<string, number>,
    critical: violations.filter(v => v.priority === 'critical'),
    quickWins: violations.filter(v => v.effort === 'quick')
  };
  
  violations.forEach(v => {
    summary.bySeverity[v.severity]++;
    summary.byRule[v.rule] = (summary.byRule[v.rule] || 0) + 1;
    summary.byCategory[v.category] = (summary.byCategory[v.category] || 0) + 1;
    summary.byEffort[v.effort] = (summary.byEffort[v.effort] || 0) + 1;
  });
  
  return summary;
}

async function generateOrganizedReports(violations: OrganizedViolation[], summary: ViolationSummary) {
  await mkdir('./reports', { recursive: true });
  
  // 1. Executive Summary
  const executiveReport = generateExecutiveReport(summary);
  await writeFile('./reports/violations-executive-summary.md', executiveReport);
  
  // 2. Critical Issues Report
  const criticalReport = generateCriticalReport(summary.critical);
  await writeFile('./reports/violations-critical.md', criticalReport);
  
  // 3. Quick Wins Report
  const quickWinsReport = generateQuickWinsReport(summary.quickWins);
  await writeFile('./reports/violations-quick-wins.md', quickWinsReport);
  
  // 4. Detailed Categorized Report
  const detailedReport = generateDetailedReport(violations, summary);
  await writeFile('./reports/violations-detailed.md', detailedReport);
  
  // 5. Action Plan
  const actionPlan = generateActionPlan(violations, summary);
  await writeFile('./reports/violations-action-plan.md', actionPlan);
  
  console.log('📄 Reports generated:');
  console.log('   - Executive Summary: reports/violations-executive-summary.md');
  console.log('   - Critical Issues: reports/violations-critical.md');
  console.log('   - Quick Wins: reports/violations-quick-wins.md');
  console.log('   - Detailed Report: reports/violations-detailed.md');
  console.log('   - Action Plan: reports/violations-action-plan.md');
}

function generateExecutiveReport(summary: ViolationSummary): string {
  return `# 🎯 VIOLATIONS EXECUTIVE SUMMARY

**Generated**: ${new Date().toISOString()}
**Total Violations**: ${summary.total}

## 📊 Overview

| Metric | Count | Impact |
|--------|-------|--------|
| **Critical Issues** | ${summary.critical.length} | 🔴 Immediate Action Required |
| **Errors** | ${summary.bySeverity.error} | 🚫 Blockers |
| **Warnings** | ${summary.bySeverity.warning} | ⚠️ Improvements |
| **Quick Wins** | ${summary.quickWins.length} | ⚡ Fast Fixes |

## 🏆 Top Priority Rules

| Rule | Violations | Severity | Priority |
|------|------------|----------|----------|
${Object.entries(summary.byRule)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([rule, count]) => `| ${rule} | ${count} | ${getRuleSeverity(rule, summary)} | High |`)
  .join('\n')}

## 📈 Impact Assessment

| Category | Violations | Risk Level |
|----------|------------|------------|
${Object.entries(summary.byCategory)
  .map(([category, count]) => `| ${category} | ${count} | ${getRiskLevel(category, count)} |`)
  .join('\n')}

${getOverallAssessment(summary)}

}

## 🎯 Recommendations

1. **Address Critical Issues First**: ${summary.critical.length} critical violations need immediate attention
2. **Leverage Quick Wins**: ${summary.quickWins.length} violations can be fixed quickly
3. **Focus on High-Impact Rules**: Prioritize Error Handling and API Usage tracking
4. **Team Training**: Educate team on Bun best practices

---
*This report provides actionable insights for maintaining institutional-grade code quality*
`;
}

function generateCriticalReport(critical: OrganizedViolation[]): string {
  return `# 🚨 CRITICAL ISSUES REPORT

**Generated**: ${new Date().toISOString()}
**Critical Issues**: ${critical.length}

## 🔴 Immediate Action Required

${critical.length === 0 ? '✅ No critical issues found!' : critical.map((v, i) => `
### ${i + 1}. ${v.rule}

**File**: \`${v.file}:${v.line}\`
**Category**: ${v.category}
**Effort**: ${v.effort}

**Issue**: ${v.message}

**Suggestion**: ${v.suggestion}

**Code Context**:
\`\`\`typescript
// File: ${v.file}
// Line: ${v.line}
// ${v.suggestion}
\`\`\`

---
`).join('')}

## 🎯 Fix Strategy

1. **Error Handling Violations**: Add try-catch blocks with retry logic
2. **API Usage Violations**: Implement apiTracker.track() wrapper
3. **Security Issues**: Review and fix resource management

## ⏰ Timeline

- **Immediate**: Today - Critical security and error handling
- **Week 1**: API tracking and monitoring setup
- **Week 2**: Remaining critical issues

---
*Critical issues must be resolved before next deployment*
`;
}

function generateQuickWinsReport(quickWins: OrganizedViolation[]): string {
  return `# ⚡ QUICK WINS REPORT

**Generated**: ${new Date().toISOString()}
**Quick Wins**: ${quickWins.length}

## 🎯 Low-Effort, High-Impact Fixes

${quickWins.length === 0 ? '✅ No quick wins available!' : quickWins.map((v, i) => `
### ${i + 1}. ${v.rule}

**File**: \`${v.file}:${v.line}\`
**Category**: ${v.category}

**Issue**: ${v.message}

**Quick Fix**:
\`\`\`typescript
// Replace this:
${getExamplePattern(v.message)}

// With this:
${getFixPattern(v.message)}
\`\`\`

**Impact**: ${v.severity === 'error' ? 'Fixes blocker' : 'Improves code quality'}

---
`).join('')}

## 🚀 Implementation Strategy

### Phase 1: Import/Export Fixes (Today)
- Replace \`require()\` with ES6 imports
- Replace \`module.exports\` with ES6 exports
- Update \`__dirname\` to \`import.meta.url\`

### Phase 2: Bun Optimizations (This Week)
- Add \`--smol\` flags to Workers
- Add \`--sql-preconnect\` to database operations
- Replace \`process.cwd()\` with \`import.meta.dir\`

### Phase 3: Package Migration (Next Week)
- Replace npm packages with Bun builtins
- Update package.json dependencies

## 📊 Expected Impact

- **Violations Resolved**: ${quickWins.length}
- **Time Investment**: 2-3 days
- **Quality Improvement**: Significant
- **Performance Gain**: 10-20%

---
*Quick wins provide immediate quality improvements with minimal effort*
`;
}

function generateDetailedReport(violations: OrganizedViolation[], summary: ViolationSummary): string {
  const byCategory = violations.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, OrganizedViolation[]>);

  return `# 📋 DETAILED VIOLATIONS REPORT

**Generated**: ${new Date().toISOString()}
**Total Violations**: ${summary.total}

## 📊 Summary by Category

${Object.entries(byCategory).map(([category, violations]) => `
## ${category.toUpperCase()} (${violations.length} violations)

### Priority Breakdown
- Critical: ${violations.filter(v => v.priority === 'critical').length}
- High: ${violations.filter(v => v.priority === 'high').length}
- Medium: ${violations.filter(v => v.priority === 'medium').length}
- Low: ${violations.filter(v => v.priority === 'low').length}

### Effort Breakdown
- Quick: ${violations.filter(v => v.effort === 'quick').length}
- Moderate: ${violations.filter(v => v.effort === 'moderate').length}
- Complex: ${violations.filter(v => v.effort === 'complex').length}

### Violations

${violations.map((v, i) => `
#### ${i + 1}. ${v.rule} (${v.severity})

**File**: \`${v.file}:${v.line}\`
**Priority**: ${v.priority}
**Effort**: ${v.effort}

**Message**: ${v.message}
**Suggestion**: ${v.suggestion}
`).join('')}
`).join('')}

---
*Detailed breakdown for comprehensive code quality management*
`;
}

function generateActionPlan(violations: OrganizedViolation[], summary: ViolationSummary): string {
  return `# 🎯 VIOLATIONS ACTION PLAN

**Generated**: ${new Date().toISOString()}
**Total Violations**: ${summary.total}

## 📅 Implementation Timeline

### Phase 1: Critical Security & Stability (Week 1)
**Target**: ${summary.critical.length} critical violations

**Tasks**:
${summary.critical.slice(0, 5).map((v, i) => `
${i + 1}. **${v.rule}** - \`${v.file}\`
   - Fix: ${v.suggestion}
   - Effort: ${v.effort}
   - Owner: TBD
   - Due: EOD Week 1
`).join('')}

### Phase 2: Quick Wins (Week 1-2)
**Target**: ${summary.quickWins.length} quick fixes

**Tasks**:
- Replace all \`require()\` with ES6 imports
- Update \`process.cwd()\` to \`import.meta.dir\`
- Add Bun optimization flags
- Fix deprecated patterns

### Phase 3: Systematic Improvements (Week 2-4)
**Target**: Remaining violations

**Focus Areas**:
- Error handling implementation
- API tracking setup
- Performance optimization
- Type safety improvements

## 🎯 Success Metrics

### Week 1 Goals
- [ ] All critical violations resolved
- [ ] 50% of quick wins completed
- [ ] CI/CD pipeline updated

### Week 2 Goals
- [ ] All quick wins completed
- [ ] Error handling standardized
- [ ] API tracking implemented

### Week 4 Goals
- [ ] All violations resolved
- [ ] Team training completed
- [ ] Documentation updated

## 👥 Team Responsibilities

### **Lead Developer** (Critical Issues)
- Review and approve all critical fixes
- Ensure proper testing before deployment
- Monitor system stability

### **Senior Developers** (Complex Fixes)
- Implement error handling patterns
- Set up API tracking infrastructure
- Optimize performance-critical code

### **Junior Developers** (Quick Wins)
- Fix import/export patterns
- Update deprecated syntax
- Add optimization flags

### **DevOps Engineer** (CI/CD)
- Update build scripts
- Configure pre-commit hooks
- Monitor deployment pipeline

## 🔄 Review Process

### Daily Standup
- Progress on critical issues
- Blockers and dependencies
- Code review assignments

### Weekly Review
- Violation count reduction
- Quality metrics improvement
- Team capacity planning

### Final Sign-off
- All violations resolved
- System performance validated
- Team training completed

## 📞 Escalation Plan

### Blockers
- **Technical**: Lead Developer → Architecture Review
- **Resource**: Project Manager → Team Allocation
- **Timeline**: Product Owner → Priority Reassessment

### Quality Gates
- No deployment with critical violations
- Minimum 80% violation reduction for releases
- Automated testing for all fixes

---
*This action plan ensures systematic resolution of all violations while maintaining development velocity*
`;
}

// Helper functions
function getRuleSeverity(rule: string, summary: ViolationSummary): string {
  const criticalRules = ['Error Handling', 'Track API Usage'];
  return criticalRules.includes(rule) ? '🔴 Critical' : '🟡 High';
}

function getRiskLevel(category: string, count: number): string {
  if (category === 'security' && count > 0) return '🔴 High';
  if (category === 'performance' && count > 5) return '🟡 Medium';
  return '🟢 Low';
}

function getOverallAssessment(summary: ViolationSummary): string {
  if (summary.critical.length > 10) return `
## 🚨 Overall Assessment: CRITICAL

The codebase has ${summary.critical.length} critical issues that require immediate attention. 
These violations could impact system stability, security, and performance.

**Recommended Action**: Stop new feature development until critical issues are resolved.
`;

  if (summary.critical.length > 0) return `
## ⚠️ Overall Assessment: ATTENTION NEEDED

${summary.critical.length} critical issues found that should be addressed promptly. 
While not blocking development, they represent potential risks.

**Recommended Action**: Prioritize critical fixes in current sprint.
`;

  return `
## ✅ Overall Assessment: HEALTHY

No critical violations found. The codebase maintains good quality standards 
with ${summary.total} minor improvements identified.

**Recommended Action**: Address warnings in next maintenance cycle.
`;
}

function getExamplePattern(message: string): string {
  if (message.includes('require(')) return 'require("package")';
  if (message.includes('process.cwd()')) return 'process.cwd()';
  if (message.includes('__dirname')) return '__dirname';
  if (message.includes('module.exports')) return 'module.exports = {}';
  return '// Current pattern';
}

function getFixPattern(message: string): string {
  if (message.includes('require(')) return 'import { something } from "package"';
  if (message.includes('process.cwd()')) return 'import.meta.dir';
  if (message.includes('__dirname')) return 'new URL(".", import.meta.url)';
  if (message.includes('module.exports')) return 'export default {}';
  return '// Fixed pattern';
}

// Run if called directly
if (import.meta.main) {
  await organizeViolations().catch(error => {
    console.error('❌ Organization failed:', error);
    process.exit(1);
  });
}
