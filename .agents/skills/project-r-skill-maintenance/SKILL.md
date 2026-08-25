---
name: project-r-skill-maintenance
description: >
  Create, tighten, and validate Project R Codex skills. Use for SKILL.md
  wording, agents/openai.yaml alignment, duplicated guidance, broken references,
  or stale Bun guidance.
---

# Project R Skill Maintenance

## Workflow

1. Update an existing repository skill when it owns the request; create a new
   skill only when no current owner fits.
2. Treat `.agents/skills` in the owning Project R checkout as the only Project R
   skill authority. Do not create installed copies under `~/.codex/skills`;
   workspace discovery loads the repository packages directly.
3. Keep frontmatter to supported keys and make `description` state capability
   plus trigger. Put runnable detail in the body or a focused reference.
4. Keep the body operational: start condition, ownership boundary, ordered
   workflow, proof, and guardrails. Remove repeated background prose and stale
   examples.
5. Align `agents/openai.yaml` with a short display name, one-line description,
   and action-oriented default prompt.
6. Register a new skill in `.agents/skills/ast-grep/skill-loop-registry.json`
   with enabled `doctor` and `rate` phases. Add `precommit` only when the skill
   owns that command.
7. Replace repeated multi-command audit recipes with one owner command when the
   repository already has the machinery. A versioned audit must fail for new
   findings and stale expected findings; keep every expected finding explicit,
   reviewed, and tested. Never add an automatic allowlist-update mode.

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
- When a skill mentions Bun 1.4, link to
  [`BUN_1_4_MIGRATION.md`](../../../docs/BUN_1_4_MIGRATION.md),
  [`BUN_1_4_CHANNEL_LIFECYCLE.md`](../../../docs/BUN_1_4_CHANNEL_LIFECYCLE.md),
  and the
  [versioned capability registry](../../../public/registry/bun-1.4-capabilities.json)
  instead of copying capability lists. The release blog owns announced facts;
  the breaking-change tracker's merged section owns reconciled behavior; its
  **Under consideration** section did not ship; the capability registry owns
  local adoption state; executable contracts own proof. Preserve the registry's
  adoption semantics: release coverage is not local use,
  `candidate`/`upstream-claim` carry no contracts, and `integrated`/`contract`
  require executable evidence.
- Preserve fail-closed validation for committed feeds, catalogs, overlays, and
  scrape state. Recovery is an explicit artifact repair or documented forced
  rebuild, not a silent default or synthesized metadata.
- Route Bun 1.4 syntax migration checks through the ast-grep package's
  `bun:1.4:migration:check` command. Do not copy its rule list or expected
  finding into another skill.
- Repository scripts and the owning command map outrank copied command snippets.
- Keep shell examples executable. `bun run <name>` must resolve in the package
  selected by the example's explicit `cd`; cross-skill paths must start at
  `.agents/skills/`.
- Remove obsolete translations. Bun has no `bun test --runInBand`; `--parallel`
  implies `--isolate`; Node test worker IDs are not `bun:test` allocation APIs.
- Root Project R uses pinned ESLint and Prettier. Keep Oxlint only inside a
  standalone nested product with its own explicit pin.
- Link shared staged-gate or loop behavior through
  [`agent-tooling.md`](../references/agent-tooling.md) instead of copying it.

## Proof

Run:

```bash
bun run skills:validate
```

When validation or hook behavior changes, also run:

```bash
bun test tests/agent-skills-validation.test.ts tests/pre-commit-runner.test.ts
```

Report the authoritative files changed, wording or behavior removed, and focused
proof. Do not synchronize repository skills into a global skill directory.

## Guardrails

- Use lowercase hyphenated names.
- Do not add README or changelog files for a skill unless requested.
- Do not delete user-authored guidance unless it is obsolete, duplicated, or
  conflicts with a verified contract.
- Never encode model branding, co-author trailers, publishing, or upload as a
  mandatory skill action.
