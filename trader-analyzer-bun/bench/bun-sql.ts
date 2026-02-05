// Bun.SQL vs bun:sqlite benchmark - Pure Bun, no Docker!
import { bench, group, execute } from "./runner";
import { Database } from "bun:sqlite";
import { SQL } from "bun";
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

const csvPath = join(import.meta.dir, "..", "bitmex_executions.csv");
const csvContent = readFileSync(csvPath, "utf-8");
const records = parse(csvContent, { columns: true, skip_empty_lines: true, relax_quotes: true });

console.log(`✅ Loaded ${records.length.toLocaleString()} records`);

// Prepare data for inserts
const insertData = records.map((r: Record<string, string>) => ({
  symbol: r.symbol,
  side: r.side,
  price: parseFloat(r.lastPx) || 0,
  size: parseFloat(r.lastQty) || 0,
  execType: r.execType,
}));

// ============ SETUP DATABASES ============

// bun:sqlite setup
const dbPath1 = join(import.meta.dir, "bench-classic.sqlite");
if (existsSync(dbPath1)) unlinkSync(dbPath1);

const dbClassic = new Database(dbPath1, { create: true });
dbClassic.run("PRAGMA journal_mode = WAL");
dbClassic.run("PRAGMA synchronous = NORMAL");
dbClassic.run(`
  CREATE TABLE executions (
    symbol TEXT, side TEXT, price REAL, size REAL, execType TEXT
  )
`);
dbClassic.run("CREATE INDEX idx_symbol ON executions(symbol)");

// Bun.SQL setup
const dbPath2 = join(import.meta.dir, "bench-bunsql.sqlite");
if (existsSync(dbPath2)) unlinkSync(dbPath2);

const dbBunSQL = new SQL(`sqlite://${dbPath2}`);
await dbBunSQL`
  CREATE TABLE executions (
    symbol TEXT, side TEXT, price REAL, size REAL, execType TEXT
  )
`;
await dbBunSQL`CREATE INDEX idx_symbol ON executions(symbol)`;

console.log("✅ Databases initialized");

// ============ INSERT BENCHMARKS ============

group("Bulk Insert (full dataset)", () => {
  bench("bun:sqlite transaction loop", () => {
    dbClassic.run("DELETE FROM executions");
    const insert = dbClassic.prepare("INSERT INTO executions VALUES (?, ?, ?, ?, ?)");
    const tx = dbClassic.transaction((rows: typeof insertData) => {
      for (const r of rows) {
        insert.run(r.symbol, r.side, r.price, r.size, r.execType);
      }
    });
    tx(insertData);
  });

  bench("Bun.SQL tagged template", async () => {
    await dbBunSQL`DELETE FROM executions`;
    await dbBunSQL`INSERT INTO executions ${dbBunSQL(insertData)}`;
  });
});

// Pre-populate for query benchmarks
const insertClassic = dbClassic.prepare("INSERT INTO executions VALUES (?, ?, ?, ?, ?)");
const txClassic = dbClassic.transaction((rows: typeof insertData) => {
  for (const r of rows) insertClassic.run(r.symbol, r.side, r.price, r.size, r.execType);
});
txClassic(insertData);

await dbBunSQL`INSERT INTO executions ${dbBunSQL(insertData)}`;
console.log("✅ Data inserted for query benchmarks");

// ============ QUERY BENCHMARKS ============

const selectAllClassic = dbClassic.prepare("SELECT * FROM executions");
const selectBySymbolClassic = dbClassic.prepare("SELECT * FROM executions WHERE symbol = ?");
const aggregateClassic = dbClassic.prepare("SELECT symbol, SUM(size) as volume FROM executions GROUP BY symbol");

group("SELECT * (full scan)", () => {
  bench("bun:sqlite .all()", () => {
    selectAllClassic.all();
  });

  bench("bun:sqlite .values()", () => {
    selectAllClassic.values();
  });

  bench("Bun.SQL tagged template", async () => {
    await dbBunSQL`SELECT * FROM executions`;
  });
});

group("WHERE symbol = ? (indexed)", () => {
  bench("bun:sqlite prepared", () => {
    selectBySymbolClassic.all("XBTUSD");
  });

  bench("Bun.SQL tagged template", async () => {
    const symbol = "XBTUSD";
    await dbBunSQL`SELECT * FROM executions WHERE symbol = ${symbol}`;
  });
});

group("Aggregation (GROUP BY SUM)", () => {
  bench("bun:sqlite prepared", () => {
    aggregateClassic.all();
  });

  bench("Bun.SQL tagged template", async () => {
    await dbBunSQL`SELECT symbol, SUM(size) as volume FROM executions GROUP BY symbol`;
  });
});

await execute();

// ============ CLEANUP ============
dbClassic.close();
await dbBunSQL.close();

for (const path of [dbPath1, dbPath2]) {
  if (existsSync(path)) unlinkSync(path);
  if (existsSync(path + "-wal")) unlinkSync(path + "-wal");
  if (existsSync(path + "-shm")) unlinkSync(path + "-shm");
}
console.log("✅ Cleaned up");
