---
title: HFT Freeze Predictor
type: project-management
status: active
version: 0.1.0
created: 2025-11-14
updated: 2025-12-29
category: project-management
description: High-frequency trading freeze prediction system
author: Sports Analytics Team
---

# HFT Freeze Predictor

Predicts freeze events in high-frequency trading systems.

## Structure

```text
hft-freeze-predictor/
├── src/
│   ├── index.ts      # Entry point, exports
│   ├── types.ts      # Config, FreezeEvent, Prediction
│   ├── predictor.ts  # Threshold comparison logic
│   ├── store.ts      # SQLite persistence
│   └── server.ts     # HTTP API routes
├── tests/
│   └── predictor.test.ts
└── package.json
```

## Flow

```text
MetricsSnapshot → predictor.predict() → Prediction
                       ↓
                  store.store()
                       ↓
              WebSocket broadcast
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Server health |
| GET | /api/hft/status | Current metrics & config |
| POST | /api/hft/ingest | Receive metrics snapshot |
| GET | /api/hft/events | Query historical events |
| WS | /api/hft/stream | Real-time predictions |

## Thresholds

| Metric | Threshold | Trigger |
|--------|-----------|---------|
| Velocity | 80 | Above |
| Latency | 100ms | Above |
| Sharpe Ratio | 0.5 | Below |

## Configuration

See [[01-Configuration/HFT Config|HFT Configuration]]

## Commands

```bash
bun dev    # Watch mode
bun start  # Run server
bun test   # Run tests
```
