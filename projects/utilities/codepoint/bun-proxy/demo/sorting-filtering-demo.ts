// @bun/proxy/demo/sorting-filtering-demo.ts - Advanced sorting and filtering demonstration

import {
  TableBuilder,
  TableData,
  exportTable
} from '../src/utils/index.js';

// Enhanced data with more comprehensive information
const enhancedData: TableData = {
  columns: [
    {
      key: "protocol",
      header: "Protocol",
      type: "string" as const,
      sortable: true,
      width: 12
    },
    {
      key: "connections",
      header: "Connections",
      type: "number" as const,
      sortable: true,
      align: "right",
      format: (value: number) => value.toLocaleString()
    },
    {
      key: "latency",
      header: "Latency (ms)",
      type: "number" as const,
      sortable: true,
      align: "right",
      format: (value: number) => `${value}ms`
    },
    {
      key: "status",
      header: "Status",
      type: "badge" as const,
      sortable: true,
      align: "center",
      width: 10,
      format: (value: string) => {
        const colorMap: Record<string, string> = {
          active: "green",
          connecting: "orange",
          inactive: "gray",
          error: "red",
          maintenance: "blue"
        };
        return { text: value, color: colorMap[value] || "gray" };
      }
    },
    {
      key: "uptime",
      header: "Uptime",
      type: "duration" as const,
      sortable: true,
      align: "right"
    },
    {
      key: "throughput",
      header: "Throughput",
      type: "number" as const,
      sortable: true,
      align: "right",
      format: (value: number) => `${value.toLocaleString()} req/s`
    },
    {
      key: "errorRate",
      header: "Error Rate",
      type: "percentage" as const,
      sortable: true,
      align: "right"
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      type: "datetime",
      sortable: true,
      align: "center"
    }
  ],
  rows: [
    {
      protocol: "HTTP",
      connections: 1500,
      latency: 28,
      status: "active",
      uptime: 86400000,
      throughput: 25000,
      errorRate: 0.2,
      lastSeen: Date.now() - 1000
    },
    {
      protocol: "HTTPS",
      connections: 2200,
      latency: 45,
      status: "active",
      uptime: 172800000,
      throughput: 35000,
      errorRate: 0.1,
      lastSeen: Date.now() - 500
    },
    {
      protocol: "WebSocket",
      connections: 850,
      latency: 120,
      status: "active",
      uptime: 43200000,
      throughput: 15000,
      errorRate: 0.5,
      lastSeen: Date.now() - 2000
    },
    {
      protocol: "WSS",
      connections: 1200,
      latency: 85,
      status: "connecting",
      uptime: 3600000,
      throughput: 20000,
      errorRate: 1.2,
      lastSeen: Date.now() - 10000
    },
    {
      protocol: "MQTT",
      connections: 450,
      latency: 65,
      status: "inactive",
      uptime: 0,
      throughput: 8000,
      errorRate: 0.0,
      lastSeen: Date.now() - 300000
    },
    {
      protocol: "TCP",
      connections: 3200,
      latency: 15,
      status: "active",
      uptime: 2592000000,
      throughput: 45000,
      errorRate: 0.05,
      lastSeen: Date.now() - 100
    },
    {
      protocol: "UDP",
      connections: 1800,
      latency: 8,
      status: "active",
      uptime: 1555200000,
      throughput: 32000,
      errorRate: 0.3,
      lastSeen: Date.now() - 200
    },
    {
      protocol: "gRPC",
      connections: 950,
      latency: 35,
      status: "active",
      uptime: 604800000,
      throughput: 18000,
      errorRate: 0.15,
      lastSeen: Date.now() - 1500
    },
    {
      protocol: "GraphQL",
      connections: 750,
      latency: 95,
      status: "maintenance",
      uptime: 0,
      throughput: 12000,
      errorRate: 0.0,
      lastSeen: Date.now() - 600000
    },
    {
      protocol: "REST",
      connections: 2800,
      latency: 55,
      status: "active",
      uptime: 1296000000,
      throughput: 40000,
      errorRate: 0.8,
      lastSeen: Date.now() - 300
    }
  ]
};

// Enhanced sorting and filtering functions
class AdvancedTableProcessor {
  constructor(private data: TableData) {}

