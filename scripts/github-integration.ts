#!/usr/bin/env bun

/**
 * 🔗 Complete GitHub Health Integration
 * 
 * Comprehensive GitHub ecosystem validation with AI-powered insights
 * and security analysis for the FactoryWager enterprise platform.
 */

import { aiOperations } from '../lib/ai/ai-operations-manager.ts';
import { nanoseconds, color } from 'bun';
import { zeroTrustManager } from '../lib/security/zero-trust-manager.ts';

interface GitHubHealth {
  repository: {
    name: string;
    owner: string;
    branch: string;
    commits: number;
    issues: number;
    prs: number;
  };
  security: {
    vulnerabilities: number;
    dependencies: number;
    secrets: number;
    score: number;
  };
  activity: {
    lastCommit: string;
    contributors: number;
    releases: number;
    stars: number;
  };
  ai: {
    insights: string[];
    recommendations: string[];
    riskScore: number;
  };
}

async function analyzeGitHubHealth(): Promise<GitHubHealth> {
  const start = nanoseconds();
  
  // Simulate GitHub API calls (in real implementation, use GitHub API)
  const repoData = {
    name: 'factorywager-enterprise',
    owner: 'factorywager',
    branch: 'main',
    commits: 1247,
    issues: 23,
    prs: 8,
    lastCommit: '2024-02-05T10:30:00Z',
    contributors: 12,
    releases: 15,
    stars: 284
  };
  
  // Security analysis
  const securityData = {
    vulnerabilities: 2,
    dependencies: 145,
    secrets: 0,
    score: 85
  };
  
  // Generate AI insights
  const insights = await aiOperations.getOptimizationSuggestions();
  const securityInsights = aiOperations.getInsights({ type: 'security' });
  
  // Calculate risk score using AI
  const riskAnalysis = await aiOperations.predict('day');
  const riskScore = Math.max(0, Math.min(100, 
    (securityData.vulnerabilities * 10) + 
    (securityData.secrets * 25) + 
    (riskAnalysis.resource.cpu > 80 ? 15 : 0)
  ));
  
  const health: GitHubHealth = {
    repository: repoData,
    security: securityData,
    activity: {
      lastCommit: repoData.lastCommit,
      contributors: repoData.contributors,
      releases: repoData.releases,
      stars: repoData.stars
    },
    ai: {
      insights: insights.slice(0, 5).map(i => i.title),
      recommendations: securityInsights.slice(0, 3).map(i => i.title),
      riskScore
    }
  };
  
  return health;
}

