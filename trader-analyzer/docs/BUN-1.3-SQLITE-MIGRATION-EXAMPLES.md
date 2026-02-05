# Bun 1.3 SQLite Migration Examples

This document provides detailed before/after examples for migrating from `bun:sqlite` to `Bun.SQL`.

## Table of Contents

1. [Basic Query Patterns](#basic-query-patterns)
2. [Prepared Statements](#prepared-statements)
3. [Transactions](#transactions)
4. [Type Safety](#type-safety)
5. [Complex Queries](#complex-queries)
6. [Bulk Operations](#bulk-operations)

---

## Basic Query Patterns

### Example 1: Simple SELECT

**Before (bun:sqlite):**
```typescript
import { Database } from "bun:sqlite";

const db = new Database("./data/example.db");
const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const user = stmt.get(userId);
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("./data/example.db");
const user = await sql`SELECT * FROM users WHERE id = ${userId}`.get(db);
```

**Benefits:**
- No manual statement preparation
- Automatic parameter escaping
- Cleaner code

### Example 2: SELECT with Multiple Parameters

**Before (bun:sqlite):**
```typescript
const stmt = db.prepare(
  "SELECT * FROM cache WHERE key = ? AND expires_at > ?"
);
const result = stmt.get(key, Date.now());
```

**After (Bun.SQL):**
```typescript
const result = await sql`
  SELECT * FROM cache 
  WHERE key = ${key} AND expires_at > ${Date.now()}
`.get(db);
```

### Example 3: SELECT ALL

**Before (bun:sqlite):**
```typescript
const stmt = db.prepare("SELECT * FROM users WHERE role = ?");
const users = stmt.all(role);
```

**After (Bun.SQL):**
```typescript
const users = await sql`SELECT * FROM users WHERE role = ${role}`.all(db);
```

---

## Prepared Statements

### Example 4: Cache Manager Get Operation

**Before (bun:sqlite):**
```typescript
// In constructor
this.getStmt = this.db.prepare(
  "SELECT value, hits, compressed FROM cache WHERE key = ? AND expires_at > ?"
);

// In method
get<T>(key: string): T | null {
  const row = this.getStmt.get(key, Date.now()) as {
    value: Buffer | Uint8Array;
    hits: number;
    compressed: number;
  } | null;
  
  if (!row) return null;
  // ... decompression logic
}
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";

interface CacheRow {
  value: Buffer | Uint8Array;
  hits: number;
  compressed: number;
}

get<T>(key: string): T | null {
  const row = await sql<CacheRow>`
    SELECT value, hits, compressed 
    FROM cache 
    WHERE key = ${key} AND expires_at > ${Date.now()}
  `.get(this.db);
  
  if (!row) return null;
  // ... decompression logic
}
```

**Benefits:**
- No need to store prepared statements as instance variables
- Automatic query plan caching
- Better type safety

### Example 5: Cache Manager Set Operation

**Before (bun:sqlite):**
```typescript
// In constructor
this.setStmt = this.db.prepare(
  "INSERT OR REPLACE INTO cache (key, value, hits, expires_at, created_at, compressed, original_size, stored_size) VALUES (?, ?, 0, ?, ?, ?, ?, ?)"
);

// In method
set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  
  // ... compression logic
  
  this.setStmt.run(
    key,
    storedValue,
    expiresAt,
    now,
    compressed ? 1 : 0,
    originalSize,
    storedValue.length,
  );
}
```

**After (Bun.SQL):**
```typescript
set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  
  // ... compression logic
  
  return sql`
    INSERT OR REPLACE INTO cache 
    (key, value, hits, expires_at, created_at, compressed, original_size, stored_size) 
    VALUES (
      ${key},
      ${storedValue},
      0,
      ${expiresAt},
      ${now},
      ${compressed ? 1 : 0},
      ${originalSize},
      ${storedValue.length}
    )
  `.run(this.db);
}
```

**Note:** Method becomes `async` due to Bun.SQL API.

---

## Transactions

### Example 6: Bulk Insert with Transaction

**Before (bun:sqlite):**
```typescript
storeOddsBatch(updates: OrcaOddsUpdate[]): void {
  const stmt = this.db.prepare(`
    INSERT INTO odds_history 
    (event_id, market_id, selection_id, bookmaker, odds, line, timestamp, is_open, max_stake)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = this.db.transaction((items: OrcaOddsUpdate[]) => {
    for (const update of items) {
      stmt.run(
        update.eventId,
        update.marketId,
        update.selectionId,
        update.bookmaker,
        update.odds,
        update.line || null,
        update.timestamp,
        update.isOpen ? 1 : 0,
        update.maxStake || null,
      );
    }
  });

  insertMany(updates);
}
```

**After (Bun.SQL) - Option 1: Keep Transaction Pattern**
```typescript
import { sql } from "bun";
import { Database } from "bun:sqlite";

storeOddsBatch(updates: OrcaOddsUpdate[]): Promise<void> {
  // Note: May need to use bun:sqlite for transaction control
  // Bun.SQL transaction API may differ
  
  const insertMany = this.db.transaction(async (items: OrcaOddsUpdate[]) => {
    for (const update of items) {
      await sql`
        INSERT INTO odds_history 
        (event_id, market_id, selection_id, bookmaker, odds, line, timestamp, is_open, max_stake)
        VALUES (
          ${update.eventId},
          ${update.marketId},
          ${update.selectionId},
          ${update.bookmaker},
          ${update.odds},
          ${update.line || null},
          ${update.timestamp},
          ${update.isOpen ? 1 : 0},
          ${update.maxStake || null}
        )
      `.run(this.db);
    }
  });

  return insertMany(updates);
}
```

**After (Bun.SQL) - Option 2: Use Bun.SQL Transaction API**
```typescript
import { SQL } from "bun";

// If Bun.SQL supports transactions differently
storeOddsBatch(updates: OrcaOddsUpdate[]): Promise<void> {
  // Need to verify Bun.SQL transaction API
  // May need to use explicit BEGIN/COMMIT
  await this.db.begin();
  try {
    for (const update of updates) {
      await this.db`
        INSERT INTO odds_history 
        (event_id, market_id, selection_id, bookmaker, odds, line, timestamp, is_open, max_stake)
        VALUES (
          ${update.eventId},
          ${update.marketId},
          ${update.selectionId},
          ${update.bookmaker},
          ${update.odds},
          ${update.line || null},
          ${update.timestamp},
          ${update.isOpen ? 1 : 0},
          ${update.maxStake || null}
        )
      `;
    }
    await this.db.commit();
  } catch (error) {
    await this.db.rollback();
    throw error;
  }
}
```

**Note:** Transaction API needs verification. May need to keep `bun:sqlite` for complex transaction patterns.

---

## Type Safety

### Example 7: RBAC Manager - Get User

**Before (bun:sqlite):**
```typescript
async getUserById(userId: string): Promise<{
  id: string;
  username: string;
  role: string;
  email?: string;
  createdAt: number;
} | null> {
  const stmt = this.db.prepare(`
    SELECT id, username, email, role_id, created_at
    FROM users
    WHERE id = ?
  `);

  const row = stmt.get(userId) as {
    id: string;
    username: string;
    email: string | null;
    role_id: string;
    created_at: number;
  } | null;

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role_id,
    email: row.email || undefined,
    createdAt: row.created_at,
  };
}
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  role_id: string;
  created_at: number;
}

interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
  createdAt: number;
}

async getUserById(userId: string): Promise<User | null> {
  const row = await sql<UserRow>`
    SELECT id, username, email, role_id, created_at
    FROM users
    WHERE id = ${userId}
  `.get(this.db);

  if (!row) return null;

  // Type-safe transformation
  return {
    id: row.id,
    username: row.username,
    role: row.role_id,
    email: row.email || undefined,
    createdAt: row.created_at,
  };
}
```

**Benefits:**
- Compile-time type checking
- No manual type assertions (`as`)
- IDE autocomplete for `row.id`, `row.username`, etc.
- Catches type errors early

### Example 8: RBAC Manager - Create User

**Before (bun:sqlite):**
```typescript
async createUser(userData: {
  username: string;
  password: string;
  role: string;
  email?: string;
}): Promise<PipelineUser> {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = await Bun.password.hash(userData.password);

  const stmt = this.db.prepare(`
    INSERT INTO users (id, username, email, role_id, feature_flags, created_at)
    VALUES (?, ?, ?, ?, ?, unixepoch())
  `);

  stmt.run(
    userId,
    userData.username,
    userData.email || null,
    userData.role,
    JSON.stringify([]),
  );

  return {
    id: userId,
    username: userData.username,
    role: userData.role,
    featureFlags: [],
  };
}
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";

async createUser(userData: {
  username: string;
  password: string;
  role: string;
  email?: string;
}): Promise<PipelineUser> {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = await Bun.password.hash(userData.password);

  await sql`
    INSERT INTO users (id, username, email, role_id, feature_flags, created_at)
    VALUES (
      ${userId},
      ${userData.username},
      ${userData.email || null},
      ${userData.role},
      ${JSON.stringify([])},
      unixepoch()
    )
  `.run(this.db);

  return {
    id: userId,
    username: userData.username,
    role: userData.role,
    featureFlags: [],
  };
}
```

---

## Complex Queries

### Example 9: JOIN Query

**Before (bun:sqlite):**
```typescript
const stmt = this.db.prepare(`
  SELECT u.id, u.username, r.name as role_name
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = ?
`);
const user = stmt.get(userId);
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";

interface UserWithRole {
  id: string;
  username: string;
  role_name: string;
}

const user = await sql<UserWithRole>`
  SELECT u.id, u.username, r.name as role_name
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = ${userId}
`.get(this.db);
```

### Example 10: Complex WHERE with Multiple Conditions

**Before (bun:sqlite):**
```typescript
getOddsHistory(
  marketId: string,
  options?: { bookmaker?: OrcaBookmaker; since?: number; limit?: number },
): OrcaOddsUpdate[] {
  let query = `SELECT * FROM odds_history WHERE market_id = ?`;
  const params: (string | number)[] = [marketId];

  if (options?.bookmaker) {
    query += ` AND bookmaker = ?`;
    params.push(options.bookmaker);
  }

  if (options?.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }

  query += ` ORDER BY timestamp DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const stmt = this.db.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map((row) => ({
    // ... mapping logic
  }));
}
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";

interface OddsHistoryRow {
  event_id: string;
  market_id: string;
  selection_id: string;
  bookmaker: string;
  odds: number;
  line: number | null;
  timestamp: number;
  is_open: number;
  max_stake: number | null;
}

getOddsHistory(
  marketId: string,
  options?: { bookmaker?: OrcaBookmaker; since?: number; limit?: number },
): Promise<OrcaOddsUpdate[]> {
  // Build query dynamically
  let query = sql`SELECT * FROM odds_history WHERE market_id = ${marketId}`;
  
  if (options?.bookmaker) {
    query = sql`${query} AND bookmaker = ${options.bookmaker}`;
  }
  
  if (options?.since) {
    query = sql`${query} AND timestamp >= ${options.since}`;
  }
  
  query = sql`${query} ORDER BY timestamp DESC`;
  
  if (options?.limit) {
    query = sql`${query} LIMIT ${options.limit}`;
  }

  const rows = await query.all<OddsHistoryRow>(this.db);

  return rows.map((row) => ({
    marketId: row.market_id,
    selectionId: row.selection_id,
    eventId: row.event_id,
    bookmaker: row.bookmaker as OrcaBookmaker,
    odds: row.odds,
    line: row.line,
    timestamp: row.timestamp,
    isOpen: row.is_open === 1,
    maxStake: row.max_stake,
    marketType: "spread" as const,
  }));
}
```

**Note:** Dynamic query building with Bun.SQL may require chaining `sql` tagged templates. Verify API support.

---

## Bulk Operations

### Example 11: Batch Insert Correlations

**Before (bun:sqlite):**
```typescript
export async function batchInsertCorrelations(
  db: Database,
  edges: HiddenEdge[],
  eventId: string,
): Promise<void> {
  if (edges.length === 0) return;

  const stmt = db.prepare(`
    INSERT INTO multi_layer_correlations (
      layer, event_id, source_node, target_node, correlation_type,
      correlation_score, latency_ms, expected_propagation,
      detected_at, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((edges: HiddenEdge[]) => {
    for (const edge of edges) {
      stmt.run(
        edge.layer,
        eventId,
        edge.source,
        edge.target,
        edge.type,
        edge.correlation,
        edge.latency,
        edge.expected_propagation,
        edge.timestamp,
        edge.confidence,
      );
    }
  });

  insertMany(edges);
}
```

**After (Bun.SQL):**
```typescript
import { sql } from "bun";
import { Database } from "bun:sqlite";

interface CorrelationRow {
  layer: string;
  event_id: string;
  source_node: string;
  target_node: string;
  correlation_type: string;
  correlation_score: number;
  latency_ms: number;
  expected_propagation: number;
  detected_at: number;
  confidence: number;
}

export async function batchInsertCorrelations(
  db: Database,
  edges: HiddenEdge[],
  eventId: string,
): Promise<void> {
  if (edges.length === 0) return;

  // Use transaction from bun:sqlite for now
  // Bun.SQL transaction API needs verification
  const insertMany = db.transaction(async (edges: HiddenEdge[]) => {
    for (const edge of edges) {
      await sql<CorrelationRow>`
        INSERT INTO multi_layer_correlations (
          layer, event_id, source_node, target_node, correlation_type,
          correlation_score, latency_ms, expected_propagation,
          detected_at, confidence
        ) VALUES (
          ${edge.layer},
          ${eventId},
          ${edge.source},
          ${edge.target},
          ${edge.type},
          ${edge.correlation},
          ${edge.latency},
          ${edge.expected_propagation},
          ${edge.timestamp},
          ${edge.confidence}
        )
      `.run(db);
    }
  });

  await insertMany(edges);
}
```

**Note:** May need to keep `bun:sqlite` transaction API for bulk operations until Bun.SQL transaction API is verified.

---

## Common Patterns

### Pattern 1: Conditional Queries

**Before (bun:sqlite):**
```typescript
let query = "SELECT * FROM table WHERE id = ?";
const params = [id];

if (filter) {
  query += " AND filter = ?";
  params.push(filter);
}

const stmt = db.prepare(query);
const result = stmt.all(...params);
```

**After (Bun.SQL):**
```typescript
let query = sql`SELECT * FROM table WHERE id = ${id}`;

if (filter) {
  query = sql`${query} AND filter = ${filter}`;
}

const result = await query.all(db);
```

### Pattern 2: COUNT Queries

**Before (bun:sqlite):**
```typescript
const countResult = db
  .query("SELECT COUNT(*) as count FROM cache")
  .get() as { count: number };
```

**After (Bun.SQL):**
```typescript
interface CountResult {
  count: number;
}

const countResult = await sql<CountResult>`
  SELECT COUNT(*) as count FROM cache
`.get(db);
```

### Pattern 3: UPDATE Queries

**Before (bun:sqlite):**
```typescript
const stmt = db.prepare(`
  UPDATE users
  SET username = ?, email = ?
  WHERE id = ?
`);
stmt.run(newUsername, newEmail, userId);
```

**After (Bun.SQL):**
```typescript
await sql`
  UPDATE users
  SET username = ${newUsername}, email = ${newEmail}
  WHERE id = ${userId}
`.run(db);
```

### Pattern 4: DELETE Queries

**Before (bun:sqlite):**
```typescript
const stmt = db.prepare("DELETE FROM cache WHERE key = ?");
const result = stmt.run(key);
return result.changes > 0;
```

**After (Bun.SQL):**
```typescript
const result = await sql`DELETE FROM cache WHERE key = ${key}`.run(db);
return result.changes > 0;
```

---

## Migration Checklist Per Example

When migrating each pattern:

- [ ] Identify all usages of the pattern
- [ ] Create type definitions for query results
- [ ] Replace `db.prepare()` with `sql` tagged template
- [ ] Replace `.get()` / `.all()` / `.run()` with Bun.SQL equivalents
- [ ] Update method signatures to `async` if needed
- [ ] Remove prepared statement instance variables
- [ ] Update tests
- [ ] Verify type safety
- [ ] Benchmark performance

---

## Performance Considerations

### When to Keep `bun:sqlite`

Keep `bun:sqlite` for:
- Complex transaction patterns that need explicit control
- Performance-critical paths that are already optimized
- Legacy code that's low-risk to change
- Cases where Bun.SQL transaction API doesn't meet needs

### When to Use Bun.SQL

Use Bun.SQL for:
- New code (always)
- High-traffic queries that benefit from automatic optimization
- Code that needs better type safety
- Multi-database support (SQLite, MySQL, MariaDB)
- Cleaner, more maintainable code

---

## References

- [Bun.SQL Documentation](https://bun.sh/docs/api/sql)
- `docs/BUN-1.3-SQL.md` - Bun.SQL migration guide
- `docs/BUN-1.3-SQLITE-REVIEW.md` - Comprehensive review
- `src/services/ui-policy-manager-sql.ts` - Existing Bun.SQL implementation
