# 🛠️ FactoryWager Security Citadel CLI Tools

## Overview

The FactoryWager Security Citadel provides a comprehensive suite of CLI tools for secrets field computation, exposure simulation, ML boosting, and WebSocket benchmarking. These tools enable advanced analysis, testing, and optimization of the secret management system.

## 📋 CLI Tools Summary

| Tool | Purpose | Command | Key Features |
|------|---------|---------|--------------|
| **Secrets Field Compute** | 3D field computation and analysis | `scripts/secrets/secrets-field.ts` | ML-enhanced scoring, benchmarking, risk analysis |
| **Vault Exposure Simulator** | Large-scale exposure simulation | `scripts/secrets/vault-sim.ts` | HyperLogLog tracking, pattern simulation, real-time metrics |
| **ONNX Secret Boost Tester** | ML model testing and comparison | `scripts/secrets/secret-boost.ts` | ONNX integration, performance benchmarking, accuracy testing |
| **WebSocket Benchmark** | WebSocket performance testing | `scripts/analysis/ws-secrets-bench.ts` | Concurrent connections, throughput testing, compression analysis |

---

## 🔍 Secrets Field Compute

### Description
Computes 3D secret field visualizations with ML-enhanced risk scoring and anomaly detection.

### Usage
```bash
bun run scripts/secrets/secrets-field.ts [options]
```

### Key Options
- `--keys <pattern>` - Key pattern to compute (default: all)
- `--exposure <value>` - Main exposure value (0-10)
- `--iterations <num>` - Number of iterations for testing
- `--benchmark` - Run performance benchmark
- `--output <format>` - Output format: console, json, csv

### Examples

**Basic Computation:**
```bash
bun run scripts/secrets/secrets-field.ts --keys factory --exposure 7.5
```

**Performance Benchmark:**
```bash
bun run scripts/secrets/secrets-field.ts --benchmark --iterations 100
```

**JSON Output:**
```bash
bun run scripts/secrets/secrets-field.ts --exposure 8.0 --output json
```

### Sample Output
```text
🔍 Secrets Field Computation
============================

📊 Computing secrets field for: compute-1770347213408
📈 Main exposure: 7.5
🔑 Key pattern: factory

📊 Computation Result:
   Compute Time: 333.16ms
   Max Exposure: 74.8%
   Anomaly: SECURE
   Risk Score: 45.2
   Recommendations: 6
   Field Values:
     Main        : ███████    74.8%
     API         : ██████     65.1%
     Database    : ████████    75.3%
     CSRF        : ███████     65.7%
     Vault       : ████████    81.8%
     Session     : ███████     70.3%
     Encryption  : ██████      55.8%
     Backup      : █████       51.9%
```

---

## 🔥 Vault Exposure Simulator

### Description
Simulates large-scale secret access patterns with Redis HyperLogLog exposure tracking and real-time analytics.

### Usage
```bash
bun run scripts/secrets/vault-sim.ts [options]
```

### Key Options
- `--access <count>` - Total access count (e.g., 20M, 1.5K, 500)
- `--duration <seconds>` - Simulation duration
- `--keys <number>` - Number of unique secret keys
- `--pattern <type>` - Access pattern: uniform, burst, wave, random
- `--realtime` - Show real-time progress

### Access Count Formats
- **Raw numbers**: `1000`, `50000`
- **Kilobytes**: `1K`, `1.5K`
- **Megabytes**: `1M`, `20M`
- **Gigabytes**: `1G`, `2.5G`

### Patterns
- **uniform** - Constant access rate
- **burst** - Periodic high-intensity bursts
- **wave** - Sinusoidal access pattern
- **random** - Random access distribution

### Examples

**Large Scale Simulation:**
```bash
bun run scripts/secrets/vault-sim.ts --access 20M --duration 300 --pattern burst
```

**Real-time Monitoring:**
```bash
bun run scripts/secrets/vault-sim.ts --access 1.5K --realtime --keys 50
```

**High Frequency Test:**
```bash
bun run scripts/secrets/vault-sim.ts --access 500 --rate 100 --pattern wave
```

### Sample Output
```text
🔥 Vault Exposure Simulator
==========================

📊 Simulation Configuration:
   Total Accesses: 20.0M
   Duration: 300s
   Unique Keys: 100
   Rate: 100/s
   Pattern: burst
   Real-time: YES

📊 Progress: 45.0% | Accesses: 9,000,000 | Rate: 100.5/s | Time: 135.0s

📊 Simulation Results:
   Performance Metrics:
   Total Accesses:    20,000,000
   Duration:          300.45s
   Average Rate:      66,578.2/s
   Target Rate:       100/s

   Redis Vault Analytics:
   Total Exposures:   1,847,293
   Risk Score:        67.3/100
   Exposure by Type:
     API         : 234,567  (12.7%)
     Database    : 456,789  (24.7%)
     CSRF        : 123,456  (6.7%)
     Vault       : 567,890  (30.7%)
     Session     : 234,567  (12.7%)
     Encryption  : 123,456  (6.7%)
     Backup      : 89,012   (4.8%)
     Audit       : 17,556   (1.0%)
```

