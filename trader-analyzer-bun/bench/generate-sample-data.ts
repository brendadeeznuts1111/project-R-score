// Generate sample execution data for benchmarking
import { writeFileSync } from "fs";
import { join } from "path";

const symbols = ["XBTUSD", "ETHUSD", "XBTETH", "SOLUSD"];
const sides = ["Buy", "Sell"] as const;
const execTypes = ["Trade", "Funding", "Settlement"] as const;
const ordTypes = ["Limit", "Market", "Stop"] as const;
const ordStatuses = ["Filled", "PartiallyFilled"] as const;

function randomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const numRecords = parseInt(process.argv[2] || "10000");
console.log(`Generating ${numRecords} sample executions...`);

const startDate = new Date("2024-01-01");
const endDate = new Date("2024-12-01");

const headers = [
  "execID",
  "orderID",
  "symbol",
  "side",
  "lastQty",
  "lastPx",
  "execType",
  "ordType",
  "ordStatus",
  "execCost",
  "execComm",
  "timestamp",
  "text",
];

const rows: string[] = [headers.join(",")];

for (let i = 0; i < numRecords; i++) {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const side = sides[Math.floor(Math.random() * sides.length)];
  const execType = Math.random() > 0.1 ? "Trade" : execTypes[Math.floor(Math.random() * execTypes.length)];
  const ordType = ordTypes[Math.floor(Math.random() * ordTypes.length)];
  const ordStatus = ordStatuses[Math.floor(Math.random() * ordStatuses.length)];

  const lastQty = Math.floor(Math.random() * 10000) + 100;
  const lastPx = symbol.includes("XBT")
    ? 40000 + Math.random() * 30000
    : symbol.includes("ETH")
      ? 2000 + Math.random() * 2000
      : 50 + Math.random() * 200;

  const execCost = lastQty * lastPx * (Math.random() > 0.5 ? 1 : -1);
  const execComm = Math.abs(execCost) * 0.0005 * (Math.random() > 0.3 ? 1 : -1);
  const timestamp = randomDate(startDate, endDate).toISOString();

  rows.push([
    randomId(),
    randomId(),
    symbol,
    side,
    lastQty.toString(),
    lastPx.toFixed(2),
    execType,
    ordType,
    ordStatus,
    execCost.toFixed(0),
    execComm.toFixed(0),
    timestamp,
    "",
  ].join(","));
}

const outputPath = join(import.meta.dir, "..", "bitmex_executions.csv");
writeFileSync(outputPath, rows.join("\n"));
console.log(`✓ Generated ${numRecords} records to ${outputPath}`);
