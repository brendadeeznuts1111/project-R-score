# Ripgrep audit: broken paths, links, node_modules, bloat, duplication

Generated from `rg` searches across the repo. Summary of issues and recommendations.

---

## 1. Broken paths (baseline & tests)

### `.validate-pointers-baseline.json` — wrong root paths ✅ FIXED

Baseline uses **root-level** paths that don’t exist; files live in subdirs:

| Baseline pointer (broken) | Actual location |
|---------------------------|-----------------|
| `/Users/nolarose/Projects/guide-cli.ts` | `utils/guide-cli.ts` |
| `/Users/nolarose/Projects/overseer-cli.ts` | `tools/overseer-cli.ts` |
| `/Users/nolarose/Projects/server.ts` | `server/server.ts` (or `tools/server.ts`) |
| `/Users/nolarose/Projects/terminal-tool.ts` | `utils/terminal-tool.ts` |

**Fix:** Update baseline pointers to the real paths (e.g. `utils/guide-cli.ts`, `tools/overseer-cli.ts`, `server/server.ts`, `utils/terminal-tool.ts`) or run the pointer validator so it records the correct paths.

### `tests/test-guide-cli-simple.ts` — wrong relative path ✅ FIXED

- Uses `../guide-cli.ts` and `import('../guide-cli.ts')` from `tests/`.
- From `tests/`, `../guide-cli.ts` is repo root; **there is no `guide-cli.ts` at root** (it’s in `utils/`).

**Fix:** Use `../utils/guide-cli.ts` and `import('../utils/guide-cli.ts')` in that test file.

---

## 2. Broken markdown links

### `docs/AGENTS.md` ✅ FIXED

- Links updated from `./BUN_SPAWN_GUIDE.md` / `./BUN_WHICH_GUIDE.md` to `./guides/BUN_SPAWN_GUIDE.md` and `./guides/BUN_WHICH_GUIDE.md`.
- Project structure tree updated to show `docs/guides/` with the two guides (removed "root level").

### `docs/COMPREHENSIVE_REPOSITORY_REVIEW.md` ✅ FIXED

- Refers to `BUN_SPAWN_GUIDE.md` and `BUN_WHICH_GUIDE.md` at “root level”; they are under `docs/guides/`. Any links to them should use the correct relative path from that doc.

---

## 3. Hardcoded /Users paths (portability & duplication)

Many files hardcode `/Users/nolarose/Projects` or `/Users/ashley/PROJECTS`. This hurts portability and creates “other machine” paths.

**Examples:**

- **`/Users/nolarose/Projects`** (current user):  
  `DIRECTORY_STRUCTURE.md`, `docs/AGENTS.md`, `docs/QUICK_TEST.md`, `factorywager-mcp.json`, `lib/port-management-system.ts`, `lib/security/*.json`, `projects/dashboards/secrets-dashboard/*`, `.husky/*.sh`, `.validate-pointers-baseline.json`, `BUN_CONSTANTS_VERSION.json`, `projects/analysis/scanner/scan.ts`, etc.
- **`/Users/ashley/PROJECTS`** (example user in docs):  
  `docs/BUN_MAIN_GUIDE.md`, `tools/inspect-demo.ts`, `tools/inspect-projects.ts`, `docs/guides/BUN_WHICH_GUIDE.md`, `docs/BUN_INSPECT_GUIDE.md`.

**Recommendation:** Prefer env (e.g. `BUN_PLATFORM_HOME`) or `Bun.main` / repo-relative paths. Docs already call this out (e.g. “never hardcode `/Users/nolarose/Projects`” in AGENTS.md); the audit shows where to replace.

---

## 4. node_modules references

**Intentional / OK:**  
Most hits are correct: `.gitignore`, exclude lists, PATH prepending (`node_modules/.bin`), eslint/tsconfig excludes, “install deps” messages, scanner logic that walks `node_modules`.

**Worth double-checking:**

- **`projects/dashboards/enterprise-dashboard/package.json`**  
  Scripts use `./node_modules/.bin/tailwindcss`. Prefer `bunx` or `bun run` so you don’t depend on that exact path.
- **`projects/analysis/matrix-analysis/package.json`**  
  MCP entries point at `node_modules/mcp-bun/...`, `node_modules/@modelcontextprotocol/...`, etc. Ensure those packages are dependencies and paths match after install.
