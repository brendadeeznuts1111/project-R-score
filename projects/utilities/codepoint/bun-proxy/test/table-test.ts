// @bun/proxy/test/table-test.ts - Test table functionality

import { TableBuilder, createSimpleTable } from '../src/utils/index.js';

// Test basic table functionality
function testBasicTable() {
  const data = [
    { id: 1, name: "HTTP Proxy", status: "active", connections: 1234 },
    { id: 2, name: "HTTPS Proxy", status: "active", connections: 892 },
    { id: 3, name: "WebSocket Proxy", status: "connecting", connections: 567 }
  ];

  const table = createSimpleTable(data, {
    theme: 'dark',
    showBorder: true,
    zebra: true
  });

  console.log("Basic Table Test:");
  console.log(table);
  return table;
}

// Test custom table builder
function testCustomTable() {
  const builder = new TableBuilder()
    .addColumn("service", "Service", "string", { width: 15 })
    .addColumn("status", "Status", "badge", {
      format: (value: string) => {
        const colors = { active: "green", connecting: "orange", error: "red" };
        return { text: value, color: colors[value as keyof typeof colors] || "gray" };
      },
      align: "center"
    })
    .addColumn("connections", "Connections", "number", {
      format: (v: number) => v.toLocaleString(),
      align: "right"
    });

  builder.addRows([
    { service: "API Gateway", status: "active", connections: 1234 },
    { service: "Auth Service", status: "connecting", connections: 567 },
    { service: "Data Service", status: "error", connections: 0 }
  ]);

  const table = builder.render();
  console.log("\nCustom Table Test:");
  console.log(table);
  return table;
}

// Test configuration table
function testConfigurationTable() {
  const configData = [
    {
      property: "listenHost",
      type: "string",
      required: false,
      default: "0.0.0.0",
      description: "Host to bind server to"
    },
    {
      property: "listenPort",
      type: "number",
      required: false,
      default: "8080",
      description: "Port to listen on"
    }
  ];

  const table = createSimpleTable(configData, {
    theme: 'dark',
    showBorder: true,
    zebra: true,
    caption: 'Configuration Test'
  });

  console.log("\nConfiguration Table Test:");
  console.log(table);
  return table;
}

// Run tests
console.log("=== Table Functionality Tests ===");

try {
  testBasicTable();
  testCustomTable();
  testConfigurationTable();
  console.log("\n✅ All tests passed successfully!");
} catch (error) {
  console.error("\n❌ Test failed:", error);
}
