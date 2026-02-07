#!/usr/bin/env bun
/**
 * Duplicate Code Analyzer
 * 
 * Analyzes TypeScript files for:
 * - Duplicate type definitions
 * - Duplicate function names
 * - Duplicate class names
 * - Duplicate interface names
 * 
 * Usage:
 *   bun run scripts/analysis/dupe-analyzer.ts
 *   bun run scripts/analysis/dupe-analyzer.ts --json
 *   bun run scripts/analysis/dupe-analyzer.ts --threshold 3
 */

import { Glob } from "bun";

interface DuplicateEntry {
  name: string;
  type: 'type' | 'interface' | 'function' | 'class' | 'const';
  files: string[];
  count: number;
}

interface AnalysisResult {
  totalFiles: number;
  duplicates: DuplicateEntry[];
  summary: {
    types: number;
    interfaces: number;
    functions: number;
    classes: number;
    consts: number;
  };
}

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const threshold = parseInt(args.find(a => a.startsWith('--threshold='))?.split('=')[1] || '2');
const showTop = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '20');

async function analyzeDuplicates(): Promise<AnalysisResult> {
  const typeMap = new Map<string, { type: string; files: string[] }>();
  const interfaceMap = new Map<string, { type: string; files: string[] }>();
  const functionMap = new Map<string, { type: string; files: string[] }>();
  const classMap = new Map<string, { type: string; files: string[] }>();
  const constMap = new Map<string, { type: string; files: string[] }>();
  
  let fileCount = 0;
  
  const glob = new Glob("**/*.ts");
  
  for await (const filePath of glob.scan('.')) {
    // Skip node_modules and dist
    if (filePath.includes('node_modules') || filePath.includes('dist/')) {
      continue;
    }
    
    fileCount++;
    
    try {
      const file = Bun.file(filePath);
      const content = await file.text();
      
      // Match type definitions
      const typeMatches = content.matchAll(/export\s+type\s+(\w+)\s*[:=<]/g);
      for (const match of typeMatches) {
        const name = match[1];
        if (!typeMap.has(name)) {
          typeMap.set(name, { type: 'type', files: [] });
        }
        typeMap.get(name)!.files.push(filePath);
      }
      
      // Match interface definitions
      const interfaceMatches = content.matchAll(/export\s+interface\s+(\w+)\s*\{/g);
      for (const match of interfaceMatches) {
        const name = match[1];
        if (!interfaceMap.has(name)) {
          interfaceMap.set(name, { type: 'interface', files: [] });
        }
        interfaceMap.get(name)!.files.push(filePath);
      }
      
      // Match function definitions
      const functionMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g);
      for (const match of functionMatches) {
        const name = match[1];
        if (!functionMap.has(name)) {
          functionMap.set(name, { type: 'function', files: [] });
        }
        functionMap.get(name)!.files.push(filePath);
      }
      
      // Match class definitions
      const classMatches = content.matchAll(/export\s+class\s+(\w+)\s*\{/g);
      for (const match of classMatches) {
        const name = match[1];
        if (!classMap.has(name)) { 
          classMap.set(name, { type: 'class', files: [] });
        }
        classMap.get(name)!.files.push(filePath);
      }
      
      // Match const exports (could be duplicate constants)
      const constMatches = content.matchAll(/export\s+const\s+(\w+)\s*[:=]/g);
      for (const match of constMatches) {
        const name = match[1];
        if (!constMap.has(name)) {
          constMap.set(name, { type: 'const', files: [] });
        }
        constMap.get(name)!.files.push(filePath);
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  // Collect duplicates (appear in multiple files)
  const duplicates: DuplicateEntry[] = [];
  
  for (const [name, data] of typeMap) {
    if (data.files.length >= threshold) {
      duplicates.push({ name, type: 'type', files: data.files, count: data.files.length });
    }
  }
  
  for (const [name, data] of interfaceMap) {
    if (data.files.length >= threshold) {
      duplicates.push({ name, type: 'interface', files: data.files, count: data.files.length });
    }
  }
  
  for (const [name, data] of functionMap) {
    if (data.files.length >= threshold) {
      duplicates.push({ name, type: 'function', files: data.files, count: data.files.length });
    }
  }
  
  for (const [name, data] of classMap) {
    if (data.files.length >= threshold) {
      duplicates.push({ name, type: 'class', files: data.files, count: data.files.length });
    }
  }
  
  for (const [name, data] of constMap) {
    if (data.files.length >= threshold) {
      duplicates.push({ name, type: 'const', files: data.files, count: data.files.length });
    }
  }
  
  // Sort by count descending
  duplicates.sort((a, b) => b.count - a.count);
  
  return {
    totalFiles: fileCount,
    duplicates: duplicates.slice(0, showTop),
    summary: {
      types: typeMap.size,
      interfaces: interfaceMap.size,
      functions: functionMap.size,
      classes: classMap.size,
      consts: constMap.size,
    }
  };
}

function printTable(results: AnalysisResult) {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    DUPLICATE CODE ANALYZER RESULTS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📁 Files Analyzed: ${results.totalFiles}`);
  console.log(`📊 Definitions Found:`);
  console.log(`   • Types:      ${results.summary.types}`);
  console.log(`   • Interfaces: ${results.summary.interfaces}`);
  console.log(`   • Functions:  ${results.summary.functions}`);
  console.log(`   • Classes:    ${results.summary.classes}`);
  console.log(`   • Constants:  ${results.summary.consts}`);
  console.log(`\n⚠️  Duplicates Found: ${results.duplicates.length}\n`);
  
  if (results.duplicates.length === 0) {
    console.log('✅ No duplicates found above threshold!\n');
    return;
  }
  
  // Print table header
  console.log('┌────────────────────────────────┬────────────┬───────┬─────────────────────────────────────┐');
  console.log('│ Name                           │ Type       │ Count │ Files                               │');
  console.log('├────────────────────────────────┼────────────┼───────┼─────────────────────────────────────┤');
  
  for (const dup of results.duplicates) {
    const name = dup.name.slice(0, 30).padEnd(30);
    const type = dup.type.padEnd(10);
    const count = dup.count.toString().padStart(5);
    const files = dup.files[0].slice(0, 35);
    console.log(`│ ${name} │ ${type} │ ${count} │ ${files.padEnd(35)} │`);
    
    // Show additional files
    for (let i = 1; i < dup.files.length && i < 3; i++) {
      const extraFile = dup.files[i].slice(0, 35);
      console.log(`│                                │            │       │ ${extraFile.padEnd(35)} │`);
    }
    if (dup.files.length > 3) {
      console.log(`│                                │            │       │ ... and ${dup.files.length - 3} more`.padEnd(35) + ' │');
    }
  }
  
  console.log('└────────────────────────────────┴────────────┴───────┴─────────────────────────────────────┘\n');
}

function printJSON(results: AnalysisResult) {
  console.log(JSON.stringify(results, null, 2));
}

// Main execution
analyzeDuplicates().then(results => {
  if (jsonOutput) {
    printJSON(results);
  } else {
    printTable(results);
  }
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
