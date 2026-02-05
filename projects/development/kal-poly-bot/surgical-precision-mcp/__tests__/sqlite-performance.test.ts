import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { OptimizedAudit, PatternMatcher } from '../audit-optimizations';

test("SQLite 3.51.1 Optimization Performance Baseline", () => {
  const db = new Database(':memory:');
  const audit = new OptimizedAudit(db);
  const matcher = new PatternMatcher(db);

  // 1. Seed data for meaningful matching
  console.time('[SQLite] Seeding 1000 audit entries');
  db.exec('BEGIN TRANSACTION');
  for (let i = 0; i < 1000; i++) {
    db.run("INSERT INTO audit_log (operation_type, severity) VALUES (?, ?)",
      [i % 10 === 0 ? 'VIOLATION' : 'INFO', i % 5 === 0 ? 'CRITICAL' : 'LOW']);
  }
  db.exec('COMMIT');
  console.timeEnd('[SQLite] Seeding 1000 audit entries');

  // 2. Measure retrieval of violations (uses planner improvements)
  const startViolation = performance.now();
  const violations = audit.getRecentViolations(50);
  const endViolation = performance.now();

  expect(violations.length).toBeGreaterThan(0);
  console.info(`[SQLite] Violation retrieval: ${(endViolation - startViolation).toFixed(4)}ms`);

  // 3. Seed pattern matrix for EXISTS testing
  db.exec('BEGIN TRANSACTION');
  for (let i = 0; i < 100; i++) {
    db.run("INSERT INTO syndicate_matrix (pattern_type) VALUES (?)", [`type_${i}`]);
    const matrixId = db.query("SELECT last_insert_rowid() as id").get() as any;
    db.run("INSERT INTO pattern_matches (matrix_id, pattern) VALUES (?, ?)", [matrixId.id, 'rapid_betting']);
  }
  db.exec('COMMIT');

  // 4. Measure EXISTS-to-JOIN optimization
  const startEXISTS = performance.now();
  const patternMatches = matcher.findMatchingPatterns('rapid_betting');
  const endEXISTS = performance.now();

  expect(patternMatches.length).toBe(100);
  console.info(`[SQLite] EXISTS pattern matching: ${(endEXISTS - startEXISTS).toFixed(4)}ms`);

  db.close();
});

test("SQLite 3.51.1 EXISTS-to-JOIN Optimization Benchmark", () => {
  const db = new Database(':memory:');
  const matcher = new PatternMatcher(db);

  console.log('\n🧪 SQLite 3.51.1 EXISTS-to-JOIN Optimization Benchmark');

  // Create test data that benefits from EXISTS-to-JOIN optimization
  console.time('[SQLite] Creating test dataset (10k patterns)');
  db.exec('BEGIN TRANSACTION');

  // Create 1000 matrices, each with 10 patterns
  for (let i = 0; i < 1000; i++) {
    db.run("INSERT INTO syndicate_matrix (pattern_type, priority) VALUES (?, ?)",
      [`matrix_${i}`, i % 3 === 0 ? 'HIGH' : 'NORMAL']);

    const matrixId = db.query("SELECT last_insert_rowid() as id").get() as any;

    // Each matrix has 10 patterns
    for (let j = 0; j < 10; j++) {
      const pattern = j < 3 ? 'rapid_betting' : `pattern_${j}_${i}`;
      db.run("INSERT INTO pattern_matches (matrix_id, pattern) VALUES (?, ?)",
        [matrixId.id, pattern]);
    }
  }
  db.exec('COMMIT');
  console.timeEnd('[SQLite] Creating test dataset (10k patterns)');

  // Benchmark EXISTS query (should use JOIN optimization in 3.51.1)
  console.time('[SQLite] EXISTS query (10k rows, optimized)');
  const existsResults = matcher.findMatchingPatterns('rapid_betting');
  const existsTime = console.timeEnd('[SQLite] EXISTS query (10k rows, optimized)');

  expect(existsResults.length).toBe(1000); // All 1000 matrices should match
  console.log(`✅ EXISTS optimization: Found ${existsResults.length} matches`);

  // Compare with manual JOIN query to verify optimization
  console.time('[SQLite] Manual JOIN equivalent');
  const joinResults = db.query(`
    SELECT DISTINCT sm.* FROM syndicate_matrix sm
    INNER JOIN pattern_matches pm ON sm.id = pm.matrix_id
    WHERE pm.pattern = ?
  `).all('rapid_betting');
  console.timeEnd('[SQLite] Manual JOIN equivalent');

  expect(joinResults.length).toBe(existsResults.length);
  console.log(`✅ JOIN consistency: Both queries returned ${joinResults.length} results`);

  // Test query planner hints with different patterns
  const testPatterns = ['rapid_betting', 'nonexistent_pattern', 'pattern_0_0'];

  console.log('\n📊 Query Performance Comparison:');
  for (const pattern of testPatterns) {
    const start = performance.now();
    const count = db.query(`
      SELECT COUNT(*) as count FROM syndicate_matrix
      WHERE EXISTS (
        SELECT 1 FROM pattern_matches
        WHERE matrix_id = syndicate_matrix.id AND pattern = ?
      )
    `).get(pattern) as any;
    const time = performance.now() - start;

    console.log(`  Pattern "${pattern}": ${count.count} matches in ${(time).toFixed(4)}ms`);
  }

  db.close();
});

test("SQLite 3.51.1 Query Planner Improvements", () => {
  const db = new Database(':memory:');

  console.log('\n🔍 SQLite 3.51.1 Query Planner Analysis');

  // Test various query patterns that benefit from planner improvements
  db.exec(`
    CREATE TABLE test_data (
      id INTEGER PRIMARY KEY,
      category TEXT,
      value INTEGER,
      status TEXT
    );
    CREATE INDEX idx_category ON test_data(category);
    CREATE INDEX idx_status ON test_data(status);
  `);

  // Insert test data
  db.exec('BEGIN TRANSACTION');
  for (let i = 0; i < 10000; i++) {
    db.run('INSERT INTO test_data (category, value, status) VALUES (?, ?, ?)',
      [`cat_${i % 10}`, Math.random() * 1000, i % 2 === 0 ? 'active' : 'inactive']);
  }
  db.exec('COMMIT');

  // Test queries that should benefit from improved planner
  const queries = [
    {
      name: 'Simple indexed lookup',
      sql: 'SELECT * FROM test_data WHERE category = ? AND status = ?',
      params: ['cat_5', 'active']
    },
    {
      name: 'EXISTS with subquery',
      sql: `SELECT * FROM test_data WHERE EXISTS (
        SELECT 1 FROM test_data dt2 WHERE dt2.category = test_data.category AND dt2.value > ?
      ) AND status = ?`,
      params: [500, 'active']
    },
    {
      name: 'Correlated subquery',
      sql: `SELECT *, (
        SELECT COUNT(*) FROM test_data dt2 WHERE dt2.category = test_data.category
      ) as category_count FROM test_data WHERE status = ? LIMIT 100`,
      params: ['active']
    }
  ];

  console.log('Query Performance Results:');
  for (const query of queries) {
    const start = performance.now();
    const results = db.query(query.sql).all(...query.params);
    const time = performance.now() - start;

    console.log(`  ${query.name}: ${results.length} rows in ${(time).toFixed(4)}ms`);
  }

  // Check SQLite version
  const version = db.query('SELECT sqlite_version() as version').get() as any;
  console.log(`\n📋 SQLite Version: ${version.version}`);
  console.log('🎯 Query planner improvements in 3.51.1 should optimize EXISTS-to-JOIN conversions');

  db.close();
});
