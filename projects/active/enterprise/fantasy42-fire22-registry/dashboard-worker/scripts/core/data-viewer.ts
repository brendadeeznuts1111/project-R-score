#!/usr/bin/env bun

/**
 * 📊 Fire22 Data Viewer - Access All Collected Metrics & Analytics
 *
 * This script shows you where all the data is stored and how to access it
 */

import { ScriptRunner } from './script-runner.js';
import { handleError, createError } from './error-handler.js';

async function showAllData() {
  return await ScriptRunner.run(
    'data-viewer-main',
    async () => {
      const runner = ScriptRunner.getInstance();

      console.info('📊 Fire22 Data Viewer - All Collected Metrics & Analytics');
      console.info('!==!==!==!==!==!==!==!==!==!====\n');

      // 1. Show current metrics for all scripts
      console.info('🔧 Current Script Metrics:');
      console.info('!==!==!==!==!==');
      const metrics = (runner as any).metrics;
      if (metrics && metrics.size > 0) {
        for (const [scriptName, scriptMetrics] of metrics) {
          console.info(`\n📈 ${scriptName}:`);
          console.info(`   Total Executions: ${scriptMetrics.totalExecutions}`);
          console.info(
            `   Success Rate: ${((scriptMetrics.successfulExecutions / scriptMetrics.totalExecutions) * 100).toFixed(1)}%`
          );
          console.info(`   Average Duration: ${scriptMetrics.averageDuration.toFixed(2)}ms`);
          console.info(
            `   Average Memory: ${(scriptMetrics.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`
          );
          console.info(`   Error Rate: ${scriptMetrics.errorRate.toFixed(1)}%`);
          console.info(`   Last Executed: ${scriptMetrics.lastExecuted}`);
        }
      } else {
        console.info('   No metrics collected yet. Run some scripts first!');
      }

      // 2. Show execution history
      console.info('\n📚 Execution History:');
      console.info('!==!==!==!==');
      const history = (runner as any).executionHistory;
      if (history && history.length > 0) {
        console.info(`   Total executions recorded: ${history.length}`);
        console.info(`   Recent executions:`);

        // Show last 5 executions
        const recent = history.slice(-5);
        recent.forEach((execution: any, index: number) => {
          const status = execution.success ? '✅' : '❌';
          const duration = execution.performance.duration.toFixed(2);
          const memory = (execution.performance.memoryDelta.heapUsed / 1024 / 1024).toFixed(2);

          console.info(
            `   ${index + 1}. ${status} ${execution.metadata.scriptName} (${duration}ms, ${memory}MB)`
          );
          console.info(`      ID: ${execution.metadata.executionId}`);
          console.info(`      Time: ${execution.metadata.timestamp}`);
          if (execution.metadata.tags.length > 0) {
            console.info(`      Tags: ${execution.metadata.tags.join(', ')}`);
          }
        });
      } else {
        console.info('   No execution history yet. Run some scripts first!');
      }

      // 3. Show performance report
      console.info('\n📊 Performance Report:');
      console.info('!==!==!==!===');
      const report = runner.generatePerformanceReport();
      console.info(report);

      // 4. Show data storage locations
      console.info('\n💾 Data Storage Locations:');
      console.info('!==!==!==!==!==');
      console.info('   📈 Metrics: Stored in memory (ScriptRunner.metrics Map)');
      console.info('   📚 History: Stored in memory (ScriptRunner.executionHistory Array)');
      console.info('   🕒 Timestamps: ISO format stored with each execution');
      console.info('   🏷️  Tags: Stored with each execution for categorization');
      console.info('   📊 Performance: Duration, memory, CPU usage for each execution');

      // 5. Show how to access data programmatically
      console.info('\n🔧 How to Access Data Programmatically:');
      console.info('!==!==!==!==!==!==!====');
      console.info('   // Get all metrics');
      console.info('   const runner = ScriptRunner.getInstance();');
      console.info('   const metrics = runner.metrics;');
      console.info('');
      console.info('   // Get execution history');
      console.info('   const history = runner.executionHistory;');
      console.info('');
      console.info('   // Generate performance report');
      console.info('   const report = runner.generatePerformanceReport();');
      console.info('');
      console.info('   // Clear data if needed');
      console.info('   runner.clearHistory();');

      return {
        metricsCount: metrics ? metrics.size : 0,
        historyCount: history ? history.length : 0,
        totalExecutions: metrics
          ? Array.from(metrics.values()).reduce((sum: number, m: any) => sum + m.totalExecutions, 0)
          : 0,
      };
    },
    {
      tags: ['data-viewer', 'analytics', 'metrics'],
      logLevel: 'info',
    }
  );
}

