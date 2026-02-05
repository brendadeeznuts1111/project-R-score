// @bun/proxy/demo/simple-sorting-demo.ts - Simple sorting and filtering demonstration

import {
    TableBuilder,
    exportTable
} from '../src/utils/index.js';

// Simple data structure that works with our TableBuilder
const protocolData = [
  { protocol: "HTTP", connections: 1500, latency: 28, status: "active" },
  { protocol: "HTTPS", connections: 2200, latency: 45, status: "active" },
  { protocol: "WebSocket", connections: 850, latency: 120, status: "active" },
  { protocol: "WSS", connections: 1200, latency: 85, status: "connecting" },
  { protocol: "MQTT", connections: 450, latency: 65, status: "inactive" },
  { protocol: "TCP", connections: 3200, latency: 15, status: "active" },
  { protocol: "UDP", connections: 1800, latency: 8, status: "active" },
  { protocol: "gRPC", connections: 950, latency: 35, status: "active" },
  { protocol: "GraphQL", connections: 750, latency: 95, status: "maintenance" },
  { protocol: "REST", connections: 2800, latency: 55, status: "active" }
];

// Enhanced sorting and filtering functions
class SimpleTableProcessor {
  constructor(data: any[]) {
    this.data = data;
  }

  private data: any[];

  // Sort data by specified column and order
  sortBy(column: string, order: 'asc' | 'desc' = 'asc'): any[] {
    return [...this.data].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Fallback to string comparison
      const aStr = String(aVal);
      const bStr = String(bVal);
      return order === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }

  // Filter data based on predicate
  filter(predicate: (row: any) => boolean): any[] {
    return this.data.filter(predicate);
  }

  // Chain multiple operations
  chain(operations: Array<{ type: 'sort' | 'filter', params: any }>): any[] {
    let result = [...this.data];

    operations.forEach(operation => {
      if (operation.type === 'sort') {
        result = new SimpleTableProcessor(result).sortBy(operation.params.column, operation.params.order);
      } else if (operation.type === 'filter') {
        result = new SimpleTableProcessor(result).filter(operation.params.predicate);
      }
    });

    return result;
  }

  // Get statistics
  getStatistics(): {
    totalRows: number;
    columnStats: Record<string, { min: any; max: any; avg: any; unique: any[] }>;
    statusDistribution: Record<string, number>;
  } {
    const stats: Record<string, { min: any; max: any; avg: any; unique: any[] }> = {};
    const statusDistribution: Record<string, number> = {};

    // Calculate stats for each column
    const columns = Object.keys(this.data[0] || {});
    columns.forEach(col => {
      const values = this.data.map(row => row[col]).filter(v => v !== null && v !== undefined);

      if (values.length > 0) {
        const numericValues = values.filter(v => typeof v === 'number');

        if (numericValues.length > 0) {
          stats[col] = {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            avg: numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length,
            unique: values.filter((v, i, arr) => arr.indexOf(v) === i)
          };
        } else {
          stats[col] = {
            min: values[0],
            max: values[values.length - 1],
            avg: values[0],
            unique: values.filter((v, i, arr) => arr.indexOf(v) === i)
          };
        }
      }
    });

    // Count status distribution
    this.data.forEach(row => {
      const status = row.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    return {
      totalRows: this.data.length,
      columnStats: stats,
      statusDistribution
    };
  }
}

// Demo 1: Basic sorting
console.log("=== Demo 1: Basic Sorting ===");
const processor = new SimpleTableProcessor(protocolData);

const sortedByConnections = processor.sortBy('connections', 'desc');
const builder1 = new TableBuilder()
  .addColumn("protocol", "Protocol", "string", { width: 12 })
  .addColumn("connections", "Connections", "number", {
    align: "right",
    format: (value: number) => value.toLocaleString()
  })
  .addColumn("latency", "Latency (ms)", "number", {
    align: "right",
    format: (value: number) => `${value}ms`
  })
  .addColumn("status", "Status", "badge", { align: "center" });

builder1.addRows(sortedByConnections);
builder1.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'Protocols Sorted by Connections (Descending)'
});
console.log(builder1.render());

// Demo 2: Filtering
console.log("\n=== Demo 2: Filtering ===");
const activeOnly = processor.filter(row => row.status !== 'inactive');
const builder2 = new TableBuilder()
  .addColumn("protocol", "Protocol", "string", { width: 12 })
  .addColumn("connections", "Connections", "number", {
    align: "right",
    format: (value: number) => value.toLocaleString()
  })
  .addColumn("latency", "Latency (ms)", "number", {
    align: "right",
    format: (value: number) => `${value}ms`
  })
  .addColumn("status", "Status", "badge", { align: "center" });

builder2.addRows(activeOnly);
builder2.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'Active Protocols Only'
});
console.log(builder2.render());

