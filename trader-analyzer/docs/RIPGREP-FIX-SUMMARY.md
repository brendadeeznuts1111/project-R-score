# Ripgrep Search Fix Summary

## Issue Identified

When attempting to search the HTMLRewriter documentation using `ripgrep`, users encountered shell errors:
```
(eval):1: unmatched "
```

## Root Cause Analysis

### Primary Issue: Shell Interpretation of Backticks
- **Problem**: Backticks (`) have special meaning in shell (command substitution)
- **Symptom**: Using double quotes with backticks causes shell to attempt command substitution
- **Error**: `(eval):1: unmatched "` occurs when shell can't parse the backticks correctly

### Secondary Issue: Pattern Mismatch
- **Documentation Format**: The file uses **4 backticks** (````typescript`) for code blocks
- **Standard Format**: Most markdown uses 3 backticks (```typescript`)
- **Impact**: Searching for 3 backticks won't match the actual content

## Solution Implemented

### 1. Use Single Quotes
Single quotes prevent all shell interpretation, including backticks:
```bash
# ❌ Wrong (causes error)
rg "```typescript" file.md

# ✅ Correct
rg '```typescript' file.md
```

### 2. Match Exact Pattern
Match the exact number of backticks used in the file:
```bash
# ❌ Wrong (won't match - file uses 4 backticks)
rg '```typescript' file.md

# ✅ Correct (matches actual file format)
rg '````typescript' file.md
```

### 3. Complete Fix
Combine both solutions:
```bash
# ✅ Final correct command
rg '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

## Files Updated

1. **`docs/RIPGREP-HTMLREWRITER-CHEATSHEET.md`**
   - Created comprehensive search cheatsheet
   - All commands use single quotes + 4 backticks
   - Added "Common Shell Errors & Fixes" section
   - Updated all aliases with correct escaping

2. **`docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md`**
   - Added reference to ripgrep cheatsheet in "Related Documentation" section

## Verification Results

All commands verified and working:

```bash
# TypeScript code blocks
rg '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md | wc -l
# Result: 20 matches ✅

# HTML code blocks
rg '````html' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md | wc -l
# Result: 9 matches ✅

# Header sections
rg "Header 6\.1\.1\.2\.2\." docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
# Result: Multiple matches ✅
```

## Key Takeaways

1. **Always use single quotes** when searching for patterns containing backticks
2. **Match the exact pattern** in the file (4 backticks in this case, not 3)
3. **Test commands** before documenting them
4. **Document the "why"** not just the "what" - helps users understand root causes

## Quick Reference

### For This Documentation File
```bash
# TypeScript code blocks (4 backticks)
rg '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# HTML code blocks (4 backticks)
rg '````html' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Headers
rg "Header 6\.1\.1\.2\.2\." docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### General Rule
When searching for markdown code block markers:
- Use **single quotes** to prevent shell interpretation
- Match the **exact number of backticks** used in the file
- Test the command to verify it works

## Related Files

- [Ripgrep HTMLRewriter Cheatsheet](./RIPGREP-HTMLREWRITER-CHEATSHEET.md)
- [HTMLRewriter Unified Deployment Documentation](./6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md)

---

**Status**: ✅ **Complete and Verified**  
**Date**: 2024-12-07  
**Impact**: All ripgrep search commands now work correctly
