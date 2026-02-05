# Quick Wins - Performance & Code Quality Improvements

## 🚀 Implemented Quick Wins

### 1. ✅ Regex Pattern Caching in `lib/skill-router.ts`
**Issue**: `matchSkillTrigger()` creates new `RegExp` instances on every call (line 224)
**Fix**: Cache compiled regex patterns per trigger string
**Impact**: Reduces regex compilation overhead for frequently matched triggers

### 2. ✅ Console.log → Proper Logging in `src/web/`
**Issue**: Direct `console.log`/`console.error` calls in production code
**Fix**: Replace with proper logging infrastructure
**Impact**: Better log management, redaction, and structured logging

## 📋 Remaining Quick Wins

### 3. Type Safety Improvements
**Location**: Multiple files using `any` types
**Files**:
- `src/plugins/hooks.ts` (line 332, 338)
- `src/auto-reply/reply/get-reply-run.ts` (line 288)
- `src/auto-reply/reply/get-reply-inline-actions.ts` (line 28)
- `src/commands/doctor-sandbox.ts` (line 81)

**Action**: Replace `any` with proper types or `unknown` with type guards

### 4. Performance: Array.includes() in Loops
**Location**: `src/infra/skills-remote.ts`, `src/infra/bridge/server/connection.ts`
**Issue**: Using `array.includes()` in loops (O(n) lookup)
**Fix**: Convert to `Set` for O(1) lookups when checking multiple values

### 5. Code Duplication: Regex Pattern Compilation
**Location**: Multiple files compile similar regex patterns
**Files**:
- `src/tui/components/searchable-select-list.ts` (line 47)
- `src/infra/exec-approvals.ts` (line 444)
- `src/browser/pw-tools-core.responses.ts` (line 11)

**Action**: Extract common regex compilation utilities

### 6. Benchmark File Already Identifies Optimizations
**Location**: `benchmarks/perf-quick-wins.bench.ts`
**Findings**:
- Path parsing: Use `lastIndexOf` + `substring` instead of `split` + `slice` + `join`
- Exec flags: Use regex split instead of `split` + `map` + `filter`
- Redaction: Already optimized with cached patterns ✅

## 🎯 Priority Order

1. ✅ Regex caching in skill-router (HIGH - frequently called)
2. ✅ Console.log replacements (MEDIUM - code quality)
3. Type safety improvements (MEDIUM - maintainability)
4. Array.includes → Set (LOW - only if hot path)
5. Extract regex utilities (LOW - code organization)

## 📊 Expected Impact

- **Performance**: 10-30% faster regex matching in skill triggers
- **Code Quality**: Better logging, type safety, maintainability
- **Bundle Size**: Minimal impact (mostly runtime improvements)