- **`native-addon-tool/build.ts`**  
  Writes to `node_modules/native-addon.node`; confirm that’s the intended install target for this repo layout.

No direct `require('node_modules/...')` or `from 'node_modules/...'` imports were found; good.

---

## 5. Bloat and noise

### TODO / FIXME / XXX / HACK

- Many under `lib/standards-integration.ts`, `projects/dashboards/enterprise-dashboard/`, `projects/analysis/matrix-analysis/`, `projects/enterprise/fantasy42-fire22-registry/`, `clawdbot/`, etc.
- Some are in docs/templates (e.g. “TICKET-XXX”); others are real TODOs.  
**Suggestion:** Triage and either implement or convert to issues; leave only intentional placeholders in templates.

### debugger

- No raw `debugger;` statements in app code that would run in production.  
- Hits are in: ESLint config (`no-debugger`), docs, tooling (inspector, widget-debugger), tests, and third-party (e.g. Obsidian).  
No change required for “remove debugger bloat.”

---

## 6. Duplication

### Scanner / scan code

- **`projects/analysis/scanner/scan.ts`** and **`projects/analysis/scanner/src/scan.ts`** (and `optimizations/enhanced-scanner.ts`) share similar logic (e.g. `node_modules` paths, `PROJECTS_ROOT`). Worth confirming which is source of truth and whether one delegates to the other to avoid drift.

### PackageManagerCLI

- **`projects/experimental/registry-powered-mcp/dashboard/src/components/PackageManagerCLI.tsx`** and **`projects/experimental/registry-powered-mcp/components/PackageManagerCLI.tsx`** have very similar content (same `node_modules` copy). Consider a single component and re-export or symlink.

### Registry CLI

- **`factorywager/registry/apps/cli/src/cli.ts`** and **`lib/registry/cli.ts`** both use the same tar exclude (`--exclude=node_modules`, `--exclude=.git`). Could be shared config or helper to avoid duplication.

### Docs / guides

- AGENTS.md says “BUN_SPAWN_GUIDE.md” and “BUN_WHICH_GUIDE.md” at “root level” but they live under `docs/guides/`. Fixing the links (above) also removes the inconsistent “root” mental model.

---

## 7. Quick fix checklist

| Item | Action | Status |
|------|--------|--------|
| `.validate-pointers-baseline.json` | Set pointers to `utils/guide-cli.ts`, `tools/overseer-cli.ts`, `server/server.ts`, `utils/terminal-tool.ts`. | ✅ Done |
| `tests/test-guide-cli-simple.ts` | Use `../utils/guide-cli.ts` and `import('../utils/guide-cli.ts')`. | ✅ Done |
| `docs/AGENTS.md` | Change guide links to `./guides/BUN_SPAWN_GUIDE.md` and `./guides/BUN_WHICH_GUIDE.md`; fix tree. | ✅ Done |
| `docs/COMPREHENSIVE_REPOSITORY_REVIEW.md` | Reference guides under `docs/guides/` in list and git add. | ✅ Done |
| Other docs | Replace any remaining wrong links to BUN_*_GUIDE.md with `guides/` path. | — |
| Hardcoded paths | Prefer `BUN_PLATFORM_HOME` / relative paths; especially in `scan.ts`, secrets-dashboard, MCP configs, husky scripts. | ✅ Partially done (code + scripts fixed; JSON configs documented in `ENV_CONFIG_MIGRATION.md`) |

---

## 8. Commands used

```bash
# node_modules mentions (excluding lockfiles)
rg 'node_modules' -g '!*.lock'

# Absolute /Users paths
rg '/Users/[^/]+/' .

# Relative doc links in .md
rg '\].\([^)]*\.\./.*\)|\].\([^)]*\./.*\)' -g '*.md'

# TODO/FIXME/XXX/HACK
rg 'FIXME|XXX|HACK|TODO' -g '!*.lock'

# Require/import from node_modules (broken pattern)
rg "require\(['\"]\.\./node_modules|from ['\"]\.\./node_modules|require\(['\"]node_modules" .

# debugger in TS/JS
rg 'debugger' -g '*.{ts,js,tsx,jsx}'
```

You can re-run these (or add `--type-add 'md:*.md'` etc.) to refresh the audit after changes.