async function showSpecificScriptData(scriptName: string) {
  return await ScriptRunner.run(
    'data-viewer-specific',
    async () => {
      const runner = ScriptRunner.getInstance();

      console.info(`📊 Data for Script: ${scriptName}`);
      console.info('!==!==!==!==!==!==\n');

      const metrics = (runner as any).metrics;
      const scriptMetrics = metrics.get(scriptName);

      if (scriptMetrics) {
        console.info(`📈 ${scriptName} Metrics:`);
        console.info(`   Total Executions: ${scriptMetrics.totalExecutions}`);
        console.info(`   Successful: ${scriptMetrics.successfulExecutions}`);
        console.info(`   Failed: ${scriptMetrics.failedExecutions}`);
        console.info(
          `   Success Rate: ${((scriptMetrics.successfulExecutions / scriptMetrics.totalExecutions) * 100).toFixed(1)}%`
        );
        console.info(`   Average Duration: ${scriptMetrics.averageDuration.toFixed(2)}ms`);
        console.info(
          `   Average Memory: ${(scriptMetrics.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`
        );
        console.info(`   Error Rate: ${scriptMetrics.errorRate.toFixed(1)}%`);
        console.info(`   Last Executed: ${scriptMetrics.lastExecuted}`);

        // Show recent executions for this script
        const history = (runner as any).executionHistory;
        const scriptHistory = history.filter(
          (execution: any) => execution.metadata.scriptName === scriptName
        );

        if (scriptHistory.length > 0) {
          console.info(`\n📚 Recent Executions for ${scriptName}:`);
          const recent = scriptHistory.slice(-3);
          recent.forEach((execution: any, index: number) => {
            const status = execution.success ? '✅' : '❌';
            const duration = execution.performance.duration.toFixed(2);
            const memory = (execution.performance.memoryDelta.heapUsed / 1024 / 1024).toFixed(2);

            console.info(`   ${index + 1}. ${status} ${duration}ms, ${memory}MB`);
            console.info(`      ID: ${execution.metadata.executionId}`);
            console.info(`      Time: ${execution.metadata.timestamp}`);
          });
        }
      } else {
        console.info(`   No data found for script: ${scriptName}`);
      }

      return { scriptName, hasData: !!scriptMetrics };
    },
    {
      tags: ['data-viewer', 'script-specific'],
      logLevel: 'info',
    }
  );
}

async function exportDataToFile() {
  return await ScriptRunner.run(
    'data-viewer-export',
    async () => {
      const runner = ScriptRunner.getInstance();

      console.info('💾 Exporting Data to File...');
      console.info('!==!==!==!==!====\n');

      const metrics = (runner as any).metrics;
      const history = (runner as any).executionHistory;

      const exportData = {
        exportTimestamp: new Date().toISOString(),
        metrics: Object.fromEntries(metrics),
        history: history.slice(-100), // Last 100 executions
        summary: {
          totalScripts: metrics.size,
          totalExecutions: Array.from(metrics.values()).reduce(
            (sum: number, m: any) => sum + m.totalExecutions,
            0
          ),
          totalHistoryEntries: history.length,
        },
      };

      // Write to file
      const filename = `fire22-data-export-${Date.now()}.json`;
      await Bun.write(filename, JSON.stringify(exportData, null, 2));

      console.info(`✅ Data exported to: ${filename}`);
      console.info(`   📊 Metrics: ${metrics.size} scripts`);
      console.info(`   📚 History: ${history.length} executions`);
      console.info(`   💾 File size: ${((await Bun.file(filename).size()) / 1024).toFixed(2)}KB`);

      return { filename, dataSize: exportData.summary };
    },
    {
      tags: ['data-viewer', 'export'],
      logLevel: 'info',
    }
  );
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      console.info('📊 Fire22 Data Viewer');
      console.info('!==!==!==!===\n');
      console.info('Usage: bun run data-viewer.ts [options]');
      console.info('');
      console.info('Options:');
      console.info('  --help, -h           Show this help message');
      console.info('  --script <name>      Show data for specific script');
      console.info('  --export             Export all data to JSON file');
      console.info('  --all                Show all data (default)');
      console.info('');
      console.info('Examples:');
      console.info('  bun run data-viewer.ts                    # Show all data');
      console.info('  bun run data-viewer.ts --script enhanced-demo  # Show specific script');
      console.info('  bun run data-viewer.ts --export           # Export to JSON');
      return;
    }

    if (args.includes('--export')) {
      await exportDataToFile();
      return;
    }

    if (args.includes('--script')) {
      const scriptIndex = args.indexOf('--script');
      if (scriptIndex + 1 < args.length) {
        const scriptName = args[scriptIndex + 1];
        await showSpecificScriptData(scriptName);
        return;
      }
    }

    // Default: show all data
    await showAllData();
  } catch (error) {
    await handleError(error, 'data-viewer', 'main');
  }
}

// Export functions for use in other scripts
export { showAllData, showSpecificScriptData, exportDataToFile };

// Run if called directly
if (import.meta.main) {
  main();
}
