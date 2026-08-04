---
name: project-r-skill-maintenance
description: Create, update, and validate Codex skills under /Users/nolarose/.codex/skills and /Users/nolarose/Projects/.agents/skills. Use when maintaining SKILL.md content, aligning agents/openai.yaml metadata, or tightening trigger/workflow quality.
---

# Project R Skill Maintenance

## Overview
Use this workflow when a user asks to create or update a skill.
Keep edits minimal, deterministic, and aligned between `SKILL.md` and `agents/openai.yaml`.

## Workflow
1. Identify target skill path and intent.
- Confirm whether this is an update to an existing skill or creation of a new one.
- Default behavior: update an existing skill first; only create a new skill when no suitable existing skill matches.
2. Edit `SKILL.md`.
- Keep frontmatter valid and concise (`name`, `description`).
- Move triggers, flow types, versions, and execution policies into the description or body; Codex does not read custom frontmatter keys.
- Add only task-relevant workflow guidance.
- Link shared agent tooling when the skill touches commits, scans, or loops: [references/agent-tooling.md](../references/agent-tooling.md).
- Register new skills in `ast-grep/skill-loop-registry.json` with `doctor` + `rate` phases (add `precommit` only when the skill has `bun run precommit`).
- Avoid extra docs files (`README.md`, changelog files) unless explicitly requested.
3. Sync `agents/openai.yaml`.
- Ensure `display_name`, `short_description`, and `default_prompt` match the new skill scope.
- Keep user-facing wording short and action-oriented.
4. Validate structure.
- Ensure folder includes required `SKILL.md`.
- Ensure references in `SKILL.md` point to real files.
- Ensure no broken paths under `scripts/`, `references/`, or `assets/`.
5. Audit staleness before preserving advice.
- Compare duplicate skill names under `/Users/nolarose/.codex/skills` and `/Users/nolarose/Projects/.agents/skills`; choose and state the authority instead of letting copies drift.
- Treat `/Users/nolarose/Projects/.agents/skills` as the repository authority for Project R skills; synchronize an installed `/Users/nolarose/.codex/skills` copy only after the repository version validates.
- For Bun behavior, check `dx version`, the active command's `--help`, and current official Bun docs. Runtime evidence wins over cached examples.
- Remove or clearly deprecate incorrect translations rather than keeping them as runnable examples. Current examples: Bun has no `bun test --runInBand`; `t.workerId` / `NODE_TEST_WORKER_ID` belong to `node:test`, not `bun:test`.
- Retire runnable root Oxlint examples; Project R uses its pinned ESLint and Prettier entrypoints. Preserve Oxlint only in a nested standalone product that owns an explicit pin.
- Preserve historical/version-specific skills only when their version scope is explicit in the name and body.
6. Run update checklist.
- Frontmatter valid and trigger description reflects actual use cases.
- `agents/openai.yaml` is consistent with `SKILL.md`.
- Scope creep check passed (no unrelated workflow sections added).
- Changed files listed for reviewer.
7. Verify and report.
- Run `bun run skills:validate`; for validator or hook changes also run `bun test tests/agent-skills-validation.test.ts tests/pre-commit-runner.test.ts`.
- Show changed files.
- Summarize what behavior changed and why.

## Guardrails
- Use lowercase hyphenated skill names.
- Keep SKILL body compact; use references for large details.
- Do not add global workflow noise unrelated to the target skill.
- Never remove existing user-authored skill content unless it is clearly obsolete or conflicting.
- Do not encode tool branding, model names, or third-party co-author trailers as mandatory commit behavior.
