// Position calculation benchmarks
import { bench, group, execute } from "./runner";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
// Simple formatSymbol implementation for benchmarks
function formatSymbol(symbol: string): string {
	return symbol.replace(/[^A-Z0-9]/g, "").toUpperCase();
}

// Load executions once for benchmarking
const csvPath = join(import.meta.dir, "..", "bitmex_executions.csv");
const csvContent = readFileSync(csvPath, "utf-8");
const records = parse(csvContent, { columns: true, skip_empty_lines: true, relax_quotes: true });

interface Execution {
  execID: string;
  orderID: string;
  symbol: string;
  displaySymbol: string;
  side: "Buy" | "Sell";
  lastQty: number;
  lastPx: number;
  execType: string;
  ordType: string;
  ordStatus: string;
  execCost: number;
  execComm: number;
  timestamp: string;
  text: string;
}

const executions: Execution[] = records.map((record: Record<string, string>) => ({
  execID: record.execID,
  orderID: record.orderID || "",
  symbol: record.symbol,
  displaySymbol: formatSymbol(record.symbol),
  side: record.side as "Buy" | "Sell",
  lastQty: parseFloat(record.lastQty) || 0,
  lastPx: parseFloat(record.lastPx) || 0,
  execType: record.execType,
  ordType: record.ordType,
  ordStatus: record.ordStatus,
  execCost: parseFloat(record.execCost) || 0,
  execComm: parseFloat(record.execComm) || 0,
  timestamp: record.timestamp,
  text: record.text || "",
}));

// Filter trade executions
const tradeExecutions = executions.filter(
  (e) => e.execType === "Trade" && e.side && e.lastQty > 0
);

console.log(`Loaded ${executions.length} executions, ${tradeExecutions.length} trades`);

group("Execution filtering", () => {
  bench("filter trades", () => {
    executions.filter((e) => e.execType === "Trade" && e.side && e.lastQty > 0);
  });

  bench("filter + group by symbol (Map)", () => {
    const bySymbol = new Map<string, Execution[]>();
    executions
      .filter((e) => e.execType === "Trade" && e.side && e.lastQty > 0)
      .forEach((e) => {
        if (!bySymbol.has(e.symbol)) bySymbol.set(e.symbol, []);
        bySymbol.get(e.symbol)!.push(e);
      });
  });

  bench("filter + group by symbol (Object)", () => {
    const bySymbol: Record<string, Execution[]> = {};
    executions
      .filter((e) => e.execType === "Trade" && e.side && e.lastQty > 0)
      .forEach((e) => {
        if (!bySymbol[e.symbol]) bySymbol[e.symbol] = [];
        bySymbol[e.symbol].push(e);
      });
  });
});

group("Sorting", () => {
  const toSort = [...tradeExecutions];

  bench("sort by timestamp (Date parse)", () => {
    [...toSort].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  });

  bench("sort by timestamp (string compare)", () => {
    [...toSort].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  });
});

group("Position tracking simulation", () => {
  bench("calculate running position", () => {
    let position = 0;
    for (const e of tradeExecutions) {
      if (e.side === "Buy") {
        position += e.lastQty;
      } else {
        position -= e.lastQty;
      }
    }
  });

  bench("calculate with session detection", () => {
    let position = 0;
    let sessionCount = 0;
    for (const e of tradeExecutions) {
      const before = position;
      if (e.side === "Buy") {
        position += e.lastQty;
      } else {
        position -= e.lastQty;
      }
      if (before === 0 && position !== 0) sessionCount++;
      if (before !== 0 && position === 0) sessionCount++;
    }
  });
});

group("Aggregations", () => {
  bench("reduce total volume", () => {
    tradeExecutions.reduce((sum, e) => sum + e.lastQty, 0);
  });

  bench("for-loop total volume", () => {
    let total = 0;
    for (const e of tradeExecutions) total += e.lastQty;
  });

  bench("weighted avg price (reduce)", () => {
    const totalQty = tradeExecutions.reduce((s, e) => s + e.lastQty, 0);
    const weighted = tradeExecutions.reduce((s, e) => s + e.lastPx * e.lastQty, 0);
    weighted / totalQty;
  });
});

await execute();
