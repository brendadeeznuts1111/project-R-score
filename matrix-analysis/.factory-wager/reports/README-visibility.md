# FactoryWager Column Visibility System

## 🎯 Overview

The Column Visibility System provides configurable hiding/showing of columns in reports, allowing users to focus on relevant data while maintaining access to all available information when needed.

## 📋 Configuration Files

### **Column Visibility Config** (`config/column-visibility.toml`)

```toml
[column_visibility]
hidden = [
  "category",
  "owner",
  "metric",
  "trend",
  "tags",
  "duration",
  "effort",
  "risk",
  "created",
  "updated",
  "source"
]
```

## 🫥 Default Hidden Columns (11 Total)

| Column | Type | Description | Reason Hidden |
|--------|------|-------------|---------------|
| **category** | taxonomy | Category classification | Secondary grouping |
| **owner** | owner | Responsible party | Internal tracking |
| **metric** | numeric | Key metric value | Detailed analytics |
| **trend** | trend | Trend direction | Status indicator |
| **tags** | array | Associated tags | Metadata |
| **duration** | duration | Time duration | Planning detail |
| **effort** | fibonacci | Effort estimate | Planning metric |
| **risk** | risk | Risk level | Assessment data |
| **created** | datetime | Creation timestamp | Audit info |
| **updated** | datetime | Last update timestamp | Audit info |
| **source** | origin | Source origin | Tracking data |

## 👁️ Default Visible Columns (9 Total)

| Column | Type | Description | Priority |
|--------|------|-------------|----------|
| **id** | identifier | Unique identifier | High |
| **status** | enum | Current status | Critical |
| **priority** | enum | Priority level | Critical |
| **title** | text | Summary title | High |
| **progress** | percent | Completion percentage | High |
| **severity** | severity | Severity level | High |
| **component** | string | Component name | Medium |
| **dueDate** | date | Due date | Medium |
| **flags** | flags | Status flags | Medium |

## 🛠️ Usage Examples

### **Generate Default Visibility Report**

```bash
# Uses default hidden columns configuration
bun run .factory-wager/reports/visibility-report-generator.ts
```

### **Generate Custom Visibility Report**

```bash
# Hide different columns
bun run .factory-wager/reports/visibility-report-generator.ts output.md category owner metric
```

### **Show All Columns**

```bash
# No columns hidden (empty list)
bun run .factory-wager/reports/visibility-report-generator.ts output.md
```

## 📊 Visibility Features

### **Visibility Summary**

- **Total Columns**: 20
- **Visible Columns**: 9 (45%)
- **Hidden Columns**: 11 (55%)
- **Visibility Ratio**: 45.0%

### **Dynamic Column Management**

- **Runtime Configuration**: Change visibility without code changes
- **Type Safety**: Full TypeScript support for visibility management
- **Flexible Selection**: Show/hide any combination of columns
- **Configuration Persistence**: TOML-based configuration storage

### **Report Sections**

1. **Visibility Summary**: Overview of column visibility state
2. **Hidden Columns**: List of currently hidden columns
3. **Visible Columns**: Detailed information about visible columns
4. **Executive Summary**: Key metrics and KPIs
5. **Task Table**: Data table with visible columns only
6. **Visibility Configuration**: Current TOML configuration

## 🔧 Integration with Type System

### **Enhanced ColumnConfig Interface**

```typescript
export interface ColumnConfig {
  name: string;
  type: ColumnType;
  // ... existing properties
  hidden?: boolean; // New visibility control
}
```

### **Visibility Management Functions**

```typescript
// Get visible columns based on hidden list
export function getVisibleColumns(hiddenColumns?: string[]): ColumnConfig[]

// Get hidden columns based on hidden list
export function getHiddenColumns(hiddenColumns?: string[]): ColumnConfig[]

// Apply visibility flags to columns
export function applyColumnVisibility(columns: ColumnConfig[], hiddenColumns: string[]): ColumnConfig[]

// Default visibility configuration
export const DEFAULT_HIDDEN_COLUMNS = ["category", "owner", "metric", ...];
```

## 📈 Benefits

### **Focused Reporting**
- **Reduced Clutter**: Hide less relevant columns for cleaner reports
- **Executive-Friendly**: Show only essential information for leadership
- **Technical Depth**: Reveal detailed columns when needed for analysis

### **Flexible Configuration**
- **Role-Based Views**: Different visibility for different audiences
- **Project-Specific**: Customize visibility per project needs
- **Temporal Changes**: Adjust visibility as project requirements evolve

### **Maintainable System**
- **Configuration-Driven**: No code changes needed for visibility updates
- **Type Safety**: Compile-time validation of column names
- **Backward Compatibility**: All columns remain accessible when needed

## 🎨 Report Output Example

### **Visibility Summary Section**

```text
## 👁️ Column Visibility Summary

- **Total Columns**: 20
- **Visible Columns**: 9
- **Hidden Columns**: 11
- **Visibility Ratio**: 45.0%
```

### **Hidden Columns Section**

```text
## 🫥 Hidden Columns

The following columns are currently hidden:

- **category** (taxonomy) ⬅️
  - *Category classification*
- **owner** (owner) ⬅️
  - *Responsible party*
```

### **Visible Columns Table**

```text
| id | status | priority | title | progress | severity | component | dueDate | flags |
|:---|:---:|:---:|:---|---:|:---:|:---|---:|:---|
| fw-001 | completed | P0 | Native Binary Compilation | 100 | critical | factory-wager-cli | 1/1/2024 | production-ready |
```

## 🚀 Advanced Usage

### **Custom Visibility Profiles**

Create different visibility configurations for different use cases:

```toml
# Executive profile - minimal columns
[column_visibility]
hidden = ["category", "owner", "metric", "trend", "tags", "duration", "effort", "risk", "created", "updated", "source", "component", "flags"]

# Technical profile - detailed columns
[column_visibility]
hidden = ["category", "owner"]

# Planning profile - focus on estimates
[column_visibility]
hidden = ["created", "updated", "source", "flags"]
```

### **Programmatic Usage**

```typescript
import { getDefaultVisibleColumns, getHiddenColumns } from '../types/column-types';

// Get default visible columns
const visibleCols = getDefaultVisibleColumns();

// Get hidden columns
const hiddenCols = getHiddenColumns(DEFAULT_HIDDEN_COLUMNS);

// Custom visibility
const customVisible = getVisibleColumns(["category", "owner", "metric"]);
```

## 💡 Best Practices

### **Visibility Planning**

1. **Audience Analysis**: Consider who will read the report
2. **Information Hierarchy**: Prioritize most important information
3. **Use Case Specific**: Tailor visibility to specific needs
4. **Progressive Disclosure**: Show summary first, details on demand

### **Configuration Management**

1. **Version Control**: Track visibility configuration changes
2. **Documentation**: Explain rationale for hidden columns
3. **Testing**: Verify reports work with different visibility settings
4. **Backup**: Maintain full-column views for reference

---

**Generated with FactoryWager Column Visibility System v1.0**
*Configurable, type-safe column visibility management*
