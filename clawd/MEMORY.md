# Memory

## Key Facts
- Uses OpenRouter for AI models
- Telegram bot: @mikehuntbot_bot
- Clawdbot gateway on port 18789
- Primary model: MiniMax M2.1

## Project Context
- ~/Projects contains 15+ Bun projects
- scripts/ folder has CLI tools (deep-app-cli, config-manager, secrets-migrate, hyper-matrix)
- Uses Bun.secrets for credential management
- Einstein similarity algorithm for code duplicate detection

## Technical Stack
- Bun runtime (not Node)
- TypeScript strict mode
- SQLite via bun:sqlite
- Bun.serve() for HTTP servers
- Bun.spawn/$`` for shell commands

## Recent Work
- Optimized CLI tools with shared utilities
- Created secrets migration tool
- Set up Clawdbot with Telegram integration
