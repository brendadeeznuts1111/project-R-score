# Bun Native JSON Reading

This project now uses Bun's native `Bun.file().json()` method for reading JSON files, providing optimal performance and type safety.

## Benefits

- **Performance**: Native implementation is faster than `readFileSync` + `JSON.parse`
- **Type Safety**: Better integration with TypeScript
- **Automatic MIME Type**: Bun automatically sets correct MIME type
- **Error Handling**: Cleaner error handling with async/await

## Usage

### Reading JSON Files

```typescript
// ✅ Recommended: Use Bun.file().json()
const file = Bun.file("config/default.json");
const config = await file.json();

// ❌ Old way (no longer used)
const content = readFileSync("config/default.json", "utf-8");
const config = JSON.parse(content);
```

### File Existence Check

```typescript
const file = Bun.file("config/default.json");

if (await file.exists()) {
  const config = await file.json();
  // Use config
}
```

### Type Safety

```typescript
interface Config {
  name: string;
  version: string;
}

const file = Bun.file("package.json");
const config = await file.json() as Config;
```

## Updated Files

The following files have been updated to use Bun's native JSON reading:

1. **`src/utils/config-loader.ts`** - Configuration loading
2. **`scripts/governance/integrity.ts`** - Integrity manifest loading
3. **`packages/data/loader.ts`** - Game data loading

## Note

WebSocket message parsing in `packages/swarm-radar/index.ts` still uses `JSON.parse()` because it's parsing user-provided strings, not reading from files.

