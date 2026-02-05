#!/usr/bin/env bun

/**
 * FactoryWager Visibility-Aware Report Generator
 * Uses column visibility configuration to show/hide columns dynamically
 */

import { writeFileSync } from 'fs';
import type { ReportRow, ReportData } from '../types/report-types';
import { 
  FACTORYWAGER_COLUMNS, 
  getDefaultVisibleColumns,
  getHiddenColumns,
  DEFAULT_HIDDEN_COLUMNS,
  type ColumnConfig
} from '../types/column-types';

class VisibilityReportGenerator {
  private generateCurrentProjectData(): ReportData {
    const rows: ReportRow[] = [
      {
        id: 'fw-001',
        status: 'completed',
        priority: 'P0',
        category: 'Build System',
        owner: 'FactoryWager',
        title: 'Native Binary Compilation',
        progress: 100,
        metric: '57MB binary size',
        trend: '→',
        severity: 'critical',
        tags: ['build', 'native', 'cli'],
        component: 'factory-wager-cli',
        duration: '2h 15m',
        effort: 8,
        risk: 'none',
        dueDate: '2024-01-01T00:00:00.000Z',
        created: '2024-01-01T09:00:00.000Z',
        updated: '2024-01-01T11:15:00.000Z',
        source: 'build-system',
        flags: ['production-ready']
      },
      {
        id: 'fw-002',
        status: 'completed',
        priority: 'P1',
        category: 'Code Quality',
        owner: 'FactoryWager',
        title: 'TypeScript Error Fixes',
        progress: 100,
        metric: '9 errors resolved',
        trend: '→',
        severity: 'high',
        tags: ['typescript', 'errors', 'polyfill'],
        component: 'native-markdown',
        duration: '45m',
        effort: 3,
        risk: 'none',
        dueDate: '2024-01-01T00:00:00.000Z',
        created: '2024-01-01T09:30:00.000Z',
        updated: '2024-01-01T10:15:00.000Z',
        source: 'ide-feedback',
        flags: ['type-safe']
      },
      {
        id: 'fw-003',
        status: 'completed',
        priority: 'P2',
        category: 'Documentation',
        owner: 'FactoryWager',
        title: 'Markdown Lint Fixes',
        progress: 100,
        metric: '17 warnings resolved',
        trend: '→',
        severity: 'medium',
        tags: ['markdown', 'lint', 'documentation'],
        component: 'compilation-report',
        duration: '20m',
        effort: 2,
        risk: 'none',
        dueDate: '2024-01-01T00:00:00.000Z',
        created: '2024-01-01T10:20:00.000Z',
        updated: '2024-01-01T10:40:00.000Z',
        source: 'markdownlint',
        flags: ['lint-clean']
      },
      {
        id: 'fw-004',
        status: 'pending',
        priority: 'P2',
        category: 'Optimization',
        owner: 'FactoryWager',
        title: 'Binary Size Optimization',
        progress: 0,
        metric: '57MB → <20MB target',
        trend: '◇',
        severity: 'medium',
        tags: ['optimization', 'size', 'bundle'],
        component: 'factory-wager-cli',
        duration: 'estimated 2d',
        effort: 8,
        risk: 'low',
        dueDate: '2024-01-15T00:00:00.000Z',
        created: '2024-01-01T11:00:00.000Z',
        updated: '2024-01-01T11:00:00.000Z',
        source: 'project-planning',
        flags: ['performance-critical']
      },
      {
        id: 'fw-005',
        status: 'pending',
        priority: 'P3',
        category: 'Code Quality',
        owner: 'FactoryWager',
        title: 'Native Purity Improvement',
        progress: 0,
        metric: '41% → 90% purity target',
        trend: '◇',
        severity: 'low',
        tags: ['native', 'purity', 'bun'],
        component: 'audit-system',
        duration: 'estimated 3d',
        effort: 13,
        risk: 'low',
        dueDate: '2024-01-30T00:00:00.000Z',
        created: '2024-01-01T11:00:00.000Z',
        updated: '2024-01-01T11:00:00.000Z',
        source: 'native-audit',
        flags: ['long-term']
      },
      {
        id: 'fw-006',
        status: 'pending',
        priority: 'P3',
        category: 'Build System',
        owner: 'FactoryWager',
        title: 'Cross-Platform Builds',
        progress: 0,
        metric: 'Linux + Windows support',
        trend: '◇',
        severity: 'medium',
        tags: ['build', 'cross-platform', 'linux', 'windows'],
        component: 'factory-wager-cli',
        duration: 'estimated 3d',
        effort: 13,
        risk: 'medium',
        dueDate: '2024-02-15T00:00:00.000Z',
        created: '2024-01-01T11:00:00.000Z',
        updated: '2024-01-01T11:00:00.000Z',
        source: 'platform-support',
        flags: ['expansion']
      },
      {
        id: 'fw-007',
        status: 'pending',
        priority: 'P2',
        category: 'Infrastructure',
        owner: 'FactoryWager',
        title: 'R2 Upload Integration',
        progress: 0,
        metric: 'Simulated → Real R2 client',
        trend: '◇',
        severity: 'high',
        tags: ['r2', 'upload', 'cloudflare'],
        component: 'deployment',
        duration: 'estimated 1d',
        effort: 5,
        risk: 'medium',
        dueDate: '2024-01-10T00:00:00.000Z',
        created: '2024-01-01T11:00:00.000Z',
        updated: '2024-01-01T11:00:00.000Z',
        source: 'deployment-planning',
        flags: ['infrastructure']
      }
    ];

    const summary = this.calculateSummary(rows);

    return {
      config: {
        title: 'FactoryWager Visibility-Aware Project Report',
        description: 'Column visibility-aware project status with configurable hidden columns',
        generatedAt: new Date().toISOString(),
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: new Date().toISOString()
        },
        filters: {
          component: ['factory-wager-cli', 'native-markdown', 'audit-system', 'deployment']
        }
      },
      summary,
      rows
    };
  }

  private calculateSummary(rows: ReportRow[]) {
    const summary = {
      total: rows.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      averageProgress: 0,
      totalEffort: 0,
      riskDistribution: {} as Record<string, number>,
    };

    rows.forEach(row => {
      summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
      summary.byPriority[row.priority] = (summary.byPriority[row.priority] || 0) + 1;
      summary.riskDistribution[row.risk] = (summary.riskDistribution[row.risk] || 0) + 1;
      summary.totalEffort += row.effort;
    });

    summary.averageProgress = rows.length > 0 
      ? rows.reduce((sum, row) => sum + row.progress, 0) / rows.length 
      : 0;

    return summary;
  }

  generateVisibilityReport(data: ReportData, hiddenColumns?: string[]): string {
    // Use provided hidden columns or default
    const hidden = hiddenColumns || DEFAULT_HIDDEN_COLUMNS;
    const visibleColumns = getDefaultVisibleColumns();
    const hiddenCols = getHiddenColumns(hidden);

    let report = `# ${data.config.title}\n\n`;
    
    if (data.config.description) {
      report += `${data.config.description}\n\n`;
    }
    
    report += `**Generated:** ${new Date(data.config.generatedAt).toLocaleString()}\n\n`;
    
    // Visibility summary
    report += `## 👁️ Column Visibility Summary\n\n`;
    report += `- **Total Columns**: ${FACTORYWAGER_COLUMNS.columns.length}\n`;
    report += `- **Visible Columns**: ${visibleColumns.length}\n`;
    report += `- **Hidden Columns**: ${hiddenCols.length}\n`;
    report += `- **Visibility Ratio**: ${((visibleColumns.length / FACTORYWAGER_COLUMNS.columns.length) * 100).toFixed(1)}%\n\n`;
    
    // Hidden columns section
    if (hiddenCols.length > 0) {
      report += `## 🫥 Hidden Columns\n\n`;
      report += `The following columns are currently hidden:\n\n`;
      
      hiddenCols.forEach(col => {
        const alignment = col.align === 'center' ? '📍' : col.align === 'right' ? '➡️' : '⬅️';
        report += `- **${col.name}** (${col.type}) ${alignment}\n`;
        report += `  - *${col.description}*\n`;
      });
      report += `\n`;
    }
    
    // Visible columns section
    report += `## 👁️ Visible Columns\n\n`;
    report += `The following columns are currently visible:\n\n`;
    
    visibleColumns.forEach(col => {
      const alignment = col.align === 'center' ? '📍' : col.align === 'right' ? '➡️' : '⬅️';
      const sortable = col.sortable ? '🔄' : '🔒';
      const filterable = col.filterable ? '🔍' : '🚫';
      
      report += `- **${col.name}** (${col.type}) ${alignment} ${sortable} ${filterable}\n`;
      report += `  - *${col.description}*\n`;
      report += `  - Width: ${col.minWidth} (ratio: ${col.widthRatio})\n`;
    });
    report += `\n`;
    
    // Executive summary
    report += `## 📊 Executive Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| **Total Tasks** | ${data.summary.total} |\n`;
    report += `| **Average Progress** | ${data.summary.averageProgress.toFixed(1)}% |\n`;
    report += `| **Total Effort** | ${data.summary.totalEffort} story points |\n`;
    report += `| **Completion Rate** | ${((data.summary.byStatus.completed || 0) / data.summary.total * 100).toFixed(1)}% |\n\n`;
    
    // Dynamic table with visible columns only
    report += `## 📋 Task Table (Visible Columns Only)\n\n`;
    
    // Table header
    const headerRow = visibleColumns.map(col => col.name).join(' | ');
    const separatorRow = visibleColumns.map(col => {
      const alignment = col.align === 'center' ? ':---:' : col.align === 'right' ? '---:' : ':---';
      return alignment;
    }).join(' | ');
    
    report += `| ${headerRow} |\n`;
    report += `| ${separatorRow} |\n`;
    
    // Table rows
    data.rows
      .sort((a, b) => {
        const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
        const statusOrder = { 'pending': 0, 'in-progress': 1, 'review': 2, 'completed': 3, 'blocked': 4, 'cancelled': 5 };
        
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return statusOrder[a.status] - statusOrder[b.status];
      })
      .forEach(row => {
        const rowData = visibleColumns.map(col => {
          const value = row[col.name as keyof ReportRow];
          return this.formatCellValue(col.name, value, col.type);
        }).join(' | ');
        
        report += `| ${rowData} |\n`;
      });
    
    report += `\n`;
    
    // Visibility configuration
    report += `## ⚙️ Visibility Configuration\n\n`;
    report += `**Current Hidden Columns:**\n\n`;
    report += '```toml\n';
    report += '[column_visibility]\n';
    report += 'hidden = [\n';
    hidden.forEach((col, index) => {
      const comma = index < hidden.length - 1 ? ',' : '';
      report += `  "${col}"${comma}\n`;
    });
    report += ']\n';
    report += '```\n\n';
    
    return report;
  }

  private formatCellValue(columnName: string, value: any, columnType: string): string {
    if (value === null || value === undefined) return '';
    
    switch (columnType) {
      case 'status':
        const statusIcons = {
          'pending': '⏳',
          'in-progress': '🔄',
          'review': '👀',
          'completed': '✅',
          'blocked': '🚫',
          'cancelled': '❌'
        };
        return `${statusIcons[value as keyof typeof statusIcons] || '❓'} ${value}`;
      
      case 'priority':
        const priorityColors = {
          'P0': '🔴',
          'P1': '🟠',
          'P2': '🟡',
          'P3': '🟢',
          'P4': '⚪'
        };
        return `${priorityColors[value as keyof typeof priorityColors] || '⚪'} ${value}`;
      
      case 'progress':
        const progress = Number(value);
        const filled = Math.round(progress / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        return `${bar} ${progress}%`;
      
      case 'trend':
        return value || '→';
      
      case 'severity':
        const severityColors = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢',
          'info': '🔵'
        };
        return `${severityColors[value as keyof typeof severityColors] || '🟡'} ${value}`;
      
      case 'risk':
        const riskIcons = {
          'high': '🔥',
          'medium': '⚠️',
          'low': '✅',
          'none': '✨'
        };
        return `${riskIcons[value as keyof typeof riskIcons] || '✨'} ${value}`;
      
      case 'effort':
        return `${value}sp`;
      
      case 'tags':
        return Array.isArray(value) ? value.join(', ') : String(value);
      
      case 'created':
      case 'updated':
        return new Date(value).toLocaleDateString();
      
      case 'dueDate':
        return new Date(value).toLocaleDateString();
      
      default:
        return String(value);
    }
  }

  async generateVisibilityAwareReport(outputPath?: string, hiddenColumns?: string[]): Promise<void> {
    const data = this.generateCurrentProjectData();
    const markdown = this.generateVisibilityReport(data, hiddenColumns);
    
    if (outputPath) {
      writeFileSync(outputPath, markdown, 'utf8');
      console.log(`✅ Visibility-aware report generated: ${outputPath}`);
    } else {
      console.log(markdown);
    }
  }
}

// CLI execution
if (import.meta.main) {
  const generator = new VisibilityReportGenerator();
  const outputPath = process.argv[2] || './reports/factory-wager-visibility-report.md';
  const customHiddenColumns = process.argv.slice(3); // Optional custom hidden columns
  
  await generator.generateVisibilityAwareReport(outputPath, customHiddenColumns).catch((error) => {
    console.error('❌ Visibility report generation failed:', error);
    process.exit(1);
  });
}

export default VisibilityReportGenerator;
