---
name: audit-gap-close
description: >
  Close harness, tenant, and public-plane gaps with discovery, catalog, bake,
  test, and fresh-rerun evidence. Use after triage identifies an owned gap row
  or when repeated harness failures need a smallest reversible correction.
---

# Audit gap close

One closure workflow serves harness tenants and the public plane. A row closes
only when the owning artifact changes and its fresh proof passes.

## Start

1. Run `reference-discovery` in harness, public, or composed mode.
2. Verify the audit catalog before editing: `bun run audit:verify`.
3. Read the owning gap map under `docs/harness/tenants/`.
4. Record the failing claim, owning boundary, accepted outcome, and proof.
5. Apply the smallest reversible fix, then fresh-rerun the exact claim from
   `lib/harness/proof.ts`.

Public-plane work also requires:

```bash
bun run public:discover:check
bun run verify:portal:static
bun run check:routes
bun run public:audit:verify
```

Harness and tenant work uses:

```bash
bun run discover:compose:check
bun run audit:verify
bun tools/doc-map-check.ts
bun tools/bun-doc-refs.ts integrity
bun run ci:harness:fast
```

Run `ci:harness:fast` only when the harness, docs, or skill lane is owned.

## Harness feedback mode

When commit loops thrash or proof repeatedly misses the edited surface:

1. Capture the earliest failed handoff: context, capability, ownership,
   authority, proof, feedback, or worker limitation.
2. State a falsifiable intervention hypothesis.
3. Prefer a type, lint, skill, or doc-map correction over another wrapper.
4. Fresh-rerun and retain, revise, or remove the intervention based on output.
5. Record repeated tool or routing failures with
   `bun run ai -- friction record --tool <entrypoint> --code <stable-code> --path <target>`.
   Use `bun run harness:lesson --title="…"` only for a promoted,
   harness-specific operational lesson that cannot be eliminated in code.

Do not weaken a grader, skip hooks, close a row with prose alone, or sweep a
parallel lane. For public work, API behavior belongs in `functions/`, not a
static `public/` mutation.

Runbooks: [audit catalog](../../../docs/audit/README.md),
[public plane](../../../docs/harness/tenants/public-plane.md), and
[fresh rerun](../../../docs/harness/FRESH-RERUN.md). Shared mechanics:
[agent tooling](../references/agent-tooling.md).
