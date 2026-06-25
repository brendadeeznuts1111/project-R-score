---
name: "source-command-workflow"
description: "Run ast-grep workflow loop with semver/network scanners and effect plugins"
---

# source-command-workflow

Use this skill when the user asks to run the migrated source command `workflow`.

## Command Template

Start or plan the continuous security workflow loop (semver + network scanners, drift detection, effect handlers).

## Plan (dry-run)

```bash
cd .agents/skills/ast-grep
bun run workflow:plan
bun scripts/skill-loop-cli.ts workflow \
  --domain sports-terminal-os \
  --scan-path projects/active/sports-terminal-os/dist/frontend \
  --dry-run --explain
```

## Run

```bash
cd .agents/skills/ast-grep
bun run workflow:start
bun run workflow:start:alert    # seed + fail-on-drift
bun run workflow:effects        # custom plugins from effects/
```

## Effect plugins

```bash
bun scripts/workflow-cli.ts start \
  --domain sports-terminal-os \
  --scan-path projects/active/sports-terminal-os/dist/frontend \
  --effect alert.url=https://hooks.slack.com/... \
  --effect fix \
  --effect report.path=reports/workflow-latest.md \
  --effects-dir .agents/skills/ast-grep/effects \
  --effect custom
```

TLS for webhooks: `--tls-ca`, `--tls-cert`, `--tls-key`

Bun runtime baseline: `--bun-seed-write` (drift in `workflow-runtime.json`)

## MCP

Call `ast_grep_workflow` or `ast_grep_skill_loop` with `action: workflow`.

Shared reference: `.agents/skills/references/agent-tooling.md`
