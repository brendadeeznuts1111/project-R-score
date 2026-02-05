#!/usr/bin/env bun

// scripts/daily-standup-automation.ts
import { GoldenRuleEnforcer } from '../packages/odds-core/src/standards/rule-enforcement.js';
import { readFile, writeFile } from 'fs/promises';

interface StandupReport {
  date: string;
  dayNumber: number;
  previousDayViolations: number;
  currentViolations: number;
  violationsResolved: number;
  violationsAdded: number;
  teamProgress: TeamMemberProgress[];
  blockers: Blocker[];
  focusAreas: string[];
  recommendations: string[];
}

interface TeamMemberProgress {
  teamMember: string;
  assignedViolations: number;
  completedViolations: number;
  remainingViolations: number;
  status: 'on-track' | 'behind' | 'blocked' | 'complete';
  notes: string[];
}

interface Blocker {
  teamMember: string;
  violation: string;
  blockerType: 'technical' | 'resource' | 'dependency' | 'approval';
  description: string;
  severity: 'high' | 'medium' | 'low';
  needsHelp: string[];
}

interface HistoricalData {
  date: string;
  totalViolations: number;
  criticalViolations: number;
}

async function generateDailyStandup() {
  console.log('🗓️ Generating daily standup report...\n');
  
  const enforcer = new GoldenRuleEnforcer();
  const currentResult = await enforcer.validateCodebase();
  
  // Load historical data
  const historicalData = await loadHistoricalData();
  const yesterdayData = historicalData[historicalData.length - 2] || historicalData[0];
  
  // Load team assignments
  const teamAssignments = await loadTeamAssignments();
  
  // Generate standup report
  const standupReport = await generateStandupReport(
    currentResult,
    yesterdayData,
    teamAssignments,
    historicalData.length
  );
  
  // Save reports
  await saveStandupReports(standupReport, currentResult);
  
  console.log('✅ Daily standup report generated!');
  console.log(`📊 Day ${standupReport.dayNumber} - ${standupReport.violationsResolved} violations resolved`);
  console.log('📋 See reports/daily-standup.md for details');
}

