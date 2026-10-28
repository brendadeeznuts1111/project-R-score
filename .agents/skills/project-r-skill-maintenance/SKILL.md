---
name: project-r-skill-maintenance
description: >
  Create, tighten, and validate Project R Codex skills. Use for SKILL.md
  wording, agents/openai.yaml alignment, duplicate installed copies, broken
  references, or stale Bun guidance.
---

# Project R Skill Maintenance

## Workflow

1. Update an existing repository skill when it owns the request; create a new
   skill only when no current owner fits.
2. Treat `.agents/skills` in the owning Project R checkout as authority. Compare
   any `~/.codex/skills` copy, but synchronize it only after the repository
   version validates. Treat `~/.codex/AGENTS.md` as optional machine routing,
   not the Project R SSOT: it must not copy generated release data or override
   repository policy.
3. Keep frontmatter to supported keys and make `description` state capability
   plus trigger. Put runnable detail in the body or a focused reference.
4. Keep the body operational: start condition, ownership boundary, ordered
   workflow, proof, and guardrails. Remove repeated background prose and stale
   examples. A skill is a focused trigger and decision boundary, not a generic
   controller. Name at most three primary executable entrypoints and link to
   shared authority instead of copying command catalogs or orchestration loops.
5. Align `agents/openai.yaml` with a short display name, one-line description,
   and action-oriented default prompt.
6. Record every active, deprecated, vendored, forked, and retired package in
   `.agents/skills/references/skill-governance.json`. Register a skill in
   `.agents/skills/ast-grep/skill-loop-registry.json` only when it owns a real
   executable phase; directory existence plus a computed rating is not proof.
   For every external package, pin the checked upstream revision and paths,
   verification date, and whether the local package is exact or adapted. Run the
   bounded remote provenance check when an external skill changes; do not put
   that network check in ordinary CI.
7. Run installed parity only on the operator machine. The repository contract
   remains portable; `--installed` compares every package file and rejects
   missing, changed, or stale files under `~/.codex/skills`.
8. Run `bun run skills:rate` for Bun-first static compliance findings and
   `bun run skills:rate:dynamic` for bounded live evidence. Never call a static
   compliance value a quality score or credit portfolio proof to an individual
   skill. The evidence registry is `config/skill-rating-evidence.json`; every
   runtime or contract proof must name its owning active skills. The scoring
   model, rules, and contextual exceptions live in
   `.agents/skills/references/bun-skill-rating.md`; do not turn a Node
   compatibility import into a penalty when no equivalent Bun API exists.
9. When the rating scheduler or its manifest changes, run
   `bun run skills:schedule:check` and the managed-process/skill-health tests.
   The spine daemon owns production in-process scheduling; do not register an
   additional OS job or run the standalone scheduler beside the spine.
10. When a skill changes XML, JSON5, JSONL, or other structured-data guidance,
    run `bun run data-formats:check`. Describe only operations proved by the
    active runtime and manifest; a namespace name or current docs page is not
    sufficient evidence. Update the ops skill's focused structured-data runbook
    and behavioral tests together when failure or promotion semantics change.
11. When skill use repeatedly requires manual searching, a hidden prerequisite,
    or the same workaround, record the stable failure with
    `bun run ai -- friction record`. Promote repeated observations by fixing the
    owning tool, route, or error contract; add skill prose only when judgment is
    the missing capability.

## Thread-portfolio boundary

When a skill or machine-alignment review also covers Codex task history, keep
the two concerns separate: task titles are navigation metadata, while the
Project R portfolio is the durable root-thread record. First inspect current
tasks with the Codex task list, then run `bun run threads:portfolio` to expose
catalog drift. Rename recent tasks from their evidenced purpose; do not infer
delivery state from a title. Add Project R root tasks to
`tools/codex-thread-portfolio.json` chronologically before claiming portfolio
verification is clean. Tasks outside the Project R workspace may be renamed for
clarity but must not be added to that catalog.

## Grounding rules

- For Bun behavior, check `bun --version`, `bun --revision`, the active
  command's `--help`, and the current official docs. The installed Bun CLI is
  the executable contract.
- For Bun API history, run `bun tools/bun-doc-refs.ts history <api> --json` and
  `bun run docs:provenance:check`. Require the exact official release version,
  canonical publication timestamp, and URL for every recorded event. Never use a
  nearby minor release, the active runtime, `verifiedOn`, or `lastUpdated` as an
  introduction date; retain `release-unknown` when official evidence is absent.
- Preserve fail-closed validation for committed feeds, catalogs, overlays, and
  scrape state. Recovery is an explicit artifact repair or documented forced
  rebuild, not a silent default or synthesized metadata.
- Keep structured-data guidance operation-specific. JSON5 owns `parse` and
  `stringify`; JSONL owns complete-input `parse` plus streaming `parseChunk` and
  has no stringify contract. JSONL negative proof must accept both thrown
  complete-input errors and the structured `parseChunk().error` result.
- Gate `Bun.XML` on Bun 1.4 or later and actual `parse`/`stringify`
  availability. Below that gate, a justified third-party parser is valid; never
  present a future native API as executable on the pinned runtime. Where a skill
  records performance, preserve raw `durationNs` from `Bun.nanoseconds()` and
  derive `durationMs = durationNs / 1_000_000` only for display.
- Repository scripts and the owning command map outrank copied command snippets.
- Let `bun run ai -- discover` find candidate skills and tools. It does not
  replace their source, grant authorization, or prove capability.
- Keep shell examples executable. `bun run <name>` must resolve in the package
  selected by the example's explicit `cd`; cross-skill paths must start at
  `.agents/skills/`.
- Remove obsolete translations. Bun has no `bun test --runInBand`; `--parallel`
  implies `--isolate`; Node test worker IDs are not `bun:test` allocation APIs.
- Root Project R uses pinned ESLint and Prettier. Keep Oxlint only inside a
  standalone nested product with its own explicit pin.
- Link shared staged-gate or loop behavior through
  [`agent-tooling.md`](../references/agent-tooling.md) instead of copying it.
- Deprecate before deleting: name the replacement and reason in the governance
  manifest, migrate direct consumers, remove the loop entry, then retire the
  package. Preserve a fork until its repository-specific behavior has an owned
  destination.

## Proof

Run:

```bash
bun run skills:validate
bun run skills:provenance:check
bun run skills:rate
bun run skills:rate:dynamic
bun run skills:schedule:check
bun run data-formats:check
bun run agents:contract:check
bun run agents:contract:check -- --installed
```

When validation or hook behavior changes, also run:

```bash
bun test tests/agent-skills-validation.test.ts tests/pre-commit-runner.test.ts
bun test tests/managed-process.test.ts tests/skill-health-scheduler.test.ts
```

Report the authoritative files changed, wording or behavior removed, focused
proof, and whether an installed copy was synchronized.

After repository proof passes, synchronize the complete changed skill package
(body, metadata, references, and scripts), run the installed contract check, and
report its exact package/file count. This is the machine-side alignment evidence
because it compares complete packages byte-for-byte. Update global routing only
when it conflicts with repository authority.

## Guardrails

- Use lowercase hyphenated names.
- Do not add README or changelog files for a skill unless requested.
- Do not delete user-authored guidance unless it is obsolete, duplicated, or
  conflicts with a verified contract.
- Never encode model branding, co-author trailers, publishing, or upload as a
  mandatory skill action.
