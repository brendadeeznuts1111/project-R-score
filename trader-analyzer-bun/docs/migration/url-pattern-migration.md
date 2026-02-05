# Migrating from Regex to URLPattern API

**Version**: 7.8.0.0.0.0.0  
**Last Updated**: 2025-12-07

## Why Migrate?

- **10-15x faster**: Native URLPattern vs regex compilation
- **Type-safe**: Automatic parameter extraction with type hints
- **Standard**: Web Platform API (works across browsers/runtimes)
- **Maintainable**: Declarative patterns vs complex regex

---

## Before (Regex)

```typescript
// Old regex-based route
app.get(/^\/api\/v1\/graph\/([^\/]+)$/, (req, res) => {
  const eventId = req.params[0]; // No type safety
  // ...
});
```

## After (URLPattern)

```typescript
// New URLPattern-based route
urlPatternRouter.add({
  pattern: new URLPattern({ pathname: '/api/v1/graph/:eventId' }),
  handler: async (req, context, groups) => {
    const { eventId } = groups; // Type-safe! eventId is string
    // ...
  }
});
```

---

## Step-by-Step Migration

### 1. Identify routes to migrate

```bash
# Find all regex routes
rg 'router\.(get|post|put|delete)\(\/|new RegExp|\/\^' src/api/
```

### 2. Create pattern mapping

```typescript
const MIGRATION_MAP = {
  // Regex -> URLPattern
  r'^\/api\/v1\/graph\/([^\/]+)$': {
    pattern: '/api/v1/graph/:eventId',
    params: ['eventId']
  },
  r'^\/api\/v1\/logs\/([^\/]+)?$': {
    pattern: '/api/v1/logs/:level?',
    params: ['level']
  },
  r'^\/api\/v1\/secrets\/([^\/]+)\/([^\/]+)$': {
    pattern: '/api/v1/secrets/:server/:type',
    params: ['server', 'type']
  }
};
```

### 3. Automated migration script

```bash
# Run migration tool
bun run migrate:routes --from-regex --to-pattern

# Verify migration
bun test tests/api/migrated-routes.test.ts
```

### 4. Performance validation

```bash
# Compare before/after
bun bench:routes --before=regex --after=pattern
```

---

## Common Patterns Migration

| Regex Pattern | URLPattern | Notes |
|---------------|------------|-------|
| `/^\/users\/(\d+)$/` | `/users/:id` | `:id` matches any characters |
| `/^\/posts\/([a-z]+)$/i` | `/posts/:slug` | Case-sensitive by default |
| `/^\/files\/(.+)$/` | `/files/*` | Wildcard captures rest of path |
| `/^\/api\/v(\d+)\/(.+)$/` | `/api/v:version/*` | Multiple params + wildcard |

---

## Testing Migrated Routes

```typescript
// Test migrated route
test('Migrated route works identically', () => {
  const pattern = new URLPattern({ pathname: '/api/v1/graph/:eventId' });
  const result = pattern.exec('https://example.com/api/v1/graph/NFL-20241207-1345');
  
  expect(result?.pathname.groups.eventId).toBe('NFL-20241207-1345');
  // Should match old regex behavior exactly
});
```

---

## Rollback Plan

If issues arise:
1. Keep legacy routes in `routes-legacy.ts`
2. Use feature flag: `USE_URL_PATTERN_ROUTES=false`
3. Instant rollback: `git revert last-migration-commit`

---

**Cross-reference**: [7.0.0.0.0.0.0 URLPattern Router](./7.0.0.0.0.0.0.0-URLPATTERN-ROUTER.md)  
**Ripgrep Pattern**: `7\.8\.0\.0\.0\.0\.0|url-pattern-migration`
