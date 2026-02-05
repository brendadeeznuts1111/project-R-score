#!/usr/bin/env bun
// scripts/demo-deep-path-focused.ts
// Focused demo of deep path access with cleaner output

import { UnicodeTableFormatter, type SortConfig } from '../terminal/unicode-formatter.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

// Initialize timezone for the demo
initializeScopeTimezone('DEVELOPMENT');

console.log('🔍 Empire Pro v3.7 - Deep Path Access Focused Demo\n');

// Simplified nested data for clear demonstration
const userData = [
  {
    id: 'USR-001',
    user: {
      profile: {
        email: 'alice@empire.com',
        name: 'Alice Johnson',
        department: 'Engineering'
      },
      security: {
        riskScore: 0.12,
        mfaEnabled: true,
        lastLogin: '2026-01-15T09:30:00Z'
      },
      performance: {
        score: 95,
        projects: 12
      }
    },
    metadata: {
      region: 'us-east',
      created: '2021-01-15T00:00:00Z'
    }
  },
  {
    id: 'USR-002',
    user: {
      profile: {
        email: 'bob@empire.com',
        name: 'Bob Smith',
        department: 'Marketing'
      },
      security: {
        riskScore: 0.45,
        mfaEnabled: false,
        lastLogin: '2026-01-14T14:15:00Z'
      },
      performance: {
        score: 78,
        projects: 5
      }
    },
    metadata: {
      region: 'eu-west',
      created: '2023-06-01T00:00:00Z'
    }
  },
  {
    id: 'USR-003',
    user: {
      profile: {
        email: 'carol@empire.com',
        name: 'Carol Davis',
        department: 'Engineering'
      },
      security: {
        riskScore: 0.08,
        mfaEnabled: true,
        lastLogin: '2026-01-15T08:45:00Z'
      },
      performance: {
        score: 98,
        projects: 18
      }
    },
    metadata: {
      region: 'us-west',
      created: '2020-03-10T00:00:00Z'
    }
  }
];

console.log('📧 Example 1: user.profile.email Deep Access');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  sortBy: [
    { column: 'user.profile.email', direction: 'asc' }
  ]
}));

console.log('\n🔐 Example 2: user.security.riskScore Numeric Sorting');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  sortBy: [
    { column: 'user.security.riskScore', direction: 'asc', type: 'number' }
  ]
}));

console.log('\n🏢 Example 3: user.profile.department + user.performance.score');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  sortBy: [
    { column: 'user.profile.department', direction: 'asc' },
    { column: 'user.performance.score', direction: 'desc', type: 'number' }
  ]
}));

console.log('\n📅 Example 4: user.security.lastLogin Date Sorting');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  sortBy: [
    { column: 'user.security.lastLogin', direction: 'desc', type: 'date' }
  ]
}));

console.log('\n🌍 Example 5: metadata.region + metadata.created Multi-level');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  sortBy: [
    { column: 'metadata.region', direction: 'asc' },
    { column: 'metadata.created', direction: 'asc', type: 'date' }
  ]
}));

console.log('\n🎯 Example 6: Complex Multi-level Deep Path Sorting');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  sortBy: [
    { column: 'user.profile.department', direction: 'asc' },
    { column: 'user.security.riskScore', direction: 'asc', type: 'number' },
    { column: 'user.performance.score', direction: 'desc', type: 'number' }
  ]
}));

console.log('\n🔍 Example 7: Deep Path Filtering');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(userData, {
  filter: { 'user.profile.department': 'Engineering' },
  sortBy: [
    { column: 'user.security.riskScore', direction: 'asc', type: 'number' }
  ]
}));

console.log('\n✅ Deep Path Access Summary:');
console.log('='.repeat(60));
console.log('🔹 user.profile.email - Direct email access');
console.log('🔹 user.security.riskScore - Numeric risk scoring');
console.log('🔹 user.performance.score - Performance metrics');
console.log('🔹 user.security.lastLogin - Date-based sorting');
console.log('🔹 metadata.region - Geographic organization');
console.log('🔹 user.profile.department - Department grouping');
console.log('🔹 Multi-level: department → risk → score');
console.log('🔹 Filtering: user.profile.department = "Engineering"');
console.log('🔹 Type inference: auto-detects number/date/string');
console.log('🔹 Unicode preserved: emojis, flags, special chars');

console.log('\n🎉 Deep Path Access - Enterprise Ready!');
console.log('🚀 Perfect for complex nested data analysis!');
