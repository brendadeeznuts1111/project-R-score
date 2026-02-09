#!/usr/bin/env bash
# --cpu-prof-interval and --cpu-prof-md flags
# Features #23-24 — PR #26620 — New in Bun 1.3.9
#
# Configurable sampling interval for CPU profiling (default: 1000us).
# --cpu-prof-md outputs markdown tables (LLM-friendly).

# Profile with 500us sampling interval
bun run --cpu-prof --cpu-prof-interval=500 app.ts

# Markdown output (LLM-friendly)
bun run --cpu-prof-md --cpu-prof-interval=500 app.ts

# Example markdown output:
# | Self% | Function    | Location                    |
# |------:|-------------|:----------------------------|
# | 93.4% | `fibonacci` | `test-cpu-prof.ts:6`        |
# |  1.8% | `link`      | `[native code]`             |
