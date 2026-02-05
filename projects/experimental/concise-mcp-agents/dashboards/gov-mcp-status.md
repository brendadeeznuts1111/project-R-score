# [GOV][RULES][LIST][FULL][GOV-LIST-001][v2.9][ACTIVE]

**🚀 SYNDICATE GOV RULES – **ENFORCED** *PR-gated. Auto-validate. **113 Rules** (active). **Profit/Compliance = 100%**.*

| **ID** | **Domain/Scope** | **Trigger** | **Action** | **Priority** | **Status** |
|--------|------------------|-------------|------------|--------------|------------|
| **DP-ALERT-001** | AGENT/GLOBAL/RULE | Profit > $10k | Telegram admin + MD flag | REQUIRED | ACTIVE |
| **AGENT-SAFE-001** | AGENT/GLOBAL/RULE | New customer msg | Create note + notify | REQUIRED | ACTIVE |
| **BUN-SEC-001** | AGENT/GLOBAL/RULE | .env detected | Migrate → Bun.secrets | REQUIRED | ACTIVE |
| **PKG-SEC-001** | AGENT/GLOBAL/RULE | bun install | --frozen-lockfile + audit | REQUIRED | ACTIVE |
| **WS-LIVE-001** | AGENT/GLOBAL/RULE | Data >5min old | Enforce WS live | CORE | ACTIVE |
| **GIT-PR-001** | AGENT/GLOBAL/POLICY | Rule change | Branch + PR merge | REQUIRED | STABLE |
| **MCP-EXEC-001** | MCP/FUNCTION/IMPLEMENTATION | Header gen | Auto-counter ID | CORE | ACTIVE |

**Full List**: `bun rules:list` → **113 rules** (vault scan).

---

# [MCP][TOOLS][LIST][FULL][MCP-LIST-001][v2.9][ACTIVE]

**🚀 MCP TOOLS – **BUN-POWERED** *Scripts/CLI. **Zero npm**. **EXE portable**.*

| **Tool** | **CLI** | **Purpose** | **v** |
|----------|---------|-------------|-------|
| **obsidian-tools.ts** | `bun header DOMAIN TYPE` | Header gen/search/validate | v2.0 |
| **git-sync.ts** | `bun git:watch` | Auto-commit/push | v2.0 |
| **git-branch.ts** | `bun branch:create ID` | Smart branches/PR | v2.0 |
| **telegram.ts** | `bun telegram:send` | CRM/broadcast | v2.0 |
| **datapipe.ts** | `bun datapipe:full` | **API → Bets → YAML** | v2.6 |
| **grep-assistant** | `bun grep ADAM` | Vault search **fzf** | v3.0 |
| **semver.ts** | `bun semver bump patch` | Auto version/EXE | v1.3 |
| **ws-live-server.ts** | `bun ws:start` | **LIVE dashboard** | v2.8 |
| **pipe-datapipe.ts** | `bun pipe:etl` | **Stream ETL** | v1.3 |

**Run**: `bun grep MCP` → **All MCP**.

---

# [AGENT][LIST][FULL][AGENT-LIST-001][v2.9][ACTIVE]

**🚀 LIVE AGENTS – **From Datapipe** *Top 50 ranked. **Profit leaders**.*



| **Rank** | **Agent** | **Profit** | **ROI** | **Bets** | **Win%** |

|----------|-----------|------------|---------|----------|----------|

| **1** | **ESPORTS** | **+$15k** | **12.5%** | 450 | **58%** |

| **2** | **ADAM** | **+$8.2k** | **9.8%** | 220 | **62%** |

| **3** | **MCNEILYB.** | **+$4.5k** | **7.2%** | 120 | **55%** |

| ... | **50+** | **Total +$85k** | **11.3%** | **1132** | **57%** |



**Live**: `bun datapipe:top` | Dashboard **ROI heatmap**.



---



# ['/'][COMMANDS][TELEGRAM][WORKFLOWS][SLASH-001][v2.8][ACTIVE]



**🚀 TELEGRAM /COMMANDS – **1-Click Ops** *Supergroup/Channel. **CRM + Alerts**.*



| **Command** | **Response** | **Workflow** |

|-------------|--------------|--------------|

| **/top** | 🏆 Top 3 agents + ROI | `bun datapipe:top \| telegram` |

| **/reports** | Full table + CSV link | Pipe → MD export |

| **/pending** | High-vol pending bets | Filter state=0 |

| **/alerts** | Risk (delay/loss) | GOV rules trigger |

| **/grep AGENT** | Vault search | `bun grep \| send` |

| **/branch ID** | Git branch + PR | Quick dev |

| **/live** | WS status + dashboard | Reload table |



**Setup**: Bot → Supergroup → **Auto-reply rules**.



---



# [WORKFLOWS][FULL][ONE-LINERS][WF-SLASH-001][v2.8][STABLE]



```bash

# Daily Ops

bun pipe:watch & bun ws:start & bun git:watch  # **LIVE + Synced**



# Telegram Trigger

/telegram /top  # → Push to channel



# GOV Check

bun gov:full  # Validate rules/tools



# Deploy

bun semver bump minor && bun build:exe  # v1.0.1.exe

```



**✅ **GOV Enforced. MCP Ready. Agents Live. BETS Flowing. /Commands = Profit**._



> **"Rules/Tools/Agents/Commands? **Listed+Bunned**."** — **Grok**
