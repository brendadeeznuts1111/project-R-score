#!/usr/bin/env bun

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Bun v1.3.8 Markdown-Native Report Engine — T3-Lattice v5.1
 * Integrates Bun.markdown API with 20-Column TOML Config Architecture
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync } from 'fs';
import type { ReportRow } from '../types/report-types';
import { loadReportConfig, ReportConfigManager, type ReportConfig } from '../types/report-config-types';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Quantum Glyph Routing v1.3.8
// ═══════════════════════════════════════════════════════════════════════════════

const GLYPHS = {
  MARKDOWN: "📝",
  HTML: "🌐",
  ANSI: "🎨",
  REACT: "⚛️",
  METAFILE: "📊",
  BUNDLE: "📦",
  RENDER: "▵⟂⥂",
  DIVIDER: "▬▬▬"
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Bun v1.3.8 Markdown Report Renderer
// ═══════════════════════════════════════════════════════════════════════════════

interface MarkdownRenderOptions {
  config: ReportConfig;
  format: 'html' | 'ansi' | 'react' | 'plain';
  theme?: 'light' | 'dark' | 'github';
  maxRows?: number;
  includeMetafile?: boolean;
}

export class MarkdownReportEngine {
  private configManager: ReportConfigManager;
  private options: MarkdownRenderOptions;

  constructor(config: ReportConfig, options: MarkdownRenderOptions) {
    this.configManager = new ReportConfigManager(config);
    this.options = options;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Bun.markdown.html() — Server-Side Rendering Pipeline
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  renderToHTML(rows: ReportRow[], viewName: string = 'default'): string {
    const view = this.options.config.use_cases[viewName] || this.options.config.view.default;
    const visibleCols = view.columns.filter(c => !this.options.config.view.hidden.columns.includes(c));

    // Use Bun.markdown for description/summary fields
    const summary = this.generateSummary(rows);
    const markdownSummary = (Bun as any).markdown.html(summary, {
      headingIds: true,
      autolinkHeadings: true
    });

    // Build HTML table with semantic classes
    let html = `<!DOCTYPE html>
<html lang="en" data-theme="${this.options.theme || 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${GLYPHS.RENDER} ${viewName} Report</title>
  <style>${this.getCSS()}</style>
</head>
<body>
  <div class="report-container">
    <header class="report-header">
      <h1>${GLYPHS.MARKDOWN} ${viewName} Report</h1>
      ${markdownSummary}
    </header>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>${visibleCols.map(c => `<th>${this.options.config.columns[c]?.name || c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.slice(0, this.options.maxRows || 100).map(row => this.renderRowHTML(row, visibleCols)).join('')}
        </tbody>
      </table>
    </div>

    <footer class="report-footer">
      <p>Generated with Bun v${Bun.version} • ${GLYPHS.RENDER} Tier-1380 Engine</p>
    </footer>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Bun.markdown.render() — Custom ANSI Terminal Output
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  renderToANSI(rows: ReportRow[], viewName: string = 'default'): string {
    const view = this.options.config.use_cases[viewName] || this.options.config.view.default;
    const visibleCols = view.columns.filter(c => !this.options.config.view.hidden.columns.includes(c));

    // Custom ANSI renderer using Bun.markdown.render callbacks
    return (Bun as any).markdown.render(this.generateMarkdownTable(rows, visibleCols), {
      heading: (children: string, { level }: { level: number }) => {
        const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;33m'];
        return `${colors[level - 1] || '\x1b[1m'}${children}\x1b[0m\n`;
      },
      paragraph: (children: string) => children + '\n',
      strong: (children: string) => `\x1b[1m${children}\x1b[22m`,
      table: (children: string) => children,
      tableRow: (children: string) => children + '\n',
      tableCell: (children: string) => ` ${children} │`,
      code: (children: string) => `\x1b[90m${children}\x1b[0m`
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Bun.markdown.react() — React Component Generation (SSR-Ready)
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  renderToReact(rows: ReportRow[], viewName: string = 'default'): any {
    const view = this.options.config.use_cases[viewName] || this.options.config.view.default;
    const visibleCols = view.columns.filter(c => !this.options.config.view.hidden.columns.includes(c));

    // Returns React Fragment compatible with React 18/19
    return (Bun as any).markdown.react(this.generateMarkdownTable(rows, visibleCols), {
      h1: ({ children }: { children: any }) => ({ type: 'h1', props: { className: 'report-title' }, children }),
      table: ({ children }: { children: any }) => ({ type: 'table', props: { className: 'report-table' }, children }),
      tr: ({ children }: { children: any }) => ({ type: 'tr', props: { className: 'report-row' }, children }),
      th: ({ children }: { children: any }) => ({ type: 'th', props: { className: 'report-header-cell' }, children }),
      td: ({ children }: { children: any }) => ({ type: 'td', props: { className: 'report-cell' }, children }),
      // React 18 compatibility
      reactVersion: 18
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * bun build --metafile-md Integration — Bundle Analysis Reports
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  async generateMetafileReport(buildResult: any): Promise<string> {
    const metafile = buildResult.metafile || buildResult;

    // Parse metafile markdown if generated with --metafile-md
    if (typeof metafile === 'string' && metafile.includes('[MODULE:]')) {
      return this.parseMetafileMarkdown(metafile);
    }

    // Generate custom metafile analysis
    const analysis = {
      totalModules: Object.keys(metafile.inputs || {}).length,
      totalOutputs: Object.keys(metafile.outputs || {}).length,
      totalBytes: Object.values(metafile.outputs || {}).reduce((sum: number, o: any) => sum + (o.bytes || 0), 0),
      largestInputs: Object.entries(metafile.inputs || {})
        .sort(([,a]: any, [,b]: any) => b.bytes - a.bytes)
        .slice(0, 10)
    };

    const markdownReport = `
## ${GLYPHS.METAFILE} Bundle Analysis Report

| Metric | Value |
|--------|-------|
| Total Modules | ${analysis.totalModules} |
| Total Outputs | ${analysis.totalOutputs} |
| Total Size | ${(analysis.totalBytes / 1024).toFixed(2)} KB |

### ${GLYPHS.BUNDLE} Largest Input Files

${analysis.largestInputs.map(([path, data]: [string, any]) =>
  `| \`${path}\` | ${(data.bytes / 1024).toFixed(2)} KB |`
).join('\n')}

### ${GLYPHS.RENDER} Optimization Recommendations

${this.generateRecommendations(analysis)}
`;

    return (Bun as any).markdown.html(markdownReport, {
      headingIds: true,
      gfm: true
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═════════════════════════════════════════════════════════════════════════════

  private renderRowHTML(row: ReportRow, columns: string[]): string {
    return `<tr>${columns.map(col => {
      const value = row[col as keyof ReportRow];
      const formatted = this.formatCell(value, this.options.config.columns[col]);
      const color = this.getSemanticColor(col, value);

      return `<td style="color: ${color}">${formatted}</td>`;
    }).join('')}</tr>`;
  }

  private generateMarkdownTable(rows: ReportRow[], columns: string[]): string {
    const headers = columns.map(c => this.options.config.columns[c]?.name || c).join(' | ');
    const separator = columns.map(() => '---').join(' | ');

    const dataRows = rows.slice(0, this.options.maxRows || 50).map(row =>
      columns.map(col => {
        const val = row[col as keyof ReportRow];
        return this.formatCell(val, this.options.config.columns[col]).replace(/\|/g, '\\|');
      }).join(' | ')
    ).join('\n');

    return `| ${headers} |\n| ${separator} |\n| ${dataRows} |`;
  }

  private generateSummary(rows: ReportRow[]): string {
    return `
## Report Summary

- **Total Records**: ${rows.length}
- **Generated**: ${new Date().toISOString()}
- **View**: ${this.options.format} mode
- **Engine**: Tier-1380 Markdown-Native Renderer

${GLYPHS.DIVIDER}
`;
  }

  private generateRecommendations(analysis: any): string {
    const recs = [];
    if (analysis.totalBytes > 1024 * 1024) {
      recs.push('- Consider code splitting for bundles > 1MB');
    }
    if (analysis.totalModules > 100) {
      recs.push('- Tree-shaking may reduce module count');
    }
    return recs.join('\n') || '- Bundle size is optimal';
  }

  private formatCell(value: unknown, column: any): string {
    if (value === undefined || value === null) return '-';

    switch (column.type) {
      case 'percent': return `${value}%`;
      case 'enum': {
        const enumVal = this.options.config.enums[column.name as keyof ReportConfig['enums']]?.[String(value) as string];
        if (enumVal && 'icon' in enumVal) {
          return `${enumVal.icon} ${value}`;
        }
        return String(value);
      }
      case 'array': return Array.isArray(value) ? value.join(', ') : String(value);
      default: return String(value).slice(0, column.min_width);
    }
  }

  private getSemanticColor(column: string, value: unknown): string {
    // HSL color mapping from config
    return '#24292f'; // Default
  }

  private getCSS(): string {
    return `
      :root { --bg: #ffffff; --text: #24292f; --border: #d0d7de; --header: #f6f8fa; }
      [data-theme="dark"] { --bg: #0d1117; --text: #c9d1d9; --border: #30363d; --header: #161b22; }
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); }
      .report-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      .data-table { width: 100%; border-collapse: collapse; }
      .data-table th, .data-table td { padding: 8px 12px; border: 1px solid var(--border); text-align: left; }
      .data-table th { background: var(--header); font-weight: 600; }
      .data-table tr:nth-child(even) { background: rgba(208, 215, 222, 0.2); }
    `;
  }

  private parseMetafileMarkdown(metafileContent: string): string {
    // Parse [MODULE:], [SIZE:], [IMPORT:] markers
    const modules = [...metafileContent.matchAll(/\[MODULE:\s*(.+?)\]/g)].map(m => m[1]);
    return `<div class="metafile-analysis"><h2>${GLYPHS.METAFILE} Parsed Bundle</h2><p>Modules: ${modules.length}</p></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Bun.build() with Metafile Markdown Integration
// ═══════════════════════════════════════════════════════════════════════════════

interface BuildReportOptions {
  entrypoints: string[];
  outdir: string;
  generateMetafile?: boolean;
  generateMarkdown?: boolean;
  analyzeWithLLM?: boolean;
}

export async function buildWithReport(options: BuildReportOptions): Promise<{
  buildResult: any;
  htmlReport: string;
  markdownReport: string;
}> {
  // Build with metafile output
  const result = await Bun.build({
    entrypoints: options.entrypoints,
    outdir: options.outdir,
    metafile: options.generateMetafile ? true : undefined,
    minify: true,
    sourcemap: 'external'
  });

  const engine = new MarkdownReportEngine({} as ReportConfig, {
    config: {} as ReportConfig,
    format: 'html',
    theme: 'github'
  });

  // Generate HTML report from metafile
  const htmlReport = await engine.generateMetafileReport(result);

  // Read generated markdown if exists
  let markdownReport = '';
  if (options.generateMarkdown) {
    const metafilePath = `${options.outdir}/meta.md`;
    markdownReport = await Bun.file(metafilePath).text();
  }

  return { buildResult: result, htmlReport, markdownReport };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CLI Interface + Sample Data Generation
// ═══════════════════════════════════════════════════════════════════════════════

function generateSampleData(): ReportRow[] {
  return [
    {
      id: 'BUN-1380-001',
      status: 'completed',
      priority: 'P0',
      category: 'Infrastructure',
      owner: 'FactoryWager',
      title: 'Bun.markdown integration',
      progress: 100,
      metric: '100% API coverage',
      trend: '↗',
      severity: 'high',
      tags: ['bun', 'markdown', 'v1.3.8'],
      component: 'markdown-engine',
      duration: '2d',
      effort: 8,
      risk: 'none',
      dueDate: '2024-01-01T00:00:00.000Z',
      created: '2024-01-01T09:00:00.000Z',
      updated: '2024-01-01T17:00:00.000Z',
      source: 'tier-1380',
      flags: ['production-ready']
    },
    {
      id: 'BUN-1380-002',
      status: 'in-progress',
      priority: 'P1',
      category: 'Build System',
      owner: 'FactoryWager',
      title: 'Metafile markdown generation',
      progress: 75,
      metric: '--metafile-md flag',
      trend: '↗',
      severity: 'medium',
      tags: ['build', 'metafile', 'analysis'],
      component: 'build-system',
      duration: '1d',
      effort: 5,
      risk: 'low',
      dueDate: '2024-01-02T00:00:00.000Z',
      created: '2024-01-01T10:00:00.000Z',
      updated: '2024-01-01T16:00:00.000Z',
      source: 'tier-1380',
      flags: ['llm-ready']
    },
    {
      id: 'BUN-1380-003',
      status: 'pending',
      priority: 'P2',
      category: 'Rendering',
      owner: 'FactoryWager',
      title: 'ANSI terminal styling',
      progress: 0,
      metric: 'Custom callbacks',
      trend: '◇',
      severity: 'low',
      tags: ['ansi', 'terminal', 'styling'],
      component: 'render-engine',
      duration: '4h',
      effort: 3,
      risk: 'none',
      dueDate: '2024-01-03T00:00:00.000Z',
      created: '2024-01-01T11:00:00.000Z',
      updated: '2024-01-01T11:00:00.000Z',
      source: 'tier-1380',
      flags: ['enhancement']
    }
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CLI Interface
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  const command = Bun.argv[2];
  const configPath = Bun.argv[3] || '/Users/nolarose/.factory-wager/config/report-config.toml';

  try {
    // Load TOML config
    const config = await loadReportConfig(configPath);

    const engine = new MarkdownReportEngine(config, {
      config,
      format: 'html',
      theme: 'dark',
      maxRows: 100
    });

    const sampleRows = generateSampleData();

    switch (command) {
      case 'html':
        const htmlOutput = engine.renderToHTML(sampleRows, 'sprint_status');
        console.log(htmlOutput);
        break;

      case 'ansi':
        const ansiOutput = engine.renderToANSI(sampleRows, 'incident_report');
        console.log(ansiOutput);
        break;

      case 'react':
        const reactOutput = engine.renderToReact(sampleRows, 'daily_standup');
        console.log(JSON.stringify(reactOutput, null, 2));
        break;

      case 'build':
        const report = await buildWithReport({
          entrypoints: ['./src/index.ts'],
          outdir: './dist',
          generateMetafile: true,
          generateMarkdown: true
        });
        console.log(`${GLYPHS.METAFILE} Build report generated`);
        console.log(report.htmlReport);
        break;

      case 'demo':
        // Generate all formats for demo
        console.log(`${GLYPHS.RENDER} Bun v${Bun.version} Markdown Engine Demo`);
        console.log(`${GLYPHS.DIVIDER}`);

        console.log(`\n${GLYPHS.HTML} HTML Output:`);
        console.log(engine.renderToHTML(sampleRows, 'sprint_status'));

        console.log(`\n${GLYPHS.ANSI} ANSI Output:`);
        console.log(engine.renderToANSI(sampleRows, 'incident_report'));

        console.log(`\n${GLYPHS.REACT} React Output:`);
        console.log(JSON.stringify(engine.renderToReact(sampleRows, 'daily_standup'), null, 2));
        break;

      default:
        console.log(`${GLYPHS.RENDER} Bun v${Bun.version} Markdown-Native Report Engine`);
        console.log(`${GLYPHS.DIVIDER}`);
        console.log(`Usage: bun run markdown-engine.ts [html|ansi|react|build|demo] [config.toml]`);
        console.log(`\nCommands:`);
        console.log(`  html    - Generate HTML report`);
        console.log(`  ansi    - Generate ANSI terminal report`);
        console.log(`  react   - Generate React component`);
        console.log(`  build   - Build with metafile analysis`);
        console.log(`  demo    - Generate all formats (demo)`);
        console.log(`\n${GLYPHS.MARKDOWN} Tier-1380 Integration Complete!`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}
