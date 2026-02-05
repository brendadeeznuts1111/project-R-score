# 🌐 T3-Lattice Registry Client

[![Bun Version](https://img.shields.io/badge/Bun-v1.x-black?logo=bun)](https://bun.sh)
[![Compliance](https://img.shields.io/badge/Spec-v1.2.1-blue)](registry-spec.md)
[![Status](https://img.shields.io/badge/Status-Production--Ready-green)](#)

A high-performance, Bun-native TypeScript implementation of the T3-Lattice Registry Client. This client provides full compliance with the Lattice Registry Specification, featuring native optimizations for speed, security, and reliability.

---

## ✨ Key Features

- **🚀 Bun-Native Optimizations**: Leverages Bun's high-performance hashing, file I/O, and WebSocket implementation.
- **🛡️ Full Type Safety**: Comprehensive TypeScript interfaces for all registry data structures and API responses.
- **📊 SLA Monitoring**: Real-time tracking of P99/P50 latencies with automatic threshold warnings.
- **🔐 Advanced Security**: Built-in CSRF protection, threat intelligence integration, and optional Quantum Audit trails.
- **🔌 WebSocket Streaming**: Efficient binary payload parsing for real-time regime-feed updates.
- **⚙️ Robust Configuration**: Runtime validation of environment variables and configuration parameters.

---

## 🚀 Quick Start

### 1. Installation
Ensure you have [Bun](https://bun.sh) installed on your system.

```bash
# Clone the repository and install dependencies (if any)
bun install
```

### 2. Configuration
Create a `.env.lattice` file in your project root (see [Configuration](#configuration) for details).

### 3. Basic Usage
```typescript
import { LatticeRegistryClient } from "./t3-lattice-registry";

const client = new LatticeRegistryClient();

// Check registry health
const isHealthy = await client.checkHealth();

if (isHealthy) {
  // Fetch market odds
  const odds = await client.fetchOddsData("market_xyz");
  console.log(`Current Regime: ${odds.regime}`);
}
```

---

## ⚙️ Configuration

The client is configured via environment variables. Below are the available options:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `LATTICE_TOKEN` | **Required** | Your registry authentication token |
| `LATTICE_REGISTRY_URL` | `https://registry.lattice.internal/v1` | Base URL for the Registry API |
| `BUN_CONFIG_MAX_HTTP_REQUESTS` | `256` | Maximum concurrent HTTP requests |
| `LATTICE_CSRF_ENABLED` | `true` | Enable/Disable CSRF protection |
| `LATTICE_THREAT_INTEL_ENABLED` | `true` | Enable threat intelligence checks |
| `LATTICE_QUANTUM_AUDIT_ENABLED` | `true` | Enable quantum-resistant audit logging |
| `LATTICE_COMPRESSION` | `true` | Enable zstd/brotli compression |
| `LATTICE_KEEPALIVE_TIMEOUT` | `30000` | HTTP keep-alive timeout (ms) |
| `LATTICE_WS_PORT` | `3001` | Local port for WebSocket operations |
| `LATTICE_AUDIT_PATH` | `./logs/lattice_audit.log` | Path to the audit log file |
| `LATTICE_AUDIT_RETENTION` | `90` | Number of days to retain audit logs |

---

## 🛠️ Implementation Details

### Core Client Logic
The `LatticeRegistryClient` handles session management, request signing, and metrics tracking.

```typescript
/**
 * t3-lattice-registry.ts
 * Bun-native implementation of T3-Lattice Registry Client v1.2.1
 */ 

// ... (Constants, Types, and Classes)
```

### Available Scripts
Manage your lattice integration using these Bun commands:

```json
{
  "scripts": {
    "lattice:start": "bun run --env-file=.env.lattice app.ts",
    "lattice:health": "bun run --env-file=.env.lattice health-check.ts",
    "lattice:metrics": "bun run --env-file=.env.lattice metrics-dashboard.ts",
    "lattice:audit": "bun run --env-file=.env.lattice audit-review.ts"
  }
}
```

---

## 📊 SLA Thresholds

The client monitors performance against the following specification targets:

- **P99 Latency**: < 50ms
- **P50 Target**: < 20ms
- **DNS Prefetch**: < 0.2ms
- **TLS Handshake**: < 20ms

---

## 📜 License

Internal Use Only - T3-Lattice Registry Specification Compliance.
