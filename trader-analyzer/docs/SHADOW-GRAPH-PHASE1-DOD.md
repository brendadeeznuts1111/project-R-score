# Phase 1: File Renames - Definition of Done (DoD)

**Phase**: Phase 1 - File Renames  
**Version**: 1.1.1.1.1.0.0  
**Status**: 📋 Ready for Implementation  
**Last Updated**: 2025-01-XX

---

## 🎯 Phase 1 Scope

**Objective**: Rename 4 core shadow-graph files to follow consistent naming conventions with `shadow-graph-` prefix.

**Files to Rename**:
1. `orchestrator.ts` → `shadow-graph-orchestrator.ts`
2. `database.ts` → `shadow-graph-database.ts`
3. `constants.ts` → `shadow-graph-constants.ts`
4. `case-study.ts` → `shadow-graph-case-study.ts`

**Files NOT to Rename**:
- ❌ `index.ts` - Standard Node.js convention (DO NOT RENAME)

---

## ✅ Definition of Done Criteria

### 1. File Renames Completed ✅

**Acceptance Criteria**:
- [ ] All 4 files renamed in `src/arbitrage/shadow-graph/` directory
- [ ] Old files no longer exist
- [ ] New files exist with correct names
- [ ] File contents unchanged (only filename changed)

**Verification Command**:
```bash
# Verify old files don't exist
ls src/arbitrage/shadow-graph/orchestrator.ts 2>&1 | grep -q "No such file" && echo "✅ orchestrator.ts renamed" || echo "❌ orchestrator.ts still exists"
ls src/arbitrage/shadow-graph/database.ts 2>&1 | grep -q "No such file" && echo "✅ database.ts renamed" || echo "❌ database.ts still exists"
ls src/arbitrage/shadow-graph/constants.ts 2>&1 | grep -q "No such file" && echo "✅ constants.ts renamed" || echo "❌ constants.ts still exists"
ls src/arbitrage/shadow-graph/case-study.ts 2>&1 | grep -q "No such file" && echo "✅ case-study.ts renamed" || echo "❌ case-study.ts still exists"

# Verify new files exist
ls src/arbitrage/shadow-graph/shadow-graph-orchestrator.ts && echo "✅ shadow-graph-orchestrator.ts exists"
ls src/arbitrage/shadow-graph/shadow-graph-database.ts && echo "✅ shadow-graph-database.ts exists"
ls src/arbitrage/shadow-graph/shadow-graph-constants.ts && echo "✅ shadow-graph-constants.ts exists"
ls src/arbitrage/shadow-graph/shadow-graph-case-study.ts && echo "✅ shadow-graph-case-study.ts exists"
```

**Expected Result**: All old files removed, all new files exist ✅

---

### 2. All Imports Updated ✅

**Acceptance Criteria**:
- [ ] No imports reference old file names
- [ ] All imports updated to use new file names
- [ ] No broken import statements
- [ ] TypeScript compilation succeeds without import errors

**Files Requiring Import Updates**:
- [ ] `src/arbitrage/shadow-graph/index.ts`
- [ ] `src/arbitrage/shadow-graph/orchestrator.ts` (if it imports these)
- [ ] `src/mcp/tools/shadow-graph-research.ts`
- [ ] `src/mcp/tools/advanced-research.ts`
- [ ] `src/arbitrage/shadow-graph/shadow-graph-builder.ts` (if imports constants)
- [ ] `src/arbitrage/shadow-graph/hidden-steam-detector.ts` (if imports constants)
- [ ] `src/arbitrage/shadow-graph/shadow-arb-scanner.ts` (if imports constants)
- [ ] Any other files importing these modules

**Verification Commands**:
```bash
# Find all imports of old file names (should return empty)
rg "from.*['\"].*orchestrator['\"]|from.*['\"].*database['\"]|from.*['\"].*constants['\"]|from.*['\"].*case-study['\"]" src/ --type ts

# Find all imports of new file names (should show updated imports)
rg "from.*['\"].*shadow-graph-orchestrator['\"]|from.*['\"].*shadow-graph-database['\"]|from.*['\"].*shadow-graph-constants['\"]|from.*['\"].*shadow-graph-case-study['\"]" src/ --type ts

# Verify TypeScript compilation
bun run typecheck
```

**Expected Result**: 
- No old imports found ✅
- New imports found in expected files ✅
- TypeScript compilation succeeds ✅

---

### 3. Export Statements Updated ✅

