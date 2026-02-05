# KYC Failsafe Module

Complete KYC failsafe system with device verification, document capture, OCR, and manual review queue.

## Core Components

### Main Services
- **failsafeEngine.ts** - Main orchestration engine
- **android13Failsafe.ts** - Android device integrity verification (implements `DeviceAttestationProvider`)
- **documentService.ts** - Document capture and OCR
- **biometricService.ts** - Biometric verification
- **reviewQueueProcessor.ts** - Automated queue processing
- **kycDashboard.ts** - Admin dashboard integration

### Device Attestation Architecture
- **DeviceAttestationProvider** (interface) - Abstraction for multi-platform device verification
- **ADBTransport** - ADB command execution with sanitization
- **IntegrityParser** - Parse ADB output for device integrity checks
- **PlayIntegrityValidator** - Google Play Integrity API validation

This architecture supports future iOS and other platform implementations through the `DeviceAttestationProvider` interface.

## Security & Resilience Features

### PII Redaction (`piiRedaction.ts`)

Redact sensitive information from logs and audit trails:

```typescript
import { redactPII, redactAuditLog } from "./piiRedaction";

// Redact PII from a string
const safe = redactPII("Contact john@example.com at 555-1234");

// Redact from audit log
const safeLog = redactAuditLog(auditLogEntries);
```

### Circuit Breakers (`circuitBreaker.ts`)

Protect against external API failures:

```typescript
import { googlePlayIntegrityBreaker } from "./circuitBreaker";

// Execute with circuit breaker protection
const result = await googlePlayIntegrityBreaker.execute(async () => {
  return await callGoogleAPI();
});
```

### Retry Logic (`retry.ts`)

Handle transient failures with exponential backoff:

```typescript
import { retryWithBackoff } from "./retry";

// Retry with default config (3 retries, exponential backoff)
const result = await retryWithBackoff(async () => {
  return await fetchExternalAPI();
});

// Custom retry config
const result = await retryWithBackoff(
  async () => await fetchExternalAPI(),
  {
    maxRetries: 5,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
  }
);

// With circuit breaker
import { retryWithCircuitBreaker } from "./retry";
const result = await retryWithCircuitBreaker(
  async () => await fetchExternalAPI(),
  googlePlayIntegrityBreaker
);
```

### ADB Command Sanitization (`adbSanitizer.ts`)

Validate and sanitize ADB commands before execution:

```typescript
import { sanitizeAdbCommand, validateAdbCommand } from "./adbSanitizer";

// Validate command before execution
const args = ["adb", "shell", "getprop", "ro.product.model"];
validateAdbCommand(args); // Throws if invalid

// Or sanitize and check
const { valid, sanitized, error } = sanitizeAdbCommand(args);
if (!valid) {
  throw new Error(error);
}
// Use sanitized command
```

## Usage Examples

### Execute KYC Failsafe

```typescript
import { KYCFailsafeEngine } from "./failsafeEngine";

const engine = new KYCFailsafeEngine();
const result = await engine.executeFailsafe(
  "user-123",
  "primary_kyc_timeout"
);

console.log(result.status); // "approved" | "review" | "rejected"
console.log(result.traceId);
console.log(result.auditLog);
```

### Get Review Queue

```typescript
import { KYCDashboard } from "./kycDashboard";

const dashboard = new KYCDashboard();
const queue = dashboard.getReviewQueue("pending");
const metrics = dashboard.getMetrics();
```

### Process Review Queue

```typescript
import { ReviewQueueProcessor } from "./reviewQueueProcessor";

const processor = new ReviewQueueProcessor();
processor.startCron(); // Processes queue every 15 minutes
```

## Configuration

Set environment variables (see `.env.example`):

```bash
KYC_MAX_RETRIES=3
KYC_REVIEW_THRESHOLD=70
ADB_PATH=adb
ANDROID_VERSION=13
DUOPLUS_PACKAGE=com.duoplus.family
KYC_S3_BUCKET=your-bucket
GOOGLE_CLOUD_KEY=your-key
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
ADMIN_WEBHOOK_URL=https://hooks.slack.com/...
```

## Testing

Run all KYC tests:

```bash
bun test src/server/kyc/__tests__/
```

## API Endpoints

- `POST /api/kyc/failsafe` - Execute failsafe flow
- `GET /api/kyc/review-queue` - Get review queue
- `GET /api/kyc/review-queue/:traceId` - Get specific item
- `POST /api/kyc/review-queue/:traceId` - Approve/reject item
- `GET /api/kyc/metrics` - Get KYC metrics
- `GET /api/kyc/audit/:traceId` - Get audit log

All endpoints require authentication and appropriate permissions (`kyc:execute`, `kyc:review`).

## CLI Commands

```bash
# Execute failsafe for a user
bun run cli/admin.ts --kyc-failsafe <userId>

# View review queue
bun run cli/admin.ts --review-queue

# View metrics
bun run cli/admin.ts --kyc-metrics
```

## Code Annotations

This module uses structured code annotations for metadata, cross-referencing, and tooling support. All KYC components are annotated with domain, scope, type, and references.

### View Annotations

```bash
# Show all KYC annotations with statistics
bun run cli/analyze.ts annotations src/server/kyc/ --stats

# Filter by reference (e.g., find all ISSUE references)
bun run cli/analyze.ts annotations src/server/kyc/ --ref=ISSUE

# Filter Bun-native code
bun run cli/analyze.ts annotations src/server/kyc/ --bun-native

# JSON output for programmatic use
bun run cli/analyze.ts annotations src/server/kyc/ --format=json
```

### Annotation Format

KYC components use the following annotation structure:

```typescript
/**
 * [KYC][SERVICE][CLASS][META:{export}][BUN-NATIVE]
 * Component description
 * #REF:ISSUE-KYC-001
 */
export class KYCFailsafeEngine { }
```

**Tags:**
- `[KYC]` - Domain identifier
- `[SERVICE]` - Scope (SERVICE, UTILITY, MODEL, etc.)
- `[CLASS]` - Type (CLASS, FUNCTION, INTERFACE, etc.)
- `[META:{property}]` - Metadata (export, async, public, etc.)
- `[BUN-NATIVE]` - Uses Bun-native features
- `[BUN-SPAWN]` - Uses Bun.spawn()
- `#REF:ID` - Cross-reference to issues, APIs, or docs

### Current Annotations

The KYC module currently has **35 annotations**:
- **9 classes**: failsafeEngine, android13Failsafe, documentService, biometricService, reviewQueueProcessor, kycDashboard, ADBTransport, IntegrityParser, PlayIntegrityValidator
- **21 functions**: executeFailsafe, verifyDeviceIntegrity, verifyBiometric, processQueue, redactPII, redactAuditLog, retryWithBackoff, retryWithCircuitBreaker, getS3Client, broadcastToClients, and more
- **4 interfaces**: CircuitBreakerConfig, RetryConfig, DeviceAttestationProvider, and more
- **1 module**: config
- **26% use Bun-native features** (BUN-NATIVE, BUN-SPAWN)
- **49% have references** to issues, APIs, or documentation
- **Scopes**: SERVICE (9), UTILITY (8), ANDROID (5), PARSER (4), TRANSPORT (4), ATTESTATION (3), MODEL (1), CONFIG (1)

For complete annotation system documentation, see [`docs/CODE_ANNOTATION_SYSTEM.md`](../../../docs/CODE_ANNOTATION_SYSTEM.md).
