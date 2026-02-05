#!/usr/bin/env bun

import { TableInspector } from "../src/metrics/table-inspector";
import { feature } from "bun:bundle";

// Parse command line arguments
const args = Bun.argv.slice(2);
const command = args[0];
const filePath = args[1];

async function analyzeCSV(filePath: string) {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const text = await file.text();
  
  // Parse CSV (simplified)
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  const data = lines.slice(1).map(line => {
    const values = line.split(",");
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim();
    });
    return obj;
  });
  
  // Create analyzed table
  const table: any = TableInspector.createTable(data, {
    title: `Analysis: ${filePath}`,
    border: "rounded",
  });
  
  // Bun.inspect/console.log will trigger Symbol.for("bun.table.inspect.custom") 
  // if Bun supports it in this version and it's implemented correctly.
  console.log("\n--- Table Display ---");
  // @ts-ignore
  if (typeof Bun.table === "function") {
    console.log(Bun.table(data)); // Show actual table
  } else {
    console.log(data);
  }
  
  console.log("\n--- Metrics Analysis ---");
  console.log(Bun.inspect(table)); // This should show our custom inspection output
  
  // Export if requested
  if (args.includes("--export")) {
    const exportData = {
      file: filePath,
      timestamp: new Date().toISOString(),
      metrics: table.metrics,
      sample: data.slice(0, 5),
    };
    
    const outPath = `table-analysis-${Date.now()}.json`;
    await Bun.write(
      outPath,
      JSON.stringify(exportData, null, 2)
    );
    
    console.log(`\n✅ Analysis exported to ${outPath}`);
  }
}

function detectActiveFeatures(): Set<string> {
  const active = new Set<string>();
  if (feature("PREMIUM")) active.add("PREMIUM");
  if (feature("DEBUG")) active.add("DEBUG");
  if (feature("TERMINAL_UI")) active.add("TERMINAL_UI");
  if (feature("AUDIT_LOG")) active.add("AUDIT_LOG");
  return active;
}

// Command routing
switch (command) {
  case "analyze":
    if (!filePath) {
      console.error("Please provide a file path");
      process.exit(1);
    }
    await analyzeCSV(filePath);
    break;
    
  case "demo":
    console.log("Active features:", Array.from(detectActiveFeatures()));
    console.log("To run the demo, build and run one of the dist outputs.");
    break;
    
  default:
    console.log(`
Table Analysis CLI

Commands:
  analyze <file.csv>    Analyze CSV file and display metrics
  demo                 Display info about current features
  
Options:
  --export             Export analysis as JSON file

Examples:
  bun cli/table-analyze.ts analyze data.csv --export
  bun --features=PREMIUM,DEBUG cli/table-analyze.ts demo
    `);
}
