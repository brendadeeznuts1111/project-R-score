# FactoryWager Reporting System

## 🎯 Overview

The FactoryWager Reporting System provides comprehensive project tracking and reporting capabilities using TypeScript interfaces for type safety and consistency.

## 📋 Core Interfaces

### ReportRow Interface

```typescript
interface ReportRow {
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
```

### ReportSummary Interface

```typescript
interface ReportSummary {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageProgress: number;
  totalEffort: number;
  riskDistribution: Record<string, number>;
}
```

## 🛠️ Available Tools

### 1. Project Report Generator

**File**: `project-report-generator.ts`

**Purpose**: Generates comprehensive Markdown reports with visual indicators

```bash
bun run .factory-wager/reports/project-report-generator.ts [output-path]
```

**Features**:

- Executive summary with key metrics
- Status, priority, and risk distributions
- Detailed task list with progress bars
- Component breakdown analysis
- Visual indicators (icons, colors, progress bars)

### 2. JSON Exporter

**File**: `json-exporter.ts`

**Purpose**: Exports data in structured JSON and CSV formats

```bash
# JSON export
bun run .factory-wager/reports/json-exporter.ts json [output-path]

# CSV export
bun run .factory-wager/reports/json-exporter.ts csv [output-path]
```

**Features**:

- Type-safe JSON export using ReportRow interfaces
- CSV export for spreadsheet analysis
- Complete data preservation
- API-ready format

## 📊 Current Project Status

### Executive Summary

- **Total Tasks**: 7
- **Average Progress**: 42.9%
- **Total Effort**: 52 story points
- **Completion Rate**: 42.9%

### Status Distribution

- ✅ **completed**: 3 tasks (42.9%)
- ⏳ **pending**: 4 tasks (57.1%)

### Priority Distribution

- 🔴 **P0**: 1 task (14.3%)
- 🟠 **P1**: 1 task (14.3%)
- 🟡 **P2**: 3 tasks (42.9%)
- 🟢 **P3**: 2 tasks (28.6%)

### Risk Distribution

- ✨ **none**: 3 tasks (42.9%)
- ✅ **low**: 2 tasks (28.6%)
- ⚠️ **medium**: 2 tasks (28.6%)

## 📁 Generated Reports

### Available Formats

1. **Markdown Report**: `factory-wager-project-report.md`

   - Human-readable with visual formatting
   - Progress bars and icons
   - Component breakdowns

2. **JSON Export**: `factory-wager-project-report.json`

   - Type-safe structured data
   - API-ready format
   - Complete metadata

3. **CSV Export**: `factory-wager-project-report.csv`

   - Spreadsheet-compatible
   - Data analysis ready
   - Tabular format

## 🔧 Integration with Task Schema

The reporting system integrates seamlessly with the standardized task schema:

- **Status values**: Direct mapping from schema
- **Priority levels**: P0-P4 classification
- **Trend indicators**: Progress visualization
- **Risk assessment**: High/medium/low/none
- **Effort points**: Fibonacci story points
- **Severity levels**: Critical/high/medium/low/info

## 🚀 Usage Examples

### Generate Full Report Suite

```bash
# Generate all report formats
bun run .factory-wager/reports/project-report-generator.ts
bun run .factory-wager/reports/json-exporter.ts json
bun run .factory-wager/reports/json-exporter.ts csv
```

### Custom Report Generation

```typescript
import { createReportRow, calculateSummary } from '../types/report-types';

// Create a new task
const newTask = createReportRow({
  id: 'fw-008',
  title: 'New Feature Implementation',
  category: 'Development',
  priority: 'P2',
  effort: 5
});

// Calculate summary
const summary = calculateSummary([...existingTasks, newTask]);
```

## 📈 Metrics & Analytics

The reporting system provides comprehensive analytics:

- **Progress Tracking**: Individual and aggregate progress metrics
- **Effort Analysis**: Story point distribution and burn rate
- **Risk Assessment**: Risk distribution and mitigation tracking
- **Performance Metrics**: Completion rates and velocity calculations
- **Component Health**: Per-component status and progress analysis

## 🎨 Visual Indicators

- **Status Icons**: ⏳ 🔄 👀 ✅ 🚫 ❌
- **Priority Colors**: 🔴 🟠 🟡 🟢 ⚪
- **Risk Indicators**: 🔥 ⚠️ ✅ ✨
- **Progress Bars**: Visual 10-step progress representation
- **Trend Arrows**: ↑ → ↓ ↗ ↘ ◇

## 💡 Best Practices

1. **Consistent Data**: Use type-safe interfaces for all data entry
2. **Regular Updates**: Keep progress and status fields current
3. **Proper Classification**: Use appropriate priority and severity levels
4. **Tag Organization**: Maintain consistent tagging conventions
5. **Component Tracking**: Assign tasks to specific components for better analysis

---

**Generated with FactoryWager Reporting System v1.0**
*Type-safe, comprehensive project tracking and analytics*
