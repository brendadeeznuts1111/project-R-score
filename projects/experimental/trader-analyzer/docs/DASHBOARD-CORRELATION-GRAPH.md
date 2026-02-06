# Dashboard Correlation Graph

**Version**: 4.2.2.4.0.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2025-01-15

## Overview

The Correlation Graph Dashboard provides an interactive visualization of multi-layer correlations between bookmakers, events, and anomalies detected in the trading system. It aggregates data from line movement audits and URL anomaly detection to build a comprehensive graph showing relationships across 4 layers of correlation.

## Strategic Benefits (4.2.2.5.0.0.0)

### 4.2.2.5.1.0.0 Holistic Insight
Provides an unparalleled, consolidated view of complex relationships across previously siloed data, enabling a holistic understanding of Hyper-Bun's operational dynamics and market interactions. The graph visualizes connections between:
- Bookmaker API calls and response patterns
- Anomaly detections and line movements
- Performance metrics and system events
- Cross-market correlations

### 4.2.2.5.2.0.0 Accelerated Root Cause Analysis
Visually identifying strong correlations between (e.g.) a sudden spike in `deepProbeMarketOfferings` latency and a subsequent `CovertSteamEvent` simplifies root cause analysis for anomalous system or market behavior. The graph enables:
- Quick identification of correlated events
- Visual timeline of relationship patterns
- Severity-based filtering to focus on critical issues
- Layer-based analysis to understand propagation paths

### 4.2.2.5.3.0.0 Enhanced Pattern Discovery
Facilitates the discovery of new, multi-layered correlation patterns that might not be evident from individual data streams. Features include:
- Cross-layer correlation detection
- Bookmaker relationship mapping
- Anomaly pattern visualization
- Time-based correlation analysis

### 4.2.2.5.4.0.0 Improved Debugging & Optimization
Developers can use the graph to understand the impact of code changes or system events on a wider range of metrics, leading to more targeted optimizations. The dashboard helps:
- Identify performance bottlenecks through latency visualization
- Track correlation changes over time windows
- Analyze bookmaker response patterns
- Optimize system performance based on correlation insights

## Quick Start

### Accessing the Dashboard

1. **Via Main Dashboard**: Navigate to the main dashboard and click the "🔗 Correlation Graph" link in the navigation bar
2. **Direct URL**: `/dashboard/correlation-graph.html?event_id=YOUR_EVENT_ID&time_window=24`

### Required Parameters

- `event_id` (required): Event identifier matching pattern `/^[a-z]+-[\w-]{6,}$/`
  - Example: `nba-lakers-warriors-2024-01-15`
  - Must be 10-100 characters
- `time_window` (optional): Hours to look back (default: 24)
  - Range: 1-168 hours (7 days)
  - Example: `?time_window=48` for 48 hours

### Example Usage

```text
/dashboard/correlation-graph.html?event_id=nba-lakers-warriors-2024-01-15&time_window=24
```

## Features

### Interactive Graph Visualization

- **vis.js Network**: High-performance graph rendering supporting 1000+ nodes
- **Force-directed layout**: Automatic node positioning with physics simulation
- **Real-time filtering**: Update graph display without reloading data
- **Node hover tooltips**: Quick information on hover
- **Node click details**: Full information panel on click

### Filter Controls

