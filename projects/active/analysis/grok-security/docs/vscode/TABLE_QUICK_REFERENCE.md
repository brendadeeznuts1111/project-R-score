# 📋 Table Format Quick Reference

## Global Rule
**All markdown tables must have minimum 6 columns**

---

## Quick Start

### Create a Table
```
Type: versiontable
Press: Tab
Result: 6-column Version History table
```

### Validate Tables
```
Cmd+Shift+P → Tasks: Run Task → [8.1.0.0]
```

### Fix Invalid Table
Add columns until you have 6 minimum:
```markdown
# Before (3 columns)
| A | B | C |
|---|---|---|

# After (6 columns)
| A | B | C | D | E | F |
|---|---|---|---|---|---|
```

---

## Snippets

| Prefix | Result | Use Case |
|---|---|---|---|---|---|
| `versiontable` | 6-col Version table | Track versions |
| `vtable` | 6-col Version table | Shorthand |
| `mdtable6` | Generic 6-col table | Custom tables |
| `table6col` | Generic 6-col table | Shorthand |

---

## Validation

| Method | Command | When |
|---|---|---|---|---|---|
| **Manual** | Cmd+Shift+P → Task | Anytime |
| **Auto** | `git commit` | Before commit |
| **CLI** | `node .vscode/validate-tables.js` | CI/CD |

---

## Error Messages

| Error | Fix |
|---|---|---|---|---|---|
| "Table row has X columns, minimum 6" | Add more columns |
| "Table separator has X columns" | Add separator cells |
| "Commit blocked" | Run validation task |

---

## Files

| File | Purpose |
|---|---|---|---|---|---|
| `.vscode/validate-tables.js` | Validation script |
| `.vscode/table-utils.code-snippets` | Snippets |
| `.git/hooks/pre-commit` | Git hook |
| `.vscode/tasks.json` | VSCode task |

---

**Rule**: 6 columns minimum | **Enforced**: Yes | **Status**: Active

