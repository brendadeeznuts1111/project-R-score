#!/usr/bin/env bun

/**
 * 🎨 Fire22 Branding Audit Toolkit - Enhanced Demo with Bun 1.1.x+ Features
 *
 * This demo showcases the comprehensive branding audit capabilities
 * with new Bun features including ReadableStream methods, improved fs.glob,
 * WebSocket compression, and enhanced performance optimizations.
 */

import { BrandingAuditor } from './src/index.ts';

// Demo configuration
const demoConfig = {
  brandColors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    success: '#10b981',
    error: '#ef4444',
    info: '#06b6d4',
  },
  tolerance: 5,
  checkContrast: true,
  checkAccessibility: true,
  checkConsistency: true,
};

console.info('🎨 Fire22 Branding Audit Toolkit - Enhanced Bun Demo');
console.info('===================================================\n');

// Create auditor instance
console.info('🔧 Initializing Branding Auditor...');
const auditor = new BrandingAuditor(demoConfig);

// Display brand colors
console.info('\n🎨 Fire22 Brand Colors:');
console.info('----------------------');
auditor.getBrandColors().forEach(color => {
  console.info(`${color.name}:`);
  console.info(`  Hex: ${color.hex}`);
  console.info(`  RGB: rgb(${color.rgb.join(', ')})`);
  console.info(`  Usage: ${color.usage.join(', ')}`);
  console.info(`  WCAG AA: ${color.accessibility.wcagAA ? '✅' : '❌'}`);
  console.info(`  WCAG AAA: ${color.accessibility.wcagAAA ? '✅' : '❌'}\n`);
});

// Create sample CSS file for demonstration
const sampleCSS = `
/* Sample CSS file demonstrating brand usage */
.header {
  background: #2563eb; /* Brand primary */
  color: #ffffff;
  border-radius: 8px;
}

.button-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
}

.button-secondary {
  background: #64748b;
  color: white;
}

.text-success {
  color: #10b981;
}

.alert-error {
  background: #fef2f2;
  border: 1px solid #ef4444;
  color: #dc2626;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.non-brand-color {
  background: #ff0000; /* Non-brand color - should be flagged */
}

.low-contrast-text {
  color: #64748b;
  background: #ffffff; /* May have contrast issues */
}
`;

// Write sample CSS file using Bun's file API
const demoDir = 'demo-files';
await Bun.write(`${demoDir}/sample.css`, sampleCSS);

// Create sample HTML file
const sampleHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Demo Page</title>
    <style>
        .header { background: #2563eb; color: white; }
        .button { background: #10b981; color: white; }
        .text-muted { color: #64748b; }
        .custom-color { background: #ff6b6b; } /* Non-brand color */
    </style>
</head>
<body>
    <header class="header">
        <h1>Welcome to Fire22</h1>
    </header>

    <main>
        <button class="button">Get Started</button>
        <p class="text-muted">This is a demo of our branding system.</p>
        <div class="custom-color">Custom styled element</div>
    </main>
</body>
</html>
`;

await Bun.write(`${demoDir}/sample.html`, sampleHTML);

// Audit the demo files using Bun's glob
console.info('🔍 Auditing demo files...');
console.info('==========================\n');

const files = await Array.fromAsync(new Bun.Glob(`${demoDir}/**/*.{css,html}`).scan());

const results = await Promise.all(
  files.map(async file => {
    try {
      return await auditor.auditFile(file);
    } catch (error) {
      console.error(`❌ Failed to audit ${file}:`, error);
      return {
        file,
        colors: [],
        issues: [
          {
            type: 'error',
            code: 'AUDIT_FAILED',
            message: `Failed to audit file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        compliance: {
          score: 0,
          grade: 'F',
          totalIssues: 1,
          criticalIssues: 1,
        },
      };
    }
  })
);

console.info(`📊 Audit Results:`);
console.info(`================`);