#### Layer Filter
- Toggle visibility of layers 1-4
- Each layer color-coded:
  - **Layer 1**: Red (#ef4444) - Direct anomaly detection
  - **Layer 2**: Teal (#14b8a6) - Cross-bookmaker correlation within same event
  - **Layer 3**: Blue (#3b82f6) - Cross-event correlation
  - **Layer 4**: Green (#10b981) - Cross-market correlation
- Shows node and edge counts per layer

#### Bookmaker Filter
- Multi-select dropdown
- Filter nodes by bookmaker name
- Shows count of nodes per bookmaker
- Updates graph in real-time

#### Severity Filter
- Filter by severity level: All, Low, Medium, High, Critical
- Color-coded buttons for easy selection
- Updates node visibility based on severity

#### Correlation Strength Filter
- Range slider (0.0 - 1.0)
- Filters edges by minimum correlation strength
- Updates edge visibility and thickness
- Shows current minimum value

### Node Details Panel

Click any node to view detailed information:

- **Node ID**: Unique identifier
- **Label**: Human-readable label
- **Layer**: Correlation layer (1-4)
- **Bookmaker**: Associated bookmaker (if applicable)
- **Severity**: Threat severity level
- **Correlation Strength**: Node's correlation strength (0-1)
- **Anomaly Count**: Number of anomalies detected
- **Movement Count**: Number of line movements
- **Threat Level**: Threat classification
- **Last Seen**: Timestamp of last activity
- **Deeplink Button**: Open node in main dashboard with context

### Graph Statistics

Header displays:
- **Event ID**: Current event being analyzed
- **Time Window**: Hours of data included
- **Node Count**: Total nodes in graph
- **Edge Count**: Total edges (connections) in graph

## API Reference

### Endpoint

```text
GET /api/dashboard/correlation-graph
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `event_id` | string | Yes | - | Event identifier (10-100 chars, pattern: `/^[a-z]+-[\w-]{6,}$/`) |
| `time_window` | number | No | 24 | Hours to look back (1-168) |

### Response Format

```typescript
{
  eventId: string;
  timeWindow: number;
  generatedAt: number;
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
  layers: LayerSummary[];
  statistics: GraphStatistics;
}
```

### Example Response

```json
{
  "eventId": "nba-lakers-warriors-2024-01-15",
  "timeWindow": 24,
  "generatedAt": 1705276800000,
  "nodes": [
    {
      "id": "pinnacle-nba-lakers-warriors-2024-01-15",
      "label": "pinnacle (nba-lake)",
      "layer": 1,
      "bookmaker": "pinnacle",
      "severity": "medium",
      "correlationStrength": 0.75,
      "summaryData": {
        "anomalyCount": 5,
        "movementCount": 12,
        "threatLevel": "medium",
        "lastSeen": 1705276800000
      },
      "deeplinkUrl": "/dashboard?deeplink=event_id%3D..."
    }
  ],
  "edges": [
    {
      "id": "pinnacle-draftkings-edge",
      "source": "pinnacle-nba-lakers-warriors-2024-01-15",
      "target": "draftkings-nba-lakers-warriors-2024-01-15",
      "layer": 2,
      "correlationStrength": 0.65,
      "confidence": 0.52
    }
  ],
  "layers": [
    {
      "layer": 1,
      "nodeCount": 5,
      "edgeCount": 8,
      "avgCorrelationStrength": 0.72
    }
  ],
  "statistics": {
    "totalNodes": 28,
    "totalEdges": 52,
    "avgCorrelationStrength": 0.58,
    "maxCorrelationStrength": 0.95,
    "bookmakers": ["pinnacle", "draftkings", "betfair"],
    "timeRange": {
      "start": 1705190400000,
      "end": 1705276800000
    }
  }
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "error": "event_id query parameter is required"
}
```

```json
{
  "error": "Invalid event_id format. Must be 10-100 characters matching pattern: /^[a-z]+-[\\w-]{6,}$/"
}
```

```json
{
  "error": "Invalid time_window. Must be a number between 1 and 168 (7 days)"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to generate correlation graph data"
}
```

## Performance Considerations

### Caching

- API responses are cached for 5 minutes
- Cache key: `correlation-graph:${eventId}:${timeWindow}`
- Cache automatically invalidates on new data insertion
- Manual cache invalidation available via `invalidateCache()` function

### Database Optimization

- Uses indexed queries on `eventId`, `timestamp`, and `bookmaker`
- Prepared statements for repeated queries
- Batch aggregations in single query where possible
- Supports datasets with 10K+ nodes

### Frontend Performance

- Debounced filter updates (300ms delay)
- Efficient vis.js rendering (60fps for 1000+ nodes)
- Lazy loading of node details
- Optimized graph layout calculations

## Troubleshooting

### Graph Not Loading

1. **Check event_id format**: Must match pattern `/^[a-z]+-[\w-]{6,}$/`
2. **Verify database tables exist**: Ensure `line_movement_audit_v2` and `url_anomaly_audit` tables are initialized
3. **Check time_window range**: Must be between 1-168 hours
4. **Review browser console**: Check for JavaScript errors

### No Nodes Displayed

1. **Verify data exists**: Check database for entries matching event_id and time_window
2. **Check filters**: Ensure filters aren't hiding all nodes
3. **Reset filters**: Uncheck all layer filters, select "All" severity, set correlation slider to 0

### Performance Issues

1. **Reduce time_window**: Use smaller time windows for faster queries
2. **Filter data**: Use bookmaker and severity filters to reduce node count
3. **Clear cache**: If data seems stale, wait for cache expiration (5 minutes)

## Integration

### Deeplink Integration

Nodes include deeplink URLs that can be used to navigate to the main dashboard with context:

```javascript
// Example deeplink URL format
/dashboard?deeplink=event_id%3Dnba-lakers-warriors-2024-01-15%26node_id%3Dpinnacle-nba-lakers-warriors-2024-01-15%26bookmaker%3Dpinnacle
```

The main dashboard should parse these parameters and highlight relevant data.

### Programmatic Access

```typescript
// Fetch graph data
const response = await fetch(
  `/api/dashboard/correlation-graph?event_id=${eventId}&time_window=24`
);
const graphData = await response.json();

// Use graph data
console.log(`Total nodes: ${graphData.statistics.totalNodes}`);
console.log(`Total edges: ${graphData.statistics.totalEdges}`);
```

## Related Documentation

- [Multi-Layer Correlation Engine](../src/analytics/correlation-engine.ts)
- [Database Initialization](../src/utils/database-initialization.ts)
- [API Documentation](../src/api/docs.ts)
- [Main Dashboard](./dashboard/index.html)

## Support

For issues or questions:
1. Check browser console for errors
2. Review API response for error messages
3. Verify database tables are initialized
4. Check event_id format and time_window range

## Changelog

### 4.2.2.4.0.0.0 (2025-01-15)
- Initial release
- Interactive graph visualization with vis.js
- Layer, bookmaker, severity, and correlation filtering
- Node details panel with deeplink integration
- API endpoint with caching
- Comprehensive documentation
