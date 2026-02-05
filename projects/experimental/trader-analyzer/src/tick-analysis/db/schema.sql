-- SQLite 3.51.1 with WAL mode and EXISTS-to-JOIN optimization
-- Version: 6.1.1.2.2.8.1.1.2.9.2

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -20000; -- 20MB cache
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB memory mapping

-- 6.1.1.2.2.8.1.1.2.9.2.1: Core tick data table (partitioned by time)
CREATE TABLE IF NOT EXISTS tick_data_partitioned (
  -- Core fields (optimized for storage)
  partition_date DATE NOT NULL, -- YYYY-MM-DD for partitioning
  timestamp_ms INTEGER NOT NULL,
  timestamp_ns INTEGER,
  node_id TEXT NOT NULL COLLATE NOCASE,
  bookmaker TEXT NOT NULL CHECK(bookmaker IN ('DRAFTKINGS','FANDUEL','BETMGM','CAESARS','BARSTOOL','BET365')),
  market_id TEXT NOT NULL,

  -- Price data (compressed storage)
  price REAL NOT NULL,
  odds INTEGER NOT NULL,
  volume_usd REAL,

  -- Metadata (bit-packed)
  tick_count INTEGER DEFAULT 1 CHECK(tick_count BETWEEN 1 AND 1000),
  flags INTEGER DEFAULT 0,
  sequence_number INTEGER,

  -- Composite primary key for fast lookups
  PRIMARY KEY (partition_date, node_id, timestamp_ms, sequence_number)
) WITHOUT ROWID;

-- 6.1.1.2.2.8.1.1.2.9.2.2: EXISTS-to-JOIN optimized indexes
CREATE INDEX IF NOT EXISTS idx_tick_time_range ON tick_data_partitioned (
  partition_date,
  timestamp_ms DESC
) WHERE timestamp_ms > unixepoch('now', '-24 hours');

-- Covering index for correlation queries (avoids table scans)
CREATE INDEX IF NOT EXISTS idx_tick_correlation_cover ON tick_data_partitioned (
  node_id,
  timestamp_ms DESC,
  price,
  volume_usd
) WHERE volume_usd IS NOT NULL;

-- Bookmaker-specific index for feed monitoring
CREATE INDEX IF NOT EXISTS idx_tick_bookmaker_realtime ON tick_data_partitioned (
  bookmaker,
  timestamp_ms DESC
) WHERE timestamp_ms > unixepoch('now', '-5 minutes');

-- Spatial index for price-time clustering
CREATE INDEX IF NOT EXISTS idx_tick_price_time_cluster ON tick_data_partitioned (
  node_id,
  ROUND(price, 1), -- Cluster by price bucket (±0.1)
  timestamp_ms DESC
);

-- 6.1.1.2.2.8.1.1.2.9.2.3: Materialized view with automatic refresh
CREATE TABLE IF NOT EXISTS tick_stats_materialized (
  node_id TEXT NOT NULL,
  period_start INTEGER NOT NULL, -- Unix timestamp
  period_end INTEGER NOT NULL,

  -- Aggregated metrics
  tick_count INTEGER NOT NULL,
  volume_total REAL NOT NULL,
  price_min REAL NOT NULL,
  price_max REAL NOT NULL,
  price_avg REAL NOT NULL,
  price_stddev REAL NOT NULL,
  latency_avg_ms REAL,
  latency_p95_ms REAL,
  jitter_coefficient REAL,

  -- Quality metrics
  sharp_tick_count INTEGER DEFAULT 0,
  spoof_tick_count INTEGER DEFAULT 0,
  iceberg_tick_count INTEGER DEFAULT 0,
  retransmission_count INTEGER DEFAULT 0,

  PRIMARY KEY (node_id, period_start)
) WITHOUT ROWID;

-- 6.1.1.2.2.8.1.1.2.9.2.4: Partition management (automatic daily partitioning)
CREATE TABLE IF NOT EXISTS tick_partition_metadata (
  partition_date DATE PRIMARY KEY,
  row_count INTEGER DEFAULT 0,
  size_bytes INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  last_updated INTEGER DEFAULT (unixepoch())
);

-- Auto-create partition for today
INSERT OR IGNORE INTO tick_partition_metadata (partition_date)
VALUES (date('now'));
