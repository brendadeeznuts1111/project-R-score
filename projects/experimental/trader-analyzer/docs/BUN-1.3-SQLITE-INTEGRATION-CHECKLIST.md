# Bun 1.3 SQLite Integration Checklist

This checklist provides a step-by-step guide for integrating Bun 1.3 SQLite enhancements into the NEXUS codebase.

## Pre-Integration Verification

### Environment Setup

- [ ] **Verify Bun Version**
  ```bash
  bun --version
  # Expected: 1.3.3 or higher
  ```

- [ ] **Verify SQLite Version**
  ```bash
  bun run scripts/verify-sqlite-version.ts
  # Expected: SQLite 3.51.0
  ```

- [ ] **Type Check**
  ```bash
  bun run typecheck
  # Should pass without errors
  ```

- [ ] **Run Tests**
  ```bash
  bun run test
  # All tests should pass
  ```

### Documentation Review

- [x] Review `docs/BUN-1.3-SQL.md`
- [x] Review `docs/BUN-1.3.3-SQLITE-3.51.0.md`
- [x] Review `docs/BUN-1.3-SQLITE-REVIEW.md`
- [x] Review `docs/SQLITE-BEST-PRACTICES.md`
- [x] Review existing Bun.SQL implementation (`src/services/ui-policy-manager-sql.ts`)

---

## Phase 1: New Code Guidelines (Immediate)

### Coding Standards

- [ ] **Update Coding Standards Document**
  - [ ] Add Bun.SQL as preferred API for new database code
  - [ ] Document when to use `bun:sqlite` vs `Bun.SQL`
  - [ ] Add code examples

- [ ] **Update Developer Guide**
  - [ ] Add Bun.SQL examples
  - [ ] Document type definitions pattern
  - [ ] Add migration examples

- [ ] **Update Code Review Checklist**
  - [ ] Check for Bun.SQL usage in new code
  - [ ] Verify type definitions are used
  - [ ] Check for proper error handling

### Type Definitions

- [ ] **Create Common Type Definitions** (`src/types/database.ts`)
  - [ ] `CacheEntry` interface
  - [ ] `UserRow` interface
  - [ ] `RoleRow` interface
  - [ ] `TickRow` interface
  - [ ] `OddsHistoryRow` interface
  - [ ] Other common query result types

---

## Phase 2: High-Traffic Query Migration (Weeks 1-4)

### Week 1: Cache Manager

**File:** `src/cache/manager.ts`

- [ ] **Create Feature Branch**
  ```bash
  git checkout -b feat/migrate-cache-manager-to-bun-sql
  ```

- [ ] **Add Type Definitions**
  - [ ] `CacheRow` interface
  - [ ] `CacheStatsRow` interface

- [ ] **Migrate Queries**
  - [ ] `get()` method
  - [ ] `set()` method
  - [ ] `delete()` method
  - [ ] `has()` method
  - [ ] `cleanup()` method
  - [ ] `stats()` method
  - [ ] `keys()` method
  - [ ] `inspect()` method

- [ ] **Update Method Signatures**
  - [ ] Make methods `async` where needed
  - [ ] Update return types

- [ ] **Update Tests**
  - [ ] Update unit tests
  - [ ] Update integration tests
  - [ ] Verify all tests pass

- [ ] **Benchmark Performance**
  - [ ] Benchmark `get()` operations (before/after)
  - [ ] Benchmark `set()` operations (before/after)
  - [ ] Compare memory usage
  - [ ] Document results

- [ ] **Code Review**
  - [ ] Review type safety
  - [ ] Review error handling
  - [ ] Review performance impact

- [ ] **Merge to Main**
  - [ ] Get approval
  - [ ] Merge PR
  - [ ] Update documentation

**Estimated Time:** 2-4 hours

---

### Week 2: RBAC Manager

**File:** `src/rbac/manager.ts`

- [ ] **Create Feature Branch**
  ```bash
  git checkout -b feat/migrate-rbac-manager-to-bun-sql
  ```

- [ ] **Add Type Definitions**
  - [ ] `UserRow` interface
  - [ ] `RoleRow` interface
  - [ ] `UserWithRole` interface

- [ ] **Migrate Queries**
  - [ ] `createUser()` method
  - [ ] `getUserById()` method
  - [ ] `getAllUsers()` method
  - [ ] `updateUser()` method
  - [ ] `registerRole()` method
  - [ ] `getRole()` method
  - [ ] `getRoleById()` method
  - [ ] `getAllRoles()` method
  - [ ] `updateRole()` method
  - [ ] `assignRoleToUser()` method

- [ ] **Update Method Signatures**
  - [ ] Make methods `async` where needed
  - [ ] Update return types

- [ ] **Update Tests**
  - [ ] Update unit tests
  - [ ] Update integration tests
  - [ ] Test RBAC workflows end-to-end

