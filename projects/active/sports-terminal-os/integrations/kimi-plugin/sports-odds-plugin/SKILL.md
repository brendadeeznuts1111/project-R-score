---
name: sports-odds
description: Query live sports betting odds, scores, handle, and risk positions from Fantasy402/Buckeye PPH proxy
scope: user
---

# Sports Odds Plugin

## Risk Color Legend (Bloomberg Terminal Theme)
| Emoji | Exposure | Hex | Action |
|-------|----------|-----|--------|
| 🔴 | >$100K | `#ff4500` | Immediate — lay off or suspend |
| 🟠 | >$50K | `#ff8c00` | Warning — monitor closely |
| 🟡 | >$10K | `#ffd700` | Caution — review limits |
| 🟢 | <$10K | `#00ff7f` | Normal |

## Usage Examples

### Odds
```
"What's the NFL moneyline for tonight?"
"Show me NBA spreads for Game 3"
"Get Premier League totals"
```

### Scores
```
"Live NBA scores"
"NFL scores from yesterday"
"Completed NCAAF games"
```

### Handle
```
"Handle on tonight's NBA games"
"Total ticket count for NFL week 1"
"Money split on Lakers vs Warriors"
```

### Positions
```
"Show my risk positions"
"Sharp flags in NFL"
"Limit breaches today"
"Positions by sport"
```

## Parameters
All tools accept JSON parameters via stdin. Kimi auto-maps natural language to these fields.

| Tool | Required | Optional |
|------|----------|----------|
| `get_odds` | `sport` | `league`, `game_id`, `market` |
| `get_scores` | `sport` | `status`, `date` |
| `get_handle` | — | `sport`, `game_id`, `period` |
| `get_positions` | — | `view`, `sport` |

## Response Format
All tools return JSON to stdout:
```json
{
  "content": "Markdown formatted table...",
  "metadata": { "count": 5, "sport": "NFL" }
}
```

## Credential Setup
1. Install plugin: `kimi plugin install https://github.com/yourrepo/sports-odds-plugin.git`
2. Kimi auto-injects `api_key` and `base_url` into `config.json`
3. Or set env vars: `F402_API_KEY`, `F402_ENDPOINT`
