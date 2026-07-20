# Development Standards — Quick Reference

> Full standards: [`.custom-instructions.md`](../.custom-instructions.md)  
> Agents / install / brands: [`AGENTS.md`](../AGENTS.md) · Layout: [`STRUCTURE.md`](../STRUCTURE.md) · Install: [`UNIFIED.md`](./UNIFIED.md)

---

## Core stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun |
| Language | TypeScript (ESM) |
| Package manager | Bun (`install:all` / `install:verify`) |
| Tests | Bun test |
| Lint / format | ESLint + Prettier |

---

## Enforced rules (eslint / harness)

| Don’t | Do |
|-------|-----|
| `console.log` | `console.info` / `warn` / `error` |
| `any` / `as any` | `unknown` + guards |
| `export default` | Named exports |
| `value!` | `?.` / defaults |
| Empty `catch` | Handle or rethrow |
| Hardcoded secrets | `config/ports.ts`, `config/r2-env.ts` |

```bash
bun run fix:console-log
bun run fix:scan-any-types
bun run fix:scan-default-exports
bun run fix:scan-non-null-assertions
```

---

## Everyday commands

```bash
bun run install:all
bun run install:verify
bun run validate:workspaces
bun run packages:list
bun run lint
bun run lint:harness
bun run format:core
bun run check:brands:all
bun run dev
bun test
```

---

## Brands & Bun docs

```bash
bun tools/brand-catalog.ts
bun run check:brands
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
```

- Brands: [`lib/types/branded/README.md`](../lib/types/branded/README.md)
- Console depth: [`lib/console-depth.ts`](../lib/console-depth.ts)

---

## Testing sketch

```typescript
describe("utility", () => {
  it("handles the happy path", () => {
    const input = "x";
    const result = utility(input);
    expect(result).toBe("y");
  });
});
```

Root harness suites: [`tests/`](../tests/). Prefer Arrange → Act → Assert.

---

## Security checklist

- [ ] Validate untrusted / wire input before use (`parse*` for brands)
- [ ] No `eval` / `Function` on untrusted data
- [ ] Errors do not leak secrets
- [ ] Deploy env via `config/r2-env.ts` / documented vars
- [ ] Prefer HTTPS for external calls

---

## Quality gates (before merge)

- [ ] Relevant tests pass (`bun test` / `test:affected`)
- [ ] No new TypeScript errors on touched surface
- [ ] ESLint / harness gates clean on staged paths
- [ ] Bun API usages have `// @see` refs when required
- [ ] Branded IDs used where domain IDs apply

---

## Doc map

| Doc | Role |
|-----|------|
| [`.custom-instructions.md`](../.custom-instructions.md) | Complete coding standards |
| [`AGENTS.md`](../AGENTS.md) | AI agent entrypoint |
| [`STRUCTURE.md`](../STRUCTURE.md) | Workspace map |
| [`README.md`](../README.md) | Human hub |
| [`IMPORT_BOUNDARIES.md`](./IMPORT_BOUNDARIES.md) | Package import rules |
| [`UNIFIED.md`](./UNIFIED.md) | Bun install policy |
| [`lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) | Path SSOT (`CANONICAL_REPO_DOCS`) |
| [`lib/types/branded/README.md`](../lib/types/branded/README.md) | Branded IDs |
| [`lib/console-depth.ts`](../lib/console-depth.ts) | Inspect depth |

*Keep this file in sync with `.custom-instructions.md` and `CANONICAL_REPO_DOCS` when conventions change.*