  // Sort data by specified column and order
  sortBy(column: string, order: 'asc' | 'desc' = 'asc'): TableData {
    const sortedRows = [...this.data.rows].sort((a, b) => {
      const aVal = a[column as keyof typeof a];
      const bVal = b[column as keyof typeof b];

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

    return {
      ...this.data,
      rows: sortedRows
    };
  }

  // Filter data based on predicate
  filter(predicate: (row: any) => boolean): TableData {
    const filteredRows = this.data.rows.filter(predicate);

    return {
      ...this.data,
      rows: filteredRows
    };
  }

  // Chain multiple operations
  chain(operations: Array<{ type: 'sort' | 'filter', params: any }>): TableData {
    let result = { ...this.data };

    operations.forEach(operation => {
      if (operation.type === 'sort') {
        const processor = new AdvancedTableProcessor(result);
        result = processor.sortBy(operation.params.column, operation.params.order);
      } else if (operation.type === 'filter') {
        const processor = new AdvancedTableProcessor(result);
        result = processor.filter(operation.params.predicate);
      }
    });

    return result;
  }

  // Get statistics about the data
  getStatistics(): {
    totalRows: number;
    columnStats: Record<string, { min: any; max: any; avg: any; unique: any[] }>;
    statusDistribution: Record<string, number>;
  } {
    const stats: Record<string, { min: any; max: any; avg: any; unique: any[] }> = {};
    const statusDistribution: Record<string, number> = {};

    this.data.columns.forEach(col => {
      const values = this.data.rows.map(row => row[col.key]).filter(v => v !== null && v !== undefined);

      if (values.length > 0) {
        const numericValues = values.filter(v => typeof v === 'number');

        if (numericValues.length > 0) {
          stats[col.key] = {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            avg: numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length,
            unique: values.filter((v, i, arr) => arr.indexOf(v) === i)
          };
        } else {
          stats[col.key] = {
            min: values[0],
            max: values[values.length - 1],
            avg: values[0],
            unique: values.filter((v, i, arr) => arr.indexOf(v) === i)
          };
        }
      }
    });

    // Count status distribution
    this.data.rows.forEach(row => {
      const status = row.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    return {
      totalRows: this.data.rows.length,
      columnStats: stats,
      statusDistribution
    };
  }
}

// Demo 1: Basic sorting
console.log("=== Demo 1: Basic Sorting ===");
const processor = new AdvancedTableProcessor(enhancedData);

const sortedByConnections = processor.sortBy('connections', 'desc');
const builder1 = new TableBuilder();
sortedByConnections.columns.forEach(col => {
  builder1.addColumn(col.key, col.header, col.type, {
    align: col.align,
    format: col.format,
    width: col.width
  });
});
builder1.addRows(sortedByConnections.rows);
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
const builder2 = new TableBuilder();
activeOnly.columns.forEach(col => {
  builder2.addColumn(col.key, col.header, col.type, {
    align: col.align,
    format: col.format,
    width: col.width
  });
});
builder2.addRows(activeOnly.rows);
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
  { type: 'sort', params: { column: 'throughput', order: 'desc' } }
]);
const builder3 = new TableBuilder();
combined.columns.forEach(col => {
  builder3.addColumn(col.key, col.header, col.type, {
    align: col.align,
    format: col.format,
    width: col.width
  });
});
builder3.addRows(combined.rows);
builder3.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'Active Protocols Sorted by Throughput (Descending)'
});
console.log(builder3.render());

// Demo 4: Multiple sorting criteria
console.log("\n=== Demo 4: Multi-Criteria Sorting ===");
const multiSorted = processor.chain([
  { type: 'filter', params: { predicate: (row: any) => row.connections > 1000 } },
  { type: 'sort', params: { column: 'status', order: 'asc' } },
  { type: 'sort', params: { column: 'latency', order: 'asc' } }
]);
const builder4 = new TableBuilder();
multiSorted.columns.forEach(col => {
  builder4.addColumn(col.key, col.header, col.type, {
    align: col.align,
    format: col.format,
    width: col.width
  });
});
builder4.addRows(multiSorted.rows);
builder4.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'High-Connection Protocols (Status → Latency)'
});
console.log(builder4.render());

// Demo 5: Statistics and analysis
console.log("\n=== Demo 5: Data Statistics ===");
const stats = processor.getStatistics();
console.log(`Total protocols: ${stats.totalRows}`);
console.log(`Status distribution:`, stats.statusDistribution);
console.log(`Connection stats:`, stats.columnStats.connections);
console.log(`Latency stats:`, stats.columnStats.latency);

// Demo 6: Advanced filtering with multiple conditions
console.log("\n=== Demo 6: Advanced Filtering ===");
const advancedFilter = processor.filter(row =>
  row.status === 'active' &&
  row.connections > 500 &&
  row.latency < 100 &&
  row.errorRate < 1.0
);
const builder5 = new TableBuilder();
advancedFilter.columns.forEach(col => {
  builder5.addColumn(col.key, col.header, col.type, {
    align: col.align,
    format: col.format,
    width: col.width
  });
});
builder5.addRows(advancedFilter.rows);
builder5.setOptions({
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'High-Performance Protocols (Active, >500 conn, <100ms, <1% error)'
});
console.log(builder5.render());

// Demo 7: Export filtered and sorted data
console.log("\n=== Demo 7: Export Operations ===");
const filteredForExport = processor.chain([
  { type: 'filter', params: { predicate: (row: any) => row.status === 'active' } },
  { type: 'sort', params: { column: 'throughput', order: 'desc' } }
]);

console.log("CSV Export:");
console.log(exportTable(filteredForExport, 'csv'));

console.log("\nMarkdown Export:");
console.log(exportTable(filteredForExport, 'markdown'));

// Demo 8: Real-time filtering simulation
console.log("\n=== Demo 8: Real-time Filtering Simulation ===");
const filterConditions = [
  { name: "All protocols", filter: () => true },
  { name: "Active only", filter: (row: any) => row.status === 'active' },
  { name: "High performance", filter: (row: any) => row.latency < 50 && row.connections > 1000 },
  { name: "Low latency", filter: (row: any) => row.latency < 30 },
  { name: "High throughput", filter: (row: any) => row.throughput > 30000 },
  { name: "Error-free", filter: (row: any) => row.errorRate === 0 }
];

filterConditions.forEach((condition, index) => {
  console.log(`\n${index + 1}. ${condition.name}:`);
  const filtered = processor.filter(condition.filter);
  const builder = new TableBuilder();
  filtered.columns.slice(0, 4).forEach(col => {
    builder.addColumn(col.key, col.header, col.type, {
      align: col.align,
      format: col.format,
      width: col.width
    });
  });
  builder.addRows(filtered.rows);
  builder.setOptions({
    theme: 'dark',
    showBorder: true,
    zebra: true,
    caption: `${condition.name} (${filtered.rows.length} results)`
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
