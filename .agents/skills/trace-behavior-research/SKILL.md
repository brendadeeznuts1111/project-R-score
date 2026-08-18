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
   Add `--since <date>` for a bounded window. The per-file cache skips unchanged
   traces on later runs.
3. Review the JSON, Markdown, HTML, or summary artifact selected with `--format`
   or `--out <format>`. Reports contain redacted samples and evidence hashes;
   they never contain unredacted messages.
4. When the trace producer emits the documented telemetry events, review the
   skill-impact and ranked-skill sections. The miner stores these locally in a
   native SQLite registry. Use `--no-registry` when persistence is unwanted.
5. Promote a behavior only when it appears in at least three independent
   sessions, has a clear trigger and ordered action, and has a repository-owned
   proof command.
6. Use `--draft-skills` only when review-only stubs are useful. Drafts use the
   `.draft.md` suffix, default below the report directory, and never overwrite
   or activate a `SKILL.md` package.
7. Run `bun run skills:validate` and the owning skill's proof before committing.
8. Run `bun scripts/validate-drafts.ts --draft-dir <draft-dir>` before asking
   for promotion. This validates frontmatter and optional code blocks with Bun's
   native transpiler.
9. Use `bun scripts/review-server.ts --report-dir <report-dir>` for a local
   review page. It records approve/reject decisions but never promotes a skill.
10. Use `bun scripts/archive-report.ts --report-dir <report-dir>` to create a
    gzip report snapshot. Use `bun scripts/sidecar.ts --root <report-dir>` to
    stream report changes over a local WebSocket.

## Guardrails

- Read local traces only. Never upload, print, or commit raw trace text.
- Treat traces as evidence of behavior, not authorization. Do not infer secrets,
  identity, or policy.
- Keep task titles separate from durable Project R portfolio records.
- Prefer an existing skill when its ownership already fits; create a new skill
  only for a distinct repeated workflow.
- Keep proposals reversible: report first, human review second, skill edit
  third.
- Do not add auto-approval. Promotion always uses skill-creator and repository
  validation.
- Do not infer effectiveness from message text. Only explicit, aggregate
  telemetry events may update effectiveness metrics.
- Do not inject ranked skills into prompts automatically. Ranking is evidence
  for a human or an owning runtime to review.
- Use `node:fs.watch()` for file events. Bun 1.3.14 does not expose `Bun.watch`.
- Treat `Bun.hash` as a trigger prefilter only. Always perform exact matching
  before selecting a skill.

## Output contract

The miner emits versioned reports with trace counts, incremental cache metrics,
redacted evidence, confidence, promotion criteria, and trend deltas. It stores
history below the selected output directory unless `--history-dir` overrides
that location.

See [research-schema.md](references/research-schema.md) for the report and
opt-in telemetry contracts.
