#!/usr/bin/env bun

// Fantasy42-Fire22 Issue Reassignment Script
// Automatically reassigns GitHub issues to appropriate department heads

import { execSync } from 'child_process';

// Department head assignments for issue reassignment
const DEPARTMENT_ASSIGNMENTS = {
  // CEO - Executive oversight and major strategic initiatives
  brendadeeznuts1111: ['enterprise', 'organization', 'enhancement'],

  // CTO - Technical architecture and infrastructure
  'nolarose1968-pixel': ['infrastructure', 'automation', 'architecture'],

  // Security & Compliance - Security, compliance, and audit
  'lisa-anderson': ['security', 'compliance', 'audit'],

  // Product Management - Product features, betting, gaming
  'samantha-rivera': ['betting', 'gaming', 'product', 'feature'],

  // Technology - Cloud, DevOps, infrastructure
  'david-kim': ['cloud', 'deployment', 'infrastructure', 'devops'],

  // Marketing - Analytics, marketing, documentation
  'rachel-green': ['analytics', 'marketing', 'documentation'],

  // Finance - Financial systems, payments
  'sarah-thompson': ['finance', 'payment', 'financial'],

  // Customer Support - Support systems
  'mike-johnson': ['support', 'customer', 'ticket'],

  // Operations - Operations and supply chain
  'robert-garcia': ['operations', 'supply', 'warehouse'],

  // Management - Strategic planning and performance
  'john-smith': ['management', 'strategy', 'performance'],

  // Team Contributors - Open source and automation
  'alex-chen': ['open-source', 'automation', 'contribution'],

  // Onboarding - Training and onboarding
  'natasha-cooper': ['onboarding', 'training', 'hr'],

  // Design - Design systems and UI
  'isabella-martinez': ['design', 'ui', 'ux'],
};

// Function to get open issues
async function getOpenIssues() {
  try {
    const result = execSync('gh issue list --state open --json number,title,labels', {
      encoding: 'utf8',
    });
    return JSON.parse(result);
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    return [];
  }
}

// Function to assign issue to department head
async function assignIssue(issueNumber: number, assignee: string, department: string) {
  try {
    execSync(`gh issue edit ${issueNumber} --add-assignee ${assignee}`, { stdio: 'inherit' });
    console.log(`✅ Assigned issue #${issueNumber} to ${assignee} (${department})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to assign issue #${issueNumber} to ${assignee}:`, error);
    return false;
  }
}

// Function to determine best department head for an issue
function findBestAssignee(issue: any): { assignee: string; department: string } | null {
  const title = issue.title.toLowerCase();
  const labels = issue.labels.map((label: any) => label.name.toLowerCase());

  // Score each department head based on relevance
  const scores: { [key: string]: { score: number; department: string } } = {};

  for (const [assignee, keywords] of Object.entries(DEPARTMENT_ASSIGNMENTS)) {
    let score = 0;
    const department = assignee.split('-').pop() || assignee; // Extract department name

    // Check title keywords
    for (const keyword of keywords) {
      if (title.includes(keyword)) {
        score += 3; // Title match is most important
      }
    }

    // Check label keywords
    for (const label of labels) {
      for (const keyword of keywords) {
        if (label.includes(keyword)) {
          score += 2; // Label match is important
        }
      }
    }

    if (score > 0) {
      scores[assignee] = { score, department };
    }
  }

  // Find highest scoring assignee
  let bestAssignee = null;
  let bestScore = 0;

  for (const [assignee, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestAssignee = { assignee, department: data.department };
    }
  }

  return bestAssignee;
}

// Main reassignment function
async function reassignIssues() {
  console.log('🚀 Fantasy42-Fire22 Issue Reassignment');
  console.log('=====================================');

  const issues = await getOpenIssues();

  if (issues.length === 0) {
    console.log('No open issues found.');
    return;
  }

  console.log(`Found ${issues.length} open issues to reassign.`);
  console.log('');

  let assignedCount = 0;
  let skippedCount = 0;

  for (const issue of issues) {
    console.log(`🔍 Analyzing issue #${issue.number}: "${issue.title}"`);

    const bestAssignee = findBestAssignee(issue);

    if (bestAssignee) {
      console.log(`   → Best match: ${bestAssignee.assignee} (${bestAssignee.department})`);

      // Ask for confirmation before assigning
      const shouldAssign = await confirmAssignment(issue, bestAssignee);

      if (shouldAssign) {
        const success = await assignIssue(
          issue.number,
          bestAssignee.assignee,
          bestAssignee.department
        );
        if (success) {
          assignedCount++;
        }
      } else {
        console.log(`   → Skipped assignment for issue #${issue.number}`);
        skippedCount++;
      }
    } else {
      console.log(`   → No suitable assignee found for issue #${issue.number}`);
      skippedCount++;
    }

    console.log('');
  }

  console.log('📊 Reassignment Summary');
  console.log('=======================');
  console.log(`✅ Issues assigned: ${assignedCount}`);
  console.log(`⏭️  Issues skipped: ${skippedCount}`);
  console.log(`📋 Total issues processed: ${issues.length}`);
}

// Simple confirmation function (in real implementation, this would be interactive)
async function confirmAssignment(issue: any, assignee: any): Promise<boolean> {
  // For this demo, we'll auto-confirm all assignments
  // In a real implementation, this would prompt the user
  return true;
}

// Run the reassignment
reassignIssues().catch(console.error);
