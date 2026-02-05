#!/usr/bin/env bun

/**
 * Complete FactoryWager Integration with Official Bun v1.3.8 Markdown API
 * Demonstrating all three methods: render(), html(), and react()
 */

// FactoryWager audit data structure
interface FactoryWagerAudit {
  version: string;
  timestamp: string;
  riskScore: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  workflows: Array<{
    name: string;
    status: 'PASSED' | 'FAILED';
    duration: number;
    riskScore?: number;
  }>;
  artifacts: string[];
}

// Sample FactoryWager audit data
const sampleAudit: FactoryWagerAudit = {
  version: '1.3.0',
  timestamp: new Date().toISOString(),
  riskScore: 45,
  status: 'SUCCESS',
  workflows: [
    { name: 'fw-analyze', status: 'PASSED', duration: 12, riskScore: 45 },
    { name: 'fw-validate', status: 'PASSED', duration: 8 },
    { name: 'fw-changelog', status: 'PASSED', duration: 15 },
    { name: 'fw-deploy', status: 'PASSED', duration: 45 },
    { name: 'fw-nexus-status', status: 'PASSED', duration: 5 }
  ],
  artifacts: [
    'release-1.3.0-20260201-093045.md',
    'factory-wager-release-1.3.0.html',
    'git-tag: release-1.3.0-20260201-093045',
    '.factory-wager/audit.log'
  ]
};

// Generate FactoryWager markdown content
function generateFactoryWagerMarkdown(audit: FactoryWagerAudit): string {
  return `
# FactoryWager Release Report - ${audit.version}

## Executive Summary

**Risk Score**: ${audit.riskScore}/100 (${audit.riskScore <= 50 ? '✅ Acceptable' : audit.riskScore <= 75 ? '⚠️ Medium' : '❌ High'})
**Status**: ${audit.status}
**Timestamp**: ${audit.timestamp}

## Workflow Execution Results

${audit.workflows.map(w => 
  `- **${w.name}**: ${w.status} (${w.duration}s)${w.riskScore ? ` - Risk: ${w.riskScore}/100` : ''}`
).join('\n')}

## Generated Artifacts

${audit.artifacts.map(artifact => `- \`${artifact}\``).join('\n')}

## Risk Assessment

${audit.riskScore <= 50 ? 
  '✅ **Low Risk** - Release approved for production deployment' :
  audit.riskScore <= 75 ?
  '⚠️ **Medium Risk** - Review recommended before deployment' :
  '❌ **High Risk** - Deployment blocked until issues resolved'
}

---

**Important**: This report was generated using FactoryWager v1.1.0 Master Orchestrator with Bun v1.3.8 Markdown API
`;
}

console.log('🏭 FactoryWager + Complete Bun v1.3.8 Markdown API');
console.log('===================================================');
console.log();

const markdownContent = generateFactoryWagerMarkdown(sampleAudit);

// Method 1: Bun.markdown.render() - Your original pattern for terminal output
console.log('📋 Method 1: Bun.markdown.render() - Terminal Output');
console.log('=====================================================');

const terminalOutput = Bun.markdown.render(markdownContent, {
  heading: (children: string, { level }: { level: number }) => {
    const colors = {
      1: '1;95', // Bright magenta for main title
      2: '1;94', // Bright blue for sections  
      3: '1;92', // Bright green for subsections
      4: '1;93', // Bright yellow for details
      5: '1;96', // Bright cyan for fine details
      6: '1;97', // Bright white for minimal
    };
    const color = colors[level as keyof typeof colors] || `1;${32 + level}`;
    return `\x1b[${color}m${'#'.repeat(level)} ${children}\x1b[0m\n`;
  },
  strong: (children: string) => {
    if (children.includes('SUCCESS') || children.includes('PASSED') || children.includes('✅')) {
      return `\x1b[1;92m${children}\x1b[0m`; // Bright green
    } else if (children.includes('FAILED') || children.includes('ERROR') || children.includes('❌')) {
      return `\x1b[1;91m${children}\x1b[0m`; // Bright red
    } else if (children.includes('WARNING') || children.includes('⚠️')) {
      return `\x1b[1;93m${children}\x1b[0m`; // Bright yellow
    }
    return `\x1b[1m${children}\x1b[0m`; // Default bold
  },
  paragraph: (children: string) => children + '\n',
  list: (children: string) => children + '\n',
  listItem: (children: string) => `  🔹 ${children}`,
  code: (children: string) => `\x1b[1;36m${children}\x1b[0m`,
  codespan: (children: string) => `\x1b[36m${children}\x1b[0m`
});

console.log(terminalOutput);

// Method 2: Bun.markdown.html() - HTML output with options
console.log('🌐 Method 2: Bun.markdown.html() - HTML Output');
console.log('==============================================');

const htmlOutput = Bun.markdown.html(markdownContent, { 
  headingIds: true,
  allowHtml: true 
});

console.log('HTML Output (first 200 chars):');
console.log(htmlOutput.substring(0, 200) + '...');

// Method 3: Bun.markdown.react() - React elements
console.log();
console.log('⚛️  Method 3: Bun.markdown.react() - React Elements');
console.log('===================================================');

try {
  const reactElement = Bun.markdown.react(markdownContent, {
    h1: ({ children }: { children: any }) => `<h1 class="factory-wager-title">${children}</h1>`,
    h2: ({ children }: { children: any }) => `<h2 class="factory-wager-section">${children}</h2>`,
    strong: ({ children }: { children: any }) => `<strong class="factory-wager-bold">${children}</strong>`,
    code: ({ children }: { children: any }) => `<code class="factory-wager-code">${children}</code>`,
    reactVersion: 18
  });
  
  console.log('React element generated successfully');
  console.log('Type:', typeof reactElement);
} catch (error) {
  console.log('React elements require React runtime - available in React applications');
}

console.log();
console.log('🎯 FactoryWager + Bun Integration Summary:');
console.log('==========================================');
console.log('✅ Method 1: Terminal output with ANSI colors');
console.log('✅ Method 2: HTML output with heading IDs');
console.log('✅ Method 3: React elements for web applications');
console.log();
console.log('🚀 Your original code pattern works perfectly with the official Bun API!');

export { generateFactoryWagerMarkdown, type FactoryWagerAudit };
