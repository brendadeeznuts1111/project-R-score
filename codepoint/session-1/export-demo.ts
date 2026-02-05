#!/usr/bin/env bun

// Enhanced HMR Data Export System with multiple formats and features
import { CustomProxyServer } from "./hmr-event-tracker";

// Enhanced export function with additional formats and options
function enhancedExportHMRData(
  server: CustomProxyServer,
  format: "csv" | "json" | "markdown" | "xml" | "yaml" | "html" = "json",
  options: {
    includeStats?: boolean;
    includeConfig?: boolean;
    sortBy?: "timestamp" | "duration" | "name";
    filterBy?: string[];
    dateFormat?: "iso" | "local" | "timestamp";
  } = {}
) {
  const {
    includeStats = true,
    includeConfig = false,
    sortBy = "timestamp",
    filterBy,
    dateFormat = "iso",
  } = options;

  let events = [...server.hmrEvents];

  // Apply filtering
  if (filterBy && filterBy.length > 0) {
    events = events.filter((event) => filterBy.includes(event.name));
  }

  // Apply sorting
  events.sort((a, b) => {
    switch (sortBy) {
      case "timestamp":
        return b.timestamp.getTime() - a.timestamp.getTime();
      case "duration":
        return (b.duration || 0) - (a.duration || 0);
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Format timestamps
  const formatTimestamp = (date: Date) => {
    switch (dateFormat) {
      case "iso":
        return date.toISOString();
      case "local":
        return date.toLocaleString();
      case "timestamp":
        return date.getTime().toString();
      default:
        return date.toISOString();
    }
  };

  switch (format) {
    case "csv":
      return exportToCSV(events, server, {
        includeStats,
        includeConfig,
        formatTimestamp,
      });

    case "markdown":
      return exportToMarkdown(events, server, {
        includeStats,
        includeConfig,
        formatTimestamp,
      });

    case "xml":
      return exportToXML(events, server, {
        includeStats,
        includeConfig,
        formatTimestamp,
      });

    case "yaml":
      return exportToYAML(events, server, {
        includeStats,
        includeConfig,
        formatTimestamp,
      });

    case "html":
      return exportToHTML(events, server, {
        includeStats,
        includeConfig,
        formatTimestamp,
      });

    case "json":
    default:
      return exportToJSON(events, server, {
        includeStats,
        includeConfig,
        formatTimestamp,
      });
  }
}

// CSV Export with enhanced features
function exportToCSV(events: any[], server: CustomProxyServer, options: any) {
  const { includeStats, includeConfig, formatTimestamp } = options;

  let csv = "";

  // Add metadata header
  if (includeStats || includeConfig) {
    csv += `# HMR Export for ${server.name}\n`;
    csv += `# Exported: ${new Date().toISOString()}\n`;
    csv += `# Total Events: ${events.length}\n`;
    if (includeStats) {
      csv += `# Error Rate: ${
        events.length > 0
          ? Math.round(
              ((server.eventCounts["error"] || 0) / events.length) * 100
            )
          : 0
      }%\n`;
    }
    csv += "\n";
  }

  // CSV headers
  const headers = ["timestamp", "event", "module", "duration", "details"];
  csv += headers.join(",") + "\n";

  // CSV rows
  const rows = events.map((e) =>
    [
      formatTimestamp(e.timestamp),
      e.name,
      e.module || "",
      e.duration || "",
      e.details ? JSON.stringify(e.details).replace(/"/g, '""') : "",
    ]
      .map((field) => `"${field}"`)
      .join(",")
  );

  csv += rows.join("\n");

  // Add configuration if requested
  if (includeConfig) {
    csv += "\n# Server Configuration\n";
    csv += `# Protocol: ${server.config.protocol}\n`;
    csv += `# Max Connections: ${server.config.maxConnections}\n`;
    csv += `# HMR Enabled: ${server.config.hmrEnabled}\n`;
    csv += `# Region: ${server.region}\n`;
  }

  return csv;
}

// Markdown Export with enhanced formatting
function exportToMarkdown(
  events: any[],
  server: CustomProxyServer,
  options: any
) {
  const { includeStats, includeConfig, formatTimestamp } = options;

  let md = "";

  // Header
  md += `# HMR Events Export: ${server.name}\n\n`;
  md += `**Exported:** ${new Date().toLocaleString()}\n`;
  md += `**Total Events:** ${events.length}\n`;
  md += `**Server Region:** ${server.region}\n\n`;

  // Statistics section
  if (includeStats) {
    md += `## 📊 Statistics\n\n`;
    md += `- **Error Rate:** ${
      events.length > 0
        ? Math.round(((server.eventCounts["error"] || 0) / events.length) * 100)
        : 0
    }%\n`;
    md += `- **Average Duration:** ${
      events.filter((e) => e.duration).length > 0
        ? Math.round(
            events.reduce((sum, e) => sum + (e.duration || 0), 0) /
              events.filter((e) => e.duration).length
          )
        : "N/A"
    }ms\n`;
    md += `- **Most Recent Event:** ${
      events.length > 0 ? events[0].name : "None"
    }\n\n`;
  }

  // Events table
  md += `## 📈 Event Details\n\n`;
  md += `| Timestamp | Event | Module | Duration | Status |\n`;
  md += `|-----------|-------|--------|----------|--------|\n`;

  events.forEach((e) => {
    const icon = getEventIcon(e.name);
    const status = getEventStatus(e.name);
    md += `| ${formatTimestamp(e.timestamp)} | ${icon} ${e.name} | ${
      e.module || "N/A"
    } | ${e.duration ? `${e.duration}ms` : "N/A"} | ${status} |\n`;
  });

  // Configuration section
  if (includeConfig) {
    md += `\n## ⚙️ Server Configuration\n\n`;
    md += `- **Protocol:** ${server.config.protocol.toUpperCase()}\n`;
    md += `- **Max Connections:** ${server.config.maxConnections.toLocaleString()}\n`;
    md += `- **HMR Enabled:** ${
      server.config.hmrEnabled ? "✅ Yes" : "❌ No"
    }\n`;
    md += `- **Timeout:** ${server.config.timeout / 1000}s\n`;
    md += `- **Current Connections:** ${server.connections.toLocaleString()}\n`;
  }

  return md;
}

// XML Export
function exportToXML(events: any[], server: CustomProxyServer, options: any) {
  const { includeStats, includeConfig, formatTimestamp } = options;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<hmr-export server="${
    server.name
  }" timestamp="${new Date().toISOString()}">\n`;

  // Metadata
  xml += "  <metadata>\n";
  xml += `    <total-events>${events.length}</total-events>\n`;
  xml += `    <server-region>${server.region}</server-region>\n`;
  if (includeStats) {
    xml += `    <error-rate>${
      events.length > 0
        ? Math.round(((server.eventCounts["error"] || 0) / events.length) * 100)
        : 0
    }</error-rate>\n`;
  }
  xml += "  </metadata>\n";

  // Events
  xml += "  <events>\n";
  events.forEach((e) => {
    xml += "    <event>\n";
    xml += `      <timestamp>${formatTimestamp(e.timestamp)}</timestamp>\n`;
    xml += `      <type>${e.name}</type>\n`;
    xml += `      <module>${e.module || "N/A"}</module>\n`;
    xml += `      <duration>${e.duration || 0}</duration>\n`;
    if (e.details) {
      xml += `      <details>${JSON.stringify(e.details)}</details>\n`;
    }
    xml += "    </event>\n";
  });
  xml += "  </events>\n";

  // Configuration
  if (includeConfig) {
    xml += "  <configuration>\n";
    xml += `    <protocol>${server.config.protocol}</protocol>\n`;
    xml += `    <max-connections>${server.config.maxConnections}</max-connections>\n`;
    xml += `    <hmr-enabled>${server.config.hmrEnabled}</hmr-enabled>\n`;
    xml += `    <timeout>${server.config.timeout}</timeout>\n`;
    xml += `    <current-connections>${server.connections}</current-connections>\n`;
    xml += "  </configuration>\n";
  }

  xml += "</hmr-export>";
  return xml;
}

// YAML Export
function exportToYAML(events: any[], server: CustomProxyServer, options: any) {
  const { includeStats, includeConfig, formatTimestamp } = options;

  let yaml = `# HMR Events Export for ${server.name}\n`;
  yaml += `exported: ${new Date().toISOString()}\n`;
  yaml += `server:\n`;
  yaml += `  name: ${server.name}\n`;
  yaml += `  region: ${server.region}\n`;
  yaml += `  total_events: ${events.length}\n`;

  if (includeStats) {
    yaml += `  statistics:\n`;
    yaml += `    error_rate: ${
      events.length > 0
        ? Math.round(((server.eventCounts["error"] || 0) / events.length) * 100)
        : 0
    }%\n`;
    yaml += `    average_duration: ${
      events.filter((e) => e.duration).length > 0
        ? Math.round(
            events.reduce((sum, e) => sum + (e.duration || 0), 0) /
              events.filter((e) => e.duration).length
          )
        : "N/A"
    }ms\n`;
  }

  if (includeConfig) {
    yaml += `  configuration:\n`;
    yaml += `    protocol: ${server.config.protocol}\n`;
    yaml += `    max_connections: ${server.config.maxConnections}\n`;
    yaml += `    hmr_enabled: ${server.config.hmrEnabled}\n`;
    yaml += `    timeout: ${server.config.timeout}\n`;
    yaml += `    current_connections: ${server.connections}\n`;
  }

  yaml += `events:\n`;
  events.forEach((e, i) => {
    yaml += `  - id: ${i + 1}\n`;
    yaml += `    timestamp: ${formatTimestamp(e.timestamp)}\n`;
    yaml += `    type: ${e.name}\n`;
    yaml += `    module: ${e.module || "N/A"}\n`;
    yaml += `    duration: ${e.duration || 0}\n`;
    if (e.details) {
      yaml += `    details: ${JSON.stringify(e.details)}\n`;
    }
  });

  return yaml;
}

// HTML Export
function exportToHTML(events: any[], server: CustomProxyServer, options: any) {
  const { includeStats, includeConfig, formatTimestamp } = options;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HMR Events Export - ${server.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #007acc; color: white; font-weight: bold; }
        tr:hover { background: #f5f5f5; }
        .event-icon { margin-right: 8px; }
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .config-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 HMR Events Export</h1>
        <div class="metadata">
            <p><strong>Server:</strong> ${server.name}</p>
            <p><strong>Region:</strong> ${server.region}</p>
            <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Events:</strong> ${events.length}</p>`;

  if (includeStats) {
    html += `
            <p><strong>Error Rate:</strong> ${
              events.length > 0
                ? Math.round(
                    ((server.eventCounts["error"] || 0) / events.length) * 100
                  )
                : 0
            }%</p>
            <p><strong>Average Duration:</strong> ${
              events.filter((e) => e.duration).length > 0
                ? Math.round(
                    events.reduce((sum, e) => sum + (e.duration || 0), 0) /
                      events.filter((e) => e.duration).length
                  )
                : "N/A"
            }ms</p>`;
  }

  html += `
        </div>`;

  if (includeConfig) {
    html += `
        <h2>⚙️ Server Configuration</h2>
        <div class="config-grid">
            <div class="config-item"><strong>Protocol:</strong> ${server.config.protocol.toUpperCase()}</div>
            <div class="config-item"><strong>Max Connections:</strong> ${server.config.maxConnections.toLocaleString()}</div>
            <div class="config-item"><strong>HMR Enabled:</strong> ${
              server.config.hmrEnabled ? "✅ Yes" : "❌ No"
            }</div>
            <div class="config-item"><strong>Timeout:</strong> ${
              server.config.timeout / 1000
            }s</div>
            <div class="config-item"><strong>Current Connections:</strong> ${server.connections.toLocaleString()}</div>
        </div>`;
  }

  html += `
        <h2>📈 Event Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Module</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>`;

  events.forEach((e) => {
    const icon = getEventIcon(e.name);
    const status = getEventStatus(e.name);
    const statusClass = status.includes("Error")
      ? "status-error"
      : status.includes("Connected")
      ? "status-good"
      : "status-warning";

    html += `
                <tr>
                    <td>${formatTimestamp(e.timestamp)}</td>
                    <td><span class="event-icon">${icon}</span>${e.name}</td>
                    <td>${e.module || "N/A"}</td>
                    <td>${e.duration ? `${e.duration}ms` : "N/A"}</td>
                    <td class="${statusClass}">${status}</td>
                    <td>${
                      e.details
                        ? JSON.stringify(e.details).slice(0, 50) + "..."
                        : "-"
                    }</td>
                </tr>`;
  });

  html += `
            </tbody>
        </table>
    </div>
</body>
</html>`;

  return html;
}

// JSON Export with enhanced structure
function exportToJSON(events: any[], server: CustomProxyServer, options: any) {
  const { includeStats, includeConfig, formatTimestamp } = options;

  const exportData: any = {
    metadata: {
      server: server.name,
      region: server.region,
      exported: new Date().toISOString(),
      totalEvents: events.length,
    },
    events: events.map((e, index) => ({
      id: index + 1,
      timestamp: formatTimestamp(e.timestamp),
      type: e.name,
      module: e.module || null,
      duration: e.duration || null,
      status: getEventStatus(e.name),
      details: e.details || null,
    })),
  };

  if (includeStats) {
    exportData.statistics = {
      errorRate:
        events.length > 0
          ? Math.round(
              ((server.eventCounts["error"] || 0) / events.length) * 100
            )
          : 0,
      averageDuration:
        events.filter((e) => e.duration).length > 0
          ? Math.round(
              events.reduce((sum, e) => sum + (e.duration || 0), 0) /
                events.filter((e) => e.duration).length
            )
          : null,
      eventCounts: server.eventCounts,
    };
  }

  if (includeConfig) {
    exportData.configuration = {
      protocol: server.config.protocol,
      maxConnections: server.config.maxConnections,
      hmrEnabled: server.config.hmrEnabled,
      timeout: server.config.timeout,
      currentConnections: server.connections,
      region: server.region,
    };
  }

  return JSON.stringify(exportData, null, 2);
}

// Helper functions
function getEventIcon(eventName: string): string {
  const icons: Record<string, string> = {
    "ws:connect": "🟢",
    "ws:disconnect": "🔴",
    beforeUpdate: "🔄",
    afterUpdate: "✅",
    beforeFullReload: "🔄",
    beforePrune: "🧹",
    invalidate: "⚠️",
    error: "❌",
  };
  return icons[eventName] || "📝";
}

function getEventStatus(eventName: string): string {
  if (eventName === "error") return "❌ Error";
  if (eventName.includes("connect")) return "🟢 Connected";
  if (eventName.includes("disconnect")) return "🔴 Disconnected";
  if (eventName.includes("Update")) return "🔄 Updated";
  if (eventName === "invalidate") return "⚠️ Invalidated";
  return "📝 Info";
}

// Demo setup and execution
console.log("📤 Enhanced HMR Export Demo");
console.log("============================\n");

// Create server with sample data
const server = new CustomProxyServer("Demo Server", 1500, {
  hmrEnabled: true,
  region: "us-east-1",
  maxConnections: 2000,
});

// Add sample events
server.logHMREvent("ws:connect", { module: "main.js" });
server.logHMREvent("beforeUpdate", { module: "app.js", duration: 45 });
server.logHMREvent("afterUpdate", { module: "app.js", duration: 120 });
server.logHMREvent("invalidate", { module: "styles.css" });
server.logHMREvent("ws:connect", { module: "utils.js" });
server.logHMREvent("error", {
  module: "component.js",
  details: { error: "Compilation failed", line: 42 },
});
server.logHMREvent("beforeUpdate", { module: "router.js", duration: 78 });
server.logHMREvent("afterUpdate", { module: "router.js", duration: 156 });

// Demo different export formats
console.log("📄 JSON Export (Enhanced):");
console.log(
  enhancedExportHMRData(server, "json", {
    includeStats: true,
    includeConfig: true,
    sortBy: "timestamp",
  })
);

console.log("\n📝 Markdown Export (Enhanced):");
console.log(
  enhancedExportHMRData(server, "markdown", {
    includeStats: true,
    includeConfig: true,
    dateFormat: "local",
  })
);

console.log("\n📊 CSV Export (Enhanced):");
console.log(
  enhancedExportHMRData(server, "csv", {
    includeStats: true,
    includeConfig: false,
    dateFormat: "iso",
  })
);

console.log("\n🌐 XML Export:");
console.log(
  enhancedExportHMRData(server, "xml", {
    includeStats: true,
    includeConfig: true,
  })
);

console.log("\n⚪ YAML Export:");
console.log(
  enhancedExportHMRData(server, "yaml", {
    includeStats: false,
    includeConfig: true,
  })
);

console.log("\n🌐 HTML Export (Preview):");
const htmlExport = enhancedExportHMRData(server, "html", {
  includeStats: true,
  includeConfig: true,
});
console.log(htmlExport.slice(0, 500) + "...");

// Demo filtering and sorting
console.log("\n🔍 Filtered Export (Errors Only):");
console.log(
  enhancedExportHMRData(server, "json", {
    filterBy: ["error"],
    includeStats: true,
  })
);

console.log("\n⏱️ Sorted Export (By Duration):");
console.log(
  enhancedExportHMRData(server, "json", {
    sortBy: "duration",
    includeStats: true,
  })
);

console.log("\n✨ Enhanced Export Demo Complete!");
