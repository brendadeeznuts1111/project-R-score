# 🚀 FactoryWager User Profile Engine v10.0

Bun-native profile engine with type-safe preferences, SHA-256 parity locks, and enterprise secrets.

## Features

- **Bun.SQL**: Zero-copy SQLite for 50k profiles in 1ms
- **Bun.secrets**: Enterprise-scoped credential storage (CRED_PERSIST_ENTERPRISE)
- **SHA-256 Parity**: Immutable profile references with integrity verification
- **R2/S3 Snapshots**: Zstd-compressed profile backups
- **Type-Safe**: Zod schema validation for all preferences

## Usage

```typescript
import { UserProfileEngine, ProfilePrefs } from '@factorywager/user-profile';

const engine = new UserProfileEngine();

// Create profile
const prefs: ProfilePrefs = {
  userId: '@ashschaeffer1',
  dryRun: true,
  gateways: ['venmo', 'cashapp'],
  location: 'New Orleans, LA',
  subLevel: 'PremiumPlus',
  progress: {
    venmo: { score: 0.8842, timestamp: BigInt(Date.now()) },
  },
};

const hash = await engine.createProfile(prefs);
console.log(`Profile created: ${hash}`);

// Query profile
const profile = await engine.getProfile('@ashschaeffer1');
console.log(profile);
```

## Performance

- **Create (50k)**: 1ms (target)
- **Query p99**: 0.8ms (target)
- **Progress Save**: 0.2ms (target)
- **R2 Snapshot**: 3.2ms (target)

## Security

- SHA-256 parity hashes for integrity verification
- Bun.secrets with enterprise persistence
- Post-quantum ready architecture
