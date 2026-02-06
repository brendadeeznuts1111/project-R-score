#!/usr/bin/env bun
// debug-table-detection.ts - Debug table column detection

import { detectTableColumns } from './junior-runner';

async function debugTableDetection() {
  const testMd = `# Simple Test

| A | B |
|---|---|
| 1 | 2 |`;

  console.log('🔍 Debugging table detection...');
  console.log('Input markdown:');
  console.log(testMd);
  console.log('\n' + '='.repeat(50));
  
  // Manual step-by-step detection
  const tableSeparatorRegex = /^\|[\s\-\|:]+\|$/gm;  
  const allTableLines = testMd.match(/^\|[^\r\n]*\|$/gm) || [];
  
  console.log('\n📋 Table lines found:');
  allTableLines.forEach((line, i) => {
    const isSeparator = tableSeparatorRegex.test(line);
    console.log(`  Line ${i+1}: "${line}" → Separator: ${isSeparator}`);
  });
  
  // Simulate table parsing
  const tables: number[] = [];
  let currentTable: string[] = [];
  
  allTableLines.forEach(line => {
    if (tableSeparatorRegex.test(line)) {  // Separator → End table
      console.log(`  → Found separator, ending current table with ${currentTable.length} rows`);
      if (currentTable.length > 0) {
        const validRows = currentTable.filter(l => !tableSeparatorRegex.test(l));
        if (validRows.length > 0) {
          const colCounts = validRows.map(l => Math.max(1, (l.match(/\|/g) || []).length - 1));
          const maxCols = Math.max(...colCounts);
          console.log(`    → Valid rows: ${validRows.length}, cols: ${colCounts}, max: ${maxCols}`);
          tables.push(maxCols);
        }
        currentTable = [];
      }
    } else {
      currentTable.push(line);
      console.log(`  → Added to current table: "${line}"`);
    }
  });
  
  // Final table
  if (currentTable.length > 0) {
    console.log(`  → Final table with ${currentTable.length} rows`);
    const validRows = currentTable.filter(l => !tableSeparatorRegex.test(l));
    if (validRows.length > 0) {
      const colCounts = validRows.map(l => Math.max(1, (l.match(/\|/g) || []).length - 1));
      const maxCols = Math.max(...colCounts);
      console.log(`    → Valid rows: ${validRows.length}, cols: ${colCounts}, max: ${maxCols}`);
      tables.push(maxCols);
    }
  }
  
  console.log(`\n🎯 Final result: ${tables.length} tables, cols: [${tables.join(', ')}]`);
  
  const result = detectTableColumns(testMd);
  console.log('\nDetection result:', result);
}

if (import.meta.main) {
  debugTableDetection();
}
