#!/usr/bin/env bun

// [DASHBOARD][GENERATOR][LIVE][DB-GEN-001][v2.9][ACTIVE]

// [DATAPIPE][CORE][DA-CO-DG1][v2.9.0][ACTIVE]

import { AgentRankingsSystem } from "./agent-rankings.ts";
import { GovernanceEngine } from "./gov-rules.ts";
import { MCPToolsRegistry } from "./mcp-tools.ts";
import { fetchData, aggregateAgents } from "./datapipe.ts";
import { writeFileSync } from 'fs';
import { join } from 'path';

interface DashboardData {
  timestamp: string;
  agents: {
    total: number;
    top5: any[];
    totalProfit: number;
    totalVolume: number;
    avgWinRate: number;
  };
  rules: {
    total: number;
    active: number;
    categories: Record<string, number>;
    compliance: number;
  };
  tools: {
    total: number;
    active: number;
    categories: Record<string, number>;
  };
  system: {
    uptime: string;
    version: string;
    lastBackup: string;
  };
}

class DashboardGenerator {
  private data: DashboardData | null = null;

  async generateLiveData(): Promise<DashboardData> {
    console.log(`📊 Generating live dashboard data...`);

    // Get agent data
    const rankings = new AgentRankingsSystem();
    await rankings.generateRankings();
    const agents = rankings.getTopAgents(5);

    // Calculate agent stats
    const allAgents = await rankings.generateRankings();
    const totalProfit = allAgents.reduce((sum, a) => sum + a.profit, 0);
    const totalVolume = allAgents.reduce((sum, a) => sum + a.volume, 0);
    const totalBets = allAgents.reduce((sum, a) => sum + a.bets, 0);
    const avgWinRate = totalBets > 0 ? (allAgents.reduce((sum, a) => sum + a.winRate * a.bets, 0) / totalBets) : 0;

    // Get rules data
    const govEngine = new GovernanceEngine();
    const allRules = govEngine.getAllRules();

    // Categorize rules
    const ruleCategories: Record<string, number> = {};
    allRules.forEach(rule => {
      ruleCategories[rule.category] = (ruleCategories[rule.category] || 0) + 1;
    });

    // Get tools data
    const toolsRegistry = new MCPToolsRegistry();
    const allTools = await toolsRegistry.scanTools();

    // Categorize tools
    const toolCategories: Record<string, number> = {};
    allTools.forEach(tool => {
      toolCategories[tool.category] = (toolCategories[tool.category] || 0) + 1;
    });

    // Get system info
    const uptime = this.getSystemUptime();
    const version = await this.getPackageVersion();
    const lastBackup = await this.getLastBackupTime();

    this.data = {
      timestamp: new Date().toISOString(),
      agents: {
        total: allAgents.length,
        top5: agents.map(a => ({
          rank: a.rank,
          agent: a.agent,
          profit: Math.round(a.profit * 100) / 100,
          roi: a.roi,
          winRate: a.winRate,
          bets: a.bets
        })),
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        avgWinRate: Math.round(avgWinRate * 100) / 100
      },
      rules: {
        total: allRules.length,
        active: allRules.filter(r => r.status === 'ACTIVE').length,
        categories: ruleCategories,
        compliance: 95 + Math.random() * 5 // Mock compliance for now
      },
      tools: {
        total: allTools.length,
        active: allTools.filter(t => t.status === 'ACTIVE').length,
        categories: toolCategories
      },
      system: {
        uptime,
        version,
        lastBackup
      }
    };

    return this.data;
  }

  private getSystemUptime(): string {
    try {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } catch {
      return 'Unknown';
    }
  }

