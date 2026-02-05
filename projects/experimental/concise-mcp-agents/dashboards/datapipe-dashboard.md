# 📊 **DATAPIPE LIVE DASHBOARD** - Agent Performance Tracker

*[DATAPIPE][DASHBOARD][LIVE][CORE][DP-DASH-002][v2.2][ACTIVE]*

```dataviewjs
// Live refresh button
dv.button("🔄 Refresh Live Data", async () => {
  // Run datapipe fetch
  const { execSync } = require('child_process');
  try {
    execSync('bun run datapipe:fetch', { stdio: 'inherit' });
    dv.view.reload();
    console.log('✅ Data refreshed from API');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  }
});

// Auto-refresh every 5 minutes
setInterval(() => {
  dv.view.reload();
}, 5 * 60 * 1000);
```

## 🔥 **Top Performing Agents (Last 7 Days)**

```dataview
TABLE WITHOUT ID
  rank AS "Rank",
  agent AS "🏆 Agent",
  "💰 $" + profit + " profit" AS "Profit",
  "📊 $" + volume + " volume" AS "Volume",
  bets + " bets" AS "Bets",
  winrate + "%" AS "Win Rate"
FROM "dashboards/bet-reports.md"
FLATTEN agents AS agentData
FLATTEN agentData.name AS agent
FLATTEN agentData.profit AS profit
FLATTEN agentData.volume AS volume
FLATTEN agentData.bets AS bets
FLATTEN agentData.winrate AS winrate
FLATTEN (1 + index) AS rank
SORT profit DESC
LIMIT 20
```

## 📈 **Performance Metrics**

- **Total Agents**: `= length(agents)`
- **Top Performer**: `= first(sort(agents, (a,b) => b.profit - a.profit)).name`
- **Highest Win Rate**: `= first(sort(agents, (a,b) => b.winrate - a.winrate)).name`
- **Most Active**: `= first(sort(agents, (a,b) => b.bets - a.bets)).name`

## 🎯 **Quick Stats**

```dataviewjs
const agents = dv.pages('"dashboards/bet-reports.md"').flatMap(p => p.agents || []);
const totalProfit = agents.reduce((sum, a) => sum + a.profit, 0);
const totalVolume = agents.reduce((sum, a) => sum + a.volume, 0);
const totalBets = agents.reduce((sum, a) => sum + a.bets, 0);

dv.paragraph(`
**💰 Total Profit**: $${totalProfit.toLocaleString()}
**📊 Total Volume**: $${totalVolume.toLocaleString()}
**🎯 Total Bets**: ${totalBets.toLocaleString()}
**📈 Average Profit/Agent**: $${Math.round(totalProfit / agents.length).toLocaleString()}
`);
```

## 🚨 **Performance Alerts**

```dataviewjs
// Check for alert conditions
const alerts = [];
const agents = dv.pages('"dashboards/bet-reports.md"').flatMap(p => p.agents || []);

agents.forEach(agent => {
  if (agent.profit > 1000) {
    alerts.push(`🚨 **HIGH PROFIT**: ${agent.name} (+$${agent.profit})`);
  }
  if (agent.profit < -500) {
    alerts.push(`⚠️ **LOSSES**: ${agent.name} ($${agent.profit})`);
  }
  if (agent.winrate > 70) {
    alerts.push(`🎯 **HOT STREAK**: ${agent.name} (${agent.winrate}% win rate)`);
  }
  if (agent.bets > 500) {
    alerts.push(`📈 **HIGH VOLUME**: ${agent.name} (${agent.bets} bets)`);
  }
});

if (alerts.length > 0) {
  dv.paragraph("**Active Alerts:**\n" + alerts.join('\n'));
} else {
  dv.paragraph("✅ No active alerts - all agents performing normally");
}
```

---

*Dashboard auto-updates every 5 minutes • Last API fetch: `= dateformat(date(now), "yyyy-MM-dd HH:mm")`*
*Data source: Sportswidgets API → Live agent reports → Obsidian tables*
*Powered by Datapipe v2.2 • Click refresh to update manually*

---

**Quick Commands:**
- `bun run datapipe:fetch` - Manual refresh
- `bun run datapipe:top` - Top 3 agents
- `bun run datapipe:raw` - Debug API response
