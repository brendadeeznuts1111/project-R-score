# Micro PR Merge Checklist

**Purpose**: Quick checklist for small cleanup, refactoring, and incremental improvement PRs.

**When to use**: PRs that are < 200 lines, focused on a single concern, and don't introduce new features.

---

## Pre-Merge Validation

### Code Quality
- [ ] `bun run lint` passes (no new linting errors)
- [ ] `bun run typecheck` passes (or only pre-existing errors unrelated to changes)
- [ ] Code follows project conventions (naming, formatting, structure)
- [ ] No hardcoded values (use constants/config where appropriate)

### Testing
- [ ] `bun test` passes (no test failures)
- [ ] Manual verification completed (if applicable)
- [ ] No regressions introduced

### Scope Validation
- [ ] Changes are focused and cohesive
- [ ] No unrelated changes included
- [ ] File count is reasonable (< 10 files typically)
- [ ] Line count is reasonable (< 200 lines typically)

### Documentation
- [ ] Code comments updated (if logic changed)
- [ ] README/docs updated (if user-facing changes)
- [ ] API docs updated (if API changes)

---

## Quick Validation Commands

```bash
# Run all checks
bun run lint && bun run typecheck && bun test

# Check file count
git diff --name-only | wc -l

# Check line count
git diff --stat | tail -1
```

---

## Common Micro PR Types

### TypeScript Cleanup
- [ ] Fix type errors
- [ ] Add missing type annotations
- [ ] Resolve `any` types
- [ ] Fix import/export issues

### Linting Cleanup
- [ ] Fix formatting issues
- [ ] Resolve unused variables
- [ ] Fix import organization
- [ ] Resolve style violations

### Documentation Updates
- [ ] Update code comments
- [ ] Fix broken links
- [ ] Update examples
- [ ] Improve clarity

### Configuration Updates
- [ ] Update dependencies
- [ ] Fix config paths
- [ ] Update environment variables
- [ ] Fix build configuration

### Refactoring
- [ ] Extract functions
- [ ] Rename variables/functions
- [ ] Simplify logic
- [ ] Remove dead code

---

## Merge Criteria

### ✅ Ready to Merge
- All validation checks pass
- Changes are isolated and focused
- No breaking changes (or clearly documented)
- Code quality maintained or improved

### ⚠️ Needs Review
- Pre-existing errors present (but unrelated to changes)
- Minor questions about approach
- Suggestions for improvement

### ❌ Block Merge
- New errors introduced
- Tests failing
- Breaking changes not documented
- Security concerns

---

## Post-Merge Checklist

- [ ] Verify merge successful
- [ ] Check CI/CD pipeline status
- [ ] Update related documentation (if needed)
- [ ] Close related issues (if applicable)

---

## Examples of Good Micro PRs

✅ **Good**: Fix TypeScript error in `src/api/routes.ts`  
✅ **Good**: Update import paths in `config/tsconfig.json`  
✅ **Good**: Add missing type annotations to `src/utils/bun.ts`  
✅ **Good**: Fix linting errors in `src/analytics/correlation-engine.ts`  
✅ **Good**: Update documentation links in `docs/api/MCP-SERVER.md`

❌ **Avoid**: Mixing type fixes with feature additions  
❌ **Avoid**: Changing multiple unrelated files  
❌ **Avoid**: Including breaking changes without documentation

---

## Quick Reference

| Check | Command | Target |
|-------|---------|--------|
| Lint | `bun run lint` | ✅ Pass |
| Typecheck | `bun run typecheck` | ✅ Pass (or pre-existing only) |
| Tests | `bun test` | ✅ Pass |
| File Count | `git diff --name-only \| wc -l` | < 10 |
| Line Count | `git diff --stat \| tail -1` | < 200 |

---

**Last Updated**: 2025-01-27  
**Version**: 1.0.0
