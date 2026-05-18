#!/usr/bin/env bun
// scripts/demo-enhanced-table-formatter.ts
// Demo of enhanced UnicodeTableFormatter with deep sorting & filtering

import { UnicodeTableFormatter, type SortConfig } from '../terminal/unicode-formatter.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

// Initialize timezone for the demo
initializeScopeTimezone('DEVELOPMENT');

console.info('🚀 Empire Pro v3.7 - Enhanced Table Formatter Demo\n');

// Example 1: Multi-column sort with deep paths
console.info('📊 Example 1: Security Metrics with Deep Sorting');
console.info('='.repeat(60));

const securityMetrics = [
  { 
    scope: 'ENTERPRISE',
    metadata: { 
      created: '2026-01-15T10:00:00Z',
      region: 'us-east',
      owner: 'alice@company.com'
    },
    score: 95,
    status: true,
    category: 'NETWORK'
  },
  {
    scope: 'DEVELOPMENT',
    metadata: {
      created: '2026-01-14T15:30:00Z',
      region: 'eu-west',
      owner: 'bob@company.com'
    },
    score: 87,
    status: false,
    category: 'IDENTITY'
  },
  {
    scope: 'ENTERPRISE',
    metadata: {
      created: '2026-01-16T08:45:00Z',
      region: 'us-west',
      owner: 'carol@company.com'
    },
    score: 92,
    status: true,
    category: 'DATA'
  },
  {
    scope: 'PRODUCTION',
    metadata: {
      created: '2026-01-13T12:15:00Z',
      region: 'us-east',
      owner: 'dave@company.com'
    },
    score: 78,
    status: false,
    category: 'COMPLIANCE'
  }
];

console.info(UnicodeTableFormatter.generateTable(securityMetrics, {
  sortBy: [
    { column: 'scope', direction: 'asc' },
    { column: 'score', direction: 'desc', type: 'number' }
  ],
  maxRows: 10
}));

// Example 2: Filtering with nested paths
console.info('\n📋 Example 2: Filtered by Scope = ENTERPRISE');
console.info('='.repeat(60));

console.info(UnicodeTableFormatter.generateTable(securityMetrics, {
  filter: { scope: 'ENTERPRISE' },
  sortBy: [
    { column: 'metadata.region', direction: 'asc' },
    { column: 'score', direction: 'desc', type: 'number' }
  ]
}));

// Example 3: Complex data with emojis and Unicode
console.info('\n🌍 Example 3: Global Infrastructure with Unicode');
console.info('='.repeat(60));

const globalInfrastructure = [
  {
    name: '🇺🇸 US East',
    status: '🟢 Active',
    load: 0.45,
    region: 'us-east',
    metadata: {
      country: 'United States',
      flag: '🇺🇸',
      established: '2020-01-01T00:00:00Z'
    }
  },
  {
    name: '🇬🇧 UK West',
    status: '🟡 Warning',
    load: 0.78,
    region: 'eu-west',
    metadata: {
      country: 'United Kingdom',
      flag: '🇬🇧',
      established: '2021-06-15T00:00:00Z'
    }
  },
  {
    name: '🇯🇵 Japan Central',
    status: '🟢 Active',
    load: 0.32,
    region: 'ap-northeast',
    metadata: {
      country: 'Japan',
      flag: '🇯🇵',
      established: '2019-03-20T00:00:00Z'
    }
  },
  {
    name: '🇦🇺 Australia East',
    status: '🔴 Critical',
    load: 0.95,
    region: 'ap-southeast',
    metadata: {
      country: 'Australia',
      flag: '🇦🇺',
      established: '2022-11-01T00:00:00Z'
    }
  }
];

console.info(UnicodeTableFormatter.generateTable(globalInfrastructure, {
  sortBy: [
    { column: 'load', direction: 'desc', type: 'number' },
    { column: 'name', direction: 'asc' }
  ],
  maxRows: 5
}));

// Example 4: Custom comparator for complex sorting
console.info('\n🎯 Example 4: Custom Status Priority Sorting');
console.info('='.repeat(60));

const statusPriority: Record<string, number> = {
  '🔴 Critical': 4,
  '🟡 Warning': 3,
  '🟢 Active': 2,
  '🔵 Maintenance': 1
};

console.info(UnicodeTableFormatter.generateTable(globalInfrastructure, {
  sortBy: [
    { 
      column: 'status', 
      direction: 'desc',
      customComparator: (a, b) => {
        const aPriority = statusPriority[a] || 0;
        const bPriority = statusPriority[b] || 0;
        return aPriority - bPriority;
      }
    },
    { column: 'metadata.country', direction: 'asc' }
  ]
}));

// Example 5: Date sorting with timezone awareness
console.info('\n📅 Example 5: Date Sorting (Newest First)');
console.info('='.repeat(60));

console.info(UnicodeTableFormatter.generateTable(globalInfrastructure, {
  sortBy: [
    { column: 'metadata.established', direction: 'desc', type: 'date' },
    { column: 'load', direction: 'asc', type: 'number' }
  ]
}));

// Example 6: Multi-dimensional analysis
console.info('\n🔍 Example 6: Multi-dimensional Analysis');
console.info('='.repeat(60));

const analysisData = [
  {
    user: { name: 'Alice', department: 'Engineering', level: 'Senior' },
    performance: { score: 95, projects: 12, efficiency: 0.92 },
    metadata: { 
      joinDate: '2021-01-15T00:00:00Z',
      lastActive: '2026-01-14T10:30:00Z',
      status: '🟢 Active'
    }
  },
  {
    user: { name: 'Bob', department: 'Marketing', level: 'Junior' },
    performance: { score: 78, projects: 5, efficiency: 0.85 },
    metadata: { 
      joinDate: '2023-06-01T00:00:00Z',
      lastActive: '2026-01-13T15:45:00Z',
      status: '🟡 Warning'
    }
  },
  {
    user: { name: 'Carol', department: 'Engineering', level: 'Lead' },
    performance: { score: 98, projects: 18, efficiency: 0.96 },
    metadata: { 
      joinDate: '2020-03-10T00:00:00Z',
      lastActive: '2026-01-15T09:15:00Z',
      status: '🟢 Active'
    }
  }
];

console.info(UnicodeTableFormatter.generateTable(analysisData, {
  sortBy: [
    { column: 'user.department', direction: 'asc' },
    { column: 'performance.score', direction: 'desc', type: 'number' },
    { column: 'user.level', direction: 'asc' }
  ],
  maxRows: 10
}));

// Generate summary
console.info(UnicodeTableFormatter.generateSummary(securityMetrics, 'scope'));

console.info('\n✅ Enhanced Table Formatter Demo Completed!');
console.info('🎯 Features demonstrated:');
console.info('  • Multi-key stable sorting with type inference');
console.info('  • Deep path access (metadata.created, user.name)');
console.info('  • Filtering with exact match');
console.info('  • Custom comparators for complex logic');
console.info('  • Date sorting with timezone awareness');
console.info('  • Unicode/emoji preservation throughout');
console.info('  • Bun.stringWidth optimization for perfect alignment');
