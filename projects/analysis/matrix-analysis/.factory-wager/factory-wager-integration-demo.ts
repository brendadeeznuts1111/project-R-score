#!/usr/bin/env bun

/**
 * FactoryWager Markdown Integration Demo
 * Direct integration of your original code pattern with FactoryWager audit system
 */

// Your exact original renderer functions
const factoryWagerRenderers = {
  heading: (content: string, { level }: { level: number }) =>
    `\x1b[1;${32+level}m${'#'.repeat(level)} ${content}\x1b[0m\n`,
  strong: (content: string) => `\x1b[1m${content}\x1b[0m`
};

// FactoryWager markdown renderer (your pattern)
function factoryWagerMarkdownRenderer(content: string, renderers: any = {}): string {
  let result = content;

  // Your heading renderer
  if (renderers.heading) {
    result = result.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return renderers.heading(content.trim(), { level });
    });
  }

  // Your strong renderer
  if (renderers.strong) {
    result = result.replace(/\*\*(.+?)\*\*/g, (match, content) => {
      return renderers.strong(content);
    });
  }

  return result;
}

// FactoryWager report generator using your pattern
function generateFactoryWagerReport(auditData: any): string {
  const reportContent = `
# FactoryWager Audit Report

## Summary

**Risk Score**: ${auditData.riskScore}/100
**Status**: ${auditData.status}
**Timestamp**: ${auditData.timestamp}

## Workflow Results

${auditData.workflows.map((w: any) =>
  `- **${w.name}**: ${w.status} (${w.duration}s)`
).join('\n')}

## Artifacts

${auditData.artifacts.map((a: string) => `- \`${a}\``).join('\n')}

**Important**: Report generated using FactoryWager v1.1.0
`;

  // Your original code pattern - now working with FactoryWager!
  const body = factoryWagerMarkdownRenderer(reportContent, {
    heading: (c: string, { level }: { level: number }) => `\x1b[1;${32+level}m${'#'.repeat(level)} ${c}\x1b[0m\n`,
    strong: (c: string) => `\x1b[1m${c}\x1b[0m`
  });

  return body;
}

// Sample FactoryWager audit data
const sampleAuditData = {
  riskScore: 45,
  status: 'SUCCESS',
  timestamp: new Date().toISOString(),
  workflows: [
    { name: 'fw-analyze', status: 'PASSED', duration: 12 },
    { name: 'fw-validate', status: 'PASSED', duration: 8 },
    { name: 'fw-changelog', status: 'PASSED', duration: 15 },
    { name: 'fw-deploy', status: 'PASSED', duration: 45 }
  ],
  artifacts: [
    'release-1.3.0.md',
    'factory-wager-release.html',
    'audit.log'
  ]
};

// Demonstrate the integration
console.log('🏭 FactoryWager + Your Original Code Pattern');
console.log('=============================================');
console.log();

// Generate and display the report
const report = generateFactoryWagerReport(sampleAuditData);
console.log(report);

console.log();
console.log('🎯 Integration Benefits:');
console.log('  • Your exact code pattern preserved');
console.log('  • FactoryWager audit data integration');
console.log('  • Colored terminal output');
console.log('  • Professional report formatting');
console.log();
console.log('📝 Usage in FactoryWager:');
console.log('  const body = factoryWagerMarkdownRenderer(fm.content, {');
console.log('    heading: (c, { level }) => `\\x1b[1;${32+level}m${\'#\'.repeat(level)} ${c}\\x1b[0m\\n`,');
console.log('    strong: c => `\\x1b[1m${c}\\x1b[0m`');
console.log('  });');

export { factoryWagerMarkdownRenderer, generateFactoryWagerReport };
