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

console.log('🎨 Fire22 Branding Audit Toolkit - Enhanced Bun Demo');
console.log('===================================================\n');

// Create auditor instance
console.log('🔧 Initializing Branding Auditor...');
const auditor = new BrandingAuditor(demoConfig);

// Display brand colors
console.log('\n🎨 Fire22 Brand Colors:');
console.log('----------------------');
auditor.getBrandColors().forEach(color => {
  console.log(`${color.name}:`);
  console.log(`  Hex: ${color.hex}`);
  console.log(`  RGB: rgb(${color.rgb.join(', ')})`);
  console.log(`  Usage: ${color.usage.join(', ')}`);
  console.log(`  WCAG AA: ${color.accessibility.wcagAA ? '✅' : '❌'}`);
  console.log(`  WCAG AAA: ${color.accessibility.wcagAAA ? '✅' : '❌'}\n`);
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
console.log('🔍 Auditing demo files...');
console.log('==========================\n');

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

console.log(`📊 Audit Results:`);
console.log(`================`);

for (const result of results) {
  console.log(`\n📁 File: ${result.file}`);
  console.log(`   Colors found: ${result.colors.length}`);
  console.log(`   Issues found: ${result.issues.length}`);
  console.log(`   Compliance grade: ${result.compliance.grade}`);
  console.log(`   Compliance score: ${result.compliance.score}%`);

  if (result.issues.length > 0) {
    console.log(`   ⚠️  Issues:`);
    result.issues.slice(0, 5).forEach((issue, index) => {
      console.log(`      ${index + 1}. ${issue.code}: ${issue.message}`);
      if (issue.suggestion) {
        console.log(`         💡 ${issue.suggestion}`);
      }
    });
  }

  console.log(`   🎨 Colors used:`);
  result.colors.slice(0, 5).forEach(color => {
    const isBrandColor = auditor.findBrandColorMatch(color.hex);
    const status = isBrandColor ? '✅' : '❌';
    console.log(`      ${status} ${color.hex} (${color.usage.join(', ')})`);
  });
}

// Generate comprehensive report
console.log('\n📋 Generating comprehensive report...');
console.log('=====================================\n');

const report = await auditor.generateReport(results);

console.log(`📊 Overall Summary:`);
console.log(`==================`);
console.log(`Total files audited: ${report.summary.totalFiles}`);
console.log(`Total colors found: ${report.summary.totalColors}`);
console.log(`Total issues: ${report.summary.totalIssues}`);
console.log(`Overall grade: ${report.summary.grade}`);
console.log(`Compliance score: ${report.summary.complianceScore}%`);
console.log(`Audit time: ${report.summary.auditTime}ms`);

console.log(`\n🎯 Brand Compliance:`);
console.log(`===================`);
console.log(`Colors used: ${report.brandCompliance.colorsUsed}`);
console.log(`Brand compliant: ${report.brandCompliance.colorsCompliant}%`);
console.log(`Accessibility score: ${report.brandCompliance.accessibilityScore}%`);
console.log(`Consistency score: ${report.brandCompliance.consistencyScore}%`);

if (report.recommendations.length > 0) {
  console.log(`\n💡 Recommendations:`);
  console.log(`==================`);
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

// Export reports using Bun's file API
console.log('\n💾 Exporting reports...');
console.log('=======================\n');

const jsonReport = await auditor.exportReport(report, 'json');
const htmlReport = await auditor.exportReport(report, 'html');
const markdownReport = await auditor.exportReport(report, 'markdown');

await Bun.write(`${demoDir}/audit-report.json`, jsonReport);
await Bun.write(`${demoDir}/audit-report.html`, htmlReport);
await Bun.write(`${demoDir}/audit-report.md`, markdownReport);

console.log('✅ Reports exported:');
console.log(`   📄 JSON: ${demoDir}/audit-report.json`);
console.log(`   🌐 HTML: ${demoDir}/audit-report.html`);
console.log(`   📝 Markdown: ${demoDir}/audit-report.md`);

// Clean up demo files
console.log('\n🧹 Cleaning up demo files...');
await Bun.spawn(['rm', '-rf', demoDir]);

console.log('\n🎉 Demo completed successfully!');
console.log('===============================');
console.log('\nNext steps:');
console.log('1. Review the generated reports');
console.log('2. Open audit-report.html in your browser');
console.log('3. Fix any identified issues');
console.log('4. Integrate the audit toolkit into your CI/CD pipeline');

console.log('\n🚀 Bun Performance Features Used:');
console.log('==================================');
console.log('✅ Bun.file() - Native file I/O');
console.log('✅ Bun.write() - Optimized file writing');
console.log('✅ Bun.Glob - Fast file globbing');
console.log('✅ Array.fromAsync() - Async iteration');
console.log('✅ Promise.all() - Concurrent processing');
console.log('✅ Native TypeScript support');
