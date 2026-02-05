# Implementation Plan: Bun.main Enhancements

[Overview]
This enhancement adds a dedicated `BUN_MAIN_GUIDE.md` and implements the `import.meta.path === Bun.main` pattern across shared tools, with a reusable `entry-guard.ts` template in `shared/tools/`.

The project matrix already exists; this upgrade deepens the documentation and adds runtime guard patterns to prevent unintended module execution, following Bun's official best practices.

[Types]
No new type definitions required. Existing patterns will use:
- `string` comparison between `import.meta.path` and `Bun.main`
- Optional guard function exports for reuse

[Files]
**New files:**
- `shared/tools/entry-guard.ts` - Reusable guard utility for direct vs imported execution
- `BUN_MAIN_GUIDE.md` - Comprehensive guide covering Bun.main, patterns, and Node.js comparison

**Modified files:**
- `overseer-cli.ts` - Add entry guard: `if (import.meta.path !== Bun.main) Bun.exit(0);`
- `cli-resolver.ts` - Add entry guard and export utility functions
- `README.md` - Add reference to BUN_MAIN_GUIDE.md and update best practices

**Directory creation:**
- `shared/tools/` directory (if not exists) for the entry-guard template

[Functions]
**New functions:**
- `ensureDirectExecution()` in `shared/tools/entry-guard.ts` - Throws error if not direct execution
- `isDirectExecution()` in `shared/tools/entry-guard.ts` - Returns boolean for guard condition

**Modified functions:**
- `runInProject()` in `overseer-cli.ts` - No change, but file gets guard at top-level
- `resolveAndRunTypeCheck()` and `resolveAndRun()` in `cli-resolver.ts` - No change, file gets guard

[Classes]
No new classes required.

[Dependencies]
No new dependencies. Uses existing Bun runtime APIs only.

[Testing]
Manual verification:
1. Run `bun overseer-cli.ts` without arguments - should work normally
2. Import `overseer-cli.ts` from another script - should exit immediately (guard)
3. Run `bun cli-resolver.ts typecheck` - should work normally
4. Import `cli-resolver.ts` - should exit immediately (guard)
5. Verify `BUN_MAIN_GUIDE.md` contains all sections and accurate comparisons

[Implementation Order]
1. Create `shared/tools/` directory
2. Create `shared/tools/entry-guard.ts` with guard utilities
3. Update `overseer-cli.ts` to add entry guard at top
4. Update `cli-resolver.ts` to add entry guard and export functions properly
5. Create `BUN_MAIN_GUIDE.md` with comprehensive documentation
6. Update `README.md` to reference the new guide
7. Verify all guards work correctly through manual testing