**Acceptance Criteria**:
- [ ] `src/arbitrage/shadow-graph/index.ts` exports updated
- [ ] All export paths reference new file names
- [ ] No broken export statements

**Verification Command**:
```bash
# Check index.ts exports
rg "from.*orchestrator|from.*database|from.*constants|from.*case-study" src/arbitrage/shadow-graph/index.ts

# Should show new file names
rg "from.*shadow-graph-orchestrator|from.*shadow-graph-database|from.*shadow-graph-constants|from.*shadow-graph-case-study" src/arbitrage/shadow-graph/index.ts
```

**Expected Result**: 
- No old file names in exports ✅
- All exports use new file names ✅

---

### 4. Code Functionality Unchanged ✅

**Acceptance Criteria**:
- [ ] No logic changes made (only import paths)
- [ ] All classes, functions, and types still accessible
- [ ] Runtime behavior unchanged
- [ ] No functionality regressions

**Verification Steps**:
```bash
# Verify classes still exist and are exported
rg "export class ShadowGraphOrchestrator" src/arbitrage/shadow-graph/shadow-graph-orchestrator.ts
rg "export function initializeShadowGraphDatabase" src/arbitrage/shadow-graph/shadow-graph-database.ts
rg "export const LAG_THRESHOLD_SECONDS" src/arbitrage/shadow-graph/shadow-graph-constants.ts
rg "export const Q1_TOTAL_CASE_STUDY" src/arbitrage/shadow-graph/shadow-graph-case-study.ts

# Run tests (if available)
bun test src/arbitrage/shadow-graph/

# Verify imports still work
bun run -e "import { ShadowGraphOrchestrator } from './src/arbitrage/shadow-graph'; console.log('✅ Import works')"
```

**Expected Result**: 
- All exports still accessible ✅
- Tests pass ✅
- Runtime imports work ✅

---

### 5. Documentation Updated ✅

**Acceptance Criteria**:
- [ ] All documentation references updated
- [ ] Code examples updated with new file names
- [ ] Cross-references updated
- [ ] No broken documentation links

**Documentation Files to Update**:
- [ ] `docs/SHADOW-GRAPH-SYSTEM.md`
- [ ] `docs/SHADOW-GRAPH-COMPLETE-HIERARCHY.md`
- [ ] `docs/SHADOW-GRAPH-QUICK-REFERENCE.md`
- [ ] `docs/SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md`
- [ ] `docs/RESEARCH-SCRIPTS-INTEGRATION.md`
- [ ] `docs/SHADOW-GRAPH-NAMING-ENHANCEMENT-PLAN.md`
- [ ] `README.md` (if references exist)

**Verification Commands**:
```bash
# Find old file references in documentation
rg "orchestrator\.ts|database\.ts|constants\.ts|case-study\.ts" docs/ --type md

# Find new file references (should show updated docs)
rg "shadow-graph-orchestrator\.ts|shadow-graph-database\.ts|shadow-graph-constants\.ts|shadow-graph-case-study\.ts" docs/ --type md
```

**Expected Result**: 
- No old file names in documentation ✅
- New file names appear in documentation ✅

---

### 6. Git History Preserved ✅

**Acceptance Criteria**:
- [ ] Git recognizes file renames (not deletions + additions)
- [ ] File history preserved
- [ ] Blame/log still works for renamed files

**Verification Commands**:
```bash
# Check git status (should show renames, not deletions)
git status

# Verify git recognizes renames
git log --follow --oneline src/arbitrage/shadow-graph/shadow-graph-orchestrator.ts | head -5
```

**Expected Result**: 
- Git shows renames (R) not deletions (D) ✅
- File history accessible ✅

---

### 7. No Broken Dependencies ✅

**Acceptance Criteria**:
- [ ] All dependent code still works
- [ ] No runtime errors from import failures
- [ ] MCP tools still function
- [ ] Research scripts still work

**Verification Steps**:
```bash
# Test MCP tools can import
bun run -e "import { shadowGraphResearchTools } from './src/mcp/tools/shadow-graph-research'; console.log('✅ MCP tools import works')"

# Test orchestrator can be imported
bun run -e "import { ShadowGraphOrchestrator } from './src/arbitrage/shadow-graph'; console.log('✅ Orchestrator import works')"

# Test constants can be imported
bun run -e "import { LAG_THRESHOLD_SECONDS } from './src/arbitrage/shadow-graph'; console.log('✅ Constants import works')"
```

**Expected Result**: 
- All imports succeed ✅
- No runtime errors ✅

---

### 8. Linter/Type Checker Passes ✅

