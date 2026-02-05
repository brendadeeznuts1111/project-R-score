# Empire Pro Dashboard API Specification

Version: 2.1.0-alpha

## Overview

Unified API for the Apple ID Infrastructure, providing metrics for Storage (R2), Performance (Bun), and Network Mesh.

## Authentication

Every request must include the `x-api-key` header.

- Header: `x-api-key: EMPIRE_PRO_SECURE_2026`

## Standard Envelope

All responses return the following structure:

```json
{
  "success": boolean,
  "data": object | null,
  "error": string | null,
  "metadata": {
    "timestamp": "ISO-8601",
    "version": "2.1.0-alpha",
    "perf": "OPTIMAL"
  }
}
```

## Endpoints

### 1. Storage Status

Returns current R2 metrics and partition density.

- **GET** `/api/v1/storage/status`

### 2. Sync Health

Compares local data mirrors against remote R2 objects.

- **GET** `/api/v1/storage/sync-health`

### 3. Lifecycle Audit

Performs a write-read-delete audit of the storage system.

- **POST** `/api/v1/storage/audit`

### 4. Network Mesh

Returns live node positions and latency for the proxy mesh.

- **GET** `/api/v1/network/mesh`

### 5. Profile Intelligence

Processes a phone number through the 8-pattern intelligence suite.

- **POST** `/api/v1/profiles/intelligence`
- Body: `{ "phoneNumber": "string" }`

### 6. System Scorecard

Comprehensive infrastructure snapshot.

- **GET** `/api/v1/system/scorecard`

## CLI Tools

Access these endpoints via the Empire CLI:

- `empire storage audit` - Run lifecycle audit
- `empire network mesh` - View node status
- `empire phone intel <number>` - Run intelligence suite
