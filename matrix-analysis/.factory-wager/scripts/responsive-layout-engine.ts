#!/usr/bin/env bun
/**
 * Responsive Layout Engine v4.4 - FactoryWager Unicode Governance
 * Live terminal-width detection + adaptive column compression
 */

interface ResponsiveConfig {
  enabled: boolean;
  minColumns: number;
  preferredColumns: number;
  maxColumns: number;
  shrinkPriorityOrder: string[];
  collapseThreshold: number;
  preserveEssentialColumns: string[];
}

interface ColumnDef {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  essential?: boolean;
}

interface LayoutResult {
  columns: ColumnDef[];
  actualWidths: number[];
  totalWidth: number;
  terminalWidth: number;
  collapsedColumns: string[];
  shrinkedColumns: string[];
}

export class ResponsiveLayoutEngine {
  private config: ResponsiveConfig;
  private terminalWidth: number;

  constructor(config: ResponsiveConfig) {
    this.config = config;
    this.terminalWidth = this.detectTerminalWidth();
  }

  /**
   * Detect current terminal width with fallback
   */
  private detectTerminalWidth(): number {
    // Try to get actual terminal width
    const width = process.stdout.columns;
    if (width && width > 0) {
      return Math.max(this.config.minColumns, Math.min(width, this.config.maxColumns));
    }
    
    // Fallback to preferred width
    console.warn(`⚠️ Could not detect terminal width, using preferred: ${this.config.preferredColumns}`);
    return this.config.preferredColumns;
  }

  /**
   * Calculate responsive layout for given columns
   */
  calculateLayout(columns: ColumnDef[]): LayoutResult {
    if (!this.config.enabled) {
      return {
        columns,
        actualWidths: columns.map(c => c.width),
        totalWidth: columns.reduce((sum, c) => sum + c.width, 0),
        terminalWidth: this.terminalWidth,
        collapsedColumns: [],
        shrinkedColumns: []
      };
    }

    let workingColumns = [...columns];
    const collapsedColumns: string[] = [];
    const shrinkedColumns: string[] = [];

    // Step 1: Handle extreme narrow terminals - collapse non-essential columns
    if (this.terminalWidth < this.config.collapseThreshold) {
      console.warn(`⚠️ Terminal too narrow (${this.terminalWidth} cols) – collapsing columns`);
      
      workingColumns = workingColumns.filter(col => {
        const isEssential = this.config.preserveEssentialColumns.includes(col.key) || col.essential;
        if (!isEssential) {
          collapsedColumns.push(col.key);
        }
        return isEssential;
      });
    }

    // Step 2: Calculate current total width
    let currentWidths = workingColumns.map(c => c.width);
    let totalWidth = currentWidths.reduce((sum, w) => sum + w, 0);

    // Step 3: If still too wide, apply shrinking based on priority
    if (totalWidth > this.terminalWidth) {
      const excessWidth = totalWidth - this.terminalWidth;
      let remainingExcess = excessWidth;

      for (const shrinkKey of this.config.shrinkPriorityOrder) {
        if (remainingExcess <= 0) break;

        const colIndex = workingColumns.findIndex(c => c.key === shrinkKey);
        if (colIndex < 0) continue;

        const currentColWidth = currentWidths[colIndex];
        const minWidth = 8; // Minimum readable width
        const maxReduction = Math.min(
          currentColWidth - minWidth,
          Math.ceil(remainingExcess / 2)
        );

        if (maxReduction > 0) {
          currentWidths[colIndex] -= maxReduction;
          remainingExcess -= maxReduction;
          shrinkedColumns.push(shrinkKey);
        }
      }

      // Update total width after shrinking
      totalWidth = currentWidths.reduce((sum, w) => sum + w, 0);
    }

    // Step 4: Apply final widths to columns
    const finalColumns = workingColumns.map((col, idx) => ({
      ...col,
      width: currentWidths[idx]
    }));

    return {
      columns: finalColumns,
      actualWidths: currentWidths,
      totalWidth,
      terminalWidth: this.terminalWidth,
      collapsedColumns,
      shrinkedColumns
    };
  }

  /**
   * Get terminal width information
   */
  getTerminalInfo(): { width: number; isNarrow: boolean; isWide: boolean } {
    return {
      width: this.terminalWidth,
      isNarrow: this.terminalWidth < this.config.collapseThreshold,
      isWide: this.terminalWidth >= this.config.preferredColumns
    };
  }

  /**
   * Refresh terminal width (call on SIGWINCH)
   */
  refreshTerminalWidth(): void {
    this.terminalWidth = this.detectTerminalWidth();
  }

  /**
   * Generate layout summary for debugging
   */
  generateLayoutSummary(result: LayoutResult): string {
    const { columns, totalWidth, terminalWidth, collapsedColumns, shrinkedColumns } = result;
    
    let summary = `📊 Responsive Layout Summary\n`;
    summary += `═══════════════════════════════\n`;
    summary += `Terminal Width: ${terminalWidth} cols\n`;
    summary += `Table Width: ${totalWidth} cols\n`;
    summary += `Columns: ${columns.length} visible`;
    
    if (collapsedColumns.length > 0) {
      summary += `, ${collapsedColumns.length} collapsed`;
    }
    if (shrinkedColumns.length > 0) {
      summary += `, ${shrinkedColumns.length} shrinked`;
    }
    summary += `\n\n`;
    
    if (collapsedColumns.length > 0) {
      summary += `🗑️ Collapsed: ${collapsedColumns.join(', ')}\n`;
    }
    if (shrinkedColumns.length > 0) {
      summary += `📏 Shrinked: ${shrinkedColumns.join(', ')}\n`;
    }
    
    summary += `\nColumn Widths:\n`;
    columns.forEach(col => {
      summary += `  ${col.key}: ${col.width} cols\n`;
    });
    
    return summary;
  }
}

// CLI execution for testing
if (import.meta.main) {
  const testConfig: ResponsiveConfig = {
    enabled: true,
    minColumns: 80,
    preferredColumns: 160,
    maxColumns: 240,
    shrinkPriorityOrder: ['value', 'author', 'key', 'modified', 'version'],
    collapseThreshold: 100,
    preserveEssentialColumns: ['key', 'type', 'status']
  };

  const testColumns: ColumnDef[] = [
    { key: '#', title: '#', width: 4, essential: true },
    { key: 'key', title: 'Key', width: 20, essential: true },
    { key: 'value', title: 'Value', width: 32 },
    { key: 'type', title: 'Type', width: 10, essential: true },
    { key: 'version', title: 'Version', width: 11 },
    { key: 'author', title: 'Author', width: 14 },
    { key: 'status', title: 'Status', width: 12, essential: true },
    { key: 'modified', title: 'Modified', width: 19 }
  ];

  const engine = new ResponsiveLayoutEngine(testConfig);
  const result = engine.calculateLayout(testColumns);
  
  console.log(engine.generateLayoutSummary(result));
}

export { ResponsiveConfig, ColumnDef, LayoutResult };
