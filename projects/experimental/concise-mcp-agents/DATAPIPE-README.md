# 🚀 **SPORTSWIDGETS DATAPIPE** - Live Agent Reports

*[DATAPIPE][README][FULL][DP-README-001][v2.5][ACTIVE]*

**Pipeline → Obsidian. Agents ranked. Profits LIVE. Zero plugins.**

## 📋 **What It Does**

- ✅ **Fetches live betting data** from Sportswidgets API (`data.r.bets[]`)
- ✅ **Parses `result` (profit), `bet` (volume), `isWin` (winrate)**
- ✅ **🆕 Parses `betDetails` JSON → Player names + Odds!**
- ✅ **🆕🆕 FULL FIELDS: d/player, k/marketId, m/odds, sk/skill, cls/class, lim/limit**
- ✅ **Aggregates by `agent`** (50+ agents from 1000+ bets)
- ✅ **Generates MD tables** in your Obsidian vault
- ✅ **🆕 12-column full bet tables with ALL fields**
- ✅ **Live Dataview dashboards** with auto-refresh
- ✅ **Telegram alerts** for high performers
- ✅ **7-day rolling reports** with dynamic dates
- ✅ **Governance rules** (PR-gated)

## 🛠️ **Quick Setup (5 minutes)**

### 1. **Get Your API Credentials**

```bash
# Open Chrome → Your Sportswidgets Dashboard
# Press F12 → Network tab → Refresh page
# Find POST to ajax.php → Right-click → "Copy as cURL"
# Extract the cookie from the cURL command
```

### 2. **Configure Environment**

```bash
# Copy the example
cp datapipe-env.example .env

# Edit .env - paste your cookie between the quotes
# DATAPIPE_COOKIE="your_full_cookie_string_here"
```

### 3. **Test Connection**

```bash
# See raw API response
bun run datapipe:raw

# If you get JSON data, it's working!
```

### 4. **Generate First Report**

```bash
# Fetch & save to Obsidian
bun run datapipe:fetch

# Check: dashboards/agent-reports.md
```

### 5. **Setup Live Dashboard**

```bash
# The dashboard file is already created:
# dashboards/datapipe-live.md

# Open it in Obsidian - it has auto-refresh!
```

## 🎯 **Available Commands**

| Command | Description | Status |
|---------|-------------|--------|
| `bun run datapipe:raw` | Show raw API response (debug) | ✅ Working |
| `bun run datapipe:full` | **NEW**: 12-col table with ALL betDetails fields | ✅ Working |
| `bun run datapipe:details` | Detailed bets + players + odds | ✅ Working |
| `bun run datapipe:fetch` | Agent rankings (legacy) | ✅ Working |
| `bun run datapipe:top` | Show top 3 performers | ✅ Working |
| `bun run datapipe:watch` | Auto-fetch every 5 minutes | ✅ Working |

## 📊 **Live Dashboard Features**

The `dashboards/datapipe-dashboard.md` file includes:

- 🔄 **Refresh button** - Manual data updates
- 📊 **Top performers table** - Live Dataview integration
- 📈 **Performance metrics** - Totals and rankings
- 🎯 **Key statistics** - Agent counts, volumes, rates
- 🚨 **Alert system** - Automatic notification flags

## 🔔 **Telegram Integration**

Add to your Telegram bot (`/top` command):

```bash
# In scripts/telegram.ts
if (msg.text === '/top') {
  const top = await Bun.$`bun scripts/datapipe.ts top`.text();
  await send(chatId, `📈 ${top}`);
}
```

## 🛡️ **Governance Rules**

See `agents/datapipe-rules.md` for:

- Alert thresholds (>$1k profit default)
- Volume monitoring (>500 bets)
- Data validation rules
- Escalation procedures

## 🔧 **Customization**

### Change Date Range

Edit `scripts/datapipe.ts`:

```typescript
// Current: 7 days
const from = dayStart(now - 7 * 86400);

// Change to 30 days:
const from = dayStart(now - 30 * 86400);
```

### Adjust Alert Thresholds

In `.env`:

```bash
# Current: $10k alerts
DATAPIPE_ALERT_THRESHOLD=10000

# Change to $5k:
DATAPIPE_ALERT_THRESHOLD=5000
```

### Add Custom Fields

After seeing raw data (`bun run datapipe:raw`), add fields to the `AgentReport` interface.

## 🚨 **Troubleshooting**

### "Cookie expired"
```bash
# Refresh: Chrome → F12 → Application → Cookies → Copy new cookie
# Update .env: DATAPIPE_COOKIE="new_cookie_here"
```

### "API Error 401"
```bash
# Check cookie is complete and current
# Verify you're logged into dashboard when copying
```

### "No data"
```bash
bun run datapipe:raw  # Check if API returns data
# May need to adjust date range or filters
```

### "Obsidian not updating"
```bash
# Check OBSIDIAN_VAULT path in .env
# Ensure dashboards/ directory exists
# Click refresh button in dashboard
```

## 🔍 **Search Integration**

```bash
# Find all datapipe content
bun grep DATAPIPE

# Find all reports
bun grep REPORT
```

## 📈 **Architecture**

```text
Sportswidgets API (data.r.bets[]) → Bun Script → JSON Parse (result/bet/isWin) → Agent Aggregation → MD Table → Obsidian Vault → Dataview Dashboard → Telegram Alerts
```

## 🎯 **Next Steps**

1. **Setup complete?** Run `bun run datapipe:fetch`
2. **Got data?** Check `dashboards/bet-reports.md`
3. **Want alerts?** Configure Telegram bot
4. **Need customization?** Edit `scripts/datapipe.ts`

---

**"1132 bets → 50 agents → ALL Fields: Deni Avdija | ML+200 | cls=10 | lim=100 → 12-COL TABLES!"** ✨📊🤖

*Built with Bun v1.3 • Datapipe v2.5 • EVERY betDetails key parsed + signed odds*

---

## 🔍 **New v2.5 Fields**

| Field | Key | Example | Description |
|-------|-----|---------|-------------|
| **Player** | `d` | `Deni Avdija` | Player name from betDetails |
| **Market ID** | `k` | `206439654` | Unique market identifier |
| **Odds** | `m` | `ML +200` | Signed moneyline (+/-) |
| **Skill** | `sk` | `1` | Player skill rating |
| **Class** | `cls` | `10` | Bet class/category |
| **Limit** | `lim` | `100` | Maximum bet amount |
