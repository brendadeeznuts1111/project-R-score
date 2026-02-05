// SQLite benchmarks - test if caching trade data in SQLite is faster
import { bench, group, execute } from "./runner";
import { Database } from "bun:sqlite";
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

const csvPath = join(import.meta.dir, "..", "bitmex_executions.csv");
const dbPath = join(import.meta.dir, "cache.sqlite");
const dbPathMem = ":memory:";

// Clean up old db
if (existsSync(dbPath)) unlinkSync(dbPath);

// Load CSV data
const csvContent = readFileSync(csvPath, "utf-8");
const records = parse(csvContent, { columns: true, skip_empty_lines: true, relax_quotes: true });

console.log(`Loaded ${records.length} records from CSV`);

// ============ DISK DATABASE (WAL mode) ============
const db = new Database(dbPath, { create: true });
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");
db.run("PRAGMA cache_size = 10000"); // 10MB cache

db.run(`
  CREATE TABLE executions (
    execID TEXT PRIMARY KEY,
    orderID TEXT,
    symbol TEXT,
    side TEXT,
    lastQty REAL,
    lastPx REAL,
    execType TEXT,
    execCost REAL,
    execComm REAL,
    timestamp TEXT
  )
`);

db.run("CREATE INDEX idx_symbol ON executions(symbol)");
db.run("CREATE INDEX idx_execType ON executions(execType)");

// Bulk insert with transaction
const insert = db.prepare(`
  INSERT INTO executions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows: typeof records) => {
  for (const row of rows) {
    insert.run(
      row.execID,
      row.orderID || "",
      row.symbol,
      row.side,
      parseFloat(row.lastQty) || 0,
      parseFloat(row.lastPx) || 0,
      row.execType,
      parseFloat(row.execCost) || 0,
      parseFloat(row.execComm) || 0,
      row.timestamp
    );
  }
});

insertMany(records);
console.log(`Inserted ${records.length} rows into SQLite (disk + WAL)`);

// ============ MEMORY DATABASE ============
const dbMem = new Database(dbPathMem);
dbMem.run(`
  CREATE TABLE executions (
    execID TEXT PRIMARY KEY,
    orderID TEXT,
    symbol TEXT,
    side TEXT,
    lastQty REAL,
    lastPx REAL,
    execType TEXT,
    execCost REAL,
    execComm REAL,
    timestamp TEXT
  )
`);
dbMem.run("CREATE INDEX idx_symbol ON executions(symbol)");
dbMem.run("CREATE INDEX idx_execType ON executions(execType)");

const insertMem = dbMem.prepare(`INSERT INTO executions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertManyMem = dbMem.transaction((rows: typeof records) => {
  for (const row of rows) {
    insertMem.run(
      row.execID, row.orderID || "", row.symbol, row.side,
      parseFloat(row.lastQty) || 0, parseFloat(row.lastPx) || 0,
      row.execType, parseFloat(row.execCost) || 0,
      parseFloat(row.execComm) || 0, row.timestamp
    );
  }
});
insertManyMem(records);
console.log(`Inserted ${records.length} rows into SQLite (:memory:)`);

// Prepare queries - disk
const selectAll = db.prepare("SELECT * FROM executions");
const selectAllValues = db.prepare("SELECT * FROM executions");
const selectTrades = db.prepare("SELECT * FROM executions WHERE execType = 'Trade'");
const selectBySymbol = db.prepare("SELECT * FROM executions WHERE symbol = ?");
const countBySymbol = db.prepare("SELECT symbol, COUNT(*) as count FROM executions GROUP BY symbol");
const aggregateVolume = db.prepare("SELECT symbol, SUM(lastQty) as volume FROM executions WHERE execType = 'Trade' GROUP BY symbol");

// Prepare queries - memory
const selectAllMem = dbMem.prepare("SELECT * FROM executions");
const selectTradesMem = dbMem.prepare("SELECT * FROM executions WHERE execType = 'Trade'");

group("Full table scan", () => {
  bench("SQLite disk: .all()", () => {
    selectAll.all();
  });

  bench("SQLite disk: .values() (zero-copy)", () => {
    selectAllValues.values();
  });

  bench("SQLite :memory: .all()", () => {
    selectAllMem.all();
  });

  bench("CSV: parse full file", () => {
    parse(csvContent, { columns: true });
  });
});

group("Filtered queries", () => {
  bench("SQLite disk: WHERE execType='Trade'", () => {
    selectTrades.all();
  });

  bench("SQLite :memory: WHERE execType='Trade'", () => {
    selectTradesMem.all();
  });

  bench("JS: filter from cached array", () => {
    records.filter((r: Record<string, string>) => r.execType === "Trade");
  });
});

group("Symbol lookup (indexed)", () => {
  bench("SQLite: WHERE symbol='XBTUSD'", () => {
    selectBySymbol.all("XBTUSD");
  });

  bench("JS: array.filter()", () => {
    records.filter((r: Record<string, string>) => r.symbol === "XBTUSD");
  });
});

group("Aggregations", () => {
  bench("SQLite: GROUP BY COUNT", () => {
    countBySymbol.all();
  });

  bench("SQLite: SUM volume GROUP BY", () => {
    aggregateVolume.all();
  });

  bench("JS: reduce volume", () => {
    const bySymbol: Record<string, number> = {};
    for (const r of records) {
      if (r.execType === "Trade") {
        bySymbol[r.symbol] = (bySymbol[r.symbol] || 0) + (parseFloat(r.lastQty) || 0);
      }
    }
  });
});

await execute();

// Cleanup
db.close();
dbMem.close();
unlinkSync(dbPath);
// Also clean up WAL files
if (existsSync(dbPath + "-wal")) unlinkSync(dbPath + "-wal");
if (existsSync(dbPath + "-shm")) unlinkSync(dbPath + "-shm");
console.log("Cleaned up benchmark databases");
