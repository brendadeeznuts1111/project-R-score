---
title: Archive naming grammar
---

# Archive naming grammar — `<t>-<lane>-<slug>`

Reusable **filename / folder** grammar for human-facing archive artifacts in
this workspace. It is **not** a domain ID, brand, git-branch, or commit message
format.

**Consumers:** Reasonix session renames · local quarantine dumps · scratch notes
· other dated artifact folders under `artifacts/`.

**Session inventory:** [`session-organization.md`](session-organization.md)
(applies this grammar in the Rename target column).

## Grammar

```text
<t>-<lane>-<slug>[.<ext>]
```

| Token    | Shape                       | Rules                                                                                                             |
| -------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `<t>`    | `YYYYMMDD-HHMM`             | Minute precision from the artifact’s start/create time. Sortable; collision-free when starts differ by ≥1 minute. |
| `<lane>` | kebab from frozen set below | Exactly one lane token (may itself contain hyphens, e.g. `harness-infra`).                                        |
| `<slug>` | kebab, **topic only**       | 3–6 tokens. Must **not** repeat `<lane>`. No PR/issue numbers (cite those in prose). No spaces.                   |
| `<ext>`  | optional                    | `.jsonl` for Reasonix sessions; omit or use `.md` / dir name for notes/quarantine.                                |

### Short ref (citations)

For chat, PR bodies, and commit messages, prefer the compact form of `<t>`:

```text
YY-MMDD-HHMM
```

Example: `<t>` `20260806-1528` → short ref `26-0806-1528`.

Do **not** put the short ref in filenames — keep filenames on full `<t>`.

## Frozen lanes

Display form (tables) ↔ kebab form (filenames):

| Display (taxonomy) | Filename `<lane>` |
| ------------------ | ----------------- |
| harness/infra      | `harness-infra`   |
| partner            | `partner`         |
| portal/UI          | `portal-ui`       |
| concepts           | `concepts`        |
| tennis-hq          | `tennis-hq`       |
| git-ops / meta     | `git-ops-meta`    |
| docs               | `docs`            |
| bugfix             | `bugfix`          |
| empty / misc       | `empty-misc`      |

Add a lane only when a new durable workstream needs filterability — do not
invent per-file lanes.

## Where to use / not use

| Surface                                 | Use?      | Instead                                                                  |
| --------------------------------------- | --------- | ------------------------------------------------------------------------ |
| Reasonix session rename targets         | **Yes**   | —                                                                        |
| `artifacts/worktree-quarantine/…` holds | **Yes**   | date bucket + `<t>-<lane>-<slug>/`                                       |
| Scratch notes under `scratch/`          | **Yes**   | —                                                                        |
| Git branches                            | **No**    | `feat\|fix\|chore\|docs/<slug>` (optional `-YYYYMMDD` only on collision) |
| Git commits                             | **No**    | conventional `type(scope): …`                                            |
| Domain / branded IDs                    | **Never** | `lib/types/branded.ts` constructors                                      |
| Machine session keys                    | **No**    | Keep Reasonix full id as SSOT; rename target is display-only             |

## Examples

| Good                                                                      | Why                                       |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| `20260802-2351-partner-accounting-integration-bake.jsonl`                 | lane once; slug is topic                  |
| `20260806-1528-git-ops-meta-session-organization.jsonl`                   | meta lane; slug not repeating `git` noise |
| `artifacts/worktree-quarantine/20260806/20260806-1215-tennis-hq-desk-ui/` | quarantine dir                            |

| Bad                                                  | Why                                        |
| ---------------------------------------------------- | ------------------------------------------ |
| `…-partner-partner-limit-increase.jsonl`             | lane repeated in slug                      |
| `…-tennis-hq-tennis-hq-dx-pr-review.jsonl`           | lane repeated; PR# belongs in prose        |
| `feat/20260806-partner-limits` as _only_ branch name | wrong surface — branches stay conventional |

## Rename procedure (Reasonix)

Reasonix owns session files under
`~/.reasonix/projects/-Users-nolarose-Projects/sessions/`. There is no rename
CLI from chat. Outside a chat session:

1. Pick `<t>` / `<lane>` / `<slug>` from this grammar.
2. Rename the `*.jsonl` **and** sidecar files (`.meta`, `.events.jsonl`,
   `.goal-state.json`, …) together to the same stem.
3. Update [`session-organization.md`](session-organization.md) Rename target if
   the map still shows the old proposal.

## References

| Source                                                              | Role                                     |
| ------------------------------------------------------------------- | ---------------------------------------- |
| [`session-organization.md`](session-organization.md)                | Active session map applying this grammar |
| [`CANONICAL_DOCS.sessionOrganization`](../../lib/docs/repo-docs.ts) | Path SSOT key                            |
| [`STRUCTURE.md`](../../STRUCTURE.md)                                | Workspace map pointer                    |
| Conventional commits                                                | Git history — not this grammar           |
