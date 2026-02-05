#!/usr/bin/env bun

/**
 * FactoryWager Terminal Reports with Bun Markdown
 * Integrates markdown rendering with FactoryWager release reports
 */

interface ReleaseReport {
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

// FactoryWager-specific markdown renderers
const factoryWagerRenderers = {
  // FactoryWager themed headings
  heading: (content: string, { level }: { level: number }) => {
    const colors = {
      1: '1;95', // Bold bright magenta for FactoryWager branding
      2: '1;94', // Bold bright blue for main sections
      3: '1;92', // Bold bright green for subsections
      4: '1;93', // Bold bright yellow for details
      5: '1;96', // Bold bright cyan for fine details
      6: '1;97', // Bold bright white for minimal emphasis
    };
    const color = colors[level as keyof typeof colors] || '1;37';
    return `\x1b[${color}m${'#'.repeat(level)} ${content}\x1b[0m\n`;
  },

  // FactoryWager status indicators
  strong: (content: string) => {
    // Color code based on content
    if (content.includes('SUCCESS') || content.includes('PASSED')) {
      return `\x1b[1;92m${content}\x1b[0m`; // Bright green for success
    } else if (content.includes('FAILED') || content.includes('ERROR')) {
      return `\x1b[1;91m${content}\x1b[0m`; // Bright red for errors
    } else if (content.includes('WARNING') || content.includes('RISK')) {
      return `\x1b[1;93m${content}\x1b[0m`; // Bright yellow for warnings
    }
    return `\x1b[1m${content}\x1b[0m`; // Default bold
  },

  // FactoryWager code styling
  code: (content: string) => {
    if (content.includes('fw-release') || content.includes('fw-')) {
      return `\x1b[1;96m${content}\x1b[0m`; // Bright cyan for FactoryWager commands
    } else if (content.includes('version') || content.includes('risk')) {
      return `\x1b[1;95m${content}\x1b[0m`; // Bright magenta for key metrics
    }
    return `\x1b[36m${content}\x1b[0m`; // Cyan for general code
  },

  // FactoryWager list styling
  list: (content: string, { ordered }: { ordered: boolean }) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const prefix = ordered ? `${index + 1}.` : '🔹';
      // Color code based on content
      let color = '32'; // Green default
      if (line.includes('FAILED') || line.includes('ERROR')) color = '31'; // Red
      else if (line.includes('WARNING') || line.includes('RISK')) color = '33'; // Yellow

      return `  \x1b[${color}m${prefix}\x1b[0m ${line}`;
    }).join('\n') + '\n';
  },

  // FactoryWager blockquotes for important notes
  blockquote: (content: string) => {
    return `\x1b[1;90m│ 🏭 FactoryWager Note: ${content.trim()}\x1b[0m\n`;
  }
};

// Generate markdown from FactoryWager release data
function generateReleaseMarkdown(report: ReleaseReport): string {
  return `
# FactoryWager Release Report

## Release Information

- **Version**: ${report.version}
- **Timestamp**: ${report.timestamp}
- **Risk Score**: ${report.riskScore}/100
- **Status**: ${report.status}

## Workflow Execution

${report.workflows.map(w =>
  `- **${w.name}**: ${w.status} (${w.duration}s)${w.riskScore ? ` - Risk: ${w.riskScore}` : ''}`
).join('\n')}

## Generated Artifacts

${report.artifacts.map(artifact => `- \`${artifact}\``).join('\n')}

> **Important**: This release was processed using FactoryWager v1.1.0 Master Orchestrator

## Next Steps

1. Monitor production for 30 minutes
2. Review HTML report with stakeholders
3. Update documentation if needed
`;
}

// Sample FactoryWager release data
const sampleReport: ReleaseReport = {
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
    'release-1.3.0-20260201-092645.md',
    'factory-wager-release-1.3.0.html',
    'git-tag: release-1.3.0-20260201-092645',
    '.factory-wager/audit.log'
  ]
};

// Simple markdown renderer for demonstration (Bun doesn't have built-in markdown)
function simpleMarkdownRenderer(content: string, renderers: any = {}): string {
  let result = content;

  // Apply custom renderers if provided
  if (renderers.heading) {
    result = result.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return renderers.heading(content.trim(), { level });
    });
  }

  if (renderers.strong) {
    result = result.replace(/\*\*(.+?)\*\*/g, (match, content) => {
      return renderers.strong(content);
    });
  }

  if (renderers.code) {
    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return renderers.code(code.trim());
    });
  }

  if (renderers.codespan) {
    result = result.replace(/`([^`]+)`/g, (match, code) => {
      return renderers.codespan(code);
    });
  }

  if (renderers.list) {
    // Simple list rendering
    result = result.replace(/^[\s]*- (.+)$/gm, (match, item) => {
      return renderers.list(item, { ordered: false });
    });
  }

  if (renderers.blockquote) {
    result = result.replace(/^> (.+)$/gm, (match, content) => {
      return renderers.blockquote(content);
    });
  }

  return result;
}

// Generate and render the report
console.log('🏭 FactoryWager Terminal Reports with Bun Markdown');
console.log('==================================================');
console.log();

const markdown = generateReleaseMarkdown(sampleReport);
const rendered = simpleMarkdownRenderer(markdown, factoryWagerRenderers);

console.log('📊 Generated FactoryWager Release Report:');
console.log('========================================');
console.log(rendered);

console.log();
console.log('🚀 FactoryWager + Bun Integration Features:');
console.log('  • Color-coded status indicators');
console.log('  • Themed headings for brand consistency');
console.log('  • Syntax-highlighted command output');
console.log('  • Risk-aware coloring based on metrics');
console.log('  • Professional terminal reports');
console.log();
console.log('💡 This integrates perfectly with the FactoryWager audit infrastructure!');

export { factoryWagerRenderers, generateReleaseMarkdown, type ReleaseReport };
