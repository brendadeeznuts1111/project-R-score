/**
 * Super Table Utility
 * Provides formatted table display for console output
 */

export interface TableData {
  [key: string]: string | number;
}

export function alignedTable(data: TableData[], columns: string[]): void {
  if (!data || data.length === 0) return;
  
  // Calculate column widths
  const widths: { [key: string]: number } = {};
  
  columns.forEach(col => {
    widths[col] = Math.max(
      col.length,
      ...data.map(row => String(row[col] || '').length)
    );
  });
  
  // Create header row
  const header = columns.map(col => col.padEnd(widths[col] !)).join(' | ');
  const separator = columns.map(col => '-'.repeat(widths[col]!)).join('-+-');
  
  console.log(header);
  console.log(separator);
  
  // Print data rows
  data.forEach(row => {
    const dataRow = columns.map(col => {
      const value = String(row[col] || '');
      return value.padEnd(widths[col]!);
    }).join(' | ');
    console.log(dataRow);
  });
}

export function formatTable(data: any[], columnSets?: any): string {
  if (!data || data.length === 0) return 'No data to display';
  
  // Simple table formatting
  const headers = Object.keys(data[0] || {});
  const rows = data.map(item => 
    headers.map(header => String(item[header] || '')).join(' | ')
  );
  
  return [headers.join(' | '), ...rows].join('\n');
}
