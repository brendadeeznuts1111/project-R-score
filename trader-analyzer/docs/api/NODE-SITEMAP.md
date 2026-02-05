# Node Sitemap & Manifest

**Hierarchical visualization of sub-market nodes with tension detection**

---

## Overview

The Node Sitemap provides a complete hierarchical view of sub-market nodes, showing:

- ✅ **Parent-Child Relationships** - Tree structure of nodes
- ✅ **Tension Events** - Conflicts between related nodes
- ✅ **Node Properties** - All properties with types
- ✅ **Graph Traversal** - Paths through the node graph
- ✅ **Visual Hierarchy** - Color-coded by depth and tension

---

## API Endpoints

### Get Sitemap

```http
GET /research/sitemap/:eventId
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "eventId": "EVENT123",
    "rootNodes": [...],
    "totalNodes": 45,
    "totalTensions": 3,
    "maxDepth": 3,
    "generatedAt": "2025-01-04T12:00:00Z"
  }
}
```

### Get Node Path

```http
GET /research/sitemap/:eventId/node/:nodeId
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "nodeId": "node_123",
    "path": [...],
    "children": [...],
    "totalChildren": 5
  }
}
```

### Get Tension Nodes

```http
GET /research/sitemap/:eventId/tensions
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "eventId": "EVENT123",
    "tensionNodes": [...],
    "totalTensions": 3
  }
}
```

---

## Node Manifest Structure

Each node in the sitemap includes:

```typescript
interface NodeManifest {
  nodeId: string;                    // Unique node ID
  eventId: string;                   // Event identifier
  marketId: string;                  // Market ID
  bookmaker: string;                 // Bookmaker name
  period: string;                    // Period (full, first_half, etc.)
  baseLineType: string;              // Type (spread, total, moneyline, prop)
  parentNodeId: string | null;       // Parent node reference
  children: NodeManifest[];           // Child nodes (recursive)
  properties: {
    impliedVolume: number | null;
    numberOfMoves: number;
    velocity: number;
    juiceVolatility: number;
    arbitragePressure: number;
    tensionScore: number;
    lastLine: number | null;
    lastOdds: number | null;
    lastMoveTimestamp: number | null;
  };
  tensions: TensionEvent[];           // Active tension events
  edges: Array<{                     // Graph edges
    edgeId: string;
    toNodeId: string;
    relationshipType: string;
    correlationCoefficient: number | null;
    confidence: number;
  }>;
  depth: number;                      // Depth in tree (0 = root)
  path: string[];                    // Path from root to this node
}
```

---

## Tension Types

The sitemap highlights these tension types:

1. **line_divergence** - Lines not mathematically consistent
2. **liquidity_imbalance** - One node has 10x volume of related node
3. **temporal_desync** - Related nodes moving out of sync
4. **arbitrage_rupture** - Arb opportunity > 3%
5. **bookmaker_confusion** - Same book has conflicting lines

---

## Dashboard Integration

The dashboard includes a sitemap section:

1. **Enter Event ID** - Input field for event ID
2. **Load Sitemap** - Fetches and displays node hierarchy
3. **Visual Tree** - Color-coded nodes with properties
4. **Tension Highlighting** - Nodes with tensions are highlighted in red
5. **Property Display** - All properties shown with types

### Color Coding

- **Cyan (#00d4ff)** - Node IDs and structure
- **Green (#00ff88)** - Node types
- **Orange (#ff6b00)** - Periods
- **Magenta (#ff00ff)** - Properties
- **Red (#ff1744)** - High severity tensions
- **Yellow (#ffeb3b)** - Medium severity tensions

---

## Usage Examples

### Generate Sitemap

```typescript
import { NodeSitemapGenerator } from "./research/sitemap";
import { initializeResearchSchema } from "./research/schema/sub-market-nodes";

const db = initializeResearchSchema();
const generator = new NodeSitemapGenerator(db);

const sitemap = generator.generateSitemap("EVENT123");
console.log(`Total nodes: ${sitemap.totalNodes}`);
console.log(`Total tensions: ${sitemap.totalTensions}`);
```

### Get Node Tree

```typescript
const tree = generator.getNodeTree("EVENT123");
// Returns array of root nodes with nested children
```

### Get All Children

```typescript
const children = generator.getAllChildren("node_123", "EVENT123");
// Returns all descendant nodes recursively
```

### Get Node Path

```typescript
const path = generator.getNodePath("node_456", "EVENT123");
// Returns breadcrumb trail from root to node
```

### Get Tension Nodes

```typescript
const tensionNodes = generator.getTensionNodes("EVENT123");
// Returns only nodes with active tensions
```

---

## Visual Features

### Node Display

- **Node ID** - Cyan, bold
- **Type Badge** - Green background
- **Period** - Orange text
- **Properties** - Magenta labels, green values
- **Tension Badges** - Color-coded by severity

### Hierarchy Visualization

- **Indentation** - Shows depth level
- **Dashed Borders** - Separate parent/child groups
- **Tension Highlighting** - Red border and glow for nodes with tensions
- **Property Nesting** - Properties indented under nodes

---

## Relationship Types

Nodes can have these relationship types:

- `parent_child` - Full game → Half time
- `correlated` - Moves together
- `anti_correlated` - Moves opposite
- `derivative` - Derived from another
- `arbitrage_pair` - Creates arb opportunity
- `temporal_lead` - One leads the other
- `liquidity_sink` - One drains liquidity from another

---

## See Also

- `src/research/tension/tension-detector.ts` - Tension detection engine
- `src/research/schema/sub-market-nodes.ts` - Node schema
- `src/research/sitemap.ts` - Sitemap generator implementation
