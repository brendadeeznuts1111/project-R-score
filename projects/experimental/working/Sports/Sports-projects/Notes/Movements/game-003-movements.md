---
title: Game 003 Movements
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for game-003-movements
author: Sports Analytics Team
deprecated: false
gameId: game-003
lastMovement: 1763103926
movementCount: 1
replaces: ""
sport: 3
tags: []
usage: ""
---

# Odds Movements: game-003

## Recent Movements


### SPREAD Movement

- **Old Value**: -5.6
- **New Value**: -2.5
- **Movement**: +3.1 (up)
- **Bookmaker**: unknown
- **Volume**: 156000
- **Time**: 11/14/2025, 1:05:26 AM


## Dataview Query: All Movements

```dataview
TABLE market, oldValue AS "Old", newValue AS "New", movement AS "Change", direction, bookmaker
FROM "Notes/Movements"
WHERE gameId = "game-003"
SORT timestamp DESC
```
