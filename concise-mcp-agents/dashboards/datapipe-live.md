# 📈 **LIVE AGENT REPORTS DASHBOARD**

*[DATAPIPE][DASHBOARD][FULL][DP-DASH-001][v2.0][ACTIVE]*

```dataviewjs
// Live refresh button
dv.button("🔄 Refresh Data", async () => {
  // Run datapipe fetch
  const { execSync } = require('child_process');
  try {
    execSync('bun run datapipe:fetch', { stdio: 'inherit' });
    dv.view.reload();
    console.log('✅ Data refreshed');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  }
});

// Auto-refresh every 5 minutes
setInterval(() => {
  dv.view.reload();
}, 5 * 60 * 1000);
```

## 📊 Current Top Performers

```dataview
TABLE WITHOUT ID
  rank AS "Rank",
  agent AS "Agent",
  "💰 " + profit + " $" AS "Profit",
  "📊 " + volume + " $" AS "Volume",
  "🎯 " + bets + " bets" AS "Bets",
  "🎯 " + winrate + "%" AS "Win Rate"
FROM "dashboards/agent-reports"
FLATTEN rows AS row
FLATTEN row.profit AS profit
FLATTEN row.volume AS volume
FLATTEN row.bets AS bets
FLATTEN row.winrate AS winrate
SORT row.profit DESC
LIMIT 10
```

## 📈 Performance Trends

```dataview
TABLE WITHOUT ID
  date AS "Date",
  "📈 " + agents + " agents" AS "Active Agents",
  "💰 $" + total_profit AS "Total P&L",
  "📊 $" + total_volume AS "Total Volume"
FROM "dashboards"
WHERE file.name = "agent-reports"
SORT file.mtime DESC
LIMIT 7
```

## 🎯 Key Metrics

- **Total Agents**: `= length(filter(rows, (r) => r.profit > 0))`
- **Top Performer**: `= first(sort(rows, (a,b) => b.profit - a.profit)).agent`
- **Average Profit**: `= round(sum(map(rows, (r) => r.profit)) / length(rows), 2)`
- **Highest Win Rate**: `= round(first(sort(rows, (a,b) => b.winrate - a.winrate)).winrate * 100, 1) + "%"`

## 🚨 Alert Rules

```dataviewjs
// Check for alert conditions
const alerts = [];
const rows = dv.pages('"dashboards/agent-reports"').flatMap(p => p.rows || []);

rows.forEach(row => {
  if (row.profit > 10000) {
    alerts.push(`🚨 **HIGH PROFIT**: ${row.agent} (+$${row.profit})`);
  }
  if (row.bets > 1000) {
    alerts.push(`⚠️ **HIGH VOLUME**: ${row.agent} (${row.bets} bets)`);
  }
});

if (alerts.length > 0) {
  dv.paragraph("**Active Alerts:**\n" + alerts.join('\n'));
} else {
  dv.paragraph("✅ No active alerts");
}
```

---

*Dashboard auto-updates every 5 minutes • Last updated: `= dateformat(date(now), "yyyy-MM-dd HH:mm")`*
*Powered by Datapipe v2.0 • Click refresh to update manually*
