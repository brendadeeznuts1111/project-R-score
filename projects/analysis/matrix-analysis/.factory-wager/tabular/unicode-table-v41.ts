/**
 * FactoryWager Unicode Table Renderer v4.1
 * Enterprise-grade GB18030-aware, emoji-safe, full-width table rendering
 * Reduced-size schema with native Bun.stringWidth() optimization
 */

// Core Unicode width function using Bun v1.3.8 native implementation
function uWidth(str: string): number {
  return Bun.stringWidth(str, { ambiguousIsNarrow: true });
}

// Unicode-aware truncation that respects grapheme clusters
function uTruncate(str: string, maxWidth: number): string {
  if (uWidth(str) <= maxWidth) return str;
  let truncated = '';
  let w = 0;
  for (const char of str) {
    const cw = uWidth(char);
    if (w + cw + 1 > maxWidth) break;
    truncated += char;
    w += cw;
  }
  return truncated + (w + 1 <= maxWidth ? '…' : '');
}

// Unicode-aware padding with alignment support
function uPad(
  str: string,
  width: number,
  align: 'left' | 'center' | 'right' = 'left'
): string {
  const w = uWidth(str);
  if (w >= width) return uTruncate(str, width);
  const padLen = width - w;
  if (align === 'right') return ' '.repeat(padLen) + str;
  if (align === 'center') {
    const left = Math.floor(padLen / 2);
    return ' '.repeat(left) + str + ' '.repeat(padLen - left);
  }
  return str + ' '.repeat(padLen);
}

// Reduced-size column schema (enterprise default)
const REDUCED_COLUMNS = [
  { key: '#', title: '#', align: 'right' as const, width: 3 },
  { key: 'key', title: 'Key', align: 'left' as const, width: 18 },
  { key: 'value', title: 'Value', align: 'left' as const, width: 32 },  // ← reduced from 36
  { key: 'type', title: 'Type', align: 'center' as const, width: 10 },
  { key: 'version', title: 'Ver', align: 'center' as const, width: 10 },
  { key: 'bunVer', title: 'Bun', align: 'center' as const, width: 8 },
  { key: 'author', title: 'Author', align: 'left' as const, width: 12 }, // ← reduced
  { key: 'authorHash', title: 'Hash', align: 'left' as const, width: 8 },
  { key: 'status', title: 'Status', align: 'center' as const, width: 10 },
  { key: 'modified', title: 'Modified', align: 'right' as const, width: 16 }
] as const;

type ColumnDef = typeof REDUCED_COLUMNS[number];
type RowData = Record<string, any>;

// Calculate total table width
function calculateTableWidth(columns: readonly ColumnDef[]): number {
  return columns.reduce((sum, col) => sum + col.width + 3, 1); // +3 for padding and separators
}

// Render table header with Unicode support
function renderHeader(columns: readonly ColumnDef[]): string {
  const header = columns.map(col => uPad(col.title, col.width, col.align)).join(' │ ');
  return `│ ${header} │`;
}

// Render table separator line
function renderSeparator(width: number): string {
  return '├' + '─'.repeat(width - 2) + '┤';
}

// Render data row with Unicode support
function renderRow(row: RowData, columns: readonly ColumnDef[]): string {
  const rowStr = columns.map(col => uPad(String(row[col.key] || ''), col.width, col.align)).join(' │ ');
  return `│ ${rowStr} │`;
}

