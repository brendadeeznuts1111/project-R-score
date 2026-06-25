# Sports Terminal OS — Build Plan

## Overview
Build a comprehensive Sports Terminal OS integrating three domain layers:
1. **Core Terminal (v5.2)**: 93 proxy endpoints, 34 SQLite tables, 6-stage data pipeline, dual WebSocket/SSE
2. **Partner Profile OS**: TOML-backed profile templates, lifecycle state machine, multi-layer signal routing
3. **Telegram Hub**: Redis Streams, multi-process bot workers, topic-per-agent routing

## Architecture
- **Runtime**: Bun 1.0+ with bun:sqlite
- **Backend**: TypeScript, Bun.serve (single port: HTTP + WebSocket + SSE)
- **Frontend**: React 19 + Vite SPA
- **Database**: SQLite with 34+ tables (6 live data + 6 risk + 4 IP + 5 sandbox + 3 webhooks + 1 rules + 10 protected + 9 partner profile)
- **Queue**: Redis Streams for Telegram bot events
- **Upstream**: Buckeye (fantasy402.com:443)

## Stage 1 — Research & Design (Parallel)
**Skills**: All three user skills loaded for reference analysis
**Agents**:
- **System_Architect**: Analyze all reference docs, design the integrated system blueprint
- **Database_Architect**: Design unified schema covering all 34+ tables across all three domains
- **API_Designer**: Design the 93 proxy endpoints + partner profile APIs + Telegram hub APIs

## Stage 2 — Foundation (Sequential)
**Skills**: sports-terminal-v52-builder
**Agents**:
- **Foundation_Builder**: Create project scaffold, package.json, Bun.serve, base router, DB connection, migrations, MEMORY.md
- **Zone4_Builder**: Backend Ops — JWT middleware, metrics, idle shutdown, rate limiting, action queue

## Stage 3 — Core Terminal Zones (Sequential within, Parallel across)
**Skills**: sports-terminal-v52-builder
**Agents**:
- **Zone1_Builder**: Sportsbook Grid — book health, best line highlight, line movement arrows
- **Zone8_Builder**: Webhook Alerts — CRUD, dispatcher, retry logic, settings UI
- **Zone2_Builder**: Patterns Tab — pattern history, rules engine, simulated auto-trade
- **Zone3_Builder**: Prediction Markets — multi-provider, arbitrage detection

## Stage 4 — Domain Systems (Parallel)
**Skills**: sports-terminal-v52-builder + partner-profile-os
**Agents**:
- **Player_Domain_Builder**: Player 360, search, profile, transactions, flags, notes, links
- **Agent_Domain_Builder**: Agents, hierarchy, downline, sync, performance
- **Risk_Analytics_Builder**: Risk alerts, exposure, betting velocity, analytics
- **PartnerProfileOS_Builder**: Full partner profile system (11 files: schema, loader, materializer, service, gateway, router, cascade, integrations, hot-reload)

## Stage 5 — Operational Layer (Sequential)
**Skills**: telegram-hub-integrator + sports-terminal-v52-builder
**Agents**:
- **TelegramHub_Builder**: Redis Streams, queue publisher, bot workers, topic manager, API extensions, deployment
- **Ops_Features_Builder**: CSV exports, command center, streams, sandbox, webhooks

## Stage 6 — Frontend & Integration (Parallel)
**Skills**: sports-terminal-v52-builder
**Agents**:
- **Frontend_Builder**: React 19 + Vite SPA with all pages (API Ref, Customers, Agents, Telegram, AI Playground, Command Center, Architecture, Risk Flags, Live Ticker, OpenAPI, Deploy, Agent, Logs, Vault)
- **Integration_Builder**: Wire all domains together, WebSocket handlers, SSE endpoints, testing

## Stage 7 — Validation & Documentation
**Agents**:
- **Validation_Suite**: Run full validation, integration tests, performance benchmarks
- **Documentation_Builder**: API docs, deployment guides, operational runbooks

## Key Integration Points
1. **Partner Profile OS** feeds into: Signal routing, SOR gating, Telegram topic routing, Settlement calculations
2. **Telegram Hub** consumes from: Risk alerts, Payment events, Agent events, System events
3. **Core Terminal** provides: Auth (JWT), WebSocket/SSE infrastructure, base database, metrics

## Deliverables
- Complete TypeScript/Bun codebase
- SQLite migration files
- React 19 + Vite frontend
- TOML profile templates
- Redis Streams queue setup
- Bot worker processes
- Full test suite
- MEMORY.md for session continuity
