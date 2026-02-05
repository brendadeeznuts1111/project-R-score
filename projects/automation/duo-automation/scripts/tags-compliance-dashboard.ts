#!/usr/bin/env bun
/**
 * [DUOPLUS][COMPLIANCE][DASHBOARD][MEDIUM][#REF:COMPLY-DASH][BUN:6.1-NATIVE]
 * Tag Compliance Dashboard - Real-time compliance metrics visualization
 * Compliance: SOC2-Type-II | Standard: ISO-27001
 */

import { $ } from "bun";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface TagStats {
  totalCommits: number;
  taggedCommits: number;
  coveragePercent: number;
  byDomain: Record<string, number>;
  byClass: Record<string, number>;
  byType: Record<string, number>;
  violations: Violation[];
  aiGeneratedCount: number;
}

interface Violation {
  commit: string;
  author: string;
  type: string;
  level: 1 | 2 | 3;
  status: 'pending' | 'resolved' | 'escalated';
  daysOpen: number;
  description: string;
}

interface ComplianceReport {
  timestamp: string;
  period: string;
  stats: TagStats;
  score: number;
  status: 'compliant' | 'at-risk' | 'non-compliant';
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════
// TAG EXTRACTION
// ═══════════════════════════════════════════════════════════

const TAG_REGEX = /\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[#REF:([A-Z0-9_-]+)\]/gi;
const SIMPLE_TAG_REGEX = /\[([A-Z_]+)\]/g;

function extractTags(content: string): { domain: string; scope: string; type: string; class: string; ref: string }[] {
  const tags: { domain: string; scope: string; type: string; class: string; ref: string }[] = [];
  let match;

  while ((match = TAG_REGEX.exec(content)) !== null) {
    tags.push({
      domain: match[1],
      scope: match[2],
      type: match[3],
      class: match[4],
      ref: match[5],
    });
  }

  return tags;
}

// ═══════════════════════════════════════════════════════════
// GIT ANALYSIS
// ═══════════════════════════════════════════════════════════

async function analyzeCommits(days: number = 30): Promise<TagStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get commit log
  const log = await $`git log --since=${since} --pretty=format:"%H|%an|%s" --no-merges`.text();
  const commits = log.trim().split('\n').filter(Boolean);

  const stats: TagStats = {
    totalCommits: commits.length,
    taggedCommits: 0,
    coveragePercent: 0,
    byDomain: {},
    byClass: {},
    byType: {},
    violations: [],
    aiGeneratedCount: 0,
  };

  for (const commit of commits) {
    const [hash, author, message] = commit.split('|');
    const tags = extractTags(message);
    const simpleTags = [...message.matchAll(SIMPLE_TAG_REGEX)].map(m => m[1]);

    if (tags.length > 0 || simpleTags.length > 0) {
      stats.taggedCommits++;

      for (const tag of tags) {
        stats.byDomain[tag.domain] = (stats.byDomain[tag.domain] || 0) + 1;
        stats.byClass[tag.class] = (stats.byClass[tag.class] || 0) + 1;
        stats.byType[tag.type] = (stats.byType[tag.type] || 0) + 1;

        // Check for AI-generated code
        if (tag.domain === 'AI' || tag.type === 'GENERATED') {
          stats.aiGeneratedCount++;
        }
      }

      // Check for violations
      for (const tag of tags) {
        // E-022: SEC domain must have SEC type
        if (tag.domain === 'SEC' && tag.type !== 'SEC') {
          stats.violations.push({
            commit: hash.substring(0, 8),
            author,
            type: 'E-022',
            level: 2,
            status: 'pending',
            daysOpen: 0,
            description: `SEC domain with non-SEC type: ${tag.type}`,
          });
        }

        // Security fixes should be CRITICAL or HIGH
        if (tag.type === 'SEC' && !['CRITICAL', 'HIGH'].includes(tag.class)) {
          stats.violations.push({
            commit: hash.substring(0, 8),
            author,
            type: 'E-003',
            level: 1,
            status: 'pending',
            daysOpen: 0,
            description: `Security fix with class ${tag.class} (should be CRITICAL/HIGH)`,
          });
        }
      }
    } else {
      // Missing tags - check if it's a code file change
      const diff = await $`git diff-tree --no-commit-id --name-only -r ${hash}`.text();
      const codeFiles = diff.split('\n').filter(f => /\.(ts|tsx|js|jsx|py|go|rs)$/.test(f));

      if (codeFiles.length > 0) {
        stats.violations.push({
          commit: hash.substring(0, 8),
          author,
          type: 'E-001',
          level: 1,
          status: 'pending',
          daysOpen: Math.floor((Date.now() - new Date(since).getTime()) / (24 * 60 * 60 * 1000)),
          description: 'Missing mandatory DuoPlus tags on code changes',
        });
      }
    }
  }

  stats.coveragePercent = stats.totalCommits > 0
    ? Math.round((stats.taggedCommits / stats.totalCommits) * 100)
    : 100;

  return stats;
}

// ═══════════════════════════════════════════════════════════
// COMPLIANCE SCORING
// ═══════════════════════════════════════════════════════════

function calculateComplianceScore(stats: TagStats): number {
  let score = 100;

  // Deduct for low coverage
  if (stats.coveragePercent < 95) {
    score -= (95 - stats.coveragePercent) * 2;
  }

  // Deduct for violations
  for (const v of stats.violations) {
    if (v.level === 1) score -= 2;
    if (v.level === 2) score -= 5;
    if (v.level === 3) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function getComplianceStatus(score: number): 'compliant' | 'at-risk' | 'non-compliant' {
  if (score >= 90) return 'compliant';
  if (score >= 70) return 'at-risk';
  return 'non-compliant';
}

// ═══════════════════════════════════════════════════════════
// DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function displayHeader() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           DUOPLUS TAG COMPLIANCE DASHBOARD v1.0                   ║
║           SOC2 Type II | ISO-27001 Compliant                      ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
}

function displayStats(stats: TagStats) {
  const coverageEmoji = stats.coveragePercent >= 95 ? '✅' : stats.coveragePercent >= 80 ? '🟡' : '🔴';

  console.log(`
📊 COVERAGE METRICS (Last 30 Days)
${'─'.repeat(50)}
Total Commits:     ${stats.totalCommits}
Tagged Commits:    ${stats.taggedCommits}
Coverage:          ${coverageEmoji} ${stats.coveragePercent}% (target: 95%)
AI-Generated:      ${stats.aiGeneratedCount} commits
`);
}

function displayDomainBreakdown(stats: TagStats) {
  console.log(`
📁 DOMAIN BREAKDOWN
${'─'.repeat(50)}`);

  const sortedDomains = Object.entries(stats.byDomain)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  for (const [domain, count] of sortedDomains) {
    const bar = '█'.repeat(Math.min(20, Math.round(count / Math.max(...Object.values(stats.byDomain)) * 20)));
    console.log(`${domain.padEnd(15)} ${bar} ${count}`);
  }
}

function displayClassBreakdown(stats: TagStats) {
  console.log(`
🎯 SEVERITY BREAKDOWN
${'─'.repeat(50)}`);

  const classColors: Record<string, string> = {
    CRITICAL: '🔴',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🟢',
    NORMAL: '⚪',
  };

  for (const [cls, count] of Object.entries(stats.byClass)) {
    console.log(`${classColors[cls] || '⚪'} ${cls.padEnd(12)} ${count}`);
  }
}

function displayViolations(stats: TagStats) {
  if (stats.violations.length === 0) {
    console.log(`
✅ NO VIOLATIONS
${'─'.repeat(50)}
All commits are compliant with DuoPlus tagging standards.
`);
    return;
  }

  console.log(`
⚠️  VIOLATIONS (${stats.violations.length} total)
${'─'.repeat(70)}`);

  console.log('Commit   | Author          | Type   | Level | Status    | Description');
  console.log('─'.repeat(70));

  for (const v of stats.violations.slice(0, 10)) {
    const levelEmoji = v.level === 1 ? '🟡' : v.level === 2 ? '🟠' : '🔴';
    console.log(
      `${v.commit.padEnd(8)} | ${v.author.substring(0, 15).padEnd(15)} | ${v.type.padEnd(6)} | ${levelEmoji} ${v.level}   | ${v.status.padEnd(9)} | ${v.description.substring(0, 30)}`
    );
  }

  if (stats.violations.length > 10) {
    console.log(`... and ${stats.violations.length - 10} more violations`);
  }
}

function displayComplianceScore(score: number, status: string) {
  const statusEmoji = status === 'compliant' ? '✅' : status === 'at-risk' ? '⚠️' : '🚨';
  const scoreBar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));

