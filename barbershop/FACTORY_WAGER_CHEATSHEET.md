# 🏰 FactoryWager v3.8 Cheatsheet

## Quick Commands

### Benchmark Suite
```bash
bun run factory-wager-cheatsheet-v38.ts suite
```

### Category Commands
```bash
bun run factory-wager-cheatsheet-v38.ts category r2
bun run factory-wager-cheatsheet-v38.ts category secrets
bun run factory-wager-cheatsheet-v38.ts category dashboard
bun run factory-wager-cheatsheet-v38.ts category profile
```

### Theme
```bash
bun run factory-wager-cheatsheet-v38.ts theme
```

## Theme Palette

| Color | Hex | HSL |
|-------|-----|-----|
| Blue | #007FFF | hsl(210 100% 50%) |
| Teal | #17B8A6 | hsl(175 80% 45%) |
| Green | #14B866 | hsl(145 80% 45%) |
| Orange | #FF8000 | hsl(30 100% 50%) |
| Red | #E64C4C | hsl(0 85% 55%) |

## API Quick Reference

### Dashboard
```typescript
import { createAdminDashboard } from './src/dashboard';
const db = createAdminDashboard();
console.log(db.export('html'));
```

### Profile
```typescript
import { quickSamplingProfile } from './src/profile';
await quickSamplingProfile('http://localhost:3001/ops/status');
```

### Cache
```typescript
import { cachedCloudflare } from './lib/cloudflare';
const zones = await cachedCloudflare.listZones();
cachedCloudflare.printStats();
```
