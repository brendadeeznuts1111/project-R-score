# Enhanced Enterprise Scanner Architecture

## Overview

The Enterprise Scanner now includes a comprehensive architecture with:
- **ConfigManager**: Centralized configuration management
- **SecureS3Exporter**: S3 export with integrity verification
- **BundleGuard**: Bundle size budget enforcement
- **ScannerMetrics**: Enhanced metrics with distributed tracing

## Architecture Components

### 1. ConfigManager

**Purpose**: Load and manage scanner configuration

**Features**:
- Loads from `.scannerrc` file
- Environment variable overrides
- S3 configuration
- Bundle budget configuration
- Metafile output settings

**Usage**:
```typescript
const configManager = new ConfigManager();
const config = await configManager.load(".scannerrc");
```

### 2. SecureS3Exporter

**Purpose**: Export scan results to S3 with integrity

**Features**:
- CRC32 checksum verification
- Gzip compression (level 9)
- Archive creation (scan.sarif + metafile.json + config.jsonc)
- Metadata tracking

**Usage**:
```typescript
const s3 = new SecureS3Exporter();
await s3.initialize({ bucket: "security-reports" });

const archive = new Bun.Archive({
  "scan.sarif": JSON.stringify(results),
  "metafile.json": JSON.stringify(metafile),
  "config.jsonc": JSON.stringify(config)
}, { compress: "gzip", level: 9 });

await s3.exportWithIntegrity(archive, `scans/${traceId}.tar.gz`);
```

### 3. BundleGuard

**Purpose**: Enforce bundle size budgets

**Features**:
- Max size enforcement
- Initial bundle size limits
- Async/chunk size limits
- Warning thresholds
- Bundle composition analysis

**Usage**:
```typescript
const guard = new BundleGuard(config);
const violations = await guard.enforceBudgets(metafile);

if (!violations.passed) {
  violations.violations.forEach(v => {
    console.error(`${v.violationType}: ${v.message}`);
  });
}
```

### 4. ScannerMetrics

**Purpose**: Enhanced metrics with distributed tracing

**Features**:
- Spans for timing
- Counters for events
- Gauges for values
- Histograms for distributions
- Prometheus export

**Usage**:
```typescript
const metrics = new ScannerMetrics(traceId);
const endSpan = metrics.span("s3_export");

// ... do work ...

endSpan(); // Records duration
```

## Integration

### Enhanced Scanner Initialization

```typescript
class EnterpriseScanner {
  private s3: SecureS3Exporter;
  private guard: BundleGuard;
  private metrics: ScannerMetrics;
  
  async initialize() {
    const config = await new ConfigManager().load(".scannerrc");
    
    this.s3 = new SecureS3Exporter();
    await this.s3.initialize();
    
    this.guard = new BundleGuard(config);
    this.metrics = new ScannerMetrics(this.traceId);
    
    // If metafile analysis enabled
    if (config.metafileOutput) {
      const meta = await this.analyzeBuild();
      await this.guard.enforceBudgets(meta);
    }
  }
  
  async exportResults(results: ScanResult[]) {
    const endSpan = this.metrics.span("s3_export");
    
    const archive = new Bun.Archive({
      "scan.sarif": JSON.stringify(results, null, 2),
      "metafile.json": JSON.stringify(this.buildMetafile()),
      "config.jsonc": JSON.stringify(this.config)
    }, { compress: "gzip", level: 9 });
    
    await this.s3.exportWithIntegrity(archive, `scans/${this.traceId}.tar.gz`);
    endSpan();
  }
}
```

## Configuration (.scannerrc)

```json
{
  "mode": "enforce",
  "format": "sarif",
  "metafileOutput": "./dist/metafile.json",
  "bundleBudgets": {
    "maxSize": 5242880,
    "maxInitialSize": 2097152,
    "maxAsyncSize": 1048576,
    "warnings": {
      "size": 3145728,
      "initialSize": 1572864
    }
  },
  "s3": {
    "bucket": "security-reports",
    "region": "us-east-1",
    "prefix": "scans",
    "compress": true
  }
}
```

## Bundle Budget Enforcement

### Budget Types

1. **maxSize**: Total bundle size limit
2. **maxInitialSize**: Initial bundle (entry point) limit
3. **maxAsyncSize**: Async/chunk bundle limit
4. **warnings**: Warning thresholds (non-blocking)

### Example Output

```
❌ Bundle budget violations: 2
   Bundle dist/index.js exceeds maximum size: 6.2 MB > 5.0 MB
   Initial bundle dist/main.js exceeds maximum: 2.5 MB > 2.0 MB
```

## S3 Export Archive Structure

```
scans/scan-{traceId}.tar.gz
├── scan.sarif          # SARIF scan results
├── metafile.json       # Build metafile analysis
└── config.jsonc        # Scanner configuration
```

## Metrics Export

### Prometheus Format

```prometheus
# HELP scanner_s3_export_duration_ms Scanner histogram metric
# TYPE scanner_s3_export_duration_ms histogram
scanner_s3_export_duration_ms_count{trace_id="abc123"} 1
scanner_s3_export_duration_ms_avg{trace_id="abc123"} 1250.5
scanner_s3_export_duration_ms_p95{trace_id="abc123"} 1500.0
```

## Benefits

1. **Centralized Config**: Single source of truth for configuration
2. **Integrity**: CRC32 checksums for all exports
3. **Budget Enforcement**: Prevents bundle bloat
4. **Observability**: Comprehensive metrics and tracing
5. **Archive Format**: All artifacts in one compressed file
