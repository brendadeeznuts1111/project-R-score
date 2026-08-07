---
name: project-r-skill-maintenance
description: Create, tighten, and validate Project R Codex skills. Use for SKILL.md wording, agents/openai.yaml alignment, duplicate installed copies, broken references, or stale Bun guidance.
---

# Project R Skill Maintenance

## Workflow

1. Update an existing repository skill when it owns the request; create a new
   skill only when no current owner fits.
2. Treat `/Users/nolarose/Projects/.agents/skills` as Project R authority.
   Compare any `/Users/nolarose/.codex/skills` copy, but synchronize it only
   after the repository version validates.
3. Keep frontmatter to supported keys and make `description` state capability
   plus trigger. Put runnable detail in the body or a focused reference.
4. Keep the body operational: start condition, ownership boundary, ordered
   workflow, proof, and guardrails. Remove repeated background prose and stale
   examples.
5. Align `agents/openai.yaml` with a short display name, one-line description,
   and action-oriented default prompt.
6. Register a new skill in `ast-grep/skill-loop-registry.json` with enabled
   `doctor` and `rate` phases. Add `precommit` only when the skill owns that
   command.

## Grounding rules

- For Bun behavior, check `dx version`, the active command's `--help`, and the
  current official docs. The installed CLI is the executable contract.
- Repository scripts and the owning command map outrank copied command snippets.
- Remove obsolete translations. Bun has no `bun test --runInBand`;
  `--parallel` implies `--isolate`; Node test worker IDs are not `bun:test`
  allocation APIs.
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

Report the authoritative files changed, wording or behavior removed, focused
proof, and whether an installed copy was synchronized.

## Guardrails

- Use lowercase hyphenated names.
- Do not add README or changelog files for a skill unless requested.
- Do not delete user-authored guidance unless it is obsolete, duplicated, or
  conflicts with a verified contract.
- Never encode model branding, co-author trailers, publishing, or upload as a
  mandatory skill action.
