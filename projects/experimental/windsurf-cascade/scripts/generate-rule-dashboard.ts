#!/usr/bin/env bun

// scripts/generate-rule-dashboard.ts
import { GoldenRuleEnforcer } from '../packages/odds-core/src/standards/rule-enforcement.js';
import { writeFile, readdir } from 'fs/promises';

interface DashboardData {
  timestamp: string;
  overallScore: number;
  ruleScores: Record<string, number>;
  trend: 'improving' | 'declining' | 'stable';
  recentViolations: any[];
  recommendations: string[];
}

async function generateDashboard(): Promise<void> {
  console.log('📊 Generating Golden Rules Dashboard...\n');
  
  const enforcer = new GoldenRuleEnforcer();
  const result = await enforcer.validateCodebase();
  
  // Read historical data
  const historicalReports = await getHistoricalReports();
  const dashboardData = await compileDashboardData(result, historicalReports);
  
  const dashboard = `
# 🎯 GOLDEN RULES COMPLIANCE DASHBOARD

**Last Updated**: ${new Date().toISOString()}
**Overall Score**: ${dashboardData.overallScore}/100
**Trend**: ${dashboardData.trend}

## 📈 Compliance Scores

${Object.entries(dashboardData.ruleScores)
  .map(([rule, score]) => `- **${rule}**: ${score}%`)
  .join('\n')}

## 🚨 Recent Issues

${dashboardData.recentViolations.length > 0 
  ? dashboardData.recentViolations.map(v => `- ${v.rule}: ${v.message}`).join('\n')
  : '✅ No recent violations'}

## 💡 Recommendations

${dashboardData.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📊 Historical Trend

${generateTrendVisualization(dashboardData)}

---
*Generated automatically by Odds Protocol Golden Rules System*
`;

  await writeFile('./reports/golden-rules-dashboard.md', dashboard);
  console.log('✅ Dashboard generated: reports/golden-rules-dashboard.md');
}

async function getHistoricalReports(): Promise<any[]> {
  try {
    const files = await readdir('./reports');
    const reportFiles = files.filter(f => f.startsWith('golden-rules-') && f.endsWith('.json'));
    
    const reports = [];
    for (const file of reportFiles.slice(-5)) { // Last 5 reports
      const content = await Bun.file(`./reports/${file}`).text();
      reports.push(JSON.parse(content));
    }
    
    return reports;
  } catch {
    return [];
  }
}

async function compileDashboardData(currentResult: any, historical: any[]): Promise<DashboardData> {
  const ruleScores: Record<string, number> = {};
  const totalRules = currentResult.summary.totalRules;
  
  // Calculate scores for each rule (simplified)
  for (const rule of ['Use Bun Builtins', 'Track API Usage', 'Error Handling', 'Type Safety']) {
    const ruleViolations = currentResult.violations.filter((v: any) => v.rule === rule);
    const errorCount = ruleViolations.filter((v: any) => v.severity === 'error').length;
    const warningCount = ruleViolations.filter((v: any) => v.severity === 'warning').length;
    
    // Simple scoring: 100% - (errors * 10 + warnings * 5)%
    ruleScores[rule] = Math.max(0, 100 - (errorCount * 10 + warningCount * 5));
  }
  
  const overallScore = Math.round(
    Object.values(ruleScores).reduce((a, b) => a + b, 0) / Object.keys(ruleScores).length
  );
  
  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (historical.length >= 2) {
    const previousScore = historical[historical.length - 2].summary?.passedRules || 0;
    const currentPassed = currentResult.summary.passedRules;
    trend = currentPassed > previousScore ? 'improving' : currentPassed < previousScore ? 'declining' : 'stable';
  }
  
  return {
    timestamp: new Date().toISOString(),
    overallScore,
    ruleScores,
    trend,
    recentViolations: currentResult.violations.slice(0, 5),
    recommendations: generateDashboardRecommendations(currentResult)
  };
}

function generateDashboardRecommendations(result: any): string[] {
  const recommendations: string[] = [];
  const { violations, summary } = result;
  
  if (summary.errorCount > 0) {
    recommendations.push(`Address ${summary.errorCount} error-level violations immediately`);
  }
  
  if (violations.some((v: any) => v.rule === 'Use Bun Builtins')) {
    recommendations.push('Migrate remaining npm packages to Bun builtins');
  }
  
  if (summary.passedRules < summary.totalRules) {
    recommendations.push(`Focus on achieving 100% rule compliance (currently ${summary.passedRules}/${summary.totalRules})`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Maintain current high standards and monitor for regressions');
  }
  
  return recommendations;
}

function generateTrendVisualization(data: DashboardData): string {
  const { trend, overallScore } = data;
  
  const trendIcons = {
    improving: '📈',
    declining: '📉',
    stable: '➡️'
  };
  
  return `
**Current Score**: ${overallScore}% ${trendIcons[trend]}

${trend === 'improving' 
  ? 'Compliance is improving! Keep up the good work!'
  : trend === 'declining'
  ? 'Compliance has declined. Review recent changes.'
  : 'Compliance remains stable.'}
  `;
}

await generateDashboard();
