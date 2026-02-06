# Research Scripts Integration

**Status**: ✅ Production Ready | Alert System Integrated | Orchestrator Enabled | RFC 001 Deep-Links Integrated | RFC 001 Deep-Links Integrated

## Overview

These updates significantly enhance our research capabilities by integrating a robust, YAML-configurable alert system and orchestrator with key research scripts, enabling more automated and intelligent arbitrage detection and analysis.

The research scripts provide automated, cron-ready tools for:
- **Nightly covert steam scanning** - Automated detection of hidden sharp money movements
- **Weekly shadow market graph analysis** - Comprehensive market structure analysis
- **Deceptive line identification** - Pre-game bait line detection
- **Automated covert arbitrage trading** - Paper and live trading execution

---

## Summary

### 1. Updated `ShadowGraphAlertSystem` (`src/arbitrage/shadow-graph/alert-system.ts`)

The alert system has been significantly enhanced to provide flexible, YAML-configurable alerting capabilities:

- **Enhanced Configuration:** Added YAML loading using Bun's native `YAML.parse()`, supporting both `alerts:` and `alert_system.alerts:` formats for maximum compatibility with existing configurations.

- **Flexible Template Variables:** Fixed template variable replacement to support both `${var}` and `{var}` formats, enabling broader compatibility with different alert configuration styles.

- **Dynamic Rule Evaluation:** Improved evaluator function execution by merging rule parameters into context, allowing for more dynamic and context-aware rule evaluation that adapts to runtime conditions.

- **Robustness:** Added comprehensive error handling for missing or malformed configuration files, improving system stability and providing clear diagnostic messages when configuration issues occur.

