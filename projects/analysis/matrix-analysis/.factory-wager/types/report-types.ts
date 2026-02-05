/**
 * FactoryWager Report System Type Definitions
 * TypeScript interfaces for comprehensive task and project reporting
 */

export interface ReportRow {
  id: string;
  status: 'pending' | 'in-progress' | 'review' | 'completed' | 'blocked' | 'cancelled';
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  category: string;
  owner: string;
  title: string;
  progress: number; // 0-100
  metric: number | string;
  trend: '↑' | '→' | '↓' | '↗' | '↘' | '◇';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  tags: string[];
  component: string;
  duration: string; // e.g., "2d 4h"
  effort: number; // story points
  risk: 'high' | 'medium' | 'low' | 'none';
  dueDate: string; // ISO date
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
  source: string;
  flags: string[];
}

export interface ReportSummary {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageProgress: number;
  totalEffort: number;
  riskDistribution: Record<string, number>;
}

export interface ReportConfig {
  title: string;
  description?: string;
  generatedAt: string;
  period?: {
    start: string;
    end: string;
  };
  filters?: {
    status?: string[];
    priority?: string[];
    component?: string[];
    owner?: string[];
  };
}

export interface ReportData {
  config: ReportConfig;
  summary: ReportSummary;
  rows: ReportRow[];
}

// Type guards and utilities
export function isValidStatus(status: string): status is ReportRow['status'] {
  return ['pending', 'in-progress', 'review', 'completed', 'blocked', 'cancelled'].includes(status);
}

export function isValidPriority(priority: string): priority is ReportRow['priority'] {
  return ['P0', 'P1', 'P2', 'P3', 'P4'].includes(priority);
}

export function isValidTrend(trend: string): trend is ReportRow['trend'] {
  return ['↑', '→', '↓', '↗', '↘', '◇'].includes(trend);
}

export function isValidSeverity(severity: string): severity is ReportRow['severity'] {
  return ['critical', 'high', 'medium', 'low', 'info'].includes(severity);
}

export function isValidRisk(risk: string): risk is ReportRow['risk'] {
  return ['high', 'medium', 'low', 'none'].includes(risk);
}

// Factory method for creating ReportRow
export function createReportRow(data: Partial<ReportRow> & Required<Pick<ReportRow, 'id' | 'title' | 'category'>>): ReportRow {
  const now = new Date().toISOString();
  
  return {
    id: data.id,
    status: data.status || 'pending',
    priority: data.priority || 'P2',
    category: data.category,
    owner: data.owner || 'unassigned',
    title: data.title,
    progress: data.progress || 0,
    metric: data.metric || 0,
    trend: data.trend || '→',
    severity: data.severity || 'medium',
    tags: data.tags || [],
    component: data.component || 'unknown',
    duration: data.duration || '',
    effort: data.effort || 1,
    risk: data.risk || 'none',
    dueDate: data.dueDate || '',
    created: data.created || now,
    updated: data.updated || now,
    source: data.source || 'manual',
    flags: data.flags || [],
  };
}

// Calculate summary from rows
export function calculateSummary(rows: ReportRow[]): ReportSummary {
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
    // Status distribution
    summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
    
    // Priority distribution
    summary.byPriority[row.priority] = (summary.byPriority[row.priority] || 0) + 1;
    
    // Risk distribution
    summary.riskDistribution[row.risk] = (summary.riskDistribution[row.risk] || 0) + 1;
    
    // Effort total
    summary.totalEffort += row.effort;
  });

  // Calculate average progress
  summary.averageProgress = rows.length > 0 
    ? rows.reduce((sum, row) => sum + row.progress, 0) / rows.length 
    : 0;

  return summary;
}
