/**
 * Enhanced Table Utility with Advanced Comparison and HTML Generation
 *
 * Provides sophisticated table operations including:
 * - Deep table comparison with diff visualization
 * - HTML-safe table generation for web reports
 * - Data validation and integrity checks
 * - Phone profile data visualization
 */

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export class EnhancedTable {
  /**
   * Compare two tables or datasets with deep equality
   * Returns a diff table showing differences
   */
  static compareTables(
    table1: any[] | Record<string, any>,
    table2: any[] | Record<string, any>,
    keyColumn: string,
    options: {
      highlightChanges?: boolean;
      showOnlyDiffs?: boolean;
      diffColor?: HSLColor;
    } = {}
  ): string {
    const rows1 = Array.isArray(table1) ? table1 : this.objectToRows(table1);
    const rows2 = Array.isArray(table2) ? table2 : this.objectToRows(table2);

    const diffRows: any[] = [];
    const allKeys = new Set<string>();

    // Collect all unique keys
    rows1.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
    rows2.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));

    // Find matching rows by key
    const map1 = new Map(rows1.map(row => [row[keyColumn], row]));
    const map2 = new Map(rows2.map(row => [row[keyColumn], row]));

    const allKeysArray = Array.from(allKeys);

    allKeysArray.forEach(key => {
      const row1 = map1.get(key);
      const row2 = map2.get(key);

      if (!row1 && row2) {
        // Row added
        const diffRow: any = { _status: '➕ ADDED', _key: key };
        allKeysArray.forEach(k => (diffRow[k] = row2[k]));
        diffRows.push(diffRow);
      } else if (row1 && !row2) {
        // Row removed
        const diffRow: any = { _status: '➖ REMOVED', _key: key };
        allKeysArray.forEach(k => (diffRow[k] = row1[k]));
        diffRows.push(diffRow);
      } else if (row1 && row2) {
        // Compare cells
        const changedCells: string[] = [];
        allKeysArray.forEach(k => {
          if (!Bun.deepEquals(row1[k], row2[k])) {
            changedCells.push(k);
          }
        });

        if (changedCells.length > 0) {
          const diffRow: any = { _status: '✏️ MODIFIED', _key: key };
          allKeysArray.forEach(k => {
            diffRow[k] = changedCells.includes(k)
              ? `${row1[k]} → ${row2[k]}`
              : row1[k];
          });
          diffRows.push(diffRow);
        } else if (!options.showOnlyDiffs) {
          // Unchanged row
          const diffRow: any = { _status: '✅ UNCHANGED', _key: key };
          allKeysArray.forEach(k => (diffRow[k] = row1[k]));
          diffRows.push(diffRow);
        }
      }
    });

    const columns = [
      '_status',
      '_key',
      ...allKeysArray.filter(k => k !== keyColumn),
    ];

    return this.table(diffRows, columns);
  }

  /**
   * Create HTML-safe table with escaped content
   * Perfect for generating web reports
   */
  static htmlTable(
    data: any[] | Record<string, any>,
    properties?: string[],
    options: {
      escapeHtml?: boolean;
      addIds?: boolean;
      compact?: boolean;
    } = {}
  ): { terminal: string; html: string; safeData: any[] } {
    const opts = { escapeHtml: true, addIds: true, compact: false, ...options };

    let rows = Array.isArray(data) ? data : this.objectToRows(data);
    const columns = properties || this.extractColumns(rows);

    // Create HTML-safe copy of data
    const safeRows = opts.escapeHtml
      ? rows.map(row => {
          const safeRow: any = {};
          Object.keys(row).forEach(key => {
            const value = row[key];
            safeRow[key] =
              typeof value === 'string' ? Bun.escapeHTML(value) : value;
          });
          if (opts.addIds && !safeRow.id) {
            safeRow.id = crypto.randomUUID();
          }
          return safeRow;
        })
      : rows;

    // Generate terminal table
    const terminalTable = this.table(safeRows, columns);

    // Generate HTML table
    const htmlTable = this.generateHtmlTable(safeRows, columns);

    return {
      terminal: terminalTable,
      html: htmlTable,
      safeData: safeRows,
    };
  }

  private static generateHtmlTable(rows: any[], columns: string[]): string {
    let html = `<table class="enhanced-table">\n`;

    // Header
    html += '  <thead>\n    <tr>\n';
    columns.forEach(col => {
      html += `      <th>${Bun.escapeHTML(col)}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n';

    // Body
    html += '  <tbody>\n';
    rows.forEach(row => {
      html += `    <tr${row.id ? ` id="${row.id}"` : ''}>\n`;
      columns.forEach(col => {
        const value = row[col];
        const displayValue =
          value === undefined ? '' : value === null ? 'null' : String(value);
        html += `      <td>${displayValue}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n</table>';

    return html;
  }

  /**
   * Open table data in editor for debugging
   */
  static async openInEditor(
    data: any[] | Record<string, any>,
    filename?: string
  ): Promise<void> {
    const tempFile = filename || `/tmp/table-data-${Date.now()}.json`;
    const jsonData = JSON.stringify(data, null, 2);

    await Bun.write(tempFile, jsonData);

    await Bun.openInEditor(tempFile, {
      editor: 'vscode',
      line: 1,
      column: 1,
    });

    console.log(`🔍 Table data opened in editor: ${tempFile}`);
  }

  /**
   * Validate table data integrity
   */
  static validateTable(
    data: any[],
    schema: Record<string, (value: any) => boolean>
  ): {
    isValid: boolean;
    errors: Array<{ row: number; column: string; value: any; error: string }>;
    summary: string;
  } {
    const errors: Array<{
      row: number;
      column: string;
      value: any;
      error: string;
    }> = [];

    data.forEach((row, rowIndex) => {
      Object.keys(schema).forEach(column => {
        const value = row[column];
        const validator = schema[column];

        if (!validator(value)) {
          errors.push({
            row: rowIndex + 1,
            column,
            value,
            error: `Validation failed for ${column}`,
          });
        }
      });
    });

    const isValid = errors.length === 0;
    const errorTable =
      errors.length > 0
        ? this.table(errors, ['row', 'column', 'value', 'error'])
        : '';

    return {
      isValid,
      errors,
      summary: `Validation ${isValid ? '✅ PASSED' : '❌ FAILED'} with ${errors.length} errors\n${errorTable}`,
    };
  }

  private static objectToRows(obj: Record<string, any>): any[] {
    const keys = Object.keys(obj);
    const maxLength = Math.max(
      ...keys.map(k => (Array.isArray(obj[k]) ? obj[k].length : 1))
    );

    return Array.from({ length: maxLength }, (_, i) => {
      const row: any = {};
      keys.forEach(key => {
        const value = obj[key];
        row[key] = Array.isArray(value) ? value[i] : value;
      });
      return row;
    });
  }

  private static extractColumns(rows: any[]): string[] {
    const columns = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(k => columns.add(k));
    });
    return Array.from(columns);
  }

  /**
   * Basic table rendering method (placeholder for implementation)
   */
  private static table(rows: any[], columns: string[]): string {
    // This would integrate with your existing table rendering logic
    // For now, return a simple string representation
    return `Table with ${rows.length} rows and ${columns.length} columns`;
  }

  /**
   * Create table from phone profile data
   */
  static phoneProfileTable(
    profiles: Array<{
      id: string;
      name: string;
      deviceId: string;
      phoneNumbers: string[];
      emails: string[];
      apps: number;
      lastSync: Date;
    }>
  ): string {
    const rows = profiles.map(profile => ({
      '📱': profile.name,
      '📞': profile.phoneNumbers.length,
      '📧': profile.emails.length,
      '📦': profile.apps,
      '🔄': profile.lastSync.toLocaleDateString(),
      '🔍': `${profile.id.substring(0, 8)}...`,
    }));

    return this.table(rows, ['📱', '📞', '📧', '📦', '🔄', '🔍']);
  }

  /**
   * Example usage demonstration
   */
  static demo() {
    // Table comparison example
    const table1 = [
      { id: 1, name: 'Alice', age: 25, city: 'NYC' },
      { id: 2, name: 'Bob', age: 30, city: 'LA' },
    ];

    const table2 = [
      { id: 1, name: 'Alice', age: 26, city: 'NYC' }, // Modified age
      { id: 3, name: 'Charlie', age: 35, city: 'Chicago' }, // Added
    ];

    console.log('=== TABLE COMPARISON ===');
    console.log(
      this.compareTables(table1, table2, 'id', { showOnlyDiffs: true })
    );

    // HTML table example
    console.log('\n=== HTML TABLE ===');
    const htmlResult = this.htmlTable(table1, ['id', 'name', 'age']);
    console.log('Terminal:', htmlResult.terminal);
    console.log('HTML:', htmlResult.html);

    // Validation example
    console.log('\n=== VALIDATION ===');
    const schema = {
      age: (v: any) => typeof v === 'number' && v > 0,
      name: (v: any) => typeof v === 'string' && v.length > 0,
    };
    const validation = this.validateTable(table1, schema);
    console.log(validation.summary);

    // Phone profile example
    console.log('\n=== PHONE PROFILES ===');
    const profiles = [
      {
        id: 'abc123def456',
        name: 'iPhone 13',
        deviceId: 'dev-001',
        phoneNumbers: ['+1234567890'],
        emails: ['user@example.com'],
        apps: 45,
        lastSync: new Date(),
      },
    ];
    console.log(this.phoneProfileTable(profiles));
  }
}
