# FactoryWager Visibility-Aware Project Report

Column visibility-aware project status with configurable hidden columns

**Generated:** 2/1/2026, 10:36:34 AM

## 👁️ Column Visibility Summary

- **Total Columns**: 20
- **Visible Columns**: 9
- **Hidden Columns**: 0
- **Visibility Ratio**: 45.0%

## 👁️ Visible Columns

The following columns are currently visible:

- **id** (identifier) ⬅️ 🔄 🔍
  - *Unique identifier*
  - Width: 14ch (ratio: 1)
- **status** (enum) 📍 🔄 🔍
  - *Current status*
  - Width: 10ch (ratio: 0.8)
- **priority** (enum) 📍 🔄 🔍
  - *Priority level*
  - Width: 6ch (ratio: 0.5)
- **title** (text) ⬅️ 🔄 🔍
  - *Summary title*
  - Width: 30ch (ratio: 2.5)
- **progress** (percent) ➡️ 🔄 🔍
  - *Completion percentage*
  - Width: 8ch (ratio: 0.6)
- **severity** (severity) 📍 🔄 🔍
  - *Severity level*
  - Width: 8ch (ratio: 0.6)
- **component** (string) ⬅️ 🔄 🔍
  - *Component name*
  - Width: 14ch (ratio: 1.2)
- **dueDate** (date) ➡️ 🔄 🔍
  - *Due date*
  - Width: 11ch (ratio: 0.9)
- **flags** (flags) ⬅️ 🔄 🔍
  - *Status flags*
  - Width: 14ch (ratio: 1.2)

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 7 |
| **Average Progress** | 42.9% |
| **Total Effort** | 52 story points |
| **Completion Rate** | 42.9% |

## 📋 Task Table (Visible Columns Only)

| id | status | priority | title | progress | severity | component | dueDate | flags |
| :--- | :---: | :---: | :--- | ---: | :---: | :--- | ---: | :--- |
| fw-001 | completed | P0 | Native Binary Compilation | 100 | 🔴 critical | factory-wager-cli | 2024-01-01T00:00:00.000Z | production-ready |
| fw-002 | completed | P1 | TypeScript Error Fixes | 100 | 🟠 high | native-markdown | 2024-01-01T00:00:00.000Z | type-safe |
| fw-004 | pending | P2 | Binary Size Optimization | 0 | 🟡 medium | factory-wager-cli | 2024-01-15T00:00:00.000Z | performance-critical |
| fw-007 | pending | P2 | R2 Upload Integration | 0 | 🟠 high | deployment | 2024-01-10T00:00:00.000Z | infrastructure |
| fw-003 | completed | P2 | Markdown Lint Fixes | 100 | 🟡 medium | compilation-report | 2024-01-01T00:00:00.000Z | lint-clean |
| fw-005 | pending | P3 | Native Purity Improvement | 0 | 🟢 low | audit-system | 2024-01-30T00:00:00.000Z | long-term |
| fw-006 | pending | P3 | Cross-Platform Builds | 0 | 🟡 medium | factory-wager-cli | 2024-02-15T00:00:00.000Z | expansion |

## ⚙️ Visibility Configuration

**Current Hidden Columns:**

```toml
[column_visibility]
hidden = [
]
```

