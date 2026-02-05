#!/usr/bin/env bun

/**
 * FactoryWager TOML-Powered Report Generator
 * Uses comprehensive TOML configuration for dynamic report generation
 */

import { writeFileSync } from 'fs';
import type { ReportRow, ReportData } from '../types/report-types';
import { loadReportConfig, ReportConfigManager, type ReportConfig } from '../types/report-config-types';

class TomlPoweredReportGenerator {
  private configManager: ReportConfigManager;
  private config: ReportConfig;

  constructor(config: ReportConfig) {
    this.config = config;
    this.configManager = new ReportConfigManager(config);
  }

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
        status: 'in-progress',
        priority: 'P2',
        category: 'Optimization',
        owner: 'FactoryWager',
        title: 'Binary Size Optimization',
        progress: 65,
        metric: '57MB → 35MB target',
        trend: '↗',
        severity: 'medium',
        tags: ['optimization', 'size', 'bundle'],
        component: 'factory-wager-cli',
        duration: 'estimated 2d',
        effort: 8,
        risk: 'low',
        dueDate: '2024-01-15T00:00:00.000Z',
        created: '2024-01-01T11:00:00.000Z',
        updated: '2024-01-01T14:30:00.000Z',
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
        status: 'blocked',
        priority: 'P3',
        category: 'Build System',
        owner: 'FactoryWager',
        title: 'Cross-Platform Builds',
        progress: 15,
        metric: 'Linux support in progress',
        trend: '→',
        severity: 'medium',
        tags: ['build', 'cross-platform', 'linux', 'windows'],
        component: 'factory-wager-cli',
        duration: 'estimated 3d',
        effort: 13,
        risk: 'medium',
        dueDate: '2024-02-15T00:00:00.000Z',
        created: '2024-01-01T11:00:00.000Z',
        updated: '2024-01-01T16:45:00.000Z',
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
        title: 'FactoryWager TOML-Powered Report',
        description: 'Comprehensive report using TOML configuration with 20-column architecture',
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

