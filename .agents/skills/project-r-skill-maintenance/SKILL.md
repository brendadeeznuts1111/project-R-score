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
- Add only task-relevant workflow guidance.
- Avoid extra docs files (`README.md`, changelog files) unless explicitly requested.
3. Sync `agents/openai.yaml`.
- Ensure `display_name`, `short_description`, and `default_prompt` match the new skill scope.
- Keep user-facing wording short and action-oriented.
4. Validate structure.
- Ensure folder includes required `SKILL.md`.
- Ensure references in `SKILL.md` point to real files.
- Ensure no broken paths under `scripts/`, `references/`, or `assets/`.
5. Run update checklist.
- Frontmatter valid and trigger description reflects actual use cases.
- `agents/openai.yaml` is consistent with `SKILL.md`.
- Scope creep check passed (no unrelated workflow sections added).
- Changed files listed for reviewer.
6. Verify and report.
- Show changed files.
- Summarize what behavior changed and why.

## Guardrails
- Use lowercase hyphenated skill names.
- Keep SKILL body compact; use references for large details.
- Do not add global workflow noise unrelated to the target skill.
- Never remove existing user-authored skill content unless it is clearly obsolete or conflicting.
