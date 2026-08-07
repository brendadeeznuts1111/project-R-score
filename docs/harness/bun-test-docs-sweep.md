# Bun-test docs/snapshot sweep — leaf-agent fanout

**Created:** 2026-08-07\
**Parent goal:** Wire `bun-test-flags` / `bun-test-inspect` into wiki, hubs,
CONTRIBUTING, capability-map bake + snapshots after #590/#589.\
**Orchestrator:** one parent; spawn **general-purpose** leaf agents with the
spawn prompts below; integrate on `cursor/bun-test-docs-sweep-294c`.\
**Machine catalog:** [`bun-test-docs-sweep.json`](./bun-test-docs-sweep.json).

## Status legend

| Status | Meaning |
| ------ | ------- |
| **DONE** | Merged or landed on sweep branch |
| **READY** | Spec clear; safe to spawn |
| **SERIAL** | Wait for dependency lane |

## Live anchors (re-probe before spawn)

```bash
bun run wiki:coverage:check
# Expect missing-tenant for bun-test-flags + bun-test-inspect until L1 lands
ls docs/harness/tenants/bun-test-flags.md docs/harness/tenants/bun-test-inspect.md
git -C "$(git rev-parse --show-toplevel)" log -1 --oneline origin/main
```

## Lane map

```text
WAVE 0 (parallel)                 WAVE 1 (after L3)
┌──────────────┐                  ┌────────────────────┐
│ L1 wiki      │                  │ L4 bake + snapshots│
└──────────────┘                  └────────────────────┘
┌──────────────┐
│ L2 hubs      │
└──────────────┘
┌──────────────┐
│ L3 cap map   │ ─────────────────► L4
└──────────────┘
```

| ID | Lane | Status | Depends | Owner globs |
| -- | ---- | ------ | ------- | ----------- |
| **L1** | Wiki coverage | DONE | — | `wiki-index.md` |
| **L2** | Human hubs | DONE | — | `README.md` · `docs/contributing/CONTRIBUTING.md` · `docs/harness/day-loop.md` |
| **L3** | Capability map SSOT | DONE | — | `docs/harness/capability-map.md` · `AGENTS.md` · `docs/harness/tenants/bun-test-flags.md` |
| **L4** | Bake + snapshots | DONE | L3 | `public/registry/capability-map-*.json` · capability-map snapshots |

## Global rules (every leaf)

1. **One lane’s files only.** Pathspec commits. Never sweep foreign dirty trees.
2. Branch: `cursor/bun-test-docs-sweep-294c` (or integrate into parent checkout).
3. **No Domain=partner** revival / domain-collision bake.
4. Do not change `test:ci` / bunfig behavior.
5. **Verify** every lane lists a green command; paste evidence in PR Claim table.

---

## L1 — Wiki coverage

| | |
| -- | -- |
| **Status** | READY |
| **Owns** | `wiki-index.md` |
| **Verify** | `bun run wiki:coverage:check` → 0 issues |

**Spawn prompt:** see JSON `lanes.L1.spawnPrompt`.

---

## L2 — Human hubs

| | |
| -- | -- |
| **Status** | READY |
| **Owns** | `README.md` · `docs/contributing/CONTRIBUTING.md` · `docs/harness/day-loop.md` |
| **Verify** | `rg -n "bun-test-flags\|bun-test-inspect\|test:inspect" README.md docs/contributing/CONTRIBUTING.md docs/harness/day-loop.md` |

---

## L3 — Capability map SSOT

| | |
| -- | -- |
| **Status** | READY |
| **Owns** | `docs/harness/capability-map.md` · `AGENTS.md` · `docs/harness/tenants/bun-test-flags.md` |
| **Verify** | Rows present for Inspector reporters + flags × scripts; do **not** bake |

---

## L4 — Bake + snapshots

| | |
| -- | -- |
| **Status** | SERIAL (after L3) |
| **Owns** | registry capability-map JSON + snapshots |
| **Verify** | `bun run bake:capabilities:check` · `bun test tests/capability-map-subset.test.ts` |

```bash
bun run bake:capabilities:update
bun run bake:capabilities:check
bun test tests/capability-map-subset.test.ts
```