  generateTomlPoweredReport(data: ReportData, useCase?: string): string {
    // Get columns based on use case or default view
    const columns = useCase
      ? this.configManager.getUseCaseColumns(useCase)
      : this.configManager.getVisibleColumns();

    let report = `# ${data.config.title}\n\n`;

    if (data.config.description) {
      report += `${data.config.description}\n\n`;
    }

    report += `**Generated:** ${new Date(data.config.generatedAt).toLocaleString()}\n`;
    report += `**Configuration:** TOML-powered with ${Object.keys(this.config.columns).length} columns\n`;
    report += `**Use Case:** ${useCase || 'default view'}\n\n`;

    // Configuration summary
    report += `## ⚙️ Configuration Summary\n\n`;
    report += `- **Total Columns**: ${Object.keys(this.config.columns).length}\n`;
    report += `- **Visible Columns**: ${columns.length}\n`;
    report += `- **Hidden Columns**: ${this.config.view.hidden.columns.length}\n`;
    report += `- **Schema Version**: ${this.config.schema.version}\n`;
    report += `- **Theme**: ${this.config.theme.mode} mode\n\n`;

    // Enum configurations
    report += `## 🎨 Enum Configurations\n\n`;

    Object.entries(this.config.enums).forEach(([enumType, enumValues]) => {
      report += `### ${enumType.charAt(0).toUpperCase() + enumType.slice(1)} Values\n\n`;

      if (enumType === 'status') {
        Object.entries(enumValues as Record<string, { color: string; icon: string }>).forEach(([key, value]) => {
          report += `- **${key}**: ${value.icon} (${value.color})\n`;
        });
      } else if (enumType === 'priority') {
        Object.entries(enumValues as Record<string, { color: string; icon: string; order: number }>).forEach(([key, value]) => {
          report += `- **${key}**: ${value.icon} (order: ${value.order})\n`;
        });
      } else if (enumType === 'trend') {
        Object.entries(enumValues as Record<string, { icon: string; meaning: string }>).forEach(([key, value]) => {
          report += `- **${key}**: ${value.icon} (${value.meaning})\n`;
        });
      } else {
        Object.entries(enumValues as Record<string, any>).forEach(([key, value]) => {
          report += `- **${key}**: ${JSON.stringify(value)}\n`;
        });
      }
      report += `\n`;
    });

    // Executive summary
    report += `## 📊 Executive Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| **Total Tasks** | ${data.summary.total} |\n`;
    report += `| **Average Progress** | ${data.summary.averageProgress.toFixed(1)}% |\n`;
    report += `| **Total Effort** | ${data.summary.totalEffort} story points |\n`;
    report += `| **Completion Rate** | ${((data.summary.byStatus.completed || 0) / data.summary.total * 100).toFixed(1)}% |\n\n`;

    // Status distribution with enum styling
    report += `### 📈 Status Distribution\n\n`;
    Object.entries(data.summary.byStatus).forEach(([status, count]) => {
      const statusConfig = this.configManager.getEnumValue('status', status);
      const icon = statusConfig?.icon || '❓';
      const percentage = ((count / data.summary.total) * 100).toFixed(1);
      report += `- ${icon} **${status}**: ${count} (${percentage}%)\n`;
    });
    report += `\n`;

    // Priority distribution with enum styling
    report += `### 🎯 Priority Distribution\n\n`;
    Object.entries(data.summary.byStatus).forEach(([priority, count]) => {
      const priorityConfig = this.configManager.getEnumValue('priority', priority);
      const icon = priorityConfig?.icon || '❓';
      const percentage = ((count / data.summary.total) * 100).toFixed(1);
      report += `- ${icon} **${priority}**: ${count} (${percentage}%)\n`;
    });
    report += `\n`;

    // Dynamic table with TOML configuration
    report += `## 📋 Dynamic Task Table\n\n`;

    // Table header
    const headerRow = columns.map(col => col.name).join(' | ');
    const separatorRow = columns.map(col => {
      const alignment = col.align === 'center' ? ':---:' : col.align === 'right' ? '---:' : ':---';
      return alignment;
    }).join(' | ');

    report += `| ${headerRow} |\n`;
    report += `| ${separatorRow} |\n`;

    // Sort data according to configuration
    const sortConfig = this.configManager.getSortConfig();
    const sortedRows = [...data.rows].sort((a, b) => {
      for (const sortCol of sortConfig.columns) {
        const aValue = a[sortCol.column as keyof ReportRow];
        const bValue = b[sortCol.column as keyof ReportRow];

        if (aValue !== bValue) {
          const direction = sortCol.direction === 'asc' ? 1 : -1;
          return aValue < bValue ? -direction : direction;
        }
      }
      return 0;
    });

    // Table rows with formatted values
    sortedRows.forEach(row => {
      const rowData = columns.map(col => {
        const value = row[col.name as keyof ReportRow];
        return this.configManager.formatCellValue(col.name, value);
      }).join(' | ');

      report += `| ${rowData} |\n`;
    });

    report += `\n`;

    // Use case information
    if (useCase && this.config.use_cases[useCase]) {
      report += `## 🎯 Use Case: ${useCase}\n\n`;
      report += `**Columns:** ${this.config.use_cases[useCase].columns.join(', ')}\n\n`;
    }

    // Sort configuration
    report += `## 🔄 Sort Configuration\n\n`;
    report += `**Null handling:** ${this.config.sort.nulls}\n\n`;
    this.config.sort.columns.forEach((sortCol, index) => {
      report += `${index + 1}. **${sortCol.column}** (${sortCol.direction})\n`;
    });
    report += `\n`;

    // Filter presets
    report += `## 🔍 Filter Presets\n\n`;
    Object.entries(this.config.filter.presets).forEach(([name, preset]) => {
      report += `- **${name}**: ${preset.column} ${preset.operator} ${JSON.stringify(preset.value)}\n`;
    });
    report += `\n`;

    // Theme information
    report += `## 🎨 Theme Configuration\n\n`;
    report += `**Mode:** ${this.config.theme.mode}\n\n`;
    report += `**Colors:**\n`;
    Object.entries(this.config.theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        report += `- ${key}: ${value}\n`;
      }
    });
    report += `\n`;

    return report;
  }

  async generateReport(outputPath?: string, useCase?: string): Promise<void> {
    const data = this.generateCurrentProjectData();
    const markdown = this.generateTomlPoweredReport(data, useCase);

    if (outputPath) {
      writeFileSync(outputPath, markdown, 'utf8');
      console.log(`✅ TOML-powered report generated: ${outputPath}`);
    } else {
      console.log(markdown);
    }
  }
}

// CLI execution
if (import.meta.main) {
  const configPath = process.argv[2] || '/Users/nolarose/.factory-wager/config/report-config.toml';
  const outputPath = process.argv[3] || './reports/factory-wager-toml-report.md';
  const useCase = process.argv[4]; // Optional use case

  try {
    const config = await loadReportConfig(configPath);
    const generator = new TomlPoweredReportGenerator(config);
    await generator.generateReport(outputPath, useCase).catch((error) => {
      console.error('❌ TOML-powered report generation failed:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    process.exit(1);
  }
}

export default TomlPoweredReportGenerator;
