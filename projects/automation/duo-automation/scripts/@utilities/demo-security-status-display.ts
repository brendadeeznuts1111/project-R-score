#!/usr/bin/env bun
// scripts/demo-security-status-display.ts
// Demo of SecurityStatusDisplay with Bun v1.3.5 stringWidth features

import { SecurityStatusDisplay } from '../security/status-display.ts';

console.log('🔒 Security Status Display Demo - Empire Pro v3.7\n');

// Example security checks for different domains
const securityChecks = [
  {
    name: 'TLS Configuration',
    status: 'PASS' as const,
    message: 'TLS 1.3 properly configured',
    level: 0
  },
  {
    name: 'CORS Policy',
    status: 'WARN' as const,
    message: 'Cross-origin settings need review',
    details: 'Current policy allows all origins\nRecommend restricting to specific domains',
    level: 0
  },
  {
    name: 'Authentication',
    status: 'PASS' as const,
    message: 'Multi-factor authentication enabled',
    level: 0
  },
  {
    name: 'Rate Limiting',
    status: 'FAIL' as const,
    message: 'No rate limiting configured',
    details: 'API endpoints are vulnerable to DDoS attacks\nImplement rate limiting middleware',
    level: 0
  },
  {
    name: 'Certificate Validity',
    status: 'PASS' as const,
    message: 'SSL certificate valid and trusted',
    level: 1
  }
];

// Demo with different domains to show flag generation
const domains = [
  'empire.factory-wager.com',  // 🇺🇸 US
  'security.example.co.uk',    // 🇬🇧 UK  
  'monitoring.test.jp',        // 🇯🇵 Japan
  'global.enterprise.io'       // 🌐 Generic
];

domains.forEach(domain => {
  console.log(`📋 Security Status for: ${domain}`);
  console.log(SecurityStatusDisplay.displayStatus(domain, securityChecks));
  console.log('\n' + '='.repeat(60) + '\n');
});

// Demo security badges
console.log('🏆 Security Badges Demo:\n');

const scores = [95, 87, 65, 42];
scores.forEach(score => {
  console.log(SecurityStatusDisplay.createSecurityBadge(score));
  console.log();
});

console.log('✅ Security Status Display demo completed!');
console.log('🎯 Features demonstrated:');
console.log('  • Country flag generation from domain TLD');
console.log('  • Unicode-aware border sizing (Bun.stringWidth)');
console.log('  • ANSI color coding for status levels');
console.log('  • Hierarchical check formatting');
console.log('  • ASCII art security badges');
console.log('  • Comprehensive summary statistics');
