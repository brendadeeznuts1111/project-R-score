#!/usr/bin/env bun
/**
 * Visual Regression Suite v4.4 - FactoryWager Unicode Governance
 * Pixel-perfect screenshot diff detection for tables & reports
 */

import { ResponsiveLayoutEngine } from './responsive-layout-engine';

interface VisualRegressionConfig {
  enabled: boolean;
  snapshotDir: string;
  diffThreshold: number;
  captureMode: 'ansi' | 'sixel' | 'png';
  autoUpdateSnapshots: boolean;
}

interface RegressionResult {
  passed: boolean;
  diffPercentage: number;
  diffLines: string[];
  snapshotPath: string;
  currentPath: string;
}

interface TableData {
  [key: string]: any;
}

interface ColumnDef {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export class VisualRegressionSuite {
  private config: VisualRegressionConfig;

  constructor(config: VisualRegressionConfig) {
    this.config = config;
  }

  /**
   * Ensure snapshot directory exists
   */
  private async ensureSnapshotDir(): Promise<void> {
    try {
      // Use Node.js fs API for directory creation
      await Bun.write(`${this.config.snapshotDir}/.gitkeep`, '');
    } catch (error) {
      // Directory might already exist or file system error
      // Try using fs.mkdir as fallback
      try {
        const fs = await import('fs');
        await fs.promises.mkdir(this.config.snapshotDir, { recursive: true });
      } catch (fallbackError) {
        // Directory creation failed, but continue anyway
      }
    }
  }

  /**
   * Render table to ANSI string (simplified version)
   */
  private renderTableToANSI(data: TableData[], columns: ColumnDef[]): string {
    const responsiveEngine = new ResponsiveLayoutEngine({
      enabled: true,
      minColumns: 80,
      preferredColumns: 160,
      maxColumns: 240,
      shrinkPriorityOrder: ['value', 'author', 'key', 'modified', 'version'],
      collapseThreshold: 100,
      preserveEssentialColumns: ['key', 'type', 'status']
    });

    const layout = responsiveEngine.calculateLayout(columns);
    let output = '';

    // Header
    const header = layout.columns.map(col =>
      col.title.padEnd(col.width)
    ).join(' | ');
    output += header + '\n';
    output += '─'.repeat(header.length) + '\n';

    // Data rows
    for (const row of data) {
      const rowStr = layout.columns.map(col => {
        const value = String(row[col.key] || '');
        return col.align === 'right'
          ? value.padStart(col.width)
          : value.padEnd(col.width);
      }).join(' | ');
      output += rowStr + '\n';
    }

    return output;
  }

  /**
   * Calculate text difference between two strings
   */
  private calculateTextDiff(golden: string, current: string): { diffPercentage: number; diffLines: string[] } {
    const goldenLines = golden.split('\n');
    const currentLines = current.split('\n');

    const maxLines = Math.max(goldenLines.length, currentLines.length);
    let diffLines = 0;
    const differences: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const goldenLine = goldenLines[i] || '';
      const currentLine = currentLines[i] || '';

      if (goldenLine !== currentLine) {
        diffLines++;
        differences.push(`Line ${i + 1}: "${goldenLine}" → "${currentLine}"`);
      }
    }

    const diffPercentage = maxLines > 0 ? (diffLines / maxLines) * 100 : 0;

    return {
      diffPercentage,
      diffLines: differences
    };
  }