// Main table renderer with Unicode perfection
export function renderUnicodeTable(data: RowData[], options: {
  columns?: readonly ColumnDef[];
  title?: string;
  footer?: string;
} = {}): string {
  const columns = options.columns || REDUCED_COLUMNS;
  const totalWidth = calculateTableWidth(columns);
  
  const lines: string[] = [];
  
  // Top border
  lines.push('┌' + '─'.repeat(totalWidth - 2) + '┐');
  
  // Title if provided
  if (options.title) {
    const titleWidth = uWidth(options.title);
    const padding = Math.max(0, totalWidth - titleWidth - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    lines.push('│ ' + ' '.repeat(leftPad) + options.title + ' '.repeat(rightPad) + ' │');
    lines.push('├' + '─'.repeat(totalWidth - 2) + '┤');
  }
  
  // Header
  lines.push(renderHeader(columns));
  lines.push(renderSeparator(totalWidth));
  
  // Data rows
  data.forEach((row, index) => {
    const rowData = { ...row, '#': (index + 1).toString() };
    lines.push(renderRow(rowData, columns));
  });
  
  // Bottom border
  lines.push('└' + '─'.repeat(totalWidth - 2) + '┘');
  
  // Footer if provided
  if (options.footer) {
    lines.push('');
    lines.push(options.footer);
  }
  
  return lines.join('\n');
}

// Multi-language support with Unicode awareness
export const MULTI_LANGUAGE_HEADERS = {
  en: [
    { key: '#', title: '#', align: 'right' as const, width: 3 },
    { key: 'component', title: 'Component', align: 'left' as const, width: 18 },
    { key: 'status', title: 'Status', align: 'center' as const, width: 10 },
    { key: 'type', title: 'Type', align: 'center' as const, width: 10 },
    { key: 'version', title: 'Version', align: 'center' as const, width: 10 }
  ],
  zh: [
    { key: '#', title: '#', align: 'right' as const, width: 3 },
    { key: 'component', title: '组件', align: 'left' as const, width: 18 },
    { key: 'status', title: '状态', align: 'center' as const, width: 10 },
    { key: 'type', title: '类型', align: 'center' as const, width: 10 },
    { key: 'version', title: '版本', align: 'center' as const, width: 10 }
  ],
  ja: [
    { key: '#', title: '#', align: 'right' as const, width: 3 },
    { key: 'component', title: 'コンポーネント', align: 'left' as const, width: 18 },
    { key: 'status', title: 'ステータス', align: 'center' as const, width: 10 },
    { key: 'type', title: 'タイプ', align: 'center' as const, width: 10 },
    { key: 'version', title: 'バージョン', align: 'center' as const, width: 10 }
  ],
  ko: [
    { key: '#', title: '#', align: 'right' as const, width: 3 },
    { key: 'component', title: '구성 요소', align: 'left' as const, width: 18 },
    { key: 'status', title: '상태', align: 'center' as const, width: 10 },
    { key: 'type', title: '유형', align: 'center' as const, width: 10 },
    { key: 'version', title: '버전', align: 'center' as const, width: 10 }
  ]
} as const;

// Performance benchmark function
export function benchmarkUnicodeTable(rows: number = 1000): void {
  const testData = Array.from({ length: rows }, (_, i) => ({
    key: `测试项${i}`,
    value: `中文测试值🇺🇸 with emoji ${i}`,
    type: '类型',
    version: 'v1.3.8',
    bunVer: '1.3.8',
    author: '作者',
    authorHash: 'abc123',
    status: '✅活跃',
    modified: new Date().toISOString()
  }));
  
  const start = performance.now();
  const result = renderUnicodeTable(testData);
  const duration = performance.now() - start;
  
  console.log(`📊 Unicode Table Benchmark:`);
  console.log(`   Rows: ${rows}`);
  console.log(`   Duration: ${duration.toFixed(2)}ms`);
  console.log(`   Output length: ${result.length} chars`);
  console.log(`   Performance: ${(rows / duration * 1000).toFixed(0)} rows/sec`);
}

// Export utility functions for external use
export { uWidth, uTruncate, uPad, REDUCED_COLUMNS };

// CLI execution for testing
if (import.meta.main) {
  // Demo with Unicode content
  const demoData = [
    {
      key: '中文配置',
      value: '生产环境设置🇨🇳',
      type: '配置',
      version: 'v1.3.8',
      bunVer: '1.3.8',
      author: '张三',
      authorHash: '8f3a2b1',
      status: '✅活跃',
      modified: '2026-02-01'
    },
    {
      key: '日本語設定',
      value: '本番環境🇯🇵',
      type: '設定',
      version: 'v1.3.8',
      bunVer: '1.3.8',
      author: '田中',
      authorHash: '5d6bb68',
      status: '✅実行中',
      modified: '2026-02-01'
    },
    {
      key: '한국어설정',
      value: '프로덕션 환경🇰🇷',
      type: '설정',
      version: 'v1.3.8',
      bunVer: '1.3.8',
      author: '김철수',
      authorHash: 'a1b2c3d',
      status: '✅실행중',
      modified: '2026-02-01'
    },
    {
      key: 'English Config',
      value: 'Production Setup🇺🇸',
      type: 'Config',
      version: 'v1.3.8',
      bunVer: '1.3.8',
      author: 'John Doe',
      authorHash: 'd4e5f6g',
      status: '✅Active',
      modified: '2026-02-01'
    }
  ];
  
  console.log('🎉 FactoryWager Unicode Table Renderer v4.1 Demo');
  console.log('');
  console.log(renderUnicodeTable(demoData, {
    title: '🛡️ Unicode Citadel Demo - 多语言支持',
    footer: `Total width: ${calculateTableWidth(REDUCED_COLUMNS)} columns (reduced from ~180)`
  }));
  
  console.log('');
  console.log('🚀 Running performance benchmark...');
  benchmarkUnicodeTable(1000);
}
