# SQLite Best Practices for Hyper-Bun

## Quick Reference

### Standard Database Initialization

```typescript
import { Database } from "bun:sqlite";

const db = new Database("./data/example.db", { create: true });

// Essential PRAGMA settings
db.exec("PRAGMA journal_mode = WAL");        // Write-Ahead Logging for concurrency
db.exec("PRAGMA synchronous = NORMAL");       // Balance safety and speed
db.exec("PRAGMA foreign_keys = ON");          // Referential integrity
db.exec("PRAGMA busy_timeout = 5000");       // Handle concurrent access
```

### Prepared Statements Pattern

```typescript
// ✅ Prepare once, reuse many times
const getStmt = db.prepare("SELECT * FROM cache WHERE key = ?");
const setStmt = db.prepare("INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)");

// Use prepared statements
const result = getStmt.get("my-key");
setStmt.run("my-key", "my-value");
```

### Transaction Pattern for Bulk Operations

```typescript
// ✅ Batch operations in transactions
const insertMany = db.transaction((items: Array<{ id: string; value: string }>) => {
  const stmt = db.prepare("INSERT INTO items (id, value) VALUES (?, ?)");
  for (const item of items) {
    stmt.run(item.id, item.value);
  }
});

insertMany(largeArray);  // Single transaction, much faster
```

## Performance Optimization

### Cache Size Configuration

```typescript
// For high-frequency operations (ticks, cache)
db.exec("PRAGMA cache_size = -64000");  // 64MB cache

// For smaller databases
db.exec("PRAGMA cache_size = -32000");   // 32MB cache
```

### Memory-Mapped I/O

```typescript
// For large databases (>100MB)
db.exec("PRAGMA mmap_size = 268435456");  // 256MB memory-mapped I/O
```

### WAL Checkpoint Configuration

```typescript
// Automatic checkpoint every N pages
db.exec("PRAGMA wal_autocheckpoint = 1000");

// Manual checkpoint (if needed)
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
```

## Concurrency Best Practices

### 1. Use WAL Mode

```typescript
// ✅ Enables concurrent readers during writes
db.exec("PRAGMA journal_mode = WAL");
```

### 2. Set Busy Timeout

```typescript
// ✅ Wait up to 5 seconds for locks
db.exec("PRAGMA busy_timeout = 5000");
```

### 3. Use Transactions

```typescript
// ✅ Atomic operations
const update = db.transaction((id: string, value: string) => {
  db.prepare("UPDATE cache SET value = ? WHERE key = ?").run(value, id);
});
```

## Index Strategy

### Create Indexes for Frequent Queries

```typescript
// ✅ Index on frequently queried columns
db.exec("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)");
db.exec("CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(key)");
```

### Composite Indexes for Multi-Column Queries

```typescript
// ✅ Composite index for multi-column WHERE clauses
db.exec("CREATE INDEX IF NOT EXISTS idx_venue_timestamp ON ticks(venue, timestamp)");
```

## Error Handling

### Database Locked Errors

```typescript
try {
  db.exec("INSERT INTO cache (key, value) VALUES (?, ?)", key, value);
} catch (error) {
  if (error instanceof Error && error.message.includes("database is locked")) {
    // Retry with exponential backoff
    await Bun.sleep(100);
    // Retry logic...
  }
}
```

### Constraint Violations

```typescript
try {
  db.run("INSERT INTO cache (key, value) VALUES (?, ?)", key, value);
} catch (error) {
  if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
    // Handle duplicate key
    db.run("UPDATE cache SET value = ? WHERE key = ?", value, key);
  }
}
```

## Monitoring and Diagnostics

### Check Database Size

```typescript
const pageCount = db.query("PRAGMA page_count").get() as { page_count: number };
const pageSize = db.query("PRAGMA page_size").get() as { page_size: number };
const sizeBytes = pageCount.page_count * pageSize.page_size;
console.log(`Database size: ${sizeBytes / 1024 / 1024}MB`);
```

### Check WAL Status

```typescript
const walMode = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
const walSize = db.query("PRAGMA wal_checkpoint").get() as { wal_checkpoint: number };
console.log(`WAL mode: ${walMode.journal_mode}, WAL size: ${walSize.wal_checkpoint} pages`);
```

### Performance Profiling

```typescript
const start = Bun.nanoseconds();
db.exec("SELECT * FROM cache WHERE expires_at > ?", Date.now());
const duration = Bun.nanoseconds() - start;
console.log(`Query took ${duration / 1_000_000}ms`);
```

## Common Patterns

### TTL Cache Pattern

```typescript
class TTLCache {
  private db: Database;
  private getStmt: ReturnType<Database["prepare"]>;
  private setStmt: ReturnType<Database["prepare"]>;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value BLOB NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at);
    `);
    
    this.getStmt = this.db.prepare(
      "SELECT value FROM cache WHERE key = ? AND expires_at > ?"
    );
    this.setStmt = this.db.prepare(
      "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)"
    );
  }
  
  get(key: string): Uint8Array | null {
    const result = this.getStmt.get(key, Date.now()) as { value: Uint8Array } | undefined;
    return result?.value ?? null;
  }
  
  set(key: string, value: Uint8Array, ttlMs: number): void {
    this.setStmt.run(key, value, Date.now() + ttlMs);
  }
}
```

### Audit Log Pattern

```typescript
class AuditLogger {
  private db: Database;
  private insertStmt: ReturnType<Database["prepare"]>;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log(timestamp);
    `);
    
    this.insertStmt = this.db.prepare(
      "INSERT INTO audit_log (event_type, details, timestamp) VALUES (?, ?, ?)"
    );
  }
  
  log(eventType: string, details: Record<string, any>): void {
    this.insertStmt.run(eventType, JSON.stringify(details), Date.now());
  }
}
```

## Related Documentation

- [Bun 1.3.3 SQLite 3.51.0 Guide](./BUN-1.3.3-SQLITE-3.51.0.md)
- [WAL Configuration](./storage/wal-config.ts)
- [Bun SQLite API](https://bun.com/docs/api/sqlite)
