# AI Lint Debt Board (Slice-Based)

Last updated: 2026-02-10  
Owner: `@nolarose`

Scope for this board: `lib/ai/**` and four rules only:
- `import/order`
- `@typescript-eslint/require-await`
- `@typescript-eslint/no-unused-vars`
- `@typescript-eslint/no-floating-promises`

## Easy (1-5 violations per file)
- [x] `lib/ai/ai-operations-manager.test.ts` (2)
- [x] `lib/ai/anomaly-detector.test.ts` (2)
- [x] `lib/ai/bunMarkdownConstants.tsx` (2)
- [x] `lib/ai/ai-snapshot.test.ts` (4)
- [x] `lib/ai/ai.bench.ts` (5)
- [x] `lib/ai/bunMarkdownExamples.ts` (5)

## Medium (6-12 violations per file)
- [ ] None currently in this four-rule slice.

## Hard (13+ violations per file)
- [ ] `lib/ai/smart-cache-manager.ts` (14)
- [ ] `lib/ai/smart-cache-manager.test.ts` (14)

## Phase Locks
- Strict subset is re-enabled and passing for:
  - `lib/ai/ai-operations-manager.ts`
  - `lib/ai/anomaly-detector.ts`

## Commit Strategy
- Commit 1: Easy slice fixes + board refresh.
- Commit 2: Medium slice (when present).
- Commit 3+: Hard files one-by-one, removing temporary overrides as each file is hardened.
