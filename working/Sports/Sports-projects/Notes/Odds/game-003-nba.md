---
title: Game 003 Nba
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for game-003-nba
author: Sports Analytics Team
awayTeam: Suns
bookmakers:
  - betmgm
  - caesars
date: 2025-11-14
deprecated: false
gameId: game-003
homeTeam: Nuggets
markets:
  moneyline:
    home: -120
    away: 100
  spread:
    home: -110
    away: -110
    line: -2.5
  total:
    over: -110
    under: -110
    line: 220
movement: 3.1
replaces: ""
sharpAction: true
sport: nba
tags: []
timestamp: 1763103926
usage: ""
volume: 156000
---

# Nuggets vs Suns

**NBA** • 11/14/2025, 1:05:26 AM

## Markets

### Moneyline
- **Nuggets**: -120
- **Suns**: 100

### Spread
- **Line**: -2.5
- **Nuggets**: -110
- **Suns**: -110

### Total
- **Line**: 220
- **Over**: -110
- **Under**: -110

## Bookmakers
- betmgm
- caesars

## Metrics
- **Volume**: 156000
- **Movement**: 3.1%
- **Sharp Action**: ✅ Yes

## Dataview Queries

### Similar Games
```dataview
TABLE homeTeam, awayTeam, movement, volume
FROM "Notes/Odds"
WHERE sport = "nba" AND gameId != "game-003"
SORT timestamp DESC
LIMIT 5
```
