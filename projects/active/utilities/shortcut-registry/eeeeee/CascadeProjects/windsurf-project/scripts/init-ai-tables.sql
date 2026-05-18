-- Nebula-Flow™ AI Database Schema
CREATE TABLE IF NOT EXISTS model_versions (
    version TEXT PRIMARY KEY,
    accuracy REAL,
    precision REAL,
    recall REAL,
    loss REAL,
    samples INTEGER,
    size_kb INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anomaly_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    score REAL,
    nebula_code TEXT,
    risk_reasons TEXT,
    amount REAL,
    recommendation TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT,
    accuracy REAL,
    loss REAL,
    samples INTEGER,
    training_time INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
