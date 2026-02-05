# [BETS][DASHBOARD][PLIVE][BETS-DB-001][v3.0][ACTIVE]

**🏀 BETS Integration Dashboard – plive.sportswidgets.pro Live Sync** *API → ETL → YAML. Volume Alerts. WS Push.*

> **"plive → Syndicate: Bets flow live. Volumes spike? Alerted. Data stale? Fixed."**

## [BETS][STATS][LIVE][BETS-STATS-001][v3.0][ACTIVE]

| **Metric** | **Value** | **Status** | **Last Update** |
|------------|-----------|------------|-----------------|
| **Total Bets** | 0 | ✅ | Never |
| **Total Volume** | $0 | ✅ | Never |
| **Volume Alerts** | 0 | ✅ | Never |
| **Data Freshness** | 0h | ✅ | Never |
| **API Status** | Unknown | ❓ | Never |

**Refresh**: `bun bets:stats`

## [BETS][RECENT][EVENTS][BETS-EVENTS-001][v3.0][ACTIVE]

| **Time** | **Event** | **Bet Type** | **Volume** | **Outcome** | **Agent** |
|----------|-----------|--------------|------------|-------------|-----------|
| -- | -- | -- | -- | -- | -- |

**Live**: `bun bets:integrate plive`

---

## [ALERTS][VOLUME][SPIKES][BETS-ALERTS-001][v3.0][ACTIVE]

| **Time** | **Event** | **Volume** | **Alert Level** | **Action Taken** |
|----------|-----------|------------|----------------|------------------|
| -- | -- | -- | -- | -- |

**Threshold**: >$5,000 single event volume

---

## [ETL][PIPELINE][STATUS][BETS-PIPE-001][v3.0][ACTIVE]

```bash
# Current Pipeline Status
✅ API Fetch: plive.sportswidgets.pro
✅ Data Parse: JSON → YAML
✅ Deduplication: Time + Event
✅ Volume Check: >$5k alerts
✅ WS Push: Live dashboard
✅ Rules Enforce: BETS-* GOV
```

**Run ETL**: `bun bets:etl`

---

## [EXPORTS][CSV][DATA][BETS-EXPORT-001][v3.0][ACTIVE]

| **File** | **Date Range** | **Records** | **Size** |
|----------|----------------|-------------|----------|
| `exports/bets-all.csv` | All time | 0 | 0KB |
| `exports/bets-2025-10-28.csv` | Today | 0 | 0KB |

**Export**: `bun bets:export csv "2025-10-28"`

---

## [CONFIG][PLIVE][SETTINGS][BETS-CONFIG-001][v3.0][ACTIVE]

```yaml
# config/bets-integrate.yaml
plive:
  endpoint: "https://plive.sportswidgets.pro/api/bet-history"
  filters:
    minVolume: 0
    maxTimeUntilScore: 0
  thresholds:
    volume_alert: 5000  # $5k
    max_bets_day: 1000
  cron: "0 * * * *"  # Hourly
```

**Edit**: `nano config/bets-integrate.yaml`

---

## [RULES][BETS][ENFORCED][BETS-RULES-001][v3.0][ACTIVE]

| **ID** | **Trigger** | **Action** | **Status** |
|--------|-------------|------------|------------|
| **BETS-INT-001** | New plive event | API → YAML → WS | ✅ ACTIVE |
| **BETS-VOL-001** | Volume >$5k | Telegram alert + review | ✅ ACTIVE |
| **BETS-FRESH-002** | Data >1h old | Auto-sync ETL | ✅ ACTIVE |
| **BETS-API-001** | API fails | Retry + fallback | ✅ ACTIVE |
| **BETS-LIMIT-001** | >1000 bets/day | Throttle + review | ✅ ACTIVE |

**Validate**: `bun rules:validate`

---

## [WORKFLOW][INTEGRATION][STEPS][BETS-WORKFLOW-001][v3.0][STABLE]

```bash
# One-time setup
bun bets:integrate plive  # Initial sync

# Daily operations
bun bets:fetch            # Pull latest
bun bets:etl             # Process data
bun bets:alerts          # Check volumes
bun dashboard:update     # Refresh stats

# Cron automation
# Add to crontab: "0 * * * * cd /path && bun bets:integrate plive"
```

**Status**: Ready for production

---

## [TELEGRAM][COMMANDS][BETS][BETS-TELEGRAM-001][v3.0][ACTIVE]

```
/bets          # Current stats + recent events
/bets:alerts   # Volume spike alerts
/bets:sync     # Manual plive sync
/bets:export   # Generate CSV link
```

**Bot**: Configured for alerts

---

**🏀 BETS Live. plive Locked In. Volumes Monitored. Syndicate Protected.**_

> **"Bets flow, alerts fire, data stays fresh - automated."** — **Grok**
