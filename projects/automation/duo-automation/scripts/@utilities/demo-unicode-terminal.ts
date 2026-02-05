#!/usr/bin/env bun
// scripts/demo-unicode-terminal.ts
// Demo script showcasing Unicode and ANSI handling capabilities

import { UnicodeTableFormatter } from '../terminal/unicode-formatter';
import { ANSIParser } from '../terminal/ansi-parser';
import { UnicodeProgress } from '../terminal/progress-indicators';
import { SecurityStatusDisplay } from '../security/status-display';

console.log('🚀 Empire Pro v3.7 - Unicode & ANSI Terminal Demo\n');

// Demo 1: Unicode-aware table formatting
console.log('📊 Demo 1: Unicode-Aware Table Formatting');
console.log('='.repeat(50));

const unicodeData = [
  { emoji: '🇺🇸', name: 'US Flag', width: '2 chars', category: 'Flags' },
  { emoji: '👨‍👩‍👧', name: 'Family', width: '2 chars', category: 'People' },
  { emoji: '1️⃣', name: 'Keycap', width: '2 chars', category: 'Symbols' },
  { emoji: '🔐', name: 'Lock', width: '1 char', category: 'Objects' },
  { emoji: '🌐', name: 'Globe', width: '1 char', category: 'Objects' },
  { emoji: '📊', name: 'Chart', width: '1 char', category: 'Objects' }
];

console.log(UnicodeTableFormatter.generateTable(unicodeData, {
  colors: true,
  showIndices: true
}));

// Demo 2: ANSI-aware text wrapping
console.log('\n🎨 Demo 2: ANSI-Aware Text Wrapping');
console.log('='.repeat(50));

const coloredText = '\x1b[31mRed text\x1b[0m with \x1b[32mgreen\x1b[0m and \x1b[34mblue\x1b[0m colors, plus emoji 🎉 and Unicode 🇺🇸 flags!';
const wrappedLines = ANSIParser.wrapText(coloredText, 40, 2);

wrappedLines.forEach(line => console.log(line));

// Demo 3: Progress indicators
console.log('\n📈 Demo 3: Unicode Progress Indicators');
console.log('='.repeat(50));

const progressData = [
  { label: 'Encryption 🔐', value: 95, max: 100 },
  { label: 'Firewall 🛡️', value: 87, max: 100 },
  { label: 'Authentication 🔑', value: 92, max: 100 },
  { label: 'Compliance 📋', value: 78, max: 100 }
];

console.log(UnicodeProgress.createMultiProgress(progressData));

// Demo 4: Progress gauge
console.log('\n📊 Demo 4: Unicode Gauge');
console.log('='.repeat(50));

console.log('Security Score: ' + UnicodeProgress.createGauge(87, 100));
console.log('Compliance: ' + UnicodeProgress.createGauge(65, 100));
console.log('Risk Level: ' + UnicodeProgress.createGauge(23, 100));

// Demo 5: Progress tree
console.log('\n🌳 Demo 5: Hierarchical Progress Tree');
console.log('='.repeat(50));

const treeData = [
  {
    label: 'Security Audit',
    status: 'success' as const,
    children: [
      { label: 'Network Scan', status: 'success' },
      { label: 'Vulnerability Check', status: 'success' },
      { label: 'Compliance Review', status: 'loading' }
    ]
  },
  {
    label: 'System Update',
    status: 'loading' as const,
    children: [
      { label: 'Package Update', status: 'success' },
      { label: 'Configuration', status: 'pending' }
    ]
  },
  {
    label: 'Backup Process',
    status: 'error' as const,
    children: [
      { label: 'Database Backup', status: 'error' },
      { label: 'File Backup', status: 'success' }
    ]
  }
];

console.log(UnicodeProgress.createProgressTree(treeData));

// Demo 6: Security status display
console.log('\n🔒 Demo 6: Security Status Display');
console.log('='.repeat(50));

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
  }
];

console.log(SecurityStatusDisplay.displayStatus('empire.factory-wager.com', securityChecks));

// Demo 7: Security badge
console.log('\n🏆 Demo 7: Security Badge');
console.log('='.repeat(50));

console.log(SecurityStatusDisplay.createSecurityBadge(87, 100));

// Demo 8: Hyperlink demonstration
console.log('\n🔗 Demo 8: ANSI Hyperlinks');
console.log('='.repeat(50));

const link = ANSIParser.createHyperlink('📚 Empire Pro Documentation', 'https://docs.empire-pro.com');
console.log(`Documentation: ${link}`);

const securityLink = ANSIParser.createHyperlink('🔒 Security Dashboard', 'https://security.empire-pro.com');
console.log(`Security: ${securityLink}`);

// Demo 9: Progress bar with colors
console.log('\n🎨 Demo 9: Colored Progress Bars');
console.log('='.repeat(50));

console.log('Critical: ' + ANSIParser.createProgressBar(15, 100, 30));
console.log('Warning:  ' + ANSIParser.createProgressBar(45, 100, 30));
console.log('Good:     ' + ANSIParser.createProgressBar(85, 100, 30));
console.log('Excellent:' + ANSIParser.createProgressBar(98, 100, 30));

console.log('\n✨ Demo completed successfully!');
console.log('🎯 Empire Pro v3.7 Unicode & ANSI handling is production ready!');
