#!/usr/bin/env bun

// [STRIPANSI][LOGS][CLEAN][ANSI-001][v1.3][ACTIVE]

// [UTILITIES][TOOLS][UT-TO-A25][v1.3.0][ACTIVE]

import { stripANSI } from "bun";

const logFile = process.argv[2] || "logs/telegram.log";
const outputFile = process.argv[3] || "dashboards/clean-logs.md";

async function cleanLogs() {
  try {
    console.log(`🧹 Reading logs from: ${logFile}`);

    const rawLog = await Bun.file(logFile).text();
    const clean = stripANSI(rawLog);

    await Bun.write(outputFile, `# Clean Logs\n\n\`\`\`\n${clean}\n\`\`\`\n\n*Generated: ${new Date().toISOString()}*`);

    console.log(`✅ Clean logs written to: ${outputFile}`);
    console.log(`📊 Cleaned ${rawLog.length} chars → ${clean.length} chars (${Math.round((1 - clean.length/rawLog.length) * 100)}% reduction)`);

  } catch (error) {
    console.error(`❌ Error cleaning logs: ${error.message}`);
    process.exit(1);
  }
}

cleanLogs();
