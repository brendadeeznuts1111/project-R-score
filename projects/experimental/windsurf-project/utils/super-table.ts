// utils/super-table.ts (Modern Super Table with CLI Filters)
import { parseCliFilters, filterData } from './cli-filter.js';

export function superTablePreview(data: any[], options: { page?: number; cols?: string[]; pageSize?: number } = {}) {
  const pageSize = options.pageSize || 10;
  const page = options.page || 0;
  const startIdx = page * pageSize;
  const endIdx = startIdx + pageSize;
  
  const projected = data.slice(startIdx, endIdx);
  const totalPages = Math.ceil(data.length / pageSize);

  const cols = options.cols || Object.keys(data[0] || {}).slice(0, 7);
  
  // Histogram for Success (if exists)
  const successCount = data.filter(r => r.success === true).length;
  const successRate = (successCount / (data.length || 1)) * 100;
  const barLen = Math.floor(successRate / 2.5);
  const barBase = '█'.repeat(barLen);
  const barPadding = ' '.repeat(Math.max(0, 40 - Bun.stringWidth(barBase)));
  const bar = barBase + barPadding;

  console.info(`📊 Super Table: ${data.length} rows | Page ${page + 1}/${totalPages} | Cols: ${cols.join(',')}`);
  if (data.length > 0 && data[0] && 'success' in data[0]) {
    console.info(`📈 Success Histogram: ${bar} ${successRate.toFixed(1)}%`);
  }

  // Use Bun's native inspector for the table
  console.info(Bun.inspect.table(projected.map(row => {
    const pick: any = {};
    cols.forEach(c => pick[c] = row[c]);
    return pick;
  })));

  return { projected, totalPages, successRate };
}

export function alignedTable(data: any[], cols: string[]) {
  const widths = cols.map(col => Math.max(...data.map(row => Bun.stringWidth(String(row[col] ?? ''))), Bun.stringWidth(col)));
  const header = cols.map((col, i) => col.padEnd(widths[i])).join(' │ ');
  console.info(header);
  console.info('-'.repeat(Bun.stringWidth(header) + (cols.length - 1) * 2));

  data.forEach(row => {
    const line = cols.map((col, i) => {
      const val = String(row[col] ?? '');
      const width = Bun.stringWidth(val);
      const padding = ' '.repeat(Math.max(0, widths[i] - width));
      return val + padding;
    }).join(' │ ');
    console.info(line);
  });
}

// Enhanced version with emoji/ANSI/zero-width support
export function emojiAlignedTable(data: any[], cols: string[]) {
  const widths = cols.map(col => 
    Math.max(...data.map(row => Bun.stringWidth(String(row[col]))), Bun.stringWidth(col))
  );
  
  // Header w/ emoji
  console.info('📊 Empire Perf:');
  const header = cols.map((col, i) => {
    const val = String(col);
    const width = Bun.stringWidth(val);
    const padding = ' '.repeat(Math.max(0, widths[i] - width));
    return val + padding;
  }).join(' │ ');
  console.info(header);
  
  const sep = widths.map(w => '─'.repeat(w)).join('─┼─');
  console.info(sep);
  
  data.forEach(row => {
    const line = cols.map((col, i) => {
      const val = String(row[col] ?? '');
      const width = Bun.stringWidth(val);
      const padding = ' '.repeat(Math.max(0, widths[i] - width));
      return val + padding;
    }).join(' │ ');
    console.info(line);
  });
  
  // Test new accuracy
  console.info('\n✅ stringWidth Tests:');
  console.info(`🇺🇸=${Bun.stringWidth('🇺🇸')} 👋🏽=${Bun.stringWidth('👋🏽')} 👨👩👧=${Bun.stringWidth('👨👩👧')} → 2/2/2`);
  console.info(`\u2060=${Bun.stringWidth('\u2060')} → 0 (zero-width)`);
  console.info(`CSI ANSI: ${Bun.stringWidth('\u001b[31mRed\u001b[0m')} → 3 (ignore)`);
}

export function superTableCli(data: any[], argv: string[]) {
  const cliFilters = parseCliFilters(argv);
  const filteredData = filterData(data, cliFilters);

  const pageArg = argv.find(a => a.startsWith('--page='));
  const page = pageArg ? parseInt(pageArg.split('=')[1]!) - 1 : 0;
  
  const colsArg = argv.find(a => a.startsWith('--cols='));
  const cols = colsArg ? colsArg.split('=')[1]!.split(',') : undefined;

  const preview = superTablePreview(filteredData, { page, cols });
  return { ...preview, filteredCount: filteredData.length };
}
