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
2. Treat `/Users/nolarose/Projects/.agents/skills` as Project R authority.
   Compare any `/Users/nolarose/.codex/skills` copy, but synchronize it only
   after the repository version validates. Treat `~/.codex/AGENTS.md` as
   optional machine routing, not the Project R SSOT: it must not copy generated
   release data or override repository policy.
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
7. Run installed parity only on the operator machine. The repository contract
   remains portable; `--installed` compares every package file and rejects
   missing, changed, or stale files under `~/.codex/skills`.

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
bun run agents:contract:check
bun run agents:contract:check -- --installed
```

When validation or hook behavior changes, also run:

```bash
bun test tests/agent-skills-validation.test.ts tests/pre-commit-runner.test.ts
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