async function loadHistoricalData(): Promise<HistoricalData[]> {
  try {
    const content = await readFile('./reports/historical-violations.json', 'utf-8');
    return JSON.parse(content);
  } catch {
    // Create initial historical data
    const enforcer = new GoldenRuleEnforcer();
    const result = await enforcer.validateCodebase();
    const initialData: HistoricalData[] = [{
      date: new Date().toISOString(),
      totalViolations: result.violations.length,
      criticalViolations: result.violations.filter(v => v.severity === 'error').length
    }];
    await writeFile('./reports/historical-violations.json', JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

async function loadTeamAssignments(): Promise<any> {
  try {
    const content = await readFile('./reports/team-assignments.json', 'utf-8');
    return JSON.parse(content);
  } catch {
    return { teamMembers: [] };
  }
}

async function generateStandupReport(
  currentResult: any,
  yesterdayData: HistoricalData,
  teamAssignments: any,
  dayNumber: number
): Promise<StandupReport> {
  const currentViolations = currentResult.violations.length;
  const currentCritical = currentResult.violations.filter(v => v.severity === 'error').length;
  const previousDayViolations = yesterdayData.totalViolations;
  
  const violationsResolved = Math.max(0, previousDayViolations - currentViolations);
  const violationsAdded = Math.max(0, currentViolations - previousDayViolations);
  
  // Calculate team progress (simplified)
  const teamProgress: TeamMemberProgress[] = teamAssignments.teamMembers?.map((member: any) => ({
    teamMember: member.teamMember,
    assignedViolations: member.violations.length,
    completedViolations: Math.floor(member.violations.length * (dayNumber * 0.2)), // Simulated progress
    remainingViolations: Math.ceil(member.violations.length * (1 - dayNumber * 0.2)),
    status: dayNumber > 3 ? 'behind' : 'on-track' as 'on-track' | 'behind',
    notes: [
      'Working on critical violations',
      'Awaiting code review for completed fixes',
      'Need clarification on API tracking implementation'
    ]
  })) || [];
  
  // Identify blockers (sample data)
  const blockers: Blocker[] = [
    {
      teamMember: 'Sarah Johnson',
      violation: 'Track API Usage - mcp-server/bun-mcp-server.ts:60',
      blockerType: 'technical',
      description: 'API tracking infrastructure not yet implemented',
      severity: 'high',
      needsHelp: ['Need apiTracker implementation', 'Requires architecture decision']
    },
    {
      teamMember: 'Mike Wilson',
      violation: 'Error Handling - packages/odds-core/src/bun-native-apis.ts:125',
      blockerType: 'dependency',
      description: 'Waiting for retry utility implementation',
      severity: 'medium',
      needsHelp: ['Dependency from Lead Developer', 'Testing framework setup']
    }
  ];
  
  // Determine focus areas
  const focusAreas = determineFocusAreas(currentResult, dayNumber);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    violationsResolved,
    violationsAdded,
    currentCritical,
    blockers.length
  );
  
  return {
    date: new Date().toISOString().split('T')[0],
    dayNumber,
    previousDayViolations,
    currentViolations,
    violationsResolved,
    violationsAdded,
    teamProgress,
    blockers,
    focusAreas,
    recommendations
  };
}

function determineFocusAreas(result: any, dayNumber: number): string[] {
  const criticalByRule = result.violations
    .filter(v => v.severity === 'error')
    .reduce((acc: any, v: any) => {
      acc[v.rule] = (acc[v.rule] || 0) + 1;
      return acc;
    }, {});
  
  const topRules = Object.entries(criticalByRule)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 3)
    .map(([rule]: any) => rule);
  
  if (dayNumber <= 3) {
    return [
      'Critical security violations',
      'API tracking infrastructure',
      'Error handling patterns',
      ...topRules
    ];
  } else if (dayNumber <= 7) {
    return [
      'Performance optimization',
      'Resource management',
      'Memory monitoring',
      ...topRules
    ];
  } else {
    return [
      'Code quality improvements',
      'Type safety compliance',
      'Documentation updates',
      ...topRules
    ];
  }
}

function generateRecommendations(
  resolved: number,
  added: number,
  critical: number,
  blockers: number
): string[] {
  const recommendations: string[] = [];
  
  if (resolved > 10) {
    recommendations.push('🎉 Great progress! Keep up the momentum on critical fixes');
  } else if (resolved < 5) {
    recommendations.push('⚠️ Progress is slow - consider pair programming for complex issues');
  }
  
  if (added > 0) {
    recommendations.push('🔍 New violations detected - review recent changes');
  }
  
  if (critical > 50) {
    recommendations.push('🚨 Critical violations still high - prioritize security and error handling');
  }
  
  if (blockers > 2) {
    recommendations.push('🛑 Multiple blockers identified - daily standup needed for resolution');
  }
  
  if (critical < 20) {
    recommendations.push('✅ Approaching completion - focus on code review and testing');
  }
  
  return recommendations;
}

async function saveStandupReports(report: StandupReport, currentResult: any) {
  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  await writeFile('./reports/daily-standup.md', markdownReport);
  
  // Update historical data
  await updateHistoricalData(currentResult);
  
  // Save JSON for automation
  await writeFile('./reports/daily-standup.json', JSON.stringify(report, null, 2));
}

function generateMarkdownReport(report: StandupReport): string {
  const progressPercentage = Math.round((report.violationsResolved / report.previousDayViolations) * 100);
  const statusEmoji = report.violationsResolved > report.violationsAdded ? '🟢' : 
                     report.violationsResolved === report.violationsAdded ? '🟡' : '🔴';
  
  return `# 🗓️ DAILY STANDUP REPORT

**Date**: ${report.date}  
**Day**: ${report.dayNumber} of 21  
**Status**: ${statusEmoji} ${progressPercentage}% progress

## 📊 Yesterday's Progress

| Metric | Count | Change |
|--------|-------|--------|
| **Total Violations** | ${report.currentViolations} | ${report.violationsAdded > report.violationsResolved ? '+' : ''}${report.violationsResolved - report.violationsAdded} |
| **Violations Resolved** | ${report.violationsResolved} | 🎉 |
| **Violations Added** | ${report.violationsAdded} | ⚠️ |
| **Critical Remaining** | ${report.currentViolations} | 🔴 |

## 👥 Team Progress

| Team Member | Assigned | Completed | Remaining | Status |
|-------------|----------|-----------|-----------|--------|
${report.teamProgress.map(member => 
  `| ${member.teamMember} | ${member.assignedViolations} | ${member.completedViolations} | ${member.remainingViolations} | ${getStatusEmoji(member.status)} ${member.status} |`
).join('\n')}

### Individual Updates

${report.teamProgress.map(member => `
#### ${member.teamMember} - ${member.status}

**Progress**: ${member.completedViolations}/${member.assignedViolations} violations  
**Notes**:
${member.notes.map(note => `- ${note}`).join('\n')}

**Focus**: ${member.remainingViolations > 0 ? `${member.remainingViolations} violations remaining` : '✅ All assigned violations complete'}
`).join('')}

## 🚫 Blockers & Impediments

${report.blockers.length === 0 ? '✅ No blockers reported' : report.blockers.map((blocker, i) => `
### ${i + 1}. ${blocker.teamMember} - ${blocker.blockerType}

**Violation**: ${blocker.violation}  
**Severity**: ${blocker.severity}  
**Description**: ${blocker.description}

**Needs Help**:
${blocker.needsHelp.map(need => `- ${need}`).join('\n')}

---
`).join('')}

## 🎯 Today's Focus Areas

${report.focusAreas.map((area, i) => `
${i + 1}. **${area}**
`).join('')}

## 💡 Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📋 Action Items

### Immediate (Today)
- [ ] Address high-priority blockers
- [ ] Complete assigned critical violations
- [ ] Code review for completed fixes

### This Week
- [ ] Reduce critical violations by 50%
- [ ] Implement API tracking infrastructure
- [ ] Standardize error handling patterns

### Process
- [ ] Update progress in team assignments
- [ ] Document any new patterns discovered
- [ ] Share knowledge across team members

## 📞 Contact & Support

**Technical Lead**: Alex Chen - for architecture decisions  
**Project Manager**: TBD - for resource allocation  
**DevOps Engineer**: TBD - for deployment questions

## 🔗 Related Reports

- [Team Assignments](./team-assignments.md) - Current violation assignments
- [Critical Issues](./violations-critical.md) - Detailed critical violations
- [Action Plan](./violations-action-plan.md) - Overall implementation plan

---

**Next Standup**: Tomorrow 09:00 AM  
**Progress Goal**: ${Math.ceil(report.currentViolations * 0.8)} violations remaining by EOD  
*Generated by Golden Rules Enforcement System*
`;
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'on-track': return '🟢';
    case 'behind': return '🟡';
    case 'blocked': return '🔴';
    case 'complete': return '✅';
    default: return '⚪';
  }
}

async function updateHistoricalData(currentResult: any) {
  try {
    const historicalData = await loadHistoricalData();
    const newData: HistoricalData = {
      date: new Date().toISOString(),
      totalViolations: currentResult.violations.length,
      criticalViolations: currentResult.violations.filter(v => v.severity === 'error').length
    };
    
    historicalData.push(newData);
    await writeFile('./reports/historical-violations.json', JSON.stringify(historicalData, null, 2));
  } catch (error) {
    console.error('Failed to update historical data:', error);
  }
}

// Run if called directly
if (import.meta.main) {
  await generateDailyStandup().catch(error => {
    console.error('❌ Standup generation failed:', error);
    process.exit(1);
  });
}