- [ ] **Benchmark Performance**
  - [ ] Benchmark user creation
  - [ ] Benchmark role lookups
  - [ ] Compare before/after

- [ ] **Code Review**
  - [ ] Review type safety improvements
  - [ ] Review error handling
  - [ ] Verify RBAC logic unchanged

- [ ] **Merge to Main**
  - [ ] Get approval
  - [ ] Merge PR
  - [ ] Update documentation

**Estimated Time:** 4-6 hours

---

### Week 3-4: Tick Storage

**File:** `src/ticks/storage.ts`

- [ ] **Create Feature Branch**
  ```bash
  git checkout -b feat/migrate-tick-storage-to-bun-sql
  ```

- [ ] **Verify Transaction API**
  - [ ] Test Bun.SQL transaction support
  - [ ] Determine if `bun:sqlite` transactions needed
  - [ ] Document transaction pattern

- [ ] **Add Type Definitions**
  - [ ] `TickRow` interface
  - [ ] `MovementRow` interface
  - [ ] `VelocityRow` interface
  - [ ] `LatencyStatsRow` interface

- [ ] **Migrate Queries**
  - [ ] `storeTick()` method
  - [ ] `storeTicks()` method (verify transaction)
  - [ ] `storeMovement()` method
  - [ ] `storeVelocity()` method
  - [ ] `storeLatencyStats()` method
  - [ ] `getTicks()` method
  - [ ] `getMovements()` method
  - [ ] `getVelocities()` method
  - [ ] `getLatencyHistory()` method
  - [ ] `getMovementStats()` method
  - [ ] `getClvAnalysis()` method

- [ ] **Update Method Signatures**
  - [ ] Make methods `async` where needed
  - [ ] Update return types

- [ ] **Update Tests**
  - [ ] Update unit tests
  - [ ] Test high-frequency writes
  - [ ] Test concurrent access
  - [ ] Verify data integrity

- [ ] **Benchmark Performance**
  - [ ] Benchmark bulk inserts
  - [ ] Benchmark queries
  - [ ] Compare before/after
  - [ ] Test concurrent performance

- [ ] **Code Review**
  - [ ] Review transaction handling
  - [ ] Review performance impact
  - [ ] Verify data integrity

- [ ] **Merge to Main**
  - [ ] Get approval
  - [ ] Merge PR
  - [ ] Update documentation

**Estimated Time:** 4-8 hours

---

## Phase 3: Medium-Priority Migration (Weeks 5-8)

### Week 5: ORCA Storage

**File:** `src/orca/storage/sqlite.ts`

- [ ] Create feature branch
- [ ] Add type definitions
- [ ] Migrate queries
- [ ] Update tests
- [ ] Benchmark performance
- [ ] Code review
- [ ] Merge to main

**Estimated Time:** 3-5 hours

---

### Week 6: Shadow Graph Batch Operations

**File:** `src/arbitrage/shadow-graph/multi-layer-batch-operations.ts`

- [ ] Create feature branch
- [ ] Verify transaction API for batch operations
- [ ] Add type definitions
- [ ] Migrate batch insert functions
- [ ] Update tests
- [ ] Benchmark performance
- [ ] Code review
- [ ] Merge to main

**Estimated Time:** 4-6 hours

---

### Week 7: Research DB

**File:** `src/api/registry.ts`

- [ ] Create feature branch
- [ ] Add type definitions
- [ ] Migrate URL pattern queries
- [ ] Update tests
- [ ] Code review
- [ ] Merge to main

**Estimated Time:** 2-4 hours

---

### Week 8: Arbitrage Storage

**File:** `src/orca/arbitrage/storage.ts`

- [ ] Create feature branch
- [ ] Add type definitions
- [ ] Migrate queries
- [ ] Update tests
- [ ] Code review
- [ ] Merge to main

**Estimated Time:** 3-5 hours

---

## Phase 4: Low-Priority Migration (Weeks 9-12)

### Shadow Graph Modules

**Files:** `src/arbitrage/shadow-graph/*` (35+ files)

- [ ] **Prioritize Modules**
  - [ ] Identify high-traffic modules
  - [ ] Identify modules with complex queries
  - [ ] Create migration order

- [ ] **Gradual Migration**
  - [ ] Migrate one module at a time
  - [ ] Keep `bun:sqlite` for complex patterns if needed
  - [ ] Document which modules use which API

- [ ] **Estimated Time:** 20-40 hours (distributed)

---

## Testing Strategy

### Unit Tests

- [ ] **For Each Migrated Module:**
  - [ ] Test each query method
  - [ ] Test type safety
  - [ ] Test error handling
  - [ ] Test edge cases

### Integration Tests

