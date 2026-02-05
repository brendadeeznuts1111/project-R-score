---
title: API Integration
type: project-management
status: active
version: 0.1.0
created: 2025-11-14
updated: 2025-12-29
category: project-management
description: Sports data API integration (Sportradar, Odds API)
author: Sports Analytics Team
feed_integration: true
tags: ["api", "sportradar", "odds", "websocket"]
---

# API Integration

Sports data API connections for real-time game events and odds.

## Structure

```
api-integration/
├── src/
│   ├── index.ts              # Exports
│   ├── types.ts              # ApiConfig, GameEvent, OddsData
│   ├── config.ts             # API endpoints, credentials
│   ├── sportradar-client.ts  # WebSocket client
│   ├── odds-client.ts        # HTTP polling client
│   └── server.ts             # HTTP API routes
├── tests/
│   └── api-integration.test.ts
└── package.json
```

## Flow

```
Sportradar WS ──→ sportradar-client ──→ GameEvent
                         ↓
Odds API HTTP ──→ odds-client ──────→ OddsData
                         ↓
                   /api/games, /api/odds
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Connection status |
| GET | /api/games | List current games |
| GET | /api/games/:id | Get specific game |
| GET | /api/odds/:gameId | Get odds for game |

## Configuration

Environment variables:
- `SPORTRADAR_API_KEY` - Sportradar authentication
- `SPORTRADAR_URL` - WebSocket endpoint (default: `wss://api.sportradar.com`)
- `ODDS_API_KEY` - Odds API authentication
- `ODDS_URL` - HTTP endpoint (default: `https://api.odds.com`)

## Sports Coverage

- NBA (National Basketball Association)
- WNBA (Women's National Basketball Association)

## Commands

```bash
bun dev    # Watch mode
bun start  # Run server
bun test   # Run tests
```

## Related

- [[01-Configuration/Sports Config|Sports Configuration]]
- [[05-Projects/sports-analytics/README|Sports Analytics]]