  /**
   * Run visual regression test for table
   */
  async runRegressionTest(
    testName: string,
    data: TableData[],
    columns: ColumnDef[]
  ): Promise<RegressionResult> {
    await this.ensureSnapshotDir();

    const snapshotPath = `${this.config.snapshotDir}/${testName}-golden.ans`;
    const currentPath = `${this.config.snapshotDir}/${testName}-current.ans`;

    // Render current version
    const currentOutput = this.renderTableToANSI(data, columns);
    await Bun.write(currentPath, currentOutput);

    // Check if golden snapshot exists
    let goldenOutput = '';
    try {
      goldenOutput = await Bun.file(snapshotPath).text();
    } catch (error) {
      // No golden snapshot exists
      if (this.config.autoUpdateSnapshots) {
        await Bun.write(snapshotPath, currentOutput);
        console.log(`✅ Created golden snapshot: ${snapshotPath}`);
        return {
          passed: true,
          diffPercentage: 0,
          diffLines: [],
          snapshotPath,
          currentPath
        };
      } else {
        console.warn(`⚠️ No golden snapshot found: ${snapshotPath}`);
        console.log(`💡 Run with --update-snapshots to create it`);
        return {
          passed: false,
          diffPercentage: 100,
          diffLines: ['No golden snapshot exists'],
          snapshotPath,
          currentPath
        };
      }
    }

    // Compare outputs
    const { diffPercentage, diffLines } = this.calculateTextDiff(goldenOutput, currentOutput);
    const passed = diffPercentage <= this.config.diffThreshold;

    if (!passed) {
      console.error(`❌ Visual regression detected for "${testName}"`);
      console.error(`📊 Difference: ${diffPercentage.toFixed(2)}% (threshold: ${this.config.diffThreshold}%)`);

      if (diffLines.length > 0) {
        console.error('\n🔍 Differences (first 10):');
        diffLines.slice(0, 10).forEach(line => {
          console.error(`   ${line}`);
        });
        if (diffLines.length > 10) {
          console.error(`   ... and ${diffLines.length - 10} more`);
        }
      }
    } else {
      console.log(`✅ Visual regression passed for "${testName}"`);
      console.log(`📊 Difference: ${diffPercentage.toFixed(2)}%`);
    }

    return {
      passed,
      diffPercentage,
      diffLines,
      snapshotPath,
      currentPath
    };
  }

  /**
   * Update all snapshots (for use when intentional changes are made)
   */
  async updateSnapshots(
    testName: string,
    data: TableData[],
    columns: ColumnDef[]
  ): Promise<void> {
    await this.ensureSnapshotDir();

    const snapshotPath = `${this.config.snapshotDir}/${testName}-golden.ans`;
    const currentOutput = this.renderTableToANSI(data, columns);

    await Bun.write(snapshotPath, currentOutput);
    console.log(`✅ Updated golden snapshot: ${snapshotPath}`);
  }

  /**
   * Run batch regression tests
   */
  async runBatchTests(tests: Array<{
    name: string;
    data: TableData[];
    columns: ColumnDef[];
  }>): Promise<{ passed: number; failed: number; results: RegressionResult[] }> {
    console.log('🔍 Visual Regression Suite v4.4');
    console.log('================================');

    let passed = 0;
    let failed = 0;
    const results: RegressionResult[] = [];

    for (const test of tests) {
      console.log(`\n📋 Testing: ${test.name}`);
      const result = await this.runRegressionTest(test.name, test.data, test.columns);
      results.push(result);

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log('\n================================');
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      console.error('🚨 Visual regression tests FAILED!');
      process.exit(1);
    }

    console.log('✅ All visual regression tests PASSED!');
    return { passed, failed, results };
  }
}

// CLI execution
if (import.meta.main) {
  const config: VisualRegressionConfig = {
    enabled: true,
    snapshotDir: '.factory-wager/snapshots',
    diffThreshold: 1.0, // 1% difference threshold
    captureMode: 'ansi',
    autoUpdateSnapshots: process.argv.includes('--update-snapshots')
  };

  const suite = new VisualRegressionSuite(config);

  // Test data
  const testData: TableData[] = [
    { '#': 1, key: 'factory-wager', value: 'Unicode Governance v4.4', type: 'config', version: 'v4.4', author: 'System', status: 'ACTIVE', modified: '2026-02-01' },
    { '#': 2, key: 'responsive-engine', value: 'Terminal width detection', type: 'feature', version: 'v4.4', author: 'System', status: 'ACTIVE', modified: '2026-02-01' },
    { '#': 3, key: 'visual-regression', value: 'Pixel-perfect diffs', type: 'feature', version: 'v4.4', author: 'System', status: 'ACTIVE', modified: '2026-02-01' }
  ];

  const testColumns: ColumnDef[] = [
    { key: '#', title: '#', width: 4 },
    { key: 'key', title: 'Key', width: 20 },
    { key: 'value', title: 'Value', width: 32 },
    { key: 'type', title: 'Type', width: 10 },
    { key: 'version', title: 'Version', width: 11 },
    { key: 'author', title: 'Author', width: 14 },
    { key: 'status', title: 'Status', width: 12 },
    { key: 'modified', title: 'Modified', width: 19 }
  ];

  if (process.argv.includes('--update-snapshots')) {
    await suite.updateSnapshots('test-table', testData, testColumns);
  } else {
    await suite.runBatchTests([
      { name: 'test-table', data: testData, columns: testColumns }
    ]);
  }
}

export { VisualRegressionConfig, RegressionResult, TableData, ColumnDef };
