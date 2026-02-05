# FactoryWager Enhanced Reporting System

## 🎯 Overview

The Enhanced Reporting System provides dynamic, configurable column-based reporting using the comprehensive column configuration you provided. This system supports 20 different column types with customizable display, sorting, filtering, and export behavior.

## 📋 Column Configuration System

### **Configuration Files**

- **TOML Config**: `config/column-config.toml` - Source configuration
- **TypeScript Types**: `types/column-types.ts` - Type-safe interfaces
- **Enhanced Generator**: `reports/enhanced-report-generator.ts` - Dynamic report generator

### **Supported Column Types** (20 Total)

| Type | Description | Example Columns |
|------|-------------|----------------|
| **identifier** | Unique IDs with code formatting | `id` |
| **enum** | Categorical values with icons/colors | `status`, `priority` |
| **taxonomy** | Hierarchical classifications | `category` |
| **owner** | Responsible parties with lookup | `owner` |
| **text** | Free-form text content | `title` |
| **percent** | Progress percentages with bars | `progress` |
| **numeric** | Numeric values with formatting | `metric` |
| **trend** | Direction indicators | `trend` |
| **severity** | Impact levels with weights | `severity` |
| **array** | Tag collections | `tags` |
| **string** | Simple text values | `component` |
| **duration** | Time periods | `duration` |
| **fibonacci** | Story point estimates | `effort` |
| **risk** | Risk assessments | `risk` |
| **date** | Calendar dates | `dueDate` |
| **datetime** | Full timestamps | `created`, `updated` |
| **origin** | Data source tracking | `source` |
| **flags** | Status indicators | `flags` |

## 🛠️ Dynamic Report Generation

### **Usage Examples**

```bash
# Generate full report with all 20 columns
bun run .factory-wager/reports/enhanced-report-generator.ts

# Generate report with specific columns
bun run .factory-wager/reports/enhanced-report-generator.ts output.md id status priority title progress

# Generate minimal report
bun run .factory-wager/reports/enhanced-report-generator.ts output.md id title status
```

### **Column Selection Features**

- **Dynamic Column Filtering**: Include only needed columns
- **Automatic Alignment**: Left/center/right based on column type
- **Responsive Width**: Ratio-based column sizing
- **Visual Indicators**: Icons and colors for different types

## 📊 Report Features

### **Column Configuration Display**

Each report shows:

- Column count and types used
- Individual column properties (width, alignment, capabilities)
- Visual indicators for sortable/filterable columns

### **Dynamic Table Generation**

- **Type-aware formatting**: Each column type gets appropriate formatting
- **Progress bars**: Visual progress representation
- **Icon integration**: Status, priority, severity with icons
- **Smart sorting**: Priority-based automatic sorting

### **Column Type Analysis**

- Groups columns by type
- Shows usage statistics
- Provides type-specific insights

## 🎨 Visual Formatting

### **Status Icons**


- ⏳ pending, 🔄 in-progress, 👀 review, ✅ completed, 🚫 blocked, ❌ cancelled

### **Priority Colors**


- 🔴 P0 (Critical), 🟠 P1 (High), 🟡 P2 (Medium), 🟢 P3 (Low), ⚪ P4 (Backlog)

### **Progress Bars**


- Visual 10-step progress bars: ██████████ 100%
- Empty progress: ░░░░░░░░░░ 0%

### **Risk Indicators**


- 🔥 high, ⚠️ medium, ✅ low, ✨ none

## 📈 Example Report Output

### **Column Configuration Section**


```text
This report uses **5 columns** with dynamic formatting:

- **id** (identifier) ⬅️ 🔄 🔍
  - *Unique identifier*
  - Width: 14ch (ratio: 1)
- **status** (enum) 📍 🔄 🔍
  - *Current status*
  - Width: 10ch (ratio: 0.8)
```

### **Dynamic Table Section**


```text
| id | status | priority | title | progress |
| :--- | :---: | :---: | :--- | ---: |
| fw-001 | completed | P0 | Native Binary Compilation | 100 |
| fw-002 | completed | P1 | TypeScript Error Fixes | 100 |
```

## 🔧 Integration with ReportRow Interface

The column system seamlessly integrates with the ReportRow TypeScript interface:


```typescript
interface ReportRow {
  id: string;                    // identifier type
  status: 'pending' | ...;       // enum type
  priority: 'P0' | ...;          // enum type
  title: string;                 // text type
  progress: number;              // percent type
  // ... 15 more fields
}
```

## 🚀 Advanced Features

### **Column Behaviors**

Each column type has specific behaviors:

- **Validation**: Pattern matching, value ranges
- **Formatting**: Date/time, numeric, currency
- **Interaction**: Sortable, filterable, searchable
- **Export**: CSV, JSON, API formats

### **Responsive Design**

- **Minimum widths**: Ensures readability
- **Width ratios**: Proportional scaling
- **Alignment**: Type-appropriate text alignment
- **Weight**: Visual hierarchy importance

### **Data Validation**

- **Type safety**: Compile-time validation
- **Runtime checks**: Value format validation
- **Enum enforcement**: Allowed value sets
- **Range validation**: Min/max constraints

## 💡 Usage Scenarios

### **Executive Dashboard**

```bash
# High-level overview
bun run .factory-wager/reports/enhanced-report-generator.ts exec.md id title status priority progress risk
```

### **Technical Deep Dive**

```bash
# Full technical details
bun run .factory-wager/reports/enhanced-report-generator.ts tech.md
```

### **Progress Tracking**

```bash
# Progress-focused view
bun run .factory-wager/reports/enhanced-report-generator.ts progress.md id title progress dueDate owner
```

## 📁 Generated Reports

### **Available Reports**

1. **Enhanced Report**: `factory-wager-enhanced-report.md`

   - Dynamic column configuration
   - Type-aware formatting
   - Visual indicators and progress bars

2. **Standard Report**: `factory-wager-project-report.md`

   - Fixed column layout
   - Traditional formatting
   - Comprehensive metrics

3. **JSON Export**: `factory-wager-project-report.json`

   - Complete data structure
   - API-ready format
   - All 20 columns included

4. **CSV Export**: `factory-wager-project-report.csv`

   - Spreadsheet-compatible
   - All columns flat format
   - Data analysis ready

## 🎯 Benefits

### **Flexibility**

- Choose any subset of 20 columns
- Custom column arrangements
- Multiple output formats

### **Type Safety**

- Full TypeScript coverage
- Compile-time validation
- Runtime type checking

### **Professional Output**

- Visual indicators and icons
- Progress bars and formatting
- Executive-ready reports

### **Enterprise Ready**

- Configurable column behavior
- Export capabilities
- Integration-friendly formats

---

**Generated with FactoryWager Enhanced Reporting System v1.0**
*Dynamic, configurable, type-safe project reporting*
