# FactoryWager TOML-Powered Report

Comprehensive report using TOML configuration with 20-column architecture

**Generated:** 2/1/2026, 10:39:37 AM
**Configuration:** TOML-powered with 20 columns
**Use Case:** sprint_status

## ⚙️ Configuration Summary

- **Total Columns**: 20
- **Visible Columns**: 7
- **Hidden Columns**: undefined
- **Schema Version**: 2.0
- **Theme**: light mode

## 🎨 Enum Configurations

### Status Values

- **pending**: ⏳ (#6e7781)
- **in_progress**: 🔄 (#bf8700)
- **review**: 👀 (#8250df)
- **approved**: ✅ (#1a7f37)
- **completed**: 🎉 (#1a7f37)
- **blocked**: 🚫 (#cf222e)
- **cancelled**: ❌ (#6e7781)
- **on_hold**: ⏸️ (#bf8700)

### Priority Values

- **P0**: 🔴 (order: 0)
- **P1**: 🟠 (order: 1)
- **P2**: 🟡 (order: 2)
- **P3**: 🟢 (order: 3)
- **P4**: ⚪ (order: 4)

### Trend Values

- **up**: ↗ (Improving)
- **down**: ↘ (Declining)
- **stable**: → (Stable)
- **peak**: ↗ (At peak)
- **valley**: ↘ (At valley)
- **volatile**: ~ (Volatile)
- **unknown**: ◇ (No data)

### Severity Values

- **critical**: {"color":"#cf222e","response":"< 15 min"}
- **high**: {"color":"#bf8700","response":"< 1 hour"}
- **medium**: {"color":"#bf8700","response":"< 4 hours"}
- **low**: {"color":"#1a7f37","response":"< 24 hours"}
- **info**: {"color":"#6e7781","response":"< 1 week"}

### Risk Values

- **critical**: {"color":"#cf222e","impact":"High","probability":"High"}
- **high**: {"color":"#cf222e","impact":"High","probability":"Medium"}
- **medium**: {"color":"#bf8700","impact":"Medium","probability":"Medium"}
- **low**: {"color":"#1a7f37","impact":"Low","probability":"Medium"}
- **none**: {"color":"#6e7781","impact":"None","probability":"None"}

### Effort Values

- **1**: {"points":1,"complexity":"Trivial"}
- **2**: {"points":2,"complexity":"Simple"}
- **3**: {"points":3,"complexity":"Easy"}
- **5**: {"points":5,"complexity":"Medium"}
- **8**: {"points":8,"complexity":"Complex"}
- **13**: {"points":13,"complexity":"Very Complex"}

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 7 |
| **Average Progress** | 54.3% |
| **Total Effort** | 52 story points |
| **Completion Rate** | 42.9% |

### 📈 Status Distribution

- 🎉 **completed**: 3 (42.9%)
- 🔄 **in_progress**: 1 (14.3%)
- ⏳ **pending**: 2 (28.6%)
- 🚫 **blocked**: 1 (14.3%)

### 🎯 Priority Distribution

- ❓ **completed**: 3 (42.9%)
- ❓ **in_progress**: 1 (14.3%)
- ❓ **pending**: 2 (28.6%)
- ❓ **blocked**: 1 (14.3%)

## 📋 Dynamic Task Table

| id | status | title | owner | progress | dueDate | flags |
| :--- | :---: | :--- | :--- | ---: | ---: | :--- |
| fw-001 | 🎉 completed | Native Binary Compilation | FactoryWager | ██████████ 100% | 12/31/2023 | production-ready |
| fw-002 | 🎉 completed | TypeScript Error Fixes | FactoryWager | ██████████ 100% | 12/31/2023 | type-safe |
| fw-003 | 🎉 completed | Markdown Lint Fixes | FactoryWager | ██████████ 100% | 12/31/2023 | lint-clean |
| fw-004 | 🔄 in_progress | Binary Size Optimization | FactoryWager | ███████░░░ 65% | 1/14/2024 | performance-critical |
| fw-007 | ⏳ pending | R2 Upload Integration | FactoryWager | ░░░░░░░░░░ 0% | 1/9/2024 | infrastructure |
| fw-006 | 🚫 blocked | Cross-Platform Builds | FactoryWager | ██░░░░░░░░ 15% | 2/14/2024 | expansion |
| fw-005 | ⏳ pending | Native Purity Improvement | FactoryWager | ░░░░░░░░░░ 0% | 1/29/2024 | long-term |

## 🎯 Use Case: sprint_status

**Columns:** id, status, title, owner, progress, dueDate, flags

## 🔄 Sort Configuration

**Null handling:** last

1. **priority** (asc)
2. **severity** (desc)
3. **dueDate** (asc)

## 🔍 Filter Presets

- **critical**: severity eq "critical"
- **blocked**: status eq "blocked"
- **overdue**: dueDate lt "2026-01-01"
- **high_priority**: priority in ["P0","P1"]
- **my_tasks**: owner contains "@nolarose"
- **recent**: updated gte "2026-01-01"

## 🎨 Theme Configuration

**Mode:** light

**Colors:**
- text: #24292f
- border: #d0d7de
- header_bg: #f6f8fa
- row_hover: rgba(208, 215, 222, 0.32)
- row_alt: #f6f8fa

