-- MLGS MultiLayerGraph Database Schema
-- Production-ready schema for sportsbook arbitrage detection

-- Nodes table: Stores graph nodes across all layers
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    layer_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    metadata TEXT NOT NULL,
    layer_weights TEXT,
    anomaly_score REAL DEFAULT 0,
    last_updated INTEGER NOT NULL,
    UNIQUE(layer_id, node_id)
);

-- Edges table: Stores graph edges with arbitrage weights
CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    layer_id TEXT NOT NULL,
    edge_id TEXT NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    type TEXT NOT NULL,
    weight REAL NOT NULL,
    confidence REAL NOT NULL,
    latency INTEGER NOT NULL,
    metadata TEXT NOT NULL,
    detected_at INTEGER NOT NULL,
    last_verified INTEGER NOT NULL,
    FOREIGN KEY(source) REFERENCES nodes(node_id),
    FOREIGN KEY(target) REFERENCES nodes(node_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_nodes_layer ON nodes(layer_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_anomaly ON nodes(anomaly_score DESC);
CREATE INDEX IF NOT EXISTS idx_edges_layer ON edges(layer_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
CREATE INDEX IF NOT EXISTS idx_edges_weight ON edges(weight DESC);
CREATE INDEX IF NOT EXISTS idx_edges_confidence ON edges(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_edges_detected ON edges(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_edges_arbitrage ON edges(layer_id, weight) WHERE layer_id = 'L1_DIRECT' AND weight > 0.025;

-- Hidden edges view: Pre-computed hidden arbitrage opportunities
CREATE VIEW IF NOT EXISTS hidden_edges_view AS
SELECT 
    e.*,
    n1.data as source_data,
    n2.data as target_data,
    (e.weight * e.confidence * 
     COALESCE((SELECT weight FROM edges e2 
              WHERE e2.source = e.target 
              ORDER BY e2.detected_at DESC LIMIT 1), 1.0)) as anomaly_score
FROM edges e
JOIN nodes n1 ON e.source = n1.node_id
JOIN nodes n2 ON e.target = n2.node_id
WHERE e.confidence > 0.85
  AND e.layer_id IN ('L4_SPORT', 'L3_EVENT')
  AND e.weight > 0.02
  AND e.detected_at > datetime('now', '-1 hour');

-- Live arbitrage view: Direct arbitrage opportunities
CREATE VIEW IF NOT EXISTS live_arbitrage_view AS
SELECT 
    e.*,
    n1.data as source_data,
    n2.data as target_data,
    e.weight * 100 as arbitrage_percent
FROM edges e
JOIN nodes n1 ON e.source = n1.node_id
JOIN nodes n2 ON e.target = n2.node_id
WHERE e.layer_id = 'L1_DIRECT'
  AND e.weight > 0.025
  AND e.confidence > 0.95
  AND e.detected_at > datetime('now', '-5 minutes');

-- Graph metrics view: Real-time statistics
CREATE VIEW IF NOT EXISTS graph_metrics_view AS
SELECT 
    (SELECT COUNT(*) FROM nodes) as node_count,
    (SELECT COUNT(*) FROM edges) as edge_count,
    (SELECT COUNT(*) FROM edges WHERE confidence > 0.9 AND layer_id IN ('L4_SPORT', 'L3_EVENT')) as hidden_edges,
    (SELECT COUNT(*) FROM edges WHERE layer_id = 'L1_DIRECT' AND weight > 0.025) as live_arbs,
    strftime('%s', 'now') * 1000 as scan_timestamp;
