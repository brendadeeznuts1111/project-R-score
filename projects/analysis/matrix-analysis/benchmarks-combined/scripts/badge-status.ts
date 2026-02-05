#!/usr/bin/env bun
/**
 * Badge Status Generator
 * 
 * Generates JSON endpoints for dynamic badge updates
 */

import { write } from 'bun';

interface BadgeStatus {
  status: string;
  label: string;
  color: string;
}

interface PerformanceScore {
  score: number;
  label: string;
  color: string;
}

interface Coverage {
  coverage: string;
  label: string;
  color: string;
}

interface LastRun {
  timestamp: string;
  label: string;
  color: string;
}

// Generate badge status based on benchmark results
function generateBadgeStatus(): BadgeStatus {
  // In real implementation, this would check actual benchmark results
  const now = new Date();
  const hour = now.getHours();
  
  // Simulate different statuses based on time
  if (hour >= 9 && hour <= 17) {
    return {
      status: 'passing',
      label: 'Passing',
      color: 'green'
    };
  } else if (hour >= 6 && hour <= 9 || hour >= 17 && hour <= 20) {
    return {
      status: 'warning',
      label: 'Warning',
      color: 'yellow'
    };
  } else {
    return {
      status: 'unknown',
      label: 'Unknown',
      color: 'grey'
    };
  }
}

// Generate performance score
function generatePerformanceScore(): PerformanceScore {
  // Simulate performance score (0-100)
  const score = Math.floor(Math.random() * 30) + 70; // 70-100 range
  
  let color = 'red';
  if (score >= 95) color = 'brightgreen';
  else if (score >= 90) color = 'green';
  else if (score >= 85) color = 'yellowgreen';
  else if (score >= 80) color = 'yellow';
  else if (score >= 75) color = 'orange';
  
  return {
    score,
    label: `${score}/100`,
    color
  };
}

// Generate coverage percentage
function generateCoverage(): Coverage {
  // Simulate coverage percentage
  const coverage = Math.floor(Math.random() * 20) + 80; // 80-100 range
  
  let color = 'red';
  if (coverage >= 95) color = 'brightgreen';
  else if (coverage >= 90) color = 'green';
  else if (coverage >= 85) color = 'yellowgreen';
  else if (coverage >= 80) color = 'yellow';
  
  return {
    coverage: `${coverage}%`,
    label: `${coverage}%`,
    color
  };
}

// Generate last run timestamp
function generateLastRun(): LastRun {
  const now = new Date();
  const minutesAgo = Math.floor(Math.random() * 60);
  const timestamp = `${minutesAgo}m ago`;
  
  let color = 'green';
  if (minutesAgo > 30) color = 'yellow';
  if (minutesAgo > 45) color = 'orange';
  if (minutesAgo > 60) color = 'red';
  
  return {
    timestamp,
    label: timestamp,
    color
  };
}

// API endpoints
const endpoints = {
  '/api/benchmarks/status': generateBadgeStatus,
  '/api/benchmarks/performance': generatePerformanceScore,
  '/api/benchmarks/coverage': generateCoverage,
  '/api/benchmarks/last-run': generateLastRun
};

// Generate all badge data
console.log('Generating badge status data...');

const statusData = generateBadgeStatus();
await write('reports/badge-status.json', JSON.stringify(statusData, null, 2));
console.log(`✓ Status: ${statusData.label} (${statusData.color})`);

const perfData = generatePerformanceScore();
await write('reports/performance-score.json', JSON.stringify(perfData, null, 2));
console.log(`✓ Performance: ${perfData.label} (${perfData.color})`);

const coverageData = generateCoverage();
await write('reports/coverage.json', JSON.stringify(coverageData, null, 2));
console.log(`✓ Coverage: ${coverageData.label} (${coverageData.color})`);

const lastRunData = generateLastRun();
await write('reports/last-run.json', JSON.stringify(lastRunData, null, 2));
console.log(`✓ Last Run: ${lastRunData.label} (${lastRunData.color})`);

// Create combined status file
const combinedStatus = {
  timestamp: new Date().toISOString(),
  status: statusData,
  performance: perfData,
  coverage: coverageData,
  lastRun: lastRunData
};

await write('reports/combined-status.json', JSON.stringify(combinedStatus, null, 2));
console.log('\n✓ All badge data generated in reports/');

// Export for potential server use
export {
  generateBadgeStatus,
  generatePerformanceScore,
  generateCoverage,
  generateLastRun,
  endpoints
};
