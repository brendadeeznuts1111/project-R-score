# API Reference

Complete reference for all Foxy Proxy APIs and modules.

## Dashboard Package

### Core Utilities

#### UnifiedProfileManager

Located: `packages/dashboard/src/utils/unified/manager.ts`

```typescript
import { UnifiedProfileManager } from "./utils/unified/manager";

const manager = new UnifiedProfileManager();

// Create a unified profile combining proxy + phone
const profile = manager.createProfile({
  name: "Gaming Setup",
  proxyId: "proxy-123",
  phoneId: "phone-456",
  template: "HIGH_PERFORMANCE"
});

// List all profiles
const profiles = manager.listProfiles();

// Update profile
manager.updateProfile(profileId, { name: "Updated Name" });

// Delete profile
manager.deleteProfile(profileId);
```

#### DuoPlus Manager

Located: `packages/dashboard/src/utils/duoplus/`

```typescript
import { DuoPlusManager } from "./utils/duoplus";

const manager = new DuoPlusManager(apiKey);

// Get phone list
const phones = await manager.getPhones();

// Execute ADB command
const result = await manager.executeADB(phoneId, "shell ls /data");

// Upload file to phone
await manager.uploadFile(phoneId, localPath, remotePath);

// Download file from phone
await manager.downloadFile(phoneId, remotePath, localPath);
```

#### IPFoxy Manager

Located: `packages/dashboard/src/utils/ipfoxy/`

```typescript
import { IPFoxyManager } from "./utils/ipfoxy";

const manager = new IPFoxyManager(apiToken, apiId);

// Get all proxies
const proxies = await manager.getProxies();

// Add proxy
const proxy = await manager.addProxy({
  ip: "1.2.3.4",
  port: 8080,
  protocol: "http",
  username: "user",
  password: "pass"
});

// Test proxy connection
const isWorking = await manager.testProxy(proxyId);

// Delete proxy
await manager.deleteProxy(proxyId);
```

### CashApp Scaling API

Located: `packages/dashboard/src/utils/scaling/`

#### CashAppNameGenerator

```typescript
import { CashAppNameGenerator } from "./utils/scaling/cashapp-pipeline";

const generator = new CashAppNameGenerator();

// Generate random profile
const profile = await generator.generateProfile();
// Returns: { firstName, lastName, middleInitial, gender, dateOfBirth }

// Generate names for specific region
const names = await generator.generateNames("New York", 5);
```

#### CashAppAddressGenerator

```typescript
import { CashAppAddressGenerator } from "./utils/scaling/cashapp-pipeline";

const generator = new CashAppAddressGenerator();

// Generate address for location
const address = await generator.generateAddress({
  city: "Los Angeles",
  state: "California"
});
// Returns: { street, city, state, zip, country }
```

#### CashAppProvisioner

```typescript
import { CashAppProvisioner } from "./utils/scaling/cashapp-pipeline";

const provisioner = new CashAppProvisioner();

// Provision single account
const result = await provisioner.provisionCashAppAccount(
  index, // Account index
  "custom", // Template type
  "213" // Area code
);

// Provision batch
const results = await provisioner.provisionBatch(startIndex, count, areaCode);
```

#### CashAppRiskMonitor

```typescript
import { CashAppRiskMonitor } from "./utils/scaling/cashapp-pipeline";

const monitor = new CashAppRiskMonitor();

// Check single account health
const health = await monitor.checkAccountHealth(deviceId);
// Returns: { riskLevel, status, flags: [...] }

// Batch health check
const results = await monitor.batchAccountHealthCheck(["device-1", "device-2"]);

// Get risk summary
const summary = monitor.getRiskSummary(results);
```

### Date & Time Utilities

Located: `packages/dashboard/src/utils/date-utils.ts`

