---
name: bun-v139-playground
description: |
  Bun v1.3.9 Interactive Playground with 26 demos covering governance, process, 
  networking, testing, and performance features. Uses Bun native signal handling,
  MCP protocol bridge, and dynamic protocol scorecards.
  
  Use when: testing Bun v1.3.9 features, running demos, benchmarking,
  or validating governance decisions.
triggers: ["bun", "v1.3.9", "playground", "demo", "governance", "signal"]
---

# Bun v1.3.9 Playground

Interactive playground for Bun v1.3.9 features.

## Quick Start

```bash
# Start playground
cd scratch/bun-v1.3.9-examples/playground-web
PORT=3011 bun run server.ts

# Access
open http://localhost:3011
```

## Key Features

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Governance | `/api/control/governance-status` | Decision validation |
| Demos | `/api/demos` | 26 interactive demos |
| Run Demo | `/api/run/:id` | Execute specific demo |
| Protocol | `/api/control/protocol-scorecard` | Dynamic recommendations |

## Process Demos (6)

- process-basics
- signals-demo
- spawn-demo
- stdin-demo
- argv-demo
- ctrl-c-demo

## Bun Native

All demos use Bun native APIs:
- `Bun.spawn()` - Process management
- `process.on('SIGINT')` - Signal handling
- `Bun.argv` - CLI arguments
- `Bun.stdin` - Stream input

## Location

`scratch/bun-v1.3.9-examples/playground-web/`
