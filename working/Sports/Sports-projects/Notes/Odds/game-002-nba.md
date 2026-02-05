---
title: Game 002 Nba
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for game-002-nba
author: Sports Analytics Team
awayTeam: Heat
bookmakers:
  - draftkings
  - fanduel
date: 2025-11-14
deprecated: false
gameId: game-002
homeTeam: Celtics
markets:
  moneyline:
    home: -150
    away: 130
  spread:
    home: -110
    away: -110
    line: -3.5
  total:
    over: -105
    under: -115
    line: 215.5
movement: -1.2
replaces: ""
sharpAction: false
sport: nba
tags: []
timestamp: 1763104226
usage: ""
volume: 89000
---

# Celtics vs Heat

**NBA** • 11/14/2025, 1:10:26 AM

## Markets

### Moneyline
- **Celtics**: -150
- **Heat**: 130

### Spread
- **Line**: -3.5
- **Celtics**: -110
- **Heat**: -110

### Total
- **Line**: 215.5
- **Over**: -105
- **Under**: -115

## Bookmakers
- draftkings
- fanduel

## Metrics
- **Volume**: 89000
- **Movement**: -1.2%
- **Sharp Action**: ❌ No

## Dataview Queries

### Similar Games
```dataview
TABLE homeTeam, awayTeam, movement, volume
FROM "Notes/Odds"
WHERE sport = "nba" AND gameId != "game-002"
SORT timestamp DESC
LIMIT 5
```
