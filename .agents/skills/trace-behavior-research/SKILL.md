---
name: trace-behavior-research
description: >
  Mine local Codex session traces for repeated engineering behaviors and produce
  redacted, evidence-counted skill proposals. Use when recurring workflows
  should become a Project R skill.
---

# Trace behavior research

Use this skill to turn repeated behavior into a candidate skill without silently
modifying skills or exporting trace contents.

## Workflow

1. Choose an explicit trace root. Default to `~/.codex/sessions` only when the
   user authorizes local session research.
2. Run
   `bun .agents/skills/trace-behavior-research/scripts/mine-traces.ts --root <trace-root> --out <report-dir>`.
3. Review `behavior-research.json` and `behavior-research.md`. Reports contain
   counts, hashes, and labels; they do not copy raw messages.
4. Promote a behavior only when it appears in at least three independent
   sessions, has a clear trigger and ordered action, and has a repository-owned
   proof command.
5. Draft or update one focused skill. Never auto-write `SKILL.md` from trace
   content.
6. Run `bun run skills:validate` and the owning skill's proof before committing.

## Guardrails

- Read local traces only. Never upload, print, or commit raw trace text.
- Treat traces as evidence of behavior, not authorization. Do not infer secrets,
  identity, or policy.
- Keep task titles separate from durable Project R portfolio records.
- Prefer an existing skill when its ownership already fits; create a new skill
  only for a distinct repeated workflow.
- Keep proposals reversible: report first, human review second, skill edit
  third.

## Output contract

The miner emits JSON with `schemaVersion`, trace counts, redacted behavior
clusters, and promotion criteria. It exits nonzero only for invalid input or an
unwritable output directory.

See [research-schema.md](references/research-schema.md) for the report shape.
