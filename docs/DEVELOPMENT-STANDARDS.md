# Development Standards — Quick Reference

> Full standards: [`.custom-instructions.md`](../.custom-instructions.md)  
> Agents / install / brands: [`AGENTS.md`](../AGENTS.md) · Layout: [`STRUCTURE.md`](../STRUCTURE.md) · Install: [`UNIFIED.md`](./UNIFIED.md)  
> Harness thesis: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering)

---

## Terminology

| Prefer | Avoid |
|--------|--------|
| **artifact** (delivered / maintained / proven thing) | “codebase” |
| **repository** / **source tree** (location) | “codebase” |
| **brand** / domain type | bare `string` for domain IDs |

Source is one replaceable realization of durable contracts. See [Stop Treating Code as the Artifact](https://hyperbo.la/w/code-is-not-the-artifact/).

---

## Core stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun |
| Language | TypeScript (ESM) |
| Package manager | Bun (`install:all` / `install:verify`) |
| Tests | Bun test |
| Lint / format | ESLint + Prettier |
| Domain IDs | Branded strings (`lib/types/branded.ts`) |

---

## Domain strings (harness) — mandatory

**Parse once at the boundary; internal APIs use brands, not bare `string`.** Agents may not add `sessionId: string` / `function f(userId: string)` — pre-commit `--staged --strict` has no baseline.

| Boundary | Constructor |
|----------|-------------|
| Wire / JSON / env | `parseXId(unknown)` |
| Optional config | `tryXId(...)` → `undefined` if blank |
| Trusted internal | `asXId(string)` |

```bash
bun tools/brand-catalog.ts
bun run check:brands:staged   # your diff (hook equivalent)
bun run check:brands
bun run check:brands:all
```

Map: [`lib/types/branded/README.md`](../lib/types/branded/README.md). Bare `string` is OK for non-domain text only.

---

## Enforced rules (eslint / harness)

| Don’t | Do |
|-------|-----|
| `console.log` | `console.info` / `warn` / `error` |
| `any` / `as any` | `unknown` + guards |
| bare `string` domain IDs | brands (`SessionId`, …) |
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

Root harness suites: [`tests/`](../tests/). Prefer Arrange → Act → Assert. Match proof to the claim; promote the same artifact CI validated.

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
- [ ] Domain IDs are branded (no new bare-string ID ports)
- [ ] Prose uses **artifact** / **repository**, not **codebase**, for agent-facing docs

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
| [harness-engineering](https://github.com/lopopolo/harness-engineering) | External thesis corpus |

*Keep this file in sync with `.custom-instructions.md` and `CANONICAL_REPO_DOCS` when conventions change.*
