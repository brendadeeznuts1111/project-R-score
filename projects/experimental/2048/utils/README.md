# Utils API Reference

This folder contains utility functions for the CRC32 toolkit.

## Files

| File | Type | Exports | Interfaces | Functions | Classes | Methods | Status | Version | Benchmark |
|------|------|---------|------------|-----------|---------|---------|--------|---------|-----------|
| `crc32-sql-helper.ts` | Utility | 4 | 4 | 2 | 1 | 8 | Stable | v2.0.0 | 100 MB/s |
| `hardware-detector.ts` | Utility | 3 | 1 | 0 | 1 | 5 | Stable | v2.0.0 | 4000 MB/s |

---

## crc32-sql-helper.ts

### Interfaces

#### CRC32Options
Configuration options for CRC32 validation.

```typescript
interface CRC32Options {
  auditTrail?: boolean;        // Create audit trail entries
  entityType?: string;          // Entity type for audit
  method?: "hardware" | "software" | "simd";  // CRC32 method
  crc32Fields?: string[];       // Fields to compute CRC32 for
  confidenceThreshold?: number; // Minimum confidence score
  batchId?: string;            // Batch ID for grouping
}
```

#### CRC32ComputedData
Result of CRC32 computation.

```typescript
interface CRC32ComputedData {
  hasCRC32Fields: boolean;      // Whether CRC32 fields were found
  originalCRC32?: number;       // Original CRC32 from data
  computedCRC32?: number;       // Computed CRC32 value
  isValid: boolean;             // Whether CRC32 values match
  confidence: number;           // Confidence score (0-1)
  processingTime: number;       // Processing time in ms
  bytesProcessed: number;       // Total bytes processed
  usedHardware: boolean;        // Whether hardware acceleration used
  throughput: number;           // MB/s throughput
  simdInstructions: number;     // SIMD instructions used
  crc32Field?: string;          // Name of CRC32 field
  defaults: Set<string>;         // Fields with DEFAULT values
  required: Set<string>;        // Fields with NOT NULL constraint
}
```

#### InsertResult
Result of insert operation.

```typescript
interface InsertResult {
  id?: string;                  // Inserted record ID
  rowsAffected: number;         // Number of rows affected
  throughput?: number;          // MB/s throughput
  duration?: number;            // Operation duration in ms
}
```

#### CRC32AuditEntry
Audit trail entry for CRC32 validation.

```typescript
interface CRC32AuditEntry {
  entity_type: string;          // Type of entity
  entity_id: string;           // Entity identifier
  original_crc32: number;       // Original CRC32 value
  computed_crc32: number;       // Computed CRC32 value
  status: "valid" | "invalid" | "corrupted";  // Validation status
  confidence_score: number;     // Confidence score (0-1)
  verification_method: string; // Method used (hardware/software/simd)
  processing_time_ms?: number;  // Processing time
  bytes_processed: number;     // Bytes processed
  error_details?: unknown;      // Error information
  created_at?: Date;            // Timestamp
  created_by?: string;          // Creator identifier
  batch_id?: string;            // Batch identifier
  retry_count?: number;          // Retry attempts
  throughput_mbps?: number;     // Throughput in MB/s
  hardware_utilized?: boolean;   // Hardware acceleration used
  simd_instructions?: number;   // SIMD instructions count
}
```

### Class: CRC32SQLHelper

SQL helper for CRC32 validation with Bun v1.3.6 undefined handling.

```typescript
class CRC32SQLHelper {
  constructor(sql: SQLTemplateHelper);

  // Insert with CRC32 validation
  async insertWithCRC32Validation(
    table: string,
    data: Record<string, unknown>,
    options?: CRC32Options,
  ): Promise<InsertResult>;

  // Bulk insert with CRC32 validation
  async bulkInsertWithCRC32Validation(
    table: string,
    dataArray: Record<string, unknown>[],
    options?: CRC32Options,
  ): Promise<InsertResult[]>;
}
```

### Usage Example

```typescript
import { SQL } from "bun";
import { CRC32SQLHelper } from "./utils/crc32-sql-helper";

const sql = new SQL("sqlite://db.sqlite");
const helper = new CRC32SQLHelper(sql);

// Single insert with CRC32 validation
const result = await helper.insertWithCRC32Validation(
  "documents",
  {
    title: "Test Document",
    content: new Uint8Array([1, 2, 3, 4, 5]),
    checksum: 0x12345678,
  },
  {
    crc32Fields: ["content", "checksum"],
    auditTrail: true,
    entityType: "document",
  },
);

// Bulk insert
const results = await helper.bulkInsertWithCRC32Validation(
  "documents",
  [
    { title: "Doc 1", content: new Uint8Array([1, 2, 3]) },
    { title: "Doc 2", content: new Uint8Array([4, 5, 6]) },
  ],
  { crc32Fields: ["content"], auditTrail: true },
);
```

---

## hardware-detector.ts

### Interfaces

#### HardwareCapabilities
Hardware capability information.

```typescript
interface HardwareCapabilities {
  simd: boolean;               // SIMD support available
  crc32: boolean;               // Hardware CRC32 available
  threads: number;              // CPU threads available
  memory: {
    total: number;             // Total heap memory
    available: number;         // Available heap memory
    limit: number;             // Memory limit
  };
  cpu: {
    architecture: string;       // CPU architecture
    model?: string;            // CPU model name
    frequency?: number;        // CPU frequency in GHz
  };
}
```

### Class: HardwareCapabilityDetector

Detects and benchmarks hardware capabilities.

```typescript
class HardwareCapabilityDetector {
  // Detect all hardware capabilities
  async detectCapabilities(): Promise<HardwareCapabilities>;

  // Run performance benchmark
  async benchmark(): Promise<{
    throughput: number;        // MB/s
    latency: number;           // ms
    efficiency: number;        // MB/s per core
  }>;

  // Generate human-readable report
  generateReport(capabilities: HardwareCapabilities): string;
}
```

### Singleton

```typescript
export const hardwareDetector: HardwareCapabilityDetector;
```

### Usage Example

```typescript
import { hardwareDetector } from "./utils/hardware-detector";

// Detect capabilities
const capabilities = await hardwareDetector.detectCapabilities();
console.log(`SIMD: ${capabilities.simd}`);
console.log(`CRC32 Hardware: ${capabilities.crc32}`);
console.log(`Threads: ${capabilities.threads}`);

// Run benchmark
const benchmark = await hardwareDetector.benchmark();
console.log(`Throughput: ${benchmark.throughput} MB/s`);
console.log(`Latency: ${benchmark.latency} ms`);
console.log(`Efficiency: ${benchmark.efficiency} MB/s per core`);

// Generate report
const report = hardwareDetector.generateReport(capabilities);
console.log(report);
```

### Sample Report Output

```text
🔧 Hardware Capability Report
========================================

🧠 SIMD Support: ✅ Enabled
🔒 CRC32 Hardware: ✅ Available
🧵 CPU Threads: 8
💾 Memory: 1024.0MB total
🖥️  Architecture: arm64
📦 CPU Model: Apple M1 Pro
⚡ Frequency: 3.2GHz

📊 Performance Recommendations:
  ✅ Optimal: Use SIMD batch processing
  ✅ High concurrency: Use parallel processing
```

---

## Quick Links

- [Root README](../README.md)
- [Test Report](./TEST-REPORT.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
