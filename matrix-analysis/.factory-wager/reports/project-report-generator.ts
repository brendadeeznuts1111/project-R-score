#!/usr/bin/env bun

/**
 * FactoryWager Project Report Generator
 * Generates comprehensive reports using the ReportRow and ReportSummary interfaces
 */

import { writeFileSync } from 'fs';
import type { ReportRow, ReportSummary, ReportConfig, ReportData, createReportRow, calculateSummary } from '../types/report-types';

class FactoryWagerReportGenerator {
  private generateCurrentProjectData(): ReportData {
    // Current FactoryWager project tasks as ReportRow objects
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

    const config: ReportConfig = {
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
    };

    const summary = this.calculateSummary(rows);

    return {
      config,
      summary,
      rows
    };
  }

  private calculateSummary(rows: ReportRow[]): ReportSummary {
    const summary: ReportSummary = {
      total: rows.length,
      byStatus: {},
      byPriority: {},
      averageProgress: 0,
      totalEffort: 0,
      riskDistribution: {},
    };

    // Calculate distributions
    rows.forEach(row => {
      summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
      summary.byPriority[row.priority] = (summary.byPriority[row.priority] || 0) + 1;
      summary.riskDistribution[row.risk] = (summary.riskDistribution[row.risk] || 0) + 1;
      summary.totalEffort += row.effort;
    });

    // Calculate average progress
    summary.averageProgress = rows.length > 0 
      ? rows.reduce((sum, row) => sum + row.progress, 0) / rows.length 
      : 0;

    return summary;
  }

  generateMarkdownReport(data: ReportData): string {
    const { config, summary, rows } = data;
    
    let report = `# ${config.title}\n\n`;
    
    if (config.description) {
      report += `${config.description}\n\n`;
    }
    
    report += `**Generated:** ${new Date(config.generatedAt).toLocaleString()}\n\n`;
    
    // Summary Section
    report += `## 📊 Executive Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| **Total Tasks** | ${summary.total} |\n`;
    report += `| **Average Progress** | ${summary.averageProgress.toFixed(1)}% |\n`;
    report += `| **Total Effort** | ${summary.totalEffort} story points |\n`;
    report += `| **Completion Rate** | ${((summary.byStatus.completed || 0) / summary.total * 100).toFixed(1)}% |\n\n`;
    
    // Status Distribution
    report += `### 📈 Status Distribution\n\n`;
    Object.entries(summary.byStatus).forEach(([status, count]) => {
      const percentage = (count / summary.total * 100).toFixed(1);
      const icon = this.getStatusIcon(status);
      report += `- **${icon} ${status}**: ${count} tasks (${percentage}%)\n`;
    });
    report += `\n`;
    
    // Priority Distribution
    report += `### 🎯 Priority Distribution\n\n`;
    Object.entries(summary.byPriority).forEach(([priority, count]) => {
      const percentage = (count / summary.total * 100).toFixed(1);
      const color = this.getPriorityColor(priority);
      report += `- **${color} ${priority}**: ${count} tasks (${percentage}%)\n`;
    });
    report += `\n`;
    
    // Risk Assessment
    report += `### ⚠️ Risk Distribution\n\n`;
    Object.entries(summary.riskDistribution).forEach(([risk, count]) => {
      const percentage = (count / summary.total * 100).toFixed(1);
      const icon = this.getRiskIcon(risk);
      report += `- **${icon} ${risk}**: ${count} tasks (${percentage}%)\n`;
    });
    report += `\n`;
    
    // Detailed Task List
    report += `## 📋 Detailed Task List\n\n`;
    report += `| ID | Title | Status | Priority | Progress | Effort | Risk |\n`;
    report += `|----|------|--------|----------|----------|--------|------|\n`;
    
    rows
      .sort((a, b) => {
        // Sort by priority first, then by status
        const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
        const statusOrder = { 'pending': 0, 'in-progress': 1, 'review': 2, 'completed': 3, 'blocked': 4, 'cancelled': 5 };
        
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return statusOrder[a.status] - statusOrder[b.status];
      })
      .forEach(row => {
        const statusIcon = this.getStatusIcon(row.status);
        const priorityColor = this.getPriorityColor(row.priority);
        const riskIcon = this.getRiskIcon(row.risk);
        const progressBar = this.createProgressBar(row.progress);
        
        report += `| ${row.id} | ${row.title} | ${statusIcon} ${row.status} | ${priorityColor} ${row.priority} | ${progressBar} ${row.progress}% | ${row.effort}sp | ${riskIcon} ${row.risk} |\n`;
      });
    
    report += `\n`;
    
    // Component Breakdown
    report += `## 🏗️ Component Breakdown\n\n`;
    const componentGroups = rows.reduce((groups, row) => {
      if (!groups[row.component]) groups[row.component] = [];
      groups[row.component].push(row);
      return groups;
    }, {} as Record<string, ReportRow[]>);
    
    Object.entries(componentGroups).forEach(([component, tasks]) => {
      const completed = tasks.filter(t => t.status === 'completed').length;
      const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length;
      
      report += `### ${component}\n`;
      report += `- **Tasks**: ${tasks.length}\n`;
      report += `- **Completed**: ${completed}/${tasks.length}\n`;
      report += `- **Average Progress**: ${totalProgress.toFixed(1)}%\n`;
      report += `- **Total Effort**: ${tasks.reduce((sum, t) => sum + t.effort, 0)} story points\n\n`;
    });
    
    return report;
  }

  private getStatusIcon(status: string): string {
    const icons = {
      'pending': '⏳',
      'in-progress': '🔄',
      'review': '👀',
      'completed': '✅',
      'blocked': '🚫',
      'cancelled': '❌'
    };
    return icons[status as keyof typeof icons] || '❓';
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      'P0': '🔴',
      'P1': '🟠',
      'P2': '🟡',
      'P3': '🟢',
      'P4': '⚪'
    };
    return colors[priority as keyof typeof colors] || '⚪';
  }

  private getRiskIcon(risk: string): string {
    const icons = {
      'high': '🔥',
      'medium': '⚠️',
      'low': '✅',
      'none': '✨'
    };
    return icons[risk as keyof typeof icons] || '❓';
  }

  private createProgressBar(progress: number): string {
    const filled = Math.round(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  async generateReport(outputPath?: string): Promise<void> {
    const data = this.generateCurrentProjectData();
    const markdown = this.generateMarkdownReport(data);
    
    if (outputPath) {
      writeFileSync(outputPath, markdown, 'utf8');
      console.log(`✅ Report generated: ${outputPath}`);
    } else {
      console.log(markdown);
    }
  }
}

// CLI execution
if (import.meta.main) {
  const generator = new FactoryWagerReportGenerator();
  const outputPath = process.argv[2] || './reports/factory-wager-project-report.md';
  
  await generator.generateReport(outputPath).catch((error) => {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  });
}

export default FactoryWagerReportGenerator;
