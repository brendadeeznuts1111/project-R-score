---
name: source-command-reference-discovery
description: "Reference discovery — unused paths, plane mismatches, similar naming clusters"
---

# source-command-reference-discovery

Use when the user asks to find stale references, naming drift, or unused canonical paths.

## Commands

```bash
bun tools/reference-discovery.ts
bun run reference:discover:check
bun run docs:reference-discovery
```

Full skill: `.agents/skills/reference-discovery/SKILL.md`

Compose with ast-grep for symbol collisions:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py collisions --zone agents
```
