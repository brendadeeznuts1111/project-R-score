#!/usr/bin/env bun

/**
 * FactoryWager JSON Report Exporter
 * Exports project data in structured JSON format using ReportRow interfaces
 */

import { writeFileSync } from 'fs';
import type { ReportData, ReportRow } from '../types/report-types';

class FactoryWagerJSONExporter {
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
        title: 'FactoryWager CLI Project Report',
        description: 'Comprehensive project status and metrics for FactoryWager CLI development',
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

  async exportJSON(outputPath?: string): Promise<void> {
    const data = this.generateCurrentProjectData();
    const json = JSON.stringify(data, null, 2);
    
    if (outputPath) {
      writeFileSync(outputPath, json, 'utf8');
      console.log(`✅ JSON exported: ${outputPath}`);
    } else {
      console.log(json);
    }
  }

  async exportCSV(outputPath?: string): Promise<void> {
    const data = this.generateCurrentProjectData();
    
    // CSV headers
    const headers = [
      'id', 'status', 'priority', 'category', 'owner', 'title', 'progress',
      'metric', 'trend', 'severity', 'tags', 'component', 'duration',
      'effort', 'risk', 'dueDate', 'created', 'updated', 'source', 'flags'
    ];
    
    // Convert rows to CSV
    const csvRows = [
      headers.join(','),
      ...data.rows.map(row => [
        row.id,
        row.status,
        row.priority,
        row.category,
        row.owner,
        `"${row.title}"`,
        row.progress,
        `"${row.metric}"`,
        row.trend,
        row.severity,
        `"${row.tags.join(';')}"`,
        row.component,
        `"${row.duration}"`,
        row.effort,
        row.risk,
        row.dueDate,
        row.created,
        row.updated,
        row.source,
        `"${row.flags.join(';')}"`
      ].join(','))
    ];
    
    const csv = csvRows.join('\n');
    
    if (outputPath) {
      writeFileSync(outputPath, csv, 'utf8');
      console.log(`✅ CSV exported: ${outputPath}`);
    } else {
      console.log(csv);
    }
  }
}

// CLI execution
if (import.meta.main) {
  const exporter = new FactoryWagerJSONExporter();
  const format = process.argv[2] || 'json';
  const outputPath = process.argv[3];
  
  if (format === 'csv') {
    await exporter.exportCSV(outputPath || './reports/factory-wager-project-report.csv');
  } else {
    await exporter.exportJSON(outputPath || './reports/factory-wager-project-report.json');
  }
}

export default FactoryWagerJSONExporter;
