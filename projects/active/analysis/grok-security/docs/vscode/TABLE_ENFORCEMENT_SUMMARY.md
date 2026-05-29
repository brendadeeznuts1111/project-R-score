# 📋 Table Format Enforcement System

## Global Rule: 6-Column Minimum

**This workspace enforces a global rule: ALL markdown tables must have a minimum of 6 columns.**

This prevents incomplete table formats from ever being committed.

---

## How It Works

### 1. **VSCode Snippets** (Prevention)
When creating tables, use these snippets to auto-generate compliant 6-column tables:

| Snippet | Expands To | Use Case |
|---|---|---|---|---|---|
| `versiontable` | Version History table | Track versions, dates, changes, status, author, notes |
| `vtable` | Version History table | Shorthand for versiontable |
| `mdtable6` | Generic 6-column template | Any custom 6-column table |
| `table6col` | Generic 6-column template | Alternative shorthand |

**How to use:**
1. Type the snippet prefix (e.g., `versiontable`)
2. Press `Tab`
3. Table auto-expands with 6 columns
4. Fill in your data

### 2. **Pre-commit Hook** (Enforcement)
Before each commit, the hook automatically validates all markdown tables:

```bash
git commit -m "Add new feature"
# ↓ Pre-commit hook runs automatically
# ✅ All tables valid → commit succeeds
# ❌ Invalid tables → commit blocked
```

**If validation fails:**
- ❌ Commit is blocked
- 📋 Error shows which files have issues
- 💡 Instructions provided to fix

### 3. **VSCode Task** (Manual Validation)
Run validation anytime:

```
Cmd+Shift+P → Tasks: Run Task → [8.1.0.0] Validate: Markdown Tables
```

### 4. **Command Line** (CI/CD)
```bash
node .vscode/validate-tables.js /Users/nolarose/grok-secuirty
```

---

## Examples

### ✅ Valid Table (6 columns)
```markdown
| **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
|---|---|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial | Active | User | Foundation |
```

### ❌ Invalid Table (4 columns)
```markdown
| **Version** | **Date** | **Changes** | **Status** |
|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial | Active |
```
**Error:** "Table row has 4 columns, minimum 6 required (GLOBAL RULE)"

### ❌ Invalid Table (Incomplete separator)
```markdown
| **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
|---|---|---|---|
| 1.0.0 | 2026-01-18 | Initial | Active | User | Notes |
```
**Error:** "Table separator has 4 columns, minimum 6 required (GLOBAL RULE)"

---

## Workflow

### Creating a New Table

1. **Type snippet prefix:**
   ```
   versiontable
   ```

2. **Press Tab** → Table expands:
   ```markdown
   ## Version History

   | **Version** | **Date** | **Changes** | **Status** | **Author** | **Notes** |
   |---|---|---|---|---|---|
   | 1.0.0 | 2026-01-18 | Initial release | Active | Author | Notes |
   ```

3. **Fill in your data** → Done!

4. **Commit** → Pre-commit hook validates automatically

### Fixing Invalid Tables

If you have an existing table with fewer than 6 columns:

**Before:**
```markdown
| Feature | Status |
|---|---|
| Auth | ✅ |
```

**After (add 4 more columns):**
```markdown
| **Feature** | **Status** | **Version** | **Priority** | **Owner** | **Notes** |
|---|---|---|---|---|---|
| Auth | ✅ | 1.0.0 | High | Team | Implemented |
```

---

## Troubleshooting

### "Commit blocked: Table validation failed"

**Solution:**
1. Run validation task: `Cmd+Shift+P → Tasks: Run Task → [8.1.0.0]`
2. Review error messages showing which tables are invalid
3. Fix tables using snippets or by adding columns
4. Stage changes: `git add .`
5. Commit again

### "Table row has X columns, minimum 6 required"

**Solution:** Add more columns to reach 6 minimum.

Example:
```markdown
# Before (3 columns)
| A | B | C |
|---|---|---|

# After (6 columns)
| A | B | C | D | E | F |
|---|---|---|---|---|---|
```

### "Table separator has X columns, minimum 6 required"

**Solution:** Add separator cells to match column count.

Example:
```markdown
# Before (incomplete separator)
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|---|---|---|

# After (complete separator)
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|---|---|---|---|---|---|
```

---

## Key Points

✅ **Always use snippets** for new tables  
✅ **Minimum 6 columns** required (GLOBAL RULE)  
✅ **Separator row must match** column count  
✅ **Pre-commit hook** prevents invalid commits  
✅ **Run validation task** before committing  
✅ **Use Cmd+Shift+P** to access snippets and tasks  

---

## Files Involved

| File | Purpose | Status |
|---|---|---|---|---|---|
| `.vscode/validate-tables.js` | Validation script | ✅ Active |
| `.vscode/table-utils.code-snippets` | Table snippets | ✅ Active |
| `.git/hooks/pre-commit` | Git hook | ✅ Active |
| `.vscode/tasks.json` | VSCode task | ✅ Active |
| `.vscode/README.md` | Documentation | ✅ Active |

---

**Version**: 1.0.0.0 | **Date**: 2026-01-18 | **Status**: Enforced