**Acceptance Criteria**:
- [ ] TypeScript type checking passes
- [ ] No linter errors introduced
- [ ] No new warnings

**Verification Commands**:
```bash
# Type check
bun run typecheck

# Lint (if configured)
bun run lint src/arbitrage/shadow-graph/
```

**Expected Result**: 
- Type checking passes ✅
- No linter errors ✅

---

## 📋 Implementation Checklist

### Pre-Implementation

- [ ] Create feature branch: `git checkout -b feat/shadow-graph-file-renames`
- [ ] Backup current state: `git commit -am "Backup before Phase 1"`
- [ ] Review all affected files: `rg "from.*orchestrator|from.*database|from.*constants|from.*case-study" src/ --type ts -l`
- [ ] Document current state (take screenshots if needed)

### Implementation Steps

1. [ ] **Rename orchestrator.ts**
   ```bash
   git mv src/arbitrage/shadow-graph/orchestrator.ts src/arbitrage/shadow-graph/shadow-graph-orchestrator.ts
   ```

2. [ ] **Rename database.ts**
   ```bash
   git mv src/arbitrage/shadow-graph/database.ts src/arbitrage/shadow-graph/shadow-graph-database.ts
   ```

3. [ ] **Rename constants.ts**
   ```bash
   git mv src/arbitrage/shadow-graph/constants.ts src/arbitrage/shadow-graph/shadow-graph-constants.ts
   ```

4. [ ] **Rename case-study.ts**
   ```bash
   git mv src/arbitrage/shadow-graph/case-study.ts src/arbitrage/shadow-graph/shadow-graph-case-study.ts
   ```

5. [ ] **Update index.ts exports**
   - Update all `from "./orchestrator"` → `from "./shadow-graph-orchestrator"`
   - Update all `from "./database"` → `from "./shadow-graph-database"`
   - Update all `from "./constants"` → `from "./shadow-graph-constants"`
   - Update all `from "./case-study"` → `from "./shadow-graph-case-study"`

6. [ ] **Update all import statements**
   - Search and replace in all affected files
   - Verify each file individually

7. [ ] **Update documentation**
   - Update all file references in docs
   - Update code examples
   - Update cross-references

### Post-Implementation Verification

- [ ] Run all verification commands (see above)
- [ ] Run test suite: `bun test`
- [ ] Run type check: `bun run typecheck`
- [ ] Manual smoke test: Import and use renamed modules
- [ ] Review git diff: `git diff --cached`

---

## 🚨 Rollback Procedure

If issues are discovered:

1. **Immediate Rollback**:
   ```bash
   git reset --hard HEAD~1  # If committed
   # OR
   git checkout -- src/arbitrage/shadow-graph/  # If not committed
   ```

2. **Partial Rollback** (if only some files have issues):
   ```bash
   git checkout HEAD -- src/arbitrage/shadow-graph/orchestrator.ts
   # Repeat for each problematic file
   ```

3. **Verify Rollback**:
   ```bash
   bun run typecheck
   bun test
   ```

---

## 📊 Success Metrics

**Phase 1 is considered DONE when**:

✅ **All 8 DoD Criteria Met**:
1. ✅ File renames completed
2. ✅ All imports updated
3. ✅ Export statements updated
4. ✅ Code functionality unchanged
5. ✅ Documentation updated
6. ✅ Git history preserved
7. ✅ No broken dependencies
8. ✅ Linter/type checker passes

✅ **Zero Regressions**:
- No broken imports
- No broken exports
- No broken functionality
- No broken documentation links

✅ **All Tests Pass**:
- Type checking passes
- Linter passes
- Runtime imports work
- MCP tools work

---

## 🎯 Sign-Off Criteria

**Phase 1 is APPROVED when**:

- [ ] All DoD criteria met ✅
- [ ] Code review completed ✅
- [ ] Tests passing ✅
- [ ] Documentation updated ✅
- [ ] No open issues ✅
- [ ] Ready to merge ✅

**Sign-off by**:
- [ ] Developer: _________________ Date: _______
- [ ] Reviewer: _________________ Date: _______
- [ ] QA: _________________ Date: _______

---

## 📝 Notes

- **Estimated Time**: 1-2 hours
- **Risk Level**: Low-Medium (breaking changes, but well-documented)
- **Dependencies**: None (can be done independently)
- **Blocks**: Phase 2 (class renames) depends on Phase 1 completion

---

**Status**: 📋 Ready for Implementation  
**Last Updated**: 2025-01-XX

