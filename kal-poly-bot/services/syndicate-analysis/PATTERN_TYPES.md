# Enhanced Pattern Types for Syndicate Analysis

This document defines all analytical patterns used by the system, specifying their attributes from a development and architectural perspective.

## Pattern Metadata Fields

- **Grading**: Importance/severity (Critical, High, Medium, Low)
- **Priority**: Development priority (P1, P2, P3, P4)
- **Category**: Pattern nature (Analytical, Real-Time, Financial, Fraud, Competitive)
- **Content Type**: Data format (Structured Data, Time-series Data, Streaming Data)
- **Protocol Type**: Data access method (N/A, DB, WebSocket, HTTP, File I/O)

## Pattern Registry

| Pattern Type | Domain | Detection Method | Typical Use Case | Confidence Range | Grading | Priority | Category | Content Type | Protocol Type |
|:------------|:--------|:------------------|:-----------------|:------------------|:------------|:------------|:----------|:-----------------|:------------------|
| **betting_frequency** | Sports Betting | Analyzes bet frequency over time (e.g., bets/hr) | Identify high-frequency syndicates | 0.6-0.9 | Medium | P3 | Analytical | Time-series Data | N/A (Internal Logic) |
| **game_selection** | Sports Betting | Tracks preferred games (e.g., top N games, specific leagues) | Detect team/league loyalty or specialization | 0.7-0.9 | Medium | P3 | Analytical | Structured Data | DB |
| **bet_type_preference** | Sports Betting | Analyzes bet type distribution (e.g., moneyline, spread, total) | Identify betting style or strategy | 0.8-0.9 | Medium | P3 | Analytical | Structured Data | DB |
| **real_time_frequency** | Real-Time | Monitors recent betting activity (e.g., bets/min last 5 min) | Detect rapid betting patterns / emerging interest | 0.6-0.8 | High | P2 | Real-Time | Streaming Data | WebSocket |
| **real_time_game_selection** | Real-Time | Analyzes recent game preferences (e.g., trending games) | Identify emerging favorites or market shifts | 0.6-0.8 | High | P2 | Real-Time | Streaming Data | WebSocket |
| **team_loyalty** | Sports Betting | Extracts team from game name & tracks betting frequency | Detect favorite teams / bias | 0.8-0.9 | Medium | P3 | Analytical | Structured Data | DB |
| **late_night_betting** | Sports Betting | Analyzes betting time patterns (e.g., 10 PM - 4 AM local time) | Identify late-night activity / specific regional behavior | 0.7-0.8 | Low | P4 | Analytical | Time-series Data | N/A (Internal Logic) |
| **large_volume_trader** | Financial | Detects single/aggregated large bet amounts (e.g., >$10k) | Identify institutional players or significant market movers | 0.9-0.95 | Critical | P1 | Financial | Structured Data | DB |
| **market_hours_trading** | Financial | Analyzes betting time patterns during specific market hours | Detect activity during peak market liquidity | 0.8-0.85 | Low | P4 | Financial | Time-series Data | N/A (Internal Logic) |
| **correlated_trading** | Financial | Finds correlated bet movements/volumes across assets/games | Identify coordinated trading or shared information | 0.85-0.9 | High | P2 | Financial | Time-series Data | DB |
| **high_risk_betting** | Fraud Detection | Detects high amount + high odds combination | Identify potential fraud attempts / unusual risk profiles | 0.9-0.95 | Critical | P1 | Fraud | Structured Data | DB |
| **rapid_betting** | Fraud Detection | Monitors betting speed (e.g., >5 bets/sec, >10 bets/min) | Detect bot activity or account compromise | 0.85-0.9 | Critical | P1 | Fraud | Streaming Data | WebSocket |
| **consistent_losing** | Fraud Detection | Analyzes long-term results (e.g., >70% loss rate over 100 bets) | Identify potential money laundering or account abuse | 0.9-0.95 | Critical | P1 | Fraud | Structured Data | DB |
| **aggressive_betting** | Competitive | Analyzes bet amounts & frequency (e.g., average bet size, bet cadence) | Identify aggressive players or strategies | 0.8-0.85 | Medium | P3 | Competitive | Structured Data | DB |
| **high_risk_tolerance** | Competitive | Analyzes odds preferences (e.g., avg odds bet, % of high odds) | Identify risk-tolerant players/syndicates | 0.9-0.9 | Medium | P3 | Competitive | Structured Data | DB |
| **consistent_risk_profile** | Competitive | Analyzes consistency of odds and bet amount preferences | Identify stable player strategy or behavioral shift | 0.85-0.9 | Low | P4 | Competitive | Time-series Data | DB |

## Grading Definitions

- **Critical**: Essential for core functionality, security, or preventing major losses
- **High**: Very important for primary analytical objectives or real-time insights
- **Medium**: Valuable for deeper analysis, user profiling, or secondary objectives
- **Low**: Useful for tertiary insights, long-term trends, or niche optimizations

## Priority Definitions

- **P1**: Must-have for MVP, security, or immediate impact
- **P2**: High value, should be implemented soon after P1
- **P3**: Important for full feature set, can be in later iterations
- **P4**: Lower urgency, for future enhancements or deeper insights

## Category Definitions

- **Analytical**: Involves historical data processing, batch analysis
- **Real-Time**: Involves immediate processing of streaming data
- **Financial**: Specific to financial trading concepts
- **Fraud**: Specific to fraud detection logic
- **Competitive**: Specific to competitive analysis or player profiling

## Content Type Definitions

- **Structured Data**: Tabular, well-defined fields (e.g., bet records)
- **Time-series Data**: Sequential data points indexed by time (e.g., odds movements)
- **Streaming Data**: Continuous flow of data, often processed in windows

## Protocol Type Definitions

- **N/A (Internal Logic)**: Primarily operates on data already ingested/cached internally
- **DB**: Primarily accesses data from a database
- **WebSocket**: Primarily consumes real-time data streams via WebSockets
- **HTTP**: Might involve external HTTP calls for specific data
- **File I/O**: Accesses data from file system

## Implementation Priority Order

### Phase 1 (P1 - Critical)
1. `large_volume_trader` - Critical, Financial
2. `high_risk_betting` - Critical, Fraud
3. `rapid_betting` - Critical, Fraud
4. `consistent_losing` - Critical, Fraud

### Phase 2 (P2 - High Value)
5. `real_time_frequency` - High, Real-Time
6. `real_time_game_selection` - High, Real-Time
7. `correlated_trading` - High, Financial

### Phase 3 (P3 - Important Features)
8. `betting_frequency` - Medium, Analytical
9. `game_selection` - Medium, Analytical
10. `bet_type_preference` - Medium, Analytical
11. `team_loyalty` - Medium, Analytical
12. `aggressive_betting` - Medium, Competitive
13. `high_risk_tolerance` - Medium, Competitive

### Phase 4 (P4 - Future Enhancements)
14. `late_night_betting` - Low, Analytical
15. `market_hours_trading` - Low, Financial
16. `consistent_risk_profile` - Low, Competitive

## Usage Example

```typescript
import { PATTERN_REGISTRY, getPatternsByPriority, getCriticalPatterns } from './pattern-registry';

// Get pattern metadata
const metadata = PATTERN_REGISTRY['large_volume_trader'];
console.log(metadata.grading); // 'Critical'
console.log(metadata.priority); // 'P1'

// Get all P1 patterns
const p1Patterns = getPatternsByPriority('P1');

// Get all critical patterns
const criticalPatterns = getCriticalPatterns();
```
