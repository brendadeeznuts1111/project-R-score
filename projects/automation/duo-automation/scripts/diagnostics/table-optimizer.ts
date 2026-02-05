// scripts/diagnostics/table-optimizer.ts

export class TableOptimizer {
  static generateTable(data: any[], options?: {
    columns?: string[];
    maxColumnWidth?: number;
    compactObjects?: boolean;
  }) {
    if (!data || data.length === 0) return 'No data to display.';
    
    const firstItem = data[0];
    const defaultColumns = Object.keys(firstItem);
    const columns = options?.columns || defaultColumns;
    const maxColumnWidth = options?.maxColumnWidth || 30;

    return Bun.inspect.table(data, {
      columns: columns,
      format: {
        // Auto-format object properties
        ...Object.fromEntries(
          columns
            .filter(col => typeof firstItem[col] === 'object' && firstItem[col] !== null)
            .map(col => [col, (value: any) => this.formatObject(value, maxColumnWidth)])
        ),
        // Specialized formatting for specific fields if they exist
        riskLevel: (value) => {
          const mapping: Record<string, string> = {
            CRITICAL: '🔴 CRITICAL',
            HIGH: '🟠 HIGH',
            MEDIUM: '🟡 MEDIUM',
            LOW: '🟢 LOW'
          };
          return mapping[value] || value;
        },
        impact: (value) => {
          const icons: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };
          return `${icons[value] || '⚪️'} ${String(value).toUpperCase()}`;
        }
      },
      colors: true,
      indent: 2
    });
  }

  private static formatObject(obj: any, maxLength: number = 30): string {
    if (!obj || typeof obj !== 'object') return '-';
    
    const str = Object.entries(obj)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    
    return str.length > maxLength 
      ? str.slice(0, maxLength) + '...' 
      : str;
  }
}