---

## 🧠 ONNX Secret Boost Tester

### Description
Tests and compares ONNX machine learning models against baseline secret field boosting algorithms with performance benchmarking.

### Usage
```bash
bun run scripts/secrets/secret-boost.ts [options]
```

### Key Options
- `--field <file>` - Field data file to test (JSON)
- `--model <path>` - ONNX model path (default: mock)
- `--iterations <num>` - Number of test iterations
- `--benchmark` - Run performance benchmark
- `--compare` - Compare with baseline (default: true)

### Examples

**Test Field File:**
```bash
bun run scripts/secrets/secret-boost.ts --field sample.json --compare
```

**Performance Benchmark:**
```bash
bun run scripts/secrets/secret-boost.ts --benchmark --iterations 1000
```

**Model Comparison:**
```bash
bun run scripts/secrets/secret-boost.ts --model custom-model.onnx --output json
```

### Sample Output
```text
🧠 ONNX Secret Boost Tester
==========================

🤖 Loading ONNX model...
   Model: mock-model.onnx
✅ Model loaded successfully!
   Type: SecretFieldBoost
   Version: 1.0.0
   Accuracy: 94.0%
   Inference Time: ~7ms

📊 Output Comparison:
   Type        | Baseline | ONNX     | Difference
   ------------|----------|----------|-----------
   Main        | 74.8%    | 76.2%    | 0.014    
   API         | 65.1%    | 66.3%    | 0.012    
   Database    | 75.3%    | 77.1%    | 0.018    
   CSRF        | 65.7%    | 66.9%    | 0.012    
   Vault       | 81.8%    | 84.2%    | 0.024    
   Session     | 70.3%    | 71.8%    | 0.015    
   Encryption  | 55.8%    | 57.1%    | 0.013    
   Backup      | 51.9%    | 53.2%    | 0.013    

⚡ Performance:
   Baseline Time: 15.23ms
   ONNX Time:     7.45ms
   Speedup:       2.04x

🧮 Similarity Analysis:
   Average Difference: 0.0150
   Max Difference:     0.0240
   Similarity Score:   98.5%

🏆 Overall Assessment: EXCELLENT
```

---

## 🌐 WebSocket Benchmark

### Description
Comprehensive WebSocket performance testing for 3D secret field streaming with concurrent connections and compression analysis.

### Usage
```bash
bun run scripts/analysis/ws-secrets-bench.ts [options]
```

### Key Options
- `--keys <number>` - Number of keys to simulate
- `--connections <num>` - Concurrent WebSocket connections
- `--duration <seconds>` - Benchmark duration
- `--compression` - Enable data compression
- `--realtime` - Show real-time metrics

### Examples

**Basic Benchmark:**
```bash
bun run scripts/analysis/ws-secrets-bench.ts --keys 1000 --connections 10
```

**High Concurrency Test:**
```bash
bun run scripts/analysis/ws-secrets-bench.ts --connections 50 --duration 300 --compression
```

**Real-time Monitoring:**
```bash
bun run scripts/analysis/ws-secrets-bench.ts --keys 5000 --realtime --compression
```

### Sample Output
```text
🌐 WebSocket Secrets Benchmark
==============================

📊 Benchmark Configuration:
   Keys: 1000
   Duration: 60s
   Connections: 10
   Rate: 5 msg/s per connection
   Compression: ENABLED
   Real-time: YES

📊 Progress: 75.0% | Connections: 10/10 | Messages: 45,000 | Rate: 750.0/s | Throughput: 15.2MB/s | Time: 45.0s

📊 Benchmark Results:
   Overall Metrics:
   Total Messages:    60,000
   Total Bytes:       1.2GB
   Duration:          60.15s
   Average Rate:      997.5 messages/s
   Throughput:        20.4MB/s

   Connection Statistics:
   Active Connections: 10
   Avg Rate/Conn:      99.8 msg/s
   Max Rate/Conn:      105.2 msg/s
   Min Rate/Conn:      94.1 msg/s

   Message Statistics:
   Avg Message Size:  20.8KB
   Compression:       ENABLED

🏆 Overall Performance: EXCELLENT
```

---

## 🚀 Advanced Usage Patterns

### Multi-Tool Workflow

**1. Generate Test Data:**
```bash
# Create exposure data
bun run scripts/secrets/vault-sim.ts --access 10K --keys 100 --output json

# Compute field from exposure data
bun run scripts/secrets/secrets-field.ts --exposure 6.5 --output json
```

**2. ML Model Testing:**
```bash
# Test ML model against field data
bun run scripts/secrets/secret-boost.ts --field field-data.json --benchmark

# Compare different models
bun run scripts/secrets/secret-boost.ts --model model-v1.onnx --field field-data.json
bun run scripts/secrets/secret-boost.ts --model model-v2.onnx --field field-data.json
```

**3. Performance Testing:**
```bash
# WebSocket performance with compression
bun run scripts/analysis/ws-secrets-bench.ts --connections 100 --compression --realtime

# Field computation performance
bun run scripts/secrets/secrets-field.ts --benchmark --iterations 1000
```

