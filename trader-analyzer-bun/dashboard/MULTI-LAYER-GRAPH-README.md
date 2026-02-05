# Multi-Layer Correlation Graph - Developer Visualization Dashboard

**Interactive web-based visualization dashboard for the Multi-Layer Correlation Graph system**

---

## Quick Start

Simply open `dashboard/multi-layer-graph.html` in your browser:

```bash
# macOS
open dashboard/multi-layer-graph.html

# Linux
xdg-open dashboard/multi-layer-graph.html

# Windows
start dashboard/multi-layer-graph.html

# Or just double-click the file
```

The dashboard works standalone but connects to the API server for live data.

---

## Features

### ✅ Interactive Graph Visualization
- **vis.js Network** - High-performance graph rendering
- **4-Layer Visualization** - Color-coded layers (L1-L4)
- **Real-time Updates** - Live anomaly streaming
- **Interactive Controls** - Zoom, pan, drag nodes

### ✅ Layer Management
- **Layer Filters** - Toggle individual layers on/off
- **Layer Colors**:
  - Layer 1 (Direct): Red (#FF6B6B)
  - Layer 2 (Cross-Market): Teal (#4ECDC4)
  - Layer 3 (Cross-Event): Blue (#45B7D1)
  - Layer 4 (Cross-Sport): Green (#96CEB4)

### ✅ Filtering & Controls
- **Confidence Filter** - Slider to filter edges by confidence (0.0 - 1.0)
- **Layer Toggle** - Enable/disable specific layers
- **Event ID Input** - Load graphs for specific events

### ✅ Real-Time Streaming
- **Start Streaming** - Polls for updates every 5 seconds
- **Stop Streaming** - Pause real-time updates
- **Auto Refresh** - Automatically updates graph data

### ✅ Node & Edge Details
- **Click Nodes** - View node details (ID, label, layer, type)
- **Click Edges** - View edge details (source, target, confidence, latency)
- **Hover Tooltips** - Quick info on hover

### ✅ Export Capabilities
- **Export JSON** - Download graph data as JSON
- **Export GraphML** - Download graph data as GraphML (for external tools)

### ✅ Statistics Dashboard
- **Total Nodes** - Number of nodes in graph
- **Total Edges** - Number of edges in graph
- **Total Anomalies** - Number of detected anomalies
- **Average Confidence** - Mean confidence across all edges
- **Layer Statistics** - Edge count per layer

---

## Usage

### Loading a Graph

1. **Enter Event ID** in the input field (e.g., `nba-lakers-warriors-2024-01-15`)
2. **Click "Load Graph"** to fetch and render the graph
3. The graph will be displayed with all enabled layers

### Filtering

1. **Confidence Filter**: Use the slider to filter edges by minimum confidence
2. **Layer Filters**: Check/uncheck layers to show/hide specific layers
3. Filters apply immediately to the current graph

### Real-Time Streaming

1. **Enter Event ID** and load initial graph
2. **Click "Start Streaming"** to begin real-time updates
3. Graph updates automatically every 5 seconds
4. **Click "Stop Streaming"** to pause updates

### Exploring the Graph

- **Zoom**: Scroll wheel or pinch gesture
- **Pan**: Click and drag background
- **Move Nodes**: Click and drag nodes
- **View Details**: Click on nodes or edges to see details panel
- **Reset View**: Double-click background to reset zoom/pan

### Exporting Data

1. **Export JSON**: Downloads current graph data as JSON file
2. **Export GraphML**: Downloads graph in GraphML format (compatible with yEd, Gephi, etc.)

---

## API Integration

The dashboard connects to the API server at `http://localhost:3001` (or port 3000) and uses:

### MCP Tools Endpoints

- `POST /api/mcp/tools/research-build-multi-layer-graph`
  - Builds complete multi-layer graph
  - Returns visualization data (nodes, edges, statistics)

- `POST /api/mcp/tools/research-generate-visualization`
  - Generates visualization data
  - Supports JSON and GraphML formats

### Fallback Behavior

If MCP tools are unavailable, the dashboard will:
1. Show error message
2. Attempt direct API calls
3. Display connection status

---

## Graph Structure

### Nodes
- **ID**: Unique node identifier
- **Label**: Display name (extracted from node ID)
- **Layer**: Layer number (1-4)
- **Type**: Node type (event, market, sport, entity)
- **Size**: Visual size (based on connections)

### Edges
- **Source/Target**: Node IDs
- **Layer**: Layer number (1-4)
- **Type**: Edge type (cross_sport, cross_event, cross_market, direct_latency)
- **Confidence**: Confidence score (0.0 - 1.0)
- **Latency**: Propagation latency in milliseconds
- **Color**: Based on confidence (red=high, orange=medium, yellow=low)

---

## Keyboard Shortcuts

- **Click Node**: Show node details
- **Click Edge**: Show edge details
- **Click Background**: Hide details panel
- **Scroll**: Zoom in/out
- **Drag**: Pan graph
- **Double-click Background**: Reset view

---

## Configuration

### API Base URL

The dashboard automatically detects the API port:
- Port 3000 → `http://localhost:3000`
- Port 3001 → `http://localhost:3001`

To change manually, edit the `API_BASE` constant in the script:

```javascript
const API_BASE = 'http://localhost:YOUR_PORT';
```

### Streaming Interval

Default: 5 seconds

To change, modify the `setInterval` call in `startStreaming()`:

```javascript
streamingInterval = setInterval(async () => {
    await loadGraph();
}, YOUR_INTERVAL_MS); // Change 5000 to your desired interval
```

---

## Troubleshooting

### Graph Not Loading

1. **Check API Server**: Ensure API server is running (`bun run dev`)
2. **Check Event ID**: Verify event ID format is correct
3. **Check Console**: Open browser console (F12) for error messages
4. **Check Network**: Verify API endpoints are accessible

### No Data Displayed

1. **Check Filters**: Ensure layers are enabled and confidence threshold isn't too high
2. **Check Event ID**: Verify event has correlation data
3. **Check API Response**: Verify API returns visualization data

### Streaming Not Working

1. **Check Connection**: Verify API server is running
2. **Check Event ID**: Ensure valid event ID is entered
3. **Check Console**: Look for error messages in browser console

---

## Integration with Existing System

This dashboard integrates with:

- ✅ `MultiLayerCorrelationGraph` - Core graph builder
- ✅ `MultiLayerVisualizationGenerator` - Visualization data generator
- ✅ `RealTimeAnomalyStreamer` - Real-time streaming
- ✅ MCP Research Tools - API endpoints
- ✅ Database - Correlation storage

---

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 (not supported)

---

## Performance

- **Graph Size**: Handles up to 10,000 nodes efficiently
- **Rendering**: Uses vis.js optimized rendering
- **Updates**: Smooth updates with data set operations
- **Memory**: Efficient memory usage with data set clearing

---

## Future Enhancements

Potential improvements:
- [ ] 3D graph visualization
- [ ] Animation for propagation paths
- [ ] Historical playback
- [ ] Custom layouts (force, hierarchical, circular)
- [ ] Search/filter nodes by name
- [ ] Cluster detection visualization
- [ ] Export to PNG/SVG
- [ ] Shareable graph URLs

---

## Related Documentation

- `docs/MULTI-LAYER-CORRELATION-GRAPH.md` - System documentation
- `docs/MULTI-LAYER-CORRELATION-IMPLEMENTATION-COMPLETE.md` - Implementation report
- `src/arbitrage/shadow-graph/multi-layer-visualization.ts` - Visualization generator
- `src/mcp/tools/multi-layer-correlation.ts` - MCP tools

---

**Built for NEXUS Trading Intelligence Platform**  
**Multi-Layer Correlation Graph System v1.0**