```typescript
import { DateUtils, PerformanceTimer } from "./utils/date-utils";

// Set application timezone
DateUtils.setBunTimezone("America/New_York");

// Get current time
const now = DateUtils.now();

// Format dates
now.format("ISO"); // ISO 8601
now.format("DISPLAY_DATETIME"); // Human readable
now.format("FILE_TIMESTAMP"); // For filenames

// Timezone conversion
const utcTime = DateUtils.toUTC(localTime);
const localTime = DateUtils.toLocal(utcTime);

// Performance timing
const timer = new PerformanceTimer();
// ... perform operation
const duration = timer.getDuration();
console.log(timer.getFormattedDuration()); // "1.234s" or "456ms"
```

### React Hooks

#### useProxyData

Located: `packages/dashboard/src/hooks/useProxyData/`

```typescript
import { useProxyData } from './hooks';

function MyComponent() {
  const {
    proxies,
    loading,
    error,
    addProxy,
    updateProxy,
    deleteProxy
  } = useProxyData();

  return (
    <>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {proxies.map(p => <ProxyCard key={p.id} proxy={p} />)}
    </>
  );
}
```

### Components

#### Proxy Management

```typescript
import { IPFoxyConfigPanel } from './components';

<IPFoxyConfigPanel onAdd={handleAdd} onUpdate={handleUpdate} />
```

#### DuoPlus Management

```typescript
import { ADBCommandPanel } from './components';

<ADBCommandPanel phoneId={phoneId} />
```

#### File Upload

```typescript
import { FileUpload } from './components';

<FileUpload onUpload={handleUpload} accept=".json,.csv" />
```

#### Feature Flags

```typescript
import { FeatureFlagToggle } from './components';

<FeatureFlagToggle
  flagName="ENABLE_CASHAPP"
  onChange={handleToggle}
/>
```

### Types

#### Profile Types

```typescript
import { Profile, ProxyConfig, PhoneConfig } from "./types";

interface Profile {
  id: string;
  name: string;
  proxyId: string;
  phoneId: string;
  template: TemplateType;
  createdAt: Date;
  updatedAt: Date;
}

interface ProxyConfig {
  id: string;
  ip: string;
  port: number;
  protocol: "http" | "https" | "socks5";
  username?: string;
  password?: string;
  region?: string;
}
```

#### CashApp Types

```typescript
interface CashAppProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  areaCode: string;
}

interface AccountHealth {
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "active" | "flagged" | "suspended";
  flags: RiskFlag[];
  lastChecked: Date;
}
```

## Common Patterns

### Error Handling

```typescript
try {
  const result = await manager.doSomething();
} catch (error) {
  if (error.code === "INVALID_TOKEN") {
    // Handle auth error
  } else if (error.code === "RATE_LIMIT") {
    // Handle rate limit
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### Async Operations with Loading State

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleOperation() {
  setLoading(true);
  setError(null);

  try {
    const result = await manager.doSomething();
    return result;
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
```

### Batch Processing

```typescript
// Process in chunks to avoid overwhelming API
const chunkSize = 50;
for (let i = 0; i < items.length; i += chunkSize) {
  const chunk = items.slice(i, i + chunkSize);
  const results = await manager.batchOperation(chunk);

  // Add delay between batches
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
```

## Rate Limits

- **IPFoxy API**: 1000 requests/hour
- **DuoPlus API**: 500 requests/hour
- **CashApp Provisioning**: 25 accounts/batch

## Authentication

### Environment Variables Required

```text
IPFOXY_API_TOKEN=your_token
IPFOXY_API_ID=your_id
DUOPLUS_API_KEY=your_key
```

### Storing Credentials Securely

```typescript
// ✅ DO: Use environment variables
const token = process.env.IPFOXY_API_TOKEN;

// ❌ DON'T: Hardcode credentials
const token = "abc123xyz"; // BAD!

// ✅ DO: Use secure vaults
import { loadSecure } from "vault-client";
const token = await loadSecure("ipfoxy-token");
```

## Versioning

Current API Version: **2.0**

- **Compatible with**: Bun 1.0+, Node.js 18+
- **Last Updated**: January 2026

---

**Need more details?**

- See [GETTING_STARTED.md](./GETTING_STARTED.md)
- Check [CashApp Pipeline](./cashapp-pipeline-guide.md)
- Browse [Examples](../examples/)
