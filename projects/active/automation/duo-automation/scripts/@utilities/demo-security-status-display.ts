#!/usr/bin/env bun
// scripts/demo-security-status-display.ts
// Demo of SecurityStatusDisplay with Bun v1.3.5 stringWidth features

import { SecurityStatusDisplay } from '../security/status-display.ts';

console.info('🔒 Security Status Display Demo - Empire Pro v3.7\n');

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
  console.info(`📋 Security Status for: ${domain}`);
  console.info(SecurityStatusDisplay.displayStatus(domain, securityChecks));
  console.info('\n' + '='.repeat(60) + '\n');
});

// Demo security badges
console.info('🏆 Security Badges Demo:\n');

const scores = [95, 87, 65, 42];
scores.forEach(score => {
  console.info(SecurityStatusDisplay.createSecurityBadge(score));
  console.info();
});

console.info('✅ Security Status Display demo completed!');
console.info('🎯 Features demonstrated:');
console.info('  • Country flag generation from domain TLD');
console.info('  • Unicode-aware border sizing (Bun.stringWidth)');
console.info('  • ANSI color coding for status levels');
console.info('  • Hierarchical check formatting');
console.info('  • ASCII art security badges');
console.info('  • Comprehensive summary statistics');