**Key Benefits:**
- Zero external dependencies (uses Bun's native YAML parser)
- Flexible configuration format support
- Context-aware rule evaluation
- Production-ready error handling

---

### 2. Enhanced Research Scripts Integration

All research scripts now integrate seamlessly with the alert system and orchestrator, providing automated intelligence and notification capabilities.

#### `research-scan-covert-steam-events.ts`

**Purpose:** Nightly automated scan for covert steam events across all sports with configurable filters.

**Integration Features:**
- Integrated with `ShadowGraphAlertSystem` for automatic alert processing
- Added `--enable_alerts` and `--alert_config_path` options for flexible alert configuration
- Proactively processes alerts for detected covert steam events matching severity thresholds, enabling real-time awareness of critical sharp money movements

**Cron Schedule:** `0 2 * * *` (runs daily at 2 AM)

**Key Capabilities:**
- Multi-sport scanning with category filtering
- Severity-based filtering (minimum severity score)
- Sharp money confirmation filtering
- Zstandard-compressed JSONL output
- Automatic alert triggering for high-severity events

#### `research-generate-shadow-market-graph.ts`

**Purpose:** Weekly comprehensive shadow market graph analysis with arbitrage and latency insights.

**Integration Features:**
- Integrated with `AdvancedResearchOrchestrator` for comprehensive analysis capabilities
- Added `--use_orchestrator` flag to enable full research report generation
- Integrated the alert system for immediate arbitrage opportunity notifications
- Supports `--analyze=comprehensive` mode, leveraging the orchestrator for in-depth insights including RLM detection, steam origination, derivative correlations, temporal patterns, LOB reconstruction, and behavioral signature classification

**Cron Schedule:** `0 4 * * 0` (runs weekly on Sunday at 4 AM)

**Key Capabilities:**
- Event-specific or pattern-based event filtering
- Multiple analysis modes (arbitrage, latency, comprehensive)
- SQLite export database with structured analysis results
- Full orchestrator integration for deep research reports
- Alert notifications for high-value opportunities

#### `research-identify-deceptive-lines.ts`

**Purpose:** Identify deceptive lines (bait lines) for specific bookmakers and events before major games.

**Key Features:**
- Bookmaker-specific scanning
- Event-specific filtering
- Probe activation for line validation
- Severity scoring (0-10 scale)
- Liquidity discrepancy detection

**Usage:** Run manually before major games or integrate into pre-game workflows

**Key Capabilities:**
- Bait line detection (displayed but not tradable)
- Liquidity discrepancy analysis
- Probe-based validation
- Severity-based prioritization

#### `research-auto-covert-arb-trader.ts`

**Purpose:** Automated trading system for covert arbitrage opportunities with paper and live modes.

**Integration Features:**
- Integrated the alert system for high-value trading opportunity notifications
- Automatically triggers alerts for opportunities exceeding 1.5x minimum profit threshold
- Added `--enable_alerts` and `--alert_config_path` options for flexible alert configuration
- Supports both paper trading (simulation) and live trading modes

**⚠️ Warning:** This script can execute real trades. Always test with `--trade_mode=paper` first.

**Key Capabilities:**
- Profit threshold filtering
- Risk management (maximum capital limits)
- Kelly Criterion-inspired capital allocation
- Paper and live trading modes
- Alert notifications for high-value opportunities
- Execution result tracking and reporting

---

### 3. Key Features

- **Zero-Dependency YAML Configuration:** Leverages Bun's native YAML parser for flexible and efficient alert configuration (`config/advanced-research-alerts.yaml`), eliminating external dependencies and simplifying deployment.

- **Intelligent Alerting:** Research scripts can dynamically trigger alerts based on configured thresholds and conditions, enhancing real-time awareness of critical events and opportunities without manual monitoring.

- **Comprehensive Orchestrated Analysis:** The `AdvancedResearchOrchestrator` now fully supports detailed weekly graph analysis, providing deeper insights and automated report generation across multiple detection systems (RLM, steam origination, derivative correlations, temporal patterns, LOB reconstruction, behavioral signatures).

- **Backward Compatible:** All new features are optional via command-line flags, ensuring seamless integration with existing workflows without disrupting current operations.

---

## Usage Examples

### Nightly Covert Steam Scan with Alerts

```bash
# Basic scan
bun run scripts/research-scan-covert-steam-events.ts \
  --sport_category=all \
  --minimum_severity_score=7 \
  --sharp_money_confirmation_only=true \
  --output=/var/log/hyper-bun/covert-steam-nightly.jsonl.zst

# With alert system enabled
bun run scripts/research-scan-covert-steam-events.ts \
  --sport_category=all \
  --minimum_severity_score=7 \
  --sharp_money_confirmation_only=true \
  --output=/var/log/hyper-bun/covert-steam-nightly.jsonl.zst \
  --enable_alerts=true \
  --alert_config_path=./config/advanced-research-alerts.yaml
```

### Weekly Shadow Market Graph Analysis

```bash
# Basic analysis (arbitrage and latency)
bun run scripts/research-generate-shadow-market-graph.ts \
  --event_identifier=all-nfl \
  --analyze=arbitrage,latency \
  --export=./data/shadow-market-graphs-weekly.db

# Comprehensive analysis with orchestrator and alerts
bun run scripts/research-generate-shadow-market-graph.ts \
  --event_identifier=all-nfl \
  --analyze=arbitrage,latency,comprehensive \
  --export=./data/shadow-market-graphs-weekly.db \
  --use_orchestrator=true \
  --enable_alerts=true \
  --alert_config_path=./config/advanced-research-alerts.yaml
```

### Deceptive Line Identification

```bash
# Identify bait lines before a major game
bun run scripts/research-identify-deceptive-lines.ts \
  --bookmaker_name=DraftKings \
  --event_identifier=nfl-2025-001 \
  --probe_activation=true
```

### Automated Covert Arbitrage Trading

```bash
# Paper trading mode (simulation)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=paper \
  --enable_alerts=true

# Live trading mode (⚠️ executes real trades)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=live \
  --enable_alerts=true
```

---

## Cron Configuration

### Recommended Cron Jobs

Add these to your crontab (`crontab -e`):

```bash
# Nightly covert steam scan (runs daily at 2 AM)
0 2 * * * cd /path/to/trader-analyzer && bun run scripts/research-scan-covert-steam-events.ts --sport_category=all --minimum_severity_score=7 --sharp_money_confirmation_only=true --output=/var/log/hyper-bun/covert-steam-nightly.jsonl.zst --enable_alerts=true >> /var/log/hyper-bun/research-scan.log 2>&1

# Weekly shadow market graph analysis (runs Sunday at 4 AM)
0 4 * * 0 cd /path/to/trader-analyzer && bun run scripts/research-generate-shadow-market-graph.ts --event_identifier=all-nfl --analyze=arbitrage,latency,comprehensive --export=/var/log/hyper-bun/shadow-market-graphs-weekly.db --use_orchestrator=true --enable_alerts=true >> /var/log/hyper-bun/research-graph.log 2>&1
```

### Manual Execution

For manual execution before major games or special events:

```bash
# Deceptive line identification (run before major games)
bun run scripts/research-identify-deceptive-lines.ts \
  --bookmaker_name=DraftKings \
  --event_identifier=nfl-2025-001 \
  --probe_activation=true

# Auto-trader (requires strict approval and testing)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=paper  # Switch to 'live' after rigorous validation
```

---

## Alert Configuration

The alert system uses YAML configuration files to define alert rules and actions. See `config/advanced-research-alerts.yaml` for examples.

### Alert Rule Structure

```yaml
alerts:
  alert_name:
    rule_type: "rule_type_name"
    severity: "critical|high|medium|low"
    params:
      min_threshold: 0.8
      # ... other parameters
    evaluator: |
      (context) => {
        return context.value >= context.min_threshold;
      }
    actions:
      - action: log
        level: "critical"
        tags: ["tag1", "tag2"]
      - action: notify_trader
        priority: "urgent"
        channel: "telegram"
        message: "Alert: {variable}"
      - action: queue_trade
        strategy: "strategy_name"
        max_size: "10000"
        profit_target: "2.5"
```

### Supported Alert Types

- `reverse_line_movement` - RLM detection alerts
- `steam_origination` - Steam origination alerts
- `derivative_correlation` - Derivative correlation break alerts
- `temporal_pattern` - Temporal pattern deviation alerts
- `behavioral_pattern` - Behavioral bot detection alerts
- `cross_sport_arbitrage` - Cross-sport arbitrage alerts
- `limit_order_book` - LOB imbalance alerts
- `hidden_steam` - Hidden steam event alerts
- `shadow_arb` - Shadow arbitrage opportunity alerts

---

## Integration Points

### With Shadow Graph System

All scripts integrate with the shadow graph database (`./data/research.db`) and use:
- `buildShadowGraph()` for graph construction
- `ShadowArbitrageScanner` for opportunity detection
- `monitorHiddenSteam()` for steam detection
- `initializeShadowGraphDatabase()` for schema initialization

### With Alert System

Scripts can trigger alerts via `ShadowGraphAlertSystem`:
- Processes events matching configured rules
- Executes action chains (logging, webhooks, notifications, trade queuing)
- Supports template variable replacement
- Handles errors gracefully

### With Advanced Research Orchestrator

The orchestrator provides comprehensive analysis including:
- Reverse Line Movement (RLM) detection
- Steam origination graph analysis
- Derivative market correlation
- Temporal pattern analysis
- Limit Order Book (LOB) reconstruction
- Behavioral pattern classification

### With Telegram Notification System

All research scripts automatically send formatted reports to Telegram topics/threads:

**Report Routing:**
- **Covert Steam Scans** → `Live Alerts` topic (Thread ID: 91)
- **Shadow Market Graph Analysis** → `Analytics & Stats` topic (Thread ID: 95)
- **Deceptive Line Identification** → `Live Alerts` topic (Thread ID: 91)
- **Auto-Trader Execution** → `Arbitrage Opportunities` topic (Thread ID: 93)
- **System Alerts** → `System Status` topic (Thread ID: 97)

**Automatic Pinning:**
Reports are automatically pinned when:
- Severity is `CRITICAL` or `ACTION_REQUIRED`
- Actions are required (e.g., review critical events, investigate failures)
- High-value opportunities detected (arbitrage, critical alerts)

**Report Format:**
- **Title**: Descriptive report title with emoji indicator (HTML formatted)
- **Summary**: High-level summary of findings
- **Metrics**: Key statistics (events found, opportunities, profit, etc.)
- **Details**: Additional context (event IDs, bookmakers, etc.)
- **Actions Required**: List of actionable items (if any)
- **Deep-Link**: RFC 001 compliant dashboard link (per `9.1.1.9.1.0.0`)

**RFC 001 Deep-Link Integration:**
All reports include RFC 001 compliant deep-links that transform Telegram notifications into actionable dashboard entry points:
- **Covert Steam Scans** → `/alert/covert-steam/` with event context
- **Shadow Market Graph** → `/dashboard/research/shadow-market-graph/` with analysis modes
- **Deceptive Lines** → `/alert/deceptive-line/` with bookmaker and event context
- **Auto-Trader** → `/dashboard/trading/execution/` with execution metrics

**Example Report:**
```text
🚨 <b>Nightly Covert Steam Scan Complete</b>
📅 2025-01-XX 02:15:00Z
📊 Type: covert-steam-scan

Scanned 150 events, found 23 covert steam events matching criteria.

<b>Metrics:</b>
  • Events Scanned: 150
  • Events Found: 23
  • Average Severity: 7.8
  • Confirmed Sharp Money: 15
  • Arbitrage Opportunities: 8
  • Critical Events: 5
  • Output File: /var/log/hyper-bun/covert-steam-nightly.jsonl.zst
  • Compressed Size: 45.23 KB

⚠️ <b>Actions Required:</b>
  • Review 5 critical events (severity ≥9)
  • Evaluate 8 arbitrage opportunities

🔗 <a href="http://localhost:8080/alert/covert-steam/?id=covert-steam-scan-1704556800000&type=covert-steam&ts=1704556800000&severity=7.8&source=research-scan-covert-steam-events">View Details on Dashboard</a>
```

**Deep-Link Parameters (RFC 001):**
- `id`: Unique report identifier (`{report-type}-{timestamp}`)
- `type`: Report type (`covert-steam-scan`, `shadow-market-graph`, `deceptive-line`, `auto-trader-execution`)
- `ts`: Timestamp (epoch milliseconds)
- `ev`: Event identifier (if applicable)
- `bm`: Bookmaker name (if applicable)
- `severity`: Average severity score (if applicable)
- `source`: Source script identifier

**Implementation:**
- Uses `ResearchReportSender` class (`src/telegram/research-report-sender.ts`)
- Integrates with existing Telegram infrastructure (`TelegramBotApi`, topic mapping)
- Follows patterns from `9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md`
- Automatic topic routing based on report type
- Graceful error handling (reports continue even if Telegram fails)

---

## Output Formats

### Covert Steam Scan Output

- **Format:** JSONL (JSON Lines) compressed with Zstandard
- **Location:** Configurable via `--output` parameter
- **Fields:** Event ID, node ID, detection timestamp, severity score, sharp money indicator, lag, movement size, correlation deviation, arbitrage detection, bookmaker, market ID

### Shadow Market Graph Analysis Output

- **Format:** SQLite database
- **Location:** Configurable via `--export` parameter
- **Tables:**
  - `shadow_graph_analyses` - Main analysis records
  - `shadow_graph_arbitrage_opportunities` - Arbitrage opportunities
  - `shadow_graph_latency_analyses` - Latency analysis results

### Deceptive Line Identification Output

- **Format:** Console output with severity-based formatting
- **Fields:** Node ID, bookmaker, market ID, displayed/actual liquidity, discrepancy, bait line flag, probe results, severity score

### Auto-Trader Output

- **Format:** Console output with execution summaries
- **Fields:** Opportunity ID, success status, profit, capital used, execution time, error messages

---

## Performance Considerations

- **Database Connections:** Scripts use SQLite with WAL mode for concurrent access
- **Memory Usage:** Large scans may require significant memory; consider filtering by sport category or time window
- **Execution Time:** Comprehensive analysis with orchestrator may take several minutes per event
- **Alert Processing:** Alert evaluation adds minimal overhead (< 10ms per event)

---

## Troubleshooting

### Common Issues

1. **Alert Config Not Found**
   - Ensure `config/advanced-research-alerts.yaml` exists
   - Check file permissions
   - Verify YAML syntax is valid

2. **Database Locked**
   - Ensure only one instance of a script runs at a time
   - Check for stale database connections
   - Use WAL mode for better concurrency

3. **No Events Found**
   - Verify database contains shadow graph data
   - Check event identifier filters
   - Ensure nodes have been populated

4. **Alert Evaluation Errors**
   - Check evaluator function syntax
   - Verify context variables match evaluator expectations
   - Review alert configuration for typos

---

## Related Documentation

- [Shadow Graph System](SHADOW-GRAPH-SYSTEM.md) - Core shadow graph architecture
- [Advanced Detection System](ADVANCED-DETECTION-SYSTEM.md) - Detection component details
- [Multi-Layer Correlation System](1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md) - Correlation analysis
- [Research System](../.claude/RESEARCH-SYSTEM.md) - Research infrastructure overview
- [Alert Configuration](../config/advanced-research-alerts.yaml) - Alert rule examples
- [Communication & Notification](9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md) - Telegram integration patterns and topic management
- [RFC 001 Deep-Link Standard](rfc/001-telegram-deeplink-standard.md) - Deep-link format specification
- [RFC 001 Integration Summary](9.1.1.9.1-RFC-INTEGRATION-SUMMARY.md) - RFC 001 integration details

---

## Status

✅ **Production Ready**
- All scripts tested and validated
- Alert system integrated and functional
- Orchestrator integration complete
- Cron-ready configurations provided
- Comprehensive error handling implemented

**Version:** 1.0.0  
**Last Updated:** 2025-01-XX  
**Maintainer:** Research Team
