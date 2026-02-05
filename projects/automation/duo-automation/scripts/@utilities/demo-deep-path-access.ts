#!/usr/bin/env bun
// scripts/demo-deep-path-access.ts
// Focused demo of deep path access in Enhanced UnicodeTableFormatter

import { UnicodeTableFormatter, type SortConfig } from '../terminal/unicode-formatter.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

// Initialize timezone for the demo
initializeScopeTimezone('DEVELOPMENT');

console.log('🔍 Empire Pro v3.7 - Deep Path Access Demo\n');

// Complex nested data structure demonstrating deep path capabilities
const enterpriseData = [
  {
    id: 'USR-001',
    user: {
      profile: {
        email: 'alice.johnson@empire.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        avatar: '👩‍💼',
        department: 'Engineering',
        level: 'Senior'
      },
      security: {
        mfaEnabled: true,
        lastLogin: '2026-01-15T09:30:00Z',
        failedAttempts: 0,
        riskScore: 0.12
      },
      permissions: {
        admin: true,
        developer: true,
        readonly: true
      }
    },
    performance: {
      metrics: {
        codeQuality: 95,
        productivity: 88,
        collaboration: 92
      },
      projects: [
        { name: 'Security Framework', status: 'completed', score: 98 },
        { name: 'API Gateway', status: 'in-progress', score: 87 }
      ],
      reviews: {
        lastReview: '2025-12-15T00:00:00Z',
        nextReview: '2026-03-15T00:00:00Z',
        rating: 4.8
      }
    },
    metadata: {
      created: '2021-01-15T00:00:00Z',
      region: 'us-east',
      costCenter: 'ENG-001',
      tags: ['senior', 'full-stack', 'security']
    }
  },
  {
    id: 'USR-002',
    user: {
      profile: {
        email: 'bob.smith@empire.com',
        firstName: 'Bob',
        lastName: 'Smith',
        avatar: '👨‍💻',
        department: 'Marketing',
        level: 'Junior'
      },
      security: {
        mfaEnabled: false,
        lastLogin: '2026-01-14T14:15:00Z',
        failedAttempts: 2,
        riskScore: 0.45
      },
      permissions: {
        admin: false,
        developer: false,
        readonly: true
      }
    },
    performance: {
      metrics: {
        codeQuality: 72,
        productivity: 85,
        collaboration: 78
      },
      projects: [
        { name: 'Campaign Analytics', status: 'completed', score: 82 },
        { name: 'Customer Portal', status: 'planned', score: 0 }
      ],
      reviews: {
        lastReview: '2025-11-20T00:00:00Z',
        nextReview: '2026-02-20T00:00:00Z',
        rating: 3.9
      }
    },
    metadata: {
      created: '2023-06-01T00:00:00Z',
      region: 'eu-west',
      costCenter: 'MKT-001',
      tags: ['junior', 'analytics', 'campaign']
    }
  },
  {
    id: 'USR-003',
    user: {
      profile: {
        email: 'carol.davis@empire.com',
        firstName: 'Carol',
        lastName: 'Davis',
        avatar: '👩‍🔬',
        department: 'Engineering',
        level: 'Lead'
      },
      security: {
        mfaEnabled: true,
        lastLogin: '2026-01-15T08:45:00Z',
        failedAttempts: 0,
        riskScore: 0.08
      },
      permissions: {
        admin: true,
        developer: true,
        readonly: true
      }
    },
    performance: {
      metrics: {
        codeQuality: 98,
        productivity: 95,
        collaboration: 96
      },
      projects: [
        { name: 'Machine Learning Pipeline', status: 'in-progress', score: 94 },
        { name: 'Data Platform', status: 'completed', score: 99 }
      ],
      reviews: {
        lastReview: '2025-12-01T00:00:00Z',
        nextReview: '2026-03-01T00:00:00Z',
        rating: 4.9
      }
    },
    metadata: {
      created: '2020-03-10T00:00:00Z',
      region: 'us-west',
      costCenter: 'ENG-002',
      tags: ['lead', 'ml-engineer', 'data-science']
    }
  }
];

console.log('📊 Example 1: Basic Deep Path Access');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { column: 'user.profile.department', direction: 'asc' },
    { column: 'performance.metrics.codeQuality', direction: 'desc', type: 'number' }
  ]
}));

console.log('\n📧 Example 2: Email and Security Focus');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { column: 'user.security.riskScore', direction: 'asc', type: 'number' },
    { column: 'user.profile.email', direction: 'asc' }
  ]
}));

console.log('\n🔐 Example 3: Security and Permissions Analysis');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { column: 'user.permissions.admin', direction: 'desc' },
    { column: 'user.security.mfaEnabled', direction: 'desc' },
    { column: 'user.security.failedAttempts', direction: 'desc', type: 'number' }
  ]
}));

console.log('\n⭐ Example 4: Performance Metrics Deep Dive');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { column: 'performance.reviews.rating', direction: 'desc', type: 'number' },
    { column: 'performance.metrics.productivity', direction: 'desc', type: 'number' }
  ]
}));

console.log('\n📅 Example 5: Date-based Sorting with Deep Paths');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { column: 'user.security.lastLogin', direction: 'desc', type: 'date' },
    { column: 'performance.reviews.nextReview', direction: 'asc', type: 'date' }
  ]
}));

console.log('\n🏷️ Example 6: Metadata and Cost Center Analysis');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { column: 'metadata.region', direction: 'asc' },
    { column: 'metadata.costCenter', direction: 'asc' },
    { column: 'metadata.created', direction: 'asc', type: 'date' }
  ]
}));

console.log('\n🎯 Example 7: Complex Multi-level Custom Sorting');
console.log('='.repeat(60));

// Custom comparator for department priority
const departmentPriority: Record<string, number> = {
  'Engineering': 3,
  'Marketing': 2,
  'Support': 1
};

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  sortBy: [
    { 
      column: 'user.profile.department', 
      direction: 'desc',
      customComparator: (a, b) => {
        const aPriority = departmentPriority[a] || 0;
        const bPriority = departmentPriority[b] || 0;
        return aPriority - bPriority;
      }
    },
    { column: 'user.profile.level', direction: 'desc' },
    { column: 'performance.metrics.codeQuality', direction: 'desc', type: 'number' }
  ]
}));

console.log('\n🔍 Example 8: Deep Path Filtering');
console.log('='.repeat(60));

console.log(UnicodeTableFormatter.generateTable(enterpriseData, {
  filter: { 'user.permissions.admin': true },
  sortBy: [
    { column: 'user.security.riskScore', direction: 'asc', type: 'number' },
    { column: 'user.profile.email', direction: 'asc' }
  ]
}));

console.log('\n📈 Summary: Deep Path Access Capabilities');
console.log('='.repeat(60));
console.log('✅ user.profile.email - Direct nested field access');
console.log('✅ user.security.riskScore - Deep numeric field access');
console.log('✅ user.permissions.admin - Deep boolean field access');
console.log('✅ performance.metrics.codeQuality - Multi-level numeric access');
console.log('✅ user.security.lastLogin - Deep date field access');
console.log('✅ metadata.region - Simple nested field access');
console.log('✅ user.permissions.admin - Filtering on deep paths');
console.log('✅ Custom comparators work with deep paths');
console.log('✅ Type inference works across all nested levels');
console.log('✅ Unicode/emoji preserved throughout deep access');

console.log('\n🎉 Deep Path Access Demo Completed!');
console.log('🚀 Empire Pro v3.7 - Enterprise-grade nested data analysis!');