- [ ] **End-to-End Workflows:**
  - [ ] Test cache operations
  - [ ] Test RBAC workflows
  - [ ] Test tick storage workflows
  - [ ] Test arbitrage detection workflows

### Performance Tests

- [ ] **Benchmark Critical Paths:**
  - [ ] Cache get/set operations
  - [ ] User creation/lookup
  - [ ] Tick storage bulk inserts
  - [ ] Complex queries

- [ ] **Compare Metrics:**
  - [ ] Query execution time
  - [ ] Memory usage
  - [ ] Concurrent performance
  - [ ] Database file size

### Regression Tests

- [ ] **Verify No Breaking Changes:**
  - [ ] All existing tests pass
  - [ ] API contracts unchanged
  - [ ] Data integrity maintained
  - [ ] Performance not degraded

---

## Documentation Updates

### Code Documentation

- [ ] **Update Inline Comments**
  - [ ] Document Bun.SQL usage
  - [ ] Update code examples
  - [ ] Add migration notes

- [ ] **Update JSDoc Comments**
  - [ ] Update method documentation
  - [ ] Add type information
  - [ ] Update examples

### Developer Documentation

- [ ] **Update `docs/BUN-1.3-SQL.md`**
  - [ ] Add migration examples
  - [ ] Update best practices
  - [ ] Add troubleshooting guide

- [ ] **Update `docs/SQLITE-BEST-PRACTICES.md`**
  - [ ] Add Bun.SQL patterns
  - [ ] Update performance recommendations
  - [ ] Add type safety guidelines

- [ ] **Create Migration Guide**
  - [ ] Step-by-step instructions
  - [ ] Common pitfalls
  - [ ] Rollback procedures

### API Documentation

- [ ] **Update API Docs**
  - [ ] Document Bun.SQL usage
  - [ ] Update code examples
  - [ ] Add migration notes

---

## Monitoring & Rollback

### Performance Monitoring

- [ ] **Set Up Monitoring**
  - [ ] Track query performance
  - [ ] Monitor error rates
  - [ ] Alert on regressions

- [ ] **Metrics to Track**
  - [ ] Query execution time
  - [ ] Database connection count
  - [ ] Memory usage
  - [ ] Error rates

### Rollback Plan

- [ ] **For Each Migration:**
  - [ ] Keep `bun:sqlite` code in git history
  - [ ] Create feature flag (if needed)
  - [ ] Document rollback procedure
  - [ ] Test rollback process

- [ ] **Database Backups**
  - [ ] Backup before migration
  - [ ] Verify backup integrity
  - [ ] Document restore procedure

---

## Success Criteria

### Phase 1 (New Code)

- [x] Coding standards updated
- [ ] Type definitions created
- [ ] Developer guide updated
- [ ] Code review checklist updated

### Phase 2 (High-Traffic Queries)

- [ ] Cache Manager migrated
- [ ] RBAC Manager migrated
- [ ] Tick Storage migrated
- [ ] All tests passing
- [ ] Performance benchmarks documented
- [ ] Documentation updated

### Phase 3 (Medium-Priority)

- [ ] ORCA Storage migrated
- [ ] Shadow Graph batch operations migrated
- [ ] Research DB migrated
- [ ] Arbitrage Storage migrated
- [ ] All tests passing

### Phase 4 (Low-Priority)

- [ ] Shadow Graph modules prioritized
- [ ] Gradual migration in progress
- [ ] Documentation updated
- [ ] Performance maintained

### Overall Success

- [ ] All high-priority modules migrated
- [ ] Type safety improved
- [ ] Performance maintained or improved
- [ ] Documentation complete
- [ ] Team trained on Bun.SQL
- [ ] No breaking changes
- [ ] All tests passing

---

## Notes

### Transaction API Verification

**Status:** ⚠️ Needs Verification

Bun.SQL transaction API may differ from `bun:sqlite`. Need to verify:
- How to begin/commit/rollback transactions
- How to use transactions with Bun.SQL
- Whether to keep `bun:sqlite` for complex transaction patterns

### Performance Considerations

- SQLite 3.51.0 improvements are automatic (no code changes)
- Bun.SQL may provide additional performance benefits
- Benchmark before/after for each migration

### Type Safety

- Create type definitions early
- Use type inference where possible
- Avoid manual type assertions (`as`)

---

## References

- `docs/BUN-1.3-SQLITE-REVIEW.md` - Comprehensive review
- `docs/BUN-1.3-SQLITE-MIGRATION-EXAMPLES.md` - Migration examples
- `docs/BUN-1.3-SQL.md` - Bun.SQL guide
- `docs/BUN-1.3.3-SQLITE-3.51.0.md` - SQLite 3.51.0 features
- `src/services/ui-policy-manager-sql.ts` - Existing Bun.SQL implementation
