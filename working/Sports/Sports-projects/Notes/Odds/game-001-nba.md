---
title: Game 001 Nba
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for game-001-nba
author: Sports Analytics Team
awayTeam: Warriors
bookmakers:
  - draftkings
  - fanduel
  - betmgm
date: 2025-11-14
deprecated: false
gameId: game-001
homeTeam: Lakers
markets:
  moneyline:
    home: -110
    away: -110
  spread:
    home: -110
    away: -110
    line: -5.5
  total:
    over: -110
    under: -110
    line: 225.5
movement: 2.5
replaces: ""
sharpAction: true
sport: nba
tags: []
timestamp: 1763104526
usage: ""
volume: 125000
---

# Lakers vs Warriors

**NBA** • 11/14/2025, 1:15:26 AM

## Markets

### Moneyline
- **Lakers**: -110
- **Warriors**: -110

### Spread
- **Line**: -5.5
- **Lakers**: -110
- **Warriors**: -110

### Total
- **Line**: 225.5
- **Over**: -110
- **Under**: -110

## Bookmakers
- draftkings
- fanduel
- betmgm

## Metrics
- **Volume**: 125000
- **Movement**: 2.5%
- **Sharp Action**: ✅ Yes

## Dataview Queries

### Similar Games
```dataview
TABLE homeTeam, awayTeam, movement, volume
FROM "Notes/Odds"
WHERE sport = "nba" AND gameId != "game-001"
SORT timestamp DESC
LIMIT 5
```