### Integration with CI/CD

**GitHub Actions Example:**
```yaml
name: Security Citadel Tests
on: [push, pull_request]

jobs:
  field-computation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: oven-sh/setup-bun@v1
      - name: Test Field Computation
        run: bun run scripts/secrets/secrets-field.ts --benchmark --iterations 100
      - name: Test Exposure Simulation
        run: bun run scripts/secrets/vault-sim.ts --access 1K --duration 30
      - name: Test ML Models
        run: bun run scripts/secrets/secret-boost.ts --benchmark --iterations 500
      - name: Test WebSocket Performance
        run: bun run scripts/analysis/ws-secrets-bench.ts --connections 10 --duration 60
```

### Monitoring and Alerting

**Real-time Monitoring:**
```bash
# Continuous exposure monitoring
bun run scripts/secrets/vault-sim.ts --access 1M --duration 3600 --realtime --pattern wave

# WebSocket health check
bun run scripts/analysis/ws-secrets-bench.ts --connections 5 --duration 300 --realtime
```

**Performance Baselines:**
```bash
# Establish performance baselines
bun run scripts/secrets/secrets-field.ts --benchmark --iterations 1000 --output json > baseline-field.json
bun run scripts/analysis/ws-secrets-bench.ts --connections 50 --duration 300 --output json > baseline-ws.json
```

---

## 📊 Output Formats

### JSON Output
All tools support JSON output for programmatic processing:

```json
{
  "timestamp": "2026-02-06T03:15:21.204Z",
  "configuration": {
    "exposure": 7.5,
    "iterations": 100
  },
  "results": {
    "computeTime": 15.23,
    "maxExposure": 0.748,
    "riskScore": 45.2
  }
}
```

### CSV Output
Structured data for analysis in spreadsheets:

```csv
Iteration,ComputeTime,MaxExposure,RiskScore,Anomaly
1,15.23,0.748,45.2,SECURE
2,14.87,0.751,46.1,SECURE
3,15.45,0.749,45.8,SECURE
```

---

## 🔧 Configuration

### Environment Variables
```bash
# System Configuration
SYSTEM_ID=factorywager-test
NODE_ENV=production

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Performance Tuning
SECRETS_FIELD_CACHE_SIZE=1000
WEBSOCKET_MAX_CONNECTIONS=1000
```

### Configuration Files

**~/.factorywager/config.json:**
```json
{
  "secretsField": {
    "defaultExposure": 5.0,
    "riskThresholds": {
      "low": 0.3,
      "medium": 0.6,
      "high": 0.8,
      "critical": 0.95
    }
  },
  "vaultSim": {
    "defaultDuration": 60,
    "defaultKeys": 100,
    "defaultRate": 100
  },
  "wsBench": {
    "defaultConnections": 10,
    "defaultDuration": 60,
    "compressionEnabled": true
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Memory Issues with Large Simulations:**
```bash
# Reduce batch size
bun run scripts/secrets/vault-sim.ts --access 1M --duration 600 --rate 50

# Use streaming output
bun run scripts/secrets/vault-sim.ts --access 5M --output csv --realtime
```

**2. WebSocket Connection Failures:**
```bash
# Check server status
curl http://localhost:3001/api/health

# Reduce connection count
bun run scripts/analysis/ws-secrets-bench.ts --connections 5 --duration 60
```

**3. ML Model Loading Errors:**
```bash
# Use mock model for testing
bun run scripts/secrets/secret-boost.ts --model mock --benchmark

# Check model path
bun run scripts/secrets/secret-boost.ts --model ./models/secret-boost.onnx --help
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=secrets-field:* bun run scripts/secrets/secrets-field.ts --benchmark

# Verbose output
VERBOSE=1 bun run scripts/secrets/vault-sim.ts --access 1M --realtime
```

---

## 📚 Reference Documentation

### API Integration
- **3D Field API**: `/api/secrets/field`
- **Secret Rotation**: `/api/secrets/rotate`
- **WebSocket**: `/ws/secrets-3d`

### Data Formats
- **Field Data**: 8-dimensional exposure vectors
- **Exposure Tracking**: Redis HyperLogLog cardinality
- **ML Models**: ONNX tensor format

### Performance Metrics
- **Field Computation**: <50ms target
- **WebSocket Throughput**: >1MB/s target
- **ML Inference**: <10ms target

---

## 🏷️ Version Information

**FactoryWager Security Citadel v5.1**
- Secrets Field Engine: v2.0
- Redis Vault Integration: v1.5
- ONNX ML Boost: v1.2
- WebSocket Benchmark: v1.0

---

## 📞 Support

For issues, questions, or contributions:
- **Documentation**: https://docs.factory-wager.com/secrets
- **GitHub**: https://github.com/factory-wager/security-citadel
- **Issues**: https://github.com/factory-wager/security-citadel/issues

---

**🏰 FactoryWager Security Citadel** - Enterprise-grade secret management with advanced CLI tooling for comprehensive analysis, testing, and optimization.
