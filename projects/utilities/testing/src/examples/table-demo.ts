import { feature } from "bun:bundle";
import { TableInspector } from "../metrics/table-inspector";

// Sample data with emoji and wide characters
const salesData = [
  { id: 1, product: "Laptop 💻", price: 999.99, quantity: 5, category: "Electronics", region: "🇺🇸 North America" },
  { id: 2, product: "Coffee ☕", price: 4.99, quantity: 150, category: "Food & Beverage", region: "🇪🇺 Europe" },
  { id: 3, product: "Book 📚", price: 29.99, quantity: 30, category: "Education", region: "🇯🇵 Asia" },
  { id: 4, product: "Headphones 🎧", price: 199.99, quantity: 25, category: "Electronics", region: "🇺🇸 North America" },
  { id: 5, product: "Plant 🌿", price: 24.99, quantity: 80, category: "Home & Garden", region: "🇪🇺 Europe" },
];

function demoTableWithMetrics() {
  console.info("\n" + "=".repeat(60));
  console.info("TABLE METRICS DEMONSTRATION");
  console.info("=".repeat(60) + "\n");
  
  // Create table with custom inspection
  const table: any = TableInspector.createTable(salesData, {
    columns: ["product", "price", "quantity", "region"],
    border: feature("TERMINAL_UI") ? "rounded" : "none",
    compact: false,
  });
  
  // Display the table
  console.info(Bun.inspect(table));
  
  // Show metrics
  console.info("\n📈 METRICS ANALYSIS:");
  const metrics = table.metrics;
  console.info(metrics);
  
  // Premium features
  if (feature("PREMIUM")) {
    console.info("\n🎯 RECOMMENDATIONS:");
    const recommendations = metrics.recommendations;
    recommendations?.forEach((rec: string, i: number) => {
      console.info(`  ${i + 1}. ${rec}`);
    });
    
    // Show string width visualization
    console.info("\n📏 STRING WIDTH VISUALIZATION:");
    const widthMetrics = metrics.stringMetrics;
    if (widthMetrics) {
      for (const [col, width] of Object.entries(widthMetrics.maxWidths)) {
        const bar = "█".repeat(Math.min(20, Math.round(width / 5)));
        console.info(`  ${col.padEnd(15)}: ${bar} (${width} chars)`);
      }
    }
  }
  
  if (feature("DEBUG")) {
    console.info("\n🔍 DEBUG INFO:");
    console.info("Active features:", Array.from(detectActiveFeatures()));
    console.info("Memory breakdown:", analyzeMemoryPerColumn(salesData));
  }
}

function detectActiveFeatures(): Set<string> {
  const active = new Set<string>();
  
  // Check which features are enabled
  if (feature("PREMIUM")) active.add("PREMIUM");
  if (feature("DEBUG")) active.add("DEBUG");
  if (feature("TERMINAL_UI")) active.add("TERMINAL_UI");
  if (feature("AUDIT_LOG")) active.add("AUDIT_LOG");
  
  return active;
}

function analyzeMemoryPerColumn(data: any[]): Record<string, string> {
  const result: Record<string, number> = {};
  
  if (data.length === 0) return {};
  
  const columns = Object.keys(data[0]);
  
  for (const col of columns) {
    let total = 0;
    for (const row of data) {
      const val = row[col];
      if (typeof val === 'string') {
        total += val.length * 2;
      } else if (typeof val === 'number') {
        total += 8;
      } else {
        total += JSON.stringify(val).length * 2;
      }
    }
    result[col] = total;
  }
  
  // Convert to readable format
  const formatted: Record<string, string> = {};
  for (const [col, bytes] of Object.entries(result)) {
    formatted[col] = `${(bytes / 1024).toFixed(2)} KB`;
  }
  
  return formatted;
}

// Run demos based on features
if (feature("PREMIUM")) {
  demoTableWithMetrics();
} else {
  // Basic table display
  // @ts-ignore
  if (typeof Bun.table === "function") {
    console.info(Bun.table(salesData.slice(0, 3)));
  } else {
    console.info(salesData.slice(0, 3));
  }
}