  console.log(`
🏆 COMPLIANCE SCORE
${'─'.repeat(50)}
Score: [${scoreBar}] ${score}/100
Status: ${statusEmoji} ${status.toUpperCase()}
`);
}

function displayRecommendations(stats: TagStats, score: number) {
  const recommendations: string[] = [];

  if (stats.coveragePercent < 95) {
    recommendations.push(`📝 Increase tag coverage from ${stats.coveragePercent}% to 95%`);
  }

  if (stats.violations.filter(v => v.level >= 2).length > 0) {
    recommendations.push('🔧 Resolve Level 2+ violations immediately');
  }

  if (stats.byClass['CRITICAL'] && stats.byClass['CRITICAL'] > 5) {
    recommendations.push('🚨 High number of CRITICAL changes - ensure proper review');
  }

  if (stats.aiGeneratedCount > stats.taggedCommits * 0.5) {
    recommendations.push('🤖 >50% AI-generated code - ensure proper review coverage');
  }

  if (recommendations.length > 0) {
    console.log(`
💡 RECOMMENDATIONS
${'─'.repeat(50)}`);
    for (const rec of recommendations) {
      console.log(`  ${rec}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30');

  try {
    const stats = await analyzeCommits(days);
    const score = calculateComplianceScore(stats);
    const status = getComplianceStatus(score);

    if (jsonOutput) {
      const report: ComplianceReport = {
        timestamp: new Date().toISOString(),
        period: `${days} days`,
        stats,
        score,
        status,
        recommendations: [],
      };
      console.log(JSON.stringify(report, null, 2));
    } else {
      displayHeader();
      displayStats(stats);
      displayDomainBreakdown(stats);
      displayClassBreakdown(stats);
      displayViolations(stats);
      displayComplianceScore(score, status);
      displayRecommendations(stats, score);

      console.log(`
${'─'.repeat(50)}
Generated: ${new Date().toISOString()}
Dashboard: https://duoplus.dev/dashboard/compliance
`);
    }

    // Exit with error if non-compliant (for CI integration)
    if (status === 'non-compliant' && args.includes('--strict')) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error generating compliance report:', error);
    process.exit(1);
  }
}

main();
