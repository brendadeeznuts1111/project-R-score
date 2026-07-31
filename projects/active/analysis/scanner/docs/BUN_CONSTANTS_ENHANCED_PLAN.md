# Enhanced BUN Constants & Code Quality Plan

Extension of the [Complete BUN Constants Mapping Plan](./.cursor/plans/complete_bun_constants_mapping_49d77626.plan.md)
— adds prefix consistency, hardcoded values audit, and HTML escape usage.

---

## 1. Prefix Consistency

### Rule

- **BUN\_** prefix: Use for all exported constants that are Bun-ecosystem or scanner-specific config (URLs, paths,
  catalog data, risk/threshold values).
- **No prefix** (or project-specific): Allowed for generic benchmark/tooling constants (e.g. `ITERATIONS`, `WARMUP`) and
  local module-only `const`.

### Audit Results

| Location                                 | Constant                                            | Current                                           | Recommendation                                                       |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `scan.ts`                                | `PROJECTS_ROOT`                                     | Env override, repository-root discovery, then cwd | OK (no machine-specific hardcoded path)                             |
| `scan.ts`                                | `SNAPSHOT_DIR`, `SNAPSHOT_PATH`, `TOKEN_AUDIT_PATH` | Internal `const`                                  | Optional: `BUN_SNAPSHOT_DIR` etc. if exported; else keep internal    |
| `benchmarks/bench-core.ts`               | `ITERATIONS`, `WARMUP`, `S`, `R`, `B`, `D`          | No BUN\_                                          | OK (benchmark-only)                                                  |
| `docs/CUSTOM_ESLINT_RULES.md`            | `R2_COOKIE_FORMAT_VERSION`, `API_VERSION`           | Example "bad"                                     | Use `BUN_R2_COOKIE_FORMAT_VERSION`, `BUN_API_VERSION` as "good"      |
| `optimizations/runtime-optimizations.ts` | `DEFAULT_RISK_CAPACITY`                             | Internal                                          | OK (internal)                                                        |
| `cli/renderers/status-glyphs.ts`         | `DEFAULT_PROJECT`                                   | Internal, equals `BUN_PROFILES_DEFAULT_NAMESPACE` | Prefer `BUN_PROFILES_DEFAULT_NAMESPACE` for consistency              |

### Action Items

1. Update `CUSTOM_ESLINT_RULES.md` examples to show correct `BUN_` prefixes.

---

## 2. Hardcoded Ports & Hosts

### Rule

- Ports and API bases should come from env vars or shared config constants, not literal numbers in code.

### Audit Results

| Location                                                    | Finding                                              | Recommendation                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `matrix-analysis/mcp-bun-docs/skills-matrix-integration.ts` | `SKILLS_API_BASE = "http://localhost:3000"`          | Use `process.env.SKILLS_API_BASE ?? "http://localhost:3000"` or `BUN_SKILLS_API_BASE` constant |
| `scanner/scan.test.ts`                                      | `PORT=3000` in test env string                       | OK (test fixture)                                                                              |
### Action Items

1. **mcp-bun-docs**: Add `BUN_SKILLS_API_BASE` (or env `SKILLS_API_BASE`) in lib.ts, use in
   skills-matrix-integration.ts.

---

## 3. Inlined HTML Escape

### Rule

- Prefer `Bun.escapeHTML()` over manual `.replace(/&/g, '&amp;')` chains for user-facing or untrusted content.

### Audit Results

| Location                                 | Finding                                       | Status                                               |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `scanner/scan.ts`                        | Same                                          | Correct                                              |
| `scanner/benchmarks/bench-native.ts`     | `escapeHtmlReplace()` with `.replace()` chain | Intentional (benchmark comparing userland vs native) |
| `scanner/benchmarks/team-init.ts`        | `.replace(/[<>{}[\]                           | \\^~`]/g, '')`                                       | Character sanitization, not HTML — document if used for security |
| `scanner/benchmarks/bun-api-snapshot.ts` | `.replace(/"/g, '')` etc.                     | JSON/CLI parsing, not HTML — OK                      |

### Action Items

1. Ensure any new code that escapes HTML for display uses `Bun.escapeHTML`.
2. Add ESLint rule or doc guideline: "Use Bun.escapeHTML for HTML/XSS-safe output."

---

## 4. Hardcoded Paths

### Audit Results

| Location                   | Finding                                                                   | Recommendation                                           |
| -------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `scanner/scan.ts`          | Env override, repository-root discovery, then cwd fallback               | OK                                                       |
| `scanner/benchmarks/*`     | `import.meta.dir`-based paths                                             | OK (runtime resolution)                                  |

### Action Items

No scanner path remediation remains.

---

## 5. Extraction Script Enhancement

Extend `scripts/extract-bun-constants.ts` to also report:

- Constants matching `export const [A-Z][A-Z0-9_]*` that do **not** start with `BUN_` (potential prefix violations).
- Literal port numbers (e.g. `:3000`, `port = 3000`).
- Inlined `.replace(/&/g, '&amp;')` or similar HTML-escape patterns.

---

## Implementation Order

| Phase | Task                                                    | Effort |
| ----- | ------------------------------------------------------- | ------ |
| 5.1   | Fix scan.ts PROJECTS_ROOT hardcoded path                | Low    |
| 5.2   | Add BUN_SKILLS_API_BASE (or env) in mcp-bun-docs        | Low    |
| 5.3   | Update CUSTOM_ESLINT_RULES.md prefix examples           | Low    |
| 5.4   | Enhance extract-bun-constants.ts with audit checks      | Medium |
| 5.5   | Add "Use Bun.escapeHTML" to CONTRIBUTING or style guide | Low    |

---

## Scope

- **Scanner**: scan.ts, benchmarks, docs
- **mcp-bun-docs**: skills-matrix-integration.ts, lib.ts