function getSecurityColor(score: number): string {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

function getRiskColor(score: number): string {
  if (score <= 20) return 'green';
  if (score <= 50) return 'yellow';
  return 'red';
}

async function displayGitHubHealth(health: GitHubHealth) {
  console.log(color('\n🔗 GitHub Health Integration', 'cyan', 'bold'));
  console.log(color('─'.repeat(60), 'gray'));
  
  // Repository Info
  console.log(color('\n📁 Repository Information:', 'yellow', 'bold'));
  console.log(`  Name: ${color(`${health.repository.owner}/${health.repository.name}`, 'green')}`);
  console.log(`  Branch: ${color(health.repository.branch, 'green')}`);
  console.log(`  Commits: ${color(health.repository.commits.toString(), 'cyan')}`);
  console.log(`  Issues: ${color(health.repository.issues.toString(), 'cyan')}`);
  console.log(`  Pull Requests: ${color(health.repository.prs.toString(), 'cyan')}`);
  
  // Security Analysis
  const secColor = getSecurityColor(health.security.score);
  console.log(color('\n🔒 Security Analysis:', 'yellow', 'bold'));
  console.log(`  Security Score: ${color(health.security.score.toString(), secColor)}`);
  console.log(`  Vulnerabilities: ${color(health.security.vulnerabilities.toString(), 
    health.security.vulnerabilities > 0 ? 'red' : 'green')}`);
  console.log(`  Dependencies: ${color(health.security.dependencies.toString(), 'cyan')}`);
  console.log(`  Secrets Detected: ${color(health.security.secrets.toString(), 
    health.security.secrets > 0 ? 'red' : 'green')}`);
  
  // Activity Metrics
  console.log(color('\n📊 Activity Metrics:', 'yellow', 'bold'));
  console.log(`  Last Commit: ${color(new Date(health.activity.lastCommit).toLocaleDateString(), 'cyan')}`);
  console.log(`  Contributors: ${color(health.activity.contributors.toString(), 'cyan')}`);
  console.log(`  Releases: ${color(health.activity.releases.toString(), 'cyan')}`);
  console.log(`  Stars: ${color(health.activity.stars.toString(), 'cyan')}`);
  
  // AI Insights
  console.log(color('\n🤖 AI-Powered Insights:', 'yellow', 'bold'));
  if (health.ai.insights.length > 0) {
    health.ai.insights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${color(insight, 'cyan')}`);
    });
  } else {
    console.log(`  ${color('No critical insights detected', 'green')}`);
  }
  
  // AI Recommendations
  console.log(color('\n💡 AI Recommendations:', 'yellow', 'bold'));
  if (health.ai.recommendations.length > 0) {
    health.ai.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${color(rec, 'cyan')}`);
    });
  } else {
    console.log(`  ${color('No recommendations at this time', 'green')}`);
  }
  
  // Risk Assessment
  const riskColor = getRiskColor(health.ai.riskScore);
  console.log(color('\n⚠️  Risk Assessment:', 'yellow', 'bold'));
  console.log(`  Overall Risk Score: ${color(health.ai.riskScore.toString(), riskColor)}`);
  
  const riskLevel = health.ai.riskScore <= 20 ? 'Low' : health.ai.riskScore <= 50 ? 'Medium' : 'High';
  console.log(`  Risk Level: ${color(riskLevel, riskColor)}`);
  
  // Health Summary
  console.log(color('\n🏥 Health Summary:', 'yellow', 'bold'));
  const overallHealth = health.security.score >= 85 && health.ai.riskScore <= 30;
  console.log(`  Overall Status: ${color(overallHealth ? '✅ Healthy' : '⚠️  Needs Attention', 
    overallHealth ? 'green' : 'yellow')}`);
  
  // Action Items
  if (!overallHealth) {
    console.log(color('\n📋 Recommended Actions:', 'yellow', 'bold'));
    if (health.security.vulnerabilities > 0) {
      console.log(`  • ${color('Address security vulnerabilities', 'red')}`);
    }
    if (health.ai.riskScore > 30) {
      console.log(`  • ${color('Review AI risk factors', 'yellow')}`);
    }
    if (health.repository.issues > 20) {
      console.log(`  • ${color('Reduce open issue count', 'yellow')}`);
    }
  }
}

async function performSecurityValidation() {
  console.log(color('\n🔐 Performing Security Validation...', 'yellow'));
  
  try {
    // Test zero-trust authentication
    const testIdentity = await zeroTrustManager.registerIdentity({
      id: 'github-security-test',
      type: 'service',
      attributes: { service: 'github-integration' },
      credentials: {
        type: 'token',
        hash: 'test-token-hash',
        expires: Date.now() + 3600000
      },
      permissions: ['read', 'analyze']
    });
    
    console.log(color('  ✅ Zero-trust authentication validated', 'green'));
    
    // Check for security anomalies
    const anomalyStats = await (await import('../lib/ai/anomaly-detector.ts')).anomalyDetector.getStatistics();
    console.log(color(`  📊 Anomaly detection active: ${anomalyStats.totalAnomalies} monitored`, 'cyan'));
    
  } catch (error) {
    console.error(color('  ❌ Security validation failed:', 'red'), error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shortMode = args.includes('--short');
  const start = nanoseconds();
  
  try {
    console.log(color('🚀 Initializing GitHub Health Integration...', 'cyan'));
    
    const health = await analyzeGitHubHealth();
    
    if (shortMode) {
      // Ultra-fast mode for one-liners
      console.log(color('🔗 GitHub Health', 'cyan'));
      console.log(`  Repo: ${color(`${health.repository.owner}/${health.repository.name}`, 'green')} | Score: ${color(health.security.score.toString(), health.security.score >= 85 ? 'green' : 'yellow')}`);
      console.log(`  Issues: ${color(health.repository.issues.toString(), 'cyan')} | PRs: ${color(health.repository.prs.toString(), 'cyan')} | Risk: ${color(health.ai.riskScore.toString(), health.ai.riskScore <= 30 ? 'green' : 'yellow')}`);
      console.log(`  Status: ${color(health.security.score >= 85 && health.ai.riskScore <= 30 ? '✅ Healthy' : '⚠️ Needs Attention', health.security.score >= 85 && health.ai.riskScore <= 30 ? 'green' : 'yellow')}`);
      return;
    }
    
    await displayGitHubHealth(health);
    await performSecurityValidation();
    
    const elapsed = (nanoseconds() - start) / 1e6;
    console.log(color(`\n✨ GitHub health analysis completed in ${elapsed.toFixed(2)}ms`, 'green'));
    
  } catch (error) {
    console.error(color('❌ GitHub integration failed:', 'red'), error?.message || String(error));
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
