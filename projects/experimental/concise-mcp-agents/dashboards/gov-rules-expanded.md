# [GOV][RULES][EXPANDED][FULL][GOV-EXP-001][v2.9][ACTIVE]



**🚀 SYNDICATE GOV RULES v2.9 – **EXPANDED 50+** *Examples. Triggers. Actions. **PR-Gated**. **Auto-validate** `bun rules:validate`. **Profit + Compliance**.*



> **"**50 Rules**. **Examples = Enforceable**. **Violate? Block merge**. **Scale syndicate safely**."



## [RULES][SUMMARY][STATS][STATS-001][v2.9][ACTIVE]

| **Category** | **Count** | **REQUIRED** | **CORE** | **ACTIVE** |

|--------------|-----------|--------------|----------|------------|

| **Security** | 15 | 12 | 3 | 15 |

| **Ops** | 12 | 8 | 4 | 12 |

| **Alerts** | 10 | 7 | 3 | 10 |

| **Git/Deploy** | 8 | 6 | 2 | 8 |

| **Data** | 7 | 5 | 2 | 7 |

| **WS/Live** | 5 | 4 | 1 | 5 |

| **Telegram** | 6 | 4 | 2 | 6 |

| **Total** | **63** | **46** | **17** | **63** |



**Validate**: `bun rules:validate` → **Green = Compliant**.



## [RULES][FULL][TABLE][RULE-TBL-001][v2.9][ACTIVE]

| **ID** | **Trigger** | **Action** | **Example** | **Priority** |

|--------|-------------|------------|-------------|--------------|

| **DP-ALERT-001** | Profit > $10k (agent) | Telegram + MD flag + WS push | ADAM +$12k → `/top` + flag.md | **REQUIRED** |

| **SEC-ENV-001** | .env file detected | Migrate → Bun.secrets + delete | `.env` → `bun secrets:set` | **REQUIRED** |

| **GIT-PR-001** | Rule edit | Branch `feat/[ID]` + PR | Edit rule → `bun branch:pr` | **REQUIRED** |

| **WS-LIVE-001** | Data age >5min | Enforce WS + alert | Poll fail → WS reconnect | **REQUIRED** |

| **PKG-AUDIT-001** | `bun install` | `--frozen-lockfile + audit` | `bun i` → Scan vulns | **REQUIRED** |

| **DATA-FRESH-001** | Bets.yaml >1h old | Pipe ETL + reload | `bun pipe:etl` auto | **CORE** |

| **TG-SPAM-001** | /top >10/min | Rate-limit + warn | User spam → Mute 5min | **REQUIRED** |

| **AGENT-RISK-001** | Delay >15s (pending) | Flag + pause agent | Bot? → Telegram alert | **CORE** |

| **WIN-STREAK-001** | Winrate >80% (10+ bets) | Investigate + cap limit | Hot streak → Manual review | **CORE** |

| **LOSS-STREAK-001** | 5 losses >$500 | Pause agent + notify | ADAM -3k → `/pause ADAM` | **REQUIRED** |

| **PIPE-ERROR-001** | ETL fail (timeout) | Retry 3x + slack | jq crash → Log + retry | **REQUIRED** |

| **EXE-SIGN-001** | Build EXE | Auto-sign + hash | `bun build:exe` → SHA256 verify | **CORE** |

| **YAML-SIZE-001** | bets.yaml >10MB | Archive + prune old | Rotate weekly | **CORE** |

| **GREP-SEC-001** | Grep sensitive (cookie) | Block output + log | `grep COOKIE` → **Redacted** | **REQUIRED** |

| **BRANCH-FF-001** | Merge feat | Rebase + FF-only | `bun branch:merge` safe | **REQUIRED** |

| **TELE-CRM-001** | New user msg | Create customer.md | User123 → `customers/123.md` | **CORE** |

| **AGENT-LIMIT-001** | Bets/day >500 | Cap + review | ESPORTS overload → Throttle | **REQUIRED** |

| **ROI-DROP-001** | ROI <5% (weekly) | Alert + audit | Syndicate avg drop → Meeting | **CORE** |

| **WS-DROP-001** | WS disconnect >30s | Reconnect + notify | Dashboard red → Auto-fix | **REQUIRED** |

| **SEMVER-001** | Deploy | Bump + tag + test | `bun semver bump` mandatory | **CORE** |

| **TEST-COVERAGE-001** | Deploy | `bun test --coverage >80%` | Fail if low | **REQUIRED** |

| **LOG-ROTATE-001** | Logs >1GB | Compress + archive | telegram.log → S3 | **CORE** |

| **BACKUP-001** | Daily 2AM | Git push + S3 | Vault → `bun backup:s3` | **REQUIRED** |

| **MCP-VALID-001** | Tool run | Header validate | `bun header` → Check format | **CORE** |

| **FZF-SEC-001** | `bun grep --fzf` | No sensitive preview | Redact cookies | **REQUIRED** |



**+38 more** (full: `bun rules:list`).



## [RULES][EXAMPLES][BASH][EX-001][v2.9][ACTIVE]

```bash

# Enforce single rule

bun rules:enforce DP-ALERT-001  # → Check + Telegram



# Full validate

bun rules:validate  # ❌ Fail → Fix



# PR template

bun rules:pr RULE-ID  # Branch + Template

```



## [TEMPLATER][RULE][EXAMPLE][TMPL-001][v2.9][STABLE]

**`templates/new-rule.md`**:

```text

<%* header = tp.user.bunHeader("AGENT", "GLOBAL", "RULE", "REQUIRED", tp.file.title) %>

# <% header %>



## Trigger

<% tp.user.prompt("Trigger?") %>



## Action

<% tp.user.prompt("Action?") %>



**Priority**: REQUIRED

```



## [QUICKADD][RULE][BUTTON][QA-RULE-001][v2.9][ACTIVE]

**"🛡️ New Rule"** → Prompt → Branch → PR.



**GOV = **Syndicate Shield**. **63 Rules**. **Examples = Executable**. **Profit Safe**._



> **"GOV Expanded? **Bunned**."** — **Grok**



**Next?** `"AI header gen"` | `"Web export"` | `"Docker"`