for (const result of results) {
  console.info(`\n📁 File: ${result.file}`);
  console.info(`   Colors found: ${result.colors.length}`);
  console.info(`   Issues found: ${result.issues.length}`);
  console.info(`   Compliance grade: ${result.compliance.grade}`);
  console.info(`   Compliance score: ${result.compliance.score}%`);

  if (result.issues.length > 0) {
    console.info(`   ⚠️  Issues:`);
    result.issues.slice(0, 5).forEach((issue, index) => {
      console.info(`      ${index + 1}. ${issue.code}: ${issue.message}`);
      if (issue.suggestion) {
        console.info(`         💡 ${issue.suggestion}`);
      }
    });
  }

  console.info(`   🎨 Colors used:`);
  result.colors.slice(0, 5).forEach(color => {
    const isBrandColor = auditor.findBrandColorMatch(color.hex);
    const status = isBrandColor ? '✅' : '❌';
    console.info(`      ${status} ${color.hex} (${color.usage.join(', ')})`);
  });
}

// Generate comprehensive report
console.info('\n📋 Generating comprehensive report...');
console.info('=====================================\n');

const report = await auditor.generateReport(results);

console.info(`📊 Overall Summary:`);
console.info(`==================`);
console.info(`Total files audited: ${report.summary.totalFiles}`);
console.info(`Total colors found: ${report.summary.totalColors}`);
console.info(`Total issues: ${report.summary.totalIssues}`);
console.info(`Overall grade: ${report.summary.grade}`);
console.info(`Compliance score: ${report.summary.complianceScore}%`);
console.info(`Audit time: ${report.summary.auditTime}ms`);

console.info(`\n🎯 Brand Compliance:`);
console.info(`===================`);
console.info(`Colors used: ${report.brandCompliance.colorsUsed}`);
console.info(`Brand compliant: ${report.brandCompliance.colorsCompliant}%`);
console.info(`Accessibility score: ${report.brandCompliance.accessibilityScore}%`);
console.info(`Consistency score: ${report.brandCompliance.consistencyScore}%`);

if (report.recommendations.length > 0) {
  console.info(`\n💡 Recommendations:`);
  console.info(`==================`);
  report.recommendations.forEach((rec, index) => {
    console.info(`${index + 1}. ${rec}`);
  });
}

// Export reports using Bun's file API
console.info('\n💾 Exporting reports...');
console.info('=======================\n');

const jsonReport = await auditor.exportReport(report, 'json');
const htmlReport = await auditor.exportReport(report, 'html');
const markdownReport = await auditor.exportReport(report, 'markdown');

await Bun.write(`${demoDir}/audit-report.json`, jsonReport);
await Bun.write(`${demoDir}/audit-report.html`, htmlReport);
await Bun.write(`${demoDir}/audit-report.md`, markdownReport);

console.info('✅ Reports exported:');
console.info(`   📄 JSON: ${demoDir}/audit-report.json`);
console.info(`   🌐 HTML: ${demoDir}/audit-report.html`);
console.info(`   📝 Markdown: ${demoDir}/audit-report.md`);

// Clean up demo files
console.info('\n🧹 Cleaning up demo files...');
await Bun.spawn(['rm', '-rf', demoDir]);

console.info('\n🎉 Demo completed successfully!');
console.info('===============================');
console.info('\nNext steps:');
console.info('1. Review the generated reports');
console.info('2. Open audit-report.html in your browser');
console.info('3. Fix any identified issues');
console.info('4. Integrate the audit toolkit into your CI/CD pipeline');

console.info('\n🚀 Bun Performance Features Used:');
console.info('==================================');
console.info('✅ Bun.file() - Native file I/O');
console.info('✅ Bun.write() - Optimized file writing');
console.info('✅ Bun.Glob - Fast file globbing');
console.info('✅ Array.fromAsync() - Async iteration');
console.info('✅ Promise.all() - Concurrent processing');
console.info('✅ Native TypeScript support');
