---
title: Game 001 Movements
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for game-001-movements
author: Sports Analytics Team
deprecated: false
gameId: game-001
lastMovement: 1763104526
movementCount: 1
replaces: ""
sport: 1
tags: []
usage: ""
---

# Odds Movements: game-001

## Recent Movements


### SPREAD Movement

- **Old Value**: -8
- **New Value**: -5.5
- **Movement**: +2.5 (up)
- **Bookmaker**: unknown
- **Volume**: 125000
- **Time**: 11/14/2025, 1:15:26 AM


## Dataview Query: All Movements

```dataview
TABLE market, oldValue AS "Old", newValue AS "New", movement AS "Change", direction, bookmaker
FROM "Notes/Movements"
WHERE gameId = "game-001"
SORT timestamp DESC
```