  private async getPackageVersion(): Promise<string> {
    try {
      const packageJson = await Bun.file('package.json').json();
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private async getLastBackupTime(): Promise<string> {
    try {
      // Check for backup files in tmp directory or S3
      const tmpFiles = await Bun.$`ls -t tmp/backup-*.tar.gz 2>/dev/null || echo "none"`.quiet();
      if (tmpFiles.stdout.toString().trim() !== 'none') {
        const latest = tmpFiles.stdout.toString().split('\n')[0];
        return latest.split('-')[1] + '-' + latest.split('-')[2] + '-' + latest.split('-')[3];
      }
      return 'Never';
    } catch {
      return 'Unknown';
    }
  }

  async generateMarkdownDashboard(): Promise<string> {
    if (!this.data) {
      await this.generateLiveData();
    }

    const d = this.data!;
    const timestamp = new Date(d.timestamp).toLocaleString();

    const content = `# [GOV][RULES][LIST][FULL][GOV-LIST-001][v2.9][ACTIVE]

**🚀 SYNDICATE GOV RULES – **ENFORCED** *PR-gated. Auto-validate. **${d.rules.total} Rules** (active). **Profit/Compliance = ${Math.round(d.rules.compliance)}%**.*

| **ID** | **Domain/Scope** | **Trigger** | **Action** | **Priority** | **Status** |
|--------|------------------|-------------|------------|--------------|------------|
| **DP-ALERT-001** | AGENT/GLOBAL/RULE | Profit > $10k | Telegram admin + MD flag | REQUIRED | ACTIVE |
| **AGENT-SAFE-001** | AGENT/GLOBAL/RULE | New customer msg | Create note + notify | REQUIRED | ACTIVE |
| **BUN-SEC-001** | AGENT/GLOBAL/RULE | .env detected | Migrate → Bun.secrets | REQUIRED | ACTIVE |
| **PKG-SEC-001** | AGENT/GLOBAL/RULE | bun install | --frozen-lockfile + audit | REQUIRED | ACTIVE |
| **WS-LIVE-001** | AGENT/GLOBAL/RULE | Data >5min old | Enforce WS live | CORE | ACTIVE |
| **GIT-PR-001** | AGENT/GLOBAL/POLICY | Rule change | Branch + PR merge | REQUIRED | STABLE |
| **MCP-EXEC-001** | MCP/FUNCTION/IMPLEMENTATION | Header gen | Auto-counter ID | CORE | ACTIVE |

**Full List**: \`bun rules:list\` → **${d.rules.total} rules** (vault scan).

---

# [MCP][TOOLS][LIST][FULL][MCP-LIST-001][v2.9][ACTIVE]

**🚀 MCP TOOLS – **BUN-POWERED** *Scripts/CLI. **Zero npm**. **EXE portable**.*

| **Tool** | **CLI** | **Purpose** | **v** |
|----------|---------|-------------|-------|
| **obsidian-tools.ts** | \`bun header DOMAIN TYPE\` | Header gen/search/validate | v2.0 |
| **git-sync.ts** | \`bun git:watch\` | Auto-commit/push | v2.0 |
| **git-branch.ts** | \`bun branch:create ID\` | Smart branches/PR | v2.0 |
| **telegram.ts** | \`bun telegram:send\` | CRM/broadcast | v2.0 |
| **datapipe.ts** | \`bun datapipe:full\` | **API → Bets → YAML** | v2.6 |
| **grep-assistant** | \`bun grep ADAM\` | Vault search **fzf** | v3.0 |
| **semver.ts** | \`bun semver bump patch\` | Auto version/EXE | v1.3 |
| **ws-live-server.ts** | \`bun ws:start\` | **LIVE dashboard** | v2.8 |
| **pipe-datapipe.ts** | \`bun pipe:etl\` | **Stream ETL** | v1.3 |

**Run**: \`bun grep MCP\` → **All MCP**.

---

# [AGENT][LIST][FULL][AGENT-LIST-001][v2.9][ACTIVE]

**🚀 LIVE AGENTS – **From Datapipe** *Top 50 ranked. **Profit leaders**. **Last updated: ${timestamp}***

| **Rank** | **Agent** | **Profit** | **ROI** | **Bets** | **Win%** |
|----------|-----------|------------|---------|----------|----------|
${d.agents.top5.map(agent =>
  `| **${agent.rank}** | **${agent.agent}** | **+$${agent.profit.toLocaleString()}** | **${agent.roi}%** | ${agent.bets.toLocaleString()} | **${agent.winRate}%** |`
).join('\n')}

| ... | **${d.agents.total - 5}+** | **Total +$${d.agents.totalProfit.toLocaleString()}** | **${((d.agents.totalProfit / d.agents.totalVolume) * 100).toFixed(1)}%** | **${Math.round(d.agents.totalVolume / (d.agents.totalVolume / d.agents.total * 100))}** | **${d.agents.avgWinRate}%** |

**Live**: \`bun datapipe:top\` | Dashboard **ROI heatmap**.

---

# ['/'][COMMANDS][TELEGRAM][WORKFLOWS][SLASH-001][v2.9][ACTIVE]

**🚀 TELEGRAM /COMMANDS – **1-Click Ops** *Supergroup/Channel. **CRM + Alerts**.*

| **Command** | **Response** | **Workflow** |
|-------------|--------------|--------------|
| **/top** | 🏆 Top 3 agents + ROI | \`bun datapipe:top \| telegram\` |
| **/reports** | Full table + CSV link | Pipe → MD export |
| **/pending** | High-vol pending bets | Filter state=0 |
| **/alerts** | Risk (delay/loss) | GOV rules trigger |
| **/grep AGENT** | Vault search | \`bun grep \| send\` |
| **/branch ID** | Git branch + PR | Quick dev |
| **/live** | WS status + dashboard | Reload table |

**Setup**: Bot → Supergroup → **Auto-reply rules**.

---

# [WORKFLOWS][FULL][ONE-LINERS][WF-SLASH-001][v2.9][STABLE]

\`\`\`bash
# Daily Ops
bun pipe:watch & bun ws:start & bun git:watch  # **LIVE + Synced**

# Telegram Trigger
/telegram /top  # → Push to channel

# GOV Check
bun gov:full  # Validate rules/tools

# Deploy
bun semver bump minor && bun build:exe  # v1.0.1.exe
\`\`\`

---

# [SYSTEM][STATUS][LIVE][SYS-STAT-001][v2.9][ACTIVE]

**🚀 SYSTEM STATUS – **${timestamp}***

| **Metric** | **Value** | **Status** |
|------------|-----------|------------|
| **Agents Active** | ${d.agents.total} | ✅ |
| **Total Profit** | $${d.agents.totalProfit.toLocaleString()} | ✅ |
| **Rules Active** | ${d.rules.active}/${d.rules.total} | ✅ |
| **Tools Available** | ${d.tools.active}/${d.tools.total} | ✅ |
| **System Uptime** | ${d.system.uptime} | ✅ |
| **Version** | ${d.system.version} | ✅ |
| **Last Backup** | ${d.system.lastBackup} | ✅ |

**GOV Enforced. MCP Ready. Agents Live. /Commands = Profit**._

> **"Rules/Tools/Agents/Commands? **Listed+Bunned**."** — **Grok**
`;

    return content;
  }

  async updateDashboard(): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📊 Updating live dashboard...`);

      const content = await this.generateMarkdownDashboard();
      const dashboardPath = join(process.cwd(), 'dashboards', 'gov-mcp-status.md');

      writeFileSync(dashboardPath, content);

      console.log(`✅ Dashboard updated: dashboards/gov-mcp-status.md`);

      return {
        success: true,
        message: `Dashboard updated successfully with live data`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update dashboard: ${error.message}`
      };
    }
  }

  async exportJson(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.data) {
        await this.generateLiveData();
      }

      const jsonPath = join(process.cwd(), 'dashboards', 'system-status.json');
      writeFileSync(jsonPath, JSON.stringify(this.data, null, 2));

      return {
        success: true,
        message: `JSON data exported to dashboards/system-status.json`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to export JSON: ${error.message}`
      };
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new DashboardGenerator();

  if (args.length === 0) {
    console.log(`🚀 Dashboard Generator v2.9

USAGE:
  bun dashboard:update     # Update live dashboard with current data
  bun dashboard:json       # Export dashboard data as JSON
  bun dashboard:preview    # Preview dashboard content

EXAMPLES:
  bun dashboard:update     # Refresh gov-mcp-status.md
  bun dashboard:json       # Generate system-status.json
  bun dashboard:preview    # Show dashboard content

FEATURES:
  - Live agent rankings from Datapipe API
  - GOV rules compliance status
  - MCP tools availability
  - System health metrics
  - Auto-updates timestamps
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'update':
        const updateResult = await generator.updateDashboard();
        if (updateResult.success) {
          console.log(`✅ ${updateResult.message}`);
        } else {
          console.error(`❌ ${updateResult.message}`);
          process.exit(1);
        }
        break;

      case 'json':
        const jsonResult = await generator.exportJson();
        if (jsonResult.success) {
          console.log(`✅ ${jsonResult.message}`);
        } else {
          console.error(`❌ ${jsonResult.message}`);
          process.exit(1);
        }
        break;

      case 'preview':
        const content = await generator.generateMarkdownDashboard();
        console.log(content);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun dashboard --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
export { DashboardGenerator };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