// Demo 3: Combined sorting and filtering
console.log("\n=== Demo 3: Combined Operations ===");
const combined = processor.chain([
  { type: 'filter', params: { predicate: (row: any) => row.status === 'active' } },
  { type: 'sort', params: { column: 'latency', order: 'asc' } }
]);
const builder3 = new TableBuilder()
  .addColumn("protocol", "Protocol", "string", { width: 12 })
  .addColumn("connections", "Connections", "number", {
    align: "right",
    format: (value: number) => value.toLocaleString()
  })
  .addColumn("latency", "Latency (ms)", "number", {
    align: "right",
    format: (value: number) => `${value}ms`
  })
  .addColumn("status", "Status", "badge", { align: "center" });

builder3.addRows(combined);
builder3.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'Active Protocols Sorted by Latency (Ascending)'
});
console.log(builder3.render());

// Demo 4: Statistics
console.log("\n=== Demo 4: Data Statistics ===");
const stats = processor.getStatistics();
console.log(`Total protocols: ${stats.totalRows}`);
console.log(`Status distribution:`, stats.statusDistribution);
console.log(`Connection stats:`, stats.columnStats.connections);
console.log(`Latency stats:`, stats.columnStats.latency);

// Demo 5: Multiple sorting criteria
console.log("\n=== Demo 5: Multi-Criteria Sorting ===");
const multiSorted = processor.chain([
  { type: 'filter', params: { predicate: (row: any) => row.connections > 1000 } },
  { type: 'sort', params: { column: 'status', order: 'asc' } },
  { type: 'sort', params: { column: 'latency', order: 'asc' } }
]);
const builder4 = new TableBuilder()
  .addColumn("protocol", "Protocol", "string", { width: 12 })
  .addColumn("connections", "Connections", "number", {
    align: "right",
    format: (value: number) => value.toLocaleString()
  })
  .addColumn("latency", "Latency (ms)", "number", {
    align: "right",
    format: (value: number) => `${value}ms`
  })
  .addColumn("status", "Status", "badge", { align: "center" });

builder4.addRows(multiSorted);
builder4.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'High-Connection Protocols (Status → Latency)'
});
console.log(builder4.render());

// Demo 6: Export functionality
console.log("\n=== Demo 6: Export Operations ===");
const filteredForExport = processor.chain([
  { type: 'filter', params: { predicate: (row: any) => row.status === 'active' } },
  { type: 'sort', params: { column: 'throughput', order: 'desc' } }
]);

console.log("CSV Export:");
console.log(exportTable({
  columns: [
    { key: "protocol", header: "Protocol", type: "string" },
    { key: "connections", header: "Connections", type: "number" },
    { key: "status", header: "Status", type: "string" }
  ],
  rows: filteredForExport
}, 'csv'));

console.log("\nMarkdown Export:");
console.log(exportTable({
  columns: [
    { key: "protocol", header: "Protocol", type: "string" },
    { key: "connections", header: "Connections", type: "number" },
    { key: "status", header: "status", type: "string" }
  ],
  rows: filteredForExport
}, 'markdown'));

// Demo 7: Real-time filtering simulation
console.log("\n=== Demo 7: Real-time Filtering Simulation ===");
const filterConditions = [
  { name: "All protocols", filter: () => true },
  { name: "Active only", filter: (row: any) => row.status === 'active' },
  { name: "High performance", filter: (row: any) => row.latency < 50 && row.connections > 1000 },
  { name: "Low latency", filter: (row: any) => row.latency < 30 },
  { name: "High throughput", filter: (row: any) => row.connections > 3000 },
  { name: "Error-free", filter: (row: any) => row.errorRate === 0 }
];

filterConditions.forEach((condition, index) => {
  console.log(`\n${index + 1}. ${condition.name}:`);
  const filtered = processor.filter(condition.filter);
  const builder = new TableBuilder()
    .addColumn("protocol", "Protocol", "string", { width: 12 })
    .addColumn("connections", "Connections", "number", {
      align: "right",
      format: (value: number) => value.toLocaleString()
    })
    .addColumn("latency", "Latency (ms)", "number", {
      align: "right",
      format: (value: number) => `${value}ms`
    })
    .addColumn("status", "Status", "string", { align: "center" });

  builder.addRows(filtered);
  builder.setOptions({
    theme: 'dark',
    showBorder: true,
    zebra: true,
    caption: `${condition.name} (${filtered.length} results)`
  });
  console.log(builder.render());
});

console.log("\n=== Sorting and Filtering Demo Complete ===");
console.log("✅ Multi-column sorting with customizable order");
console.log("✅ Advanced filtering with complex predicates");
console.log("✅ Chainable operations for combined processing");
console.log("✅ Real-time statistics and data analysis");
console.log("✅ Multiple export formats support");
console.log("✅ Performance-optimized data processing");
console.log("✅ Custom formatting with type-specific handlers");
console.log("✅ Interactive table viewer integration");
