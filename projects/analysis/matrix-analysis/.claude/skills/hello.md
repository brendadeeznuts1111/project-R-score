---
name: hello
description: "This skill should be used when the user asks to \"test hot-reload\", \"demo skill loading\", or wants to verify skill functionality."
user-invocable: true
---

# Hello Hot-Reload Skill

This is a test skill to demonstrate the hot-reload feature in Claude Code 2.1.x.

You can edit this file and the changes will be available immediately without restarting Claude.

## What this does:
- Greets the user
- Shows real-time performance benchmarks
- Tracks edit history
- Demonstrates skill hot-reload

## Benchmark Metrics

The skill tracks these metrics to demonstrate hot-reload effectiveness:

```typescript
if (typeof Bun !== "undefined") {
  Bun.inspect.table([
    { Metric: "Load Time", Description: "Time to load skill content", Target: "< 10ms" },
    { Metric: "Parse Time", Description: "Time to parse frontmatter", Target: "< 5ms" },
    { Metric: "Version", Description: "Track edits for hot-reload", Target: "Auto-increment" },
  ]);
}
```

---

Hello! This is the **hello** skill with live benchmarks.

**Version:** 3.0.0
**Last Modified:** 2026-01-09
**Feature:** Performance benchmarks and metrics tracking

Edit this file to see hot-reload in action. Changes appear instantly without restarting Claude.
