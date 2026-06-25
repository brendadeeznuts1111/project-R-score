# 📋 Markdown Table Enforcement Guide

## Overview

This workspace enforces a **6-column minimum** for all markdown tables to maintain consistency and prevent incomplete table formats.

---

## ✅ How to Ensure Compliance

### 1. **Use VSCode Snippets** (Recommended)

Type one of these prefixes and press `Tab`:

#### Version History Table
```
versiontable
```
or
```
vtable
```

**Expands to:**
```markdown
## Version History

| **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
|---|---|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial release | Active | Author | Notes |
```

#### Generic 6-Column Table
```
mdtable6
```
or
```
table6col
```

**Expands to:**
```markdown
| **Col 1** | **Col 2** | **Col 3** | **Col 4** | **Col 5** | **Col 6** |
|---|---|---|---|---|---|
| data | data | data | data | data | data |
```

---

## 🔍 Validation Methods

### Method 1: VSCode Task (Manual)
```
Cmd+Shift+P → Tasks: Run Task → [8.1.0.0] Validate: Markdown Tables
```

### Method 2: Pre-commit Hook (Automatic)
Tables are automatically validated before each commit. If validation fails:
- ❌ Commit is blocked
- 💡 Error message shows which files have issues
- ✅ Fix tables and try committing again

### Method 3: Command Line
```bash
node .vscode/validate-tables.js /Users/nolarose/grok-secuirty
```

---

## 📊 Table Format Requirements

### ✅ Valid Table (6 columns)
```markdown
| **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
|---|---|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial | Active | User | Notes |
```

### ❌ Invalid Table (4 columns)
```markdown
| **Version** | **Date** | **Changes** | **Status** |
|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial | Active |
```

### ❌ Invalid Table (Incomplete separator)
```markdown
| **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial | Active | User | Notes |
```

---

## 🛠️ Troubleshooting

### Issue: "Table row has X columns, minimum 6 required"

**Solution:** Add more columns to reach 6 minimum.

Example fix:
```markdown
# Before (4 columns)
| A | B | C | D |
|---|---|---|---|

# After (6 columns)
| A | B | C | D | E | F |
|---|---|---|---|---|---|
```

### Issue: "Table separator has X columns, minimum 6 required"

**Solution:** Add separator cells (`|---|`) to match column count.

Example fix:
```markdown
# Before (incomplete separator)
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|---|---|---|

# After (complete separator)
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|---|---|---|---|---|---|
```

### Issue: Pre-commit hook blocks commit

**Solution:**
1. Run validation task: `Cmd+Shift+P → Tasks: Run Task → [8.1.0.0]`
2. Fix reported issues
3. Stage changes: `git add .`
4. Commit again

---

## 📝 Examples

### Version History Table
```markdown
## Version History

| **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
|---|---|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial setup | Active | Brenda | Foundation |
| 1.1.0 | 2026-01-19 | Added features | Active | Brenda | Enhancement |
| 1.0.1 | 2026-01-18 | Bug fixes | Archived | Team | Hotfix |
```

### Feature Matrix Table
```markdown
| **Feature** | **Status** | **Version** | **Priority** | **Owner** | **Notes** |
|---|---|---|---|---|---|
| Auth | Complete | 1.0.0 | High | Alice | Implemented |
| API | In Progress | 1.1.0 | High | Bob | 80% done |
| UI | Planned | 1.2.0 | Medium | Carol | Q2 2026 |
```

### API Reference Table
```markdown
| **Endpoint** | **Method** | **Auth** | **Rate Limit** | **Status** | **Docs** |
|---|---|---|---|---|---|
| /users | GET | Required | 100/min | Active | [Link](#) |
| /users | POST | Required | 10/min | Active | [Link](#) |
| /admin | GET | Admin | 1000/min | Beta | [Link](#) |
```

---

## 🚀 Quick Reference

| Action | Command | Result |
|---|---|---|---|---|---|
| Insert Version Table | Type `versiontable` + Tab | 6-column table |
| Insert Generic Table | Type `mdtable6` + Tab | 6-column template |
| Validate All Tables | Cmd+Shift+P → Task | Shows issues |
| Validate CLI | `node .vscode/validate-tables.js` | Exit code 0/1 |

---

## 📌 Key Points

✅ **Always use snippets** for new tables  
✅ **Minimum 6 columns** required  
✅ **Separator row must match** column count  
✅ **Pre-commit hook** prevents invalid commits  
✅ **Run validation task** before committing  

---

**Version**: 1.0.0.0 | **Date**: 2026-01-18 | **Enforced**: Yes

