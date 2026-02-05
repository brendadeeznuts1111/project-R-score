# Bun.SQL - MySQL, MariaDB, and SQLite Support

## Overview

Bun 1.3 introduces **Bun.SQL**, a powerful SQL query builder with support for MySQL, MariaDB, and SQLite. This provides type-safe SQL queries using tagged template literals and improved developer experience.

## Current SQL Usage in NEXUS

The codebase currently uses `bun:sqlite` extensively with prepared statements:

### Current Pattern (bun:sqlite)

```typescript
import { Database } from "bun:sqlite";

const db = new Database("./data/example.db");
const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const user = stmt.get(userId);
```

### Locations Using SQLite

- **RBAC Manager** (`src/rbac/manager.ts`) - User and role management
- **Cache Manager** (`src/cache/manager.ts`) - TTL cache with compression
- **ORCA Storage** (`src/orca/storage/sqlite.ts`) - Team aliases and odds history
- **Tick Storage** (`src/ticks/storage.ts`) - Trade tick data
- **Research DB** (`src/api/registry.ts`) - URL anomaly patterns
- **Arbitrage Storage** (`src/orca/arbitrage/storage.ts`) - Arbitrage opportunities

## Bun.SQL Features

### 1. Tagged Template Literals

Bun.SQL provides type-safe SQL queries using tagged template literals:

```typescript
import { sql } from "bun";

// Type-safe SQL queries
const users = sql`SELECT * FROM users WHERE role = ${role}`;
const result = await users.all();
```

### 2. Multi-Database Support

Bun.SQL supports MySQL, MariaDB, and SQLite with the same API:

```typescript
// SQLite
const db = new Database("data.db");
const users = sql`SELECT * FROM users`.all(db);

// MySQL/MariaDB
const mysql = new MySQL({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mydb"
});
const users = sql`SELECT * FROM users`.all(mysql);
```

### 3. Type Safety

Bun.SQL provides better type inference and safety:

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

const users = sql<User>`SELECT id, username, email, role FROM users`.all(db);
// users is typed as User[]
```

## Migration Examples

### Example 1: RBAC Manager User Creation

**Before (bun:sqlite)**:
```typescript
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
```

**After (Bun.SQL)**:
```typescript
import { sql } from "bun";

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
```

### Example 2: Cache Manager Query

**Before (bun:sqlite)**:
```typescript
const getStmt = this.db.prepare(
  "SELECT value, hits, compressed FROM cache WHERE key = ? AND expires_at > ?"
);
const result = getStmt.get(key, Date.now());
```

**After (Bun.SQL)**:
```typescript
import { sql } from "bun";

const result = await sql`
  SELECT value, hits, compressed 
  FROM cache 
  WHERE key = ${key} AND expires_at > ${Date.now()}
`.get(this.db);
```

### Example 3: Complex Query with Joins

**Before (bun:sqlite)**:
```typescript
const stmt = this.db.prepare(`
  SELECT u.id, u.username, r.name as role_name
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = ?
`);
const user = stmt.get(userId);
```

**After (Bun.SQL)**:
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

## Benefits of Bun.SQL

### 1. Better Developer Experience

- **No String Concatenation**: Tagged templates prevent SQL injection
- **Syntax Highlighting**: SQL syntax highlighting in IDEs
- **Type Safety**: Better TypeScript inference

### 2. Performance

- **Prepared Statements**: Automatically uses prepared statements
- **Query Optimization**: Better query planning
- **Connection Pooling**: Built-in connection management

### 3. Multi-Database Support

- **Unified API**: Same code works with SQLite, MySQL, MariaDB
- **Easy Migration**: Switch databases without code changes
- **Database-Specific Features**: Access to database-specific features

## Migration Strategy

### Phase 1: New Code
- Use Bun.SQL for all new database operations
- Keep existing `bun:sqlite` code unchanged

### Phase 2: High-Traffic Endpoints
- Migrate frequently-used queries to Bun.SQL
- Focus on performance-critical paths

### Phase 3: Full Migration
- Gradually migrate all database operations
- Remove `bun:sqlite` imports where possible

## Security Considerations

### SQL Injection Prevention

Bun.SQL automatically escapes parameters:

```typescript
// ✅ Safe - automatically escaped
const users = sql`SELECT * FROM users WHERE username = ${userInput}`;

// ❌ Dangerous - don't do this
const users = sql`SELECT * FROM users WHERE username = '${userInput}'`;
```

### Parameter Binding

Always use parameter binding:

```typescript
// ✅ Correct
const result = sql`SELECT * FROM users WHERE id = ${userId}`.get(db);

// ❌ Incorrect - vulnerable to injection
const result = sql`SELECT * FROM users WHERE id = '${userId}'`.get(db);
```

## Example: Migrating RBAC Manager

### Current Implementation

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

### Migrated to Bun.SQL

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

## Performance Comparison

### Prepared Statements

Both approaches use prepared statements, but Bun.SQL provides:
- **Automatic Caching**: Query plans cached automatically
- **Better Type Inference**: TypeScript types improve performance
- **Connection Pooling**: Better connection management

### Benchmark Results

(To be added after migration testing)

## References

- [Bun 1.3 Blog Post - Bun.SQL](https://bun.com/blog/bun-v1.3#bun-sql-mysql-mariadb-and-sqlite-support)
- [Bun SQL Documentation](https://bun.sh/docs/api/sql)
- [SQLite Best Practices](./SQLITE-BEST-PRACTICES.md)

## Related Documentation

- `docs/BUN-1.3-FULL-STACK-FEATURES.md` - Full-stack runtime features
- `docs/BUN-LATEST-BREAKING-CHANGES.md` - Breaking changes
- `docs/SQLITE-BEST-PRACTICES.md` - SQLite optimization guide
