# PRD: Kimi Datasource Plugin Demo

## 1. Overview

**Product:** Kimi Code CLI — kimi-datasource plugin (Beta, v2.1.0)
**Goal:** Produce a polished demo that showcases the plugin's three data verticals — financial markets, macroeconomic indicators, and academic literature — to drive adoption among developers, analysts, and researchers.
**Target audience:** Engineering managers, quant developers, data analysts, academic researchers, and existing Kimi Code CLI users.

## 2. Problem Statement

Users of Kimi Code CLI have powerful coding-AI capabilities but lack a built-in way to query structured, external data sources (financial, economic, academic) from the same chat interface. Currently they must context-switch to separate tools or APIs. The kimi-datasource plugin solves this by making professional data queryable via natural language with zero configuration.

## 3. Demo Scenarios

### 3.1 Financial Data (3–4 minutes)

| Scenario | Query | What to Highlight |
|---|---|---|
| Real-time quote | `"What's the current price of Moutai?"` | Slash-command trigger (`/skill:kimi-datasource`), natural language fallback, A-share coverage |
| Historical + technical | `"What was Apple's (AAPL) highest and lowest closing price in Q4 2025?"` | Historical prices, cross-market (US stocks) |
| Fundamentals | `"What are NVIDIA's main business segments and who are its largest institutional shareholders?"` | Company fundamentals, business overview, shareholder data |
| Screening | `"In the US semiconductor sector, find stocks with market cap above $500B."` | Filter/screening capability |
| Watchlist | `"Track my portfolio: I bought 100 shares of BABA at $80 and 50 shares of TSLA at $350. What's my P&L?"` | Watchlist management, cost-basis P&L calculation |

### 3.2 Macroeconomic Data (2–3 minutes)

| Scenario | Query | What to Highlight |
|---|---|---|
| Cross-country comparison | `"Compare GDP growth rates for China, India, and Vietnam over the past 20 years."` | World Bank data, 50+ year time series, 189 countries |
| Thematic data | `"Show CO2 emissions trends for major economies over the past decade alongside renewable energy share."` | Multi-indicator correlation, thematic dataset breadth |

### 3.3 Academic Data (2–3 minutes)

| Scenario | Query | What to Highlight |
|---|---|---|
| Literature search | `"Find key papers on financial fraud detection from the past 5 years."` | Paper corpus, cross-discipline coverage |
| Citation analysis | `"What are the most influential papers on RLHF? Who are the key authors?"` | Citation ranking, author identification |
| Preprint lookup | `"What are the latest preprints at the intersection of quant finance and ML?"` | Preprint access, research frontier tracking |

## 4. Success Criteria

- Demo runs start-to-finish in **≤10 minutes**
- All queries are shown live (no pre-recorded videos) with real API responses
- The plugin install + verification step is shown once at the beginning (`kimi plugin install`, `kimi plugin list`)
- At least **1 query per data vertical** is demonstrated
- Usage-cost transparency is mentioned (credit-based billing)
- The read-only nature and disclaimer ("not investment advice") are stated

## 5. Non-Goals

- No trading or order-execution workflows
- No custom plugin development or plugin authoring
- No MCP or Hooks integration
- No legacy (Python/uv) CLI migration path

## 6. Technical Prerequisites

- Kimi Code CLI installed and authenticated
- `kimi plugin install https://cdn.kimi.com/kimi-code-plugins/kimi-datasource.zip`
- Verify with `kimi plugin list`
- Sufficient account credits for demonstration queries

## 7. Demo Script Outline

```
1. Intro (30s)     — What is kimi-datasource? Three data verticals overview.
2. Setup (1 min)   — Install plugin, verify in console.
3. Financial (3m)  — Quote → Historical → Fundamentals → Screening → Watchlist.
4. Macro (2m)      — GDP cross-country → CO2 + renewables thematic.
5. Academic (2m)   — Lit search → Citation analysis → Preprints.
6. Wrap-up (30s)   — Pricing model, next steps (Custom Plugins, Skills docs).
```

## 8. Open Questions

- Should the demo use the Web UI (`kimi web`) or the terminal CLI? (Recommend: terminal for authenticity, but have Web UI as a backup)
- Should we pre-load a watchlist file or enter it live?
- What fallback queries should we prepare if the API is slow / rate-limited?

## 9. Future Considerations

- Regional-language queries (CN, JP, KR markets)
- Integration with Custom Plugins pipeline for automated data-fetch + code-gen workflows
- Potential for scheduled / recurring data pulls via Hooks
