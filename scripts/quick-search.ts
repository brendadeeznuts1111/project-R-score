#!/usr/bin/env bun

/**
 * Quick Search - Ghost Search Maneuver
 * Search docs and project code in parallel using Bun.spawn
 */

import { ghostSearch, searchDocs, searchProjectCode } from '../lib/docs/ripgrep-spawn';

interface SearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
  projectDir?: string;
  docsOnly?: boolean;
  codeOnly?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔍 Quick Search - Ghost Search Maneuver

USAGE:
  bun run scripts/quick-search.ts <query> [options]

QUERY:
  Search term to find in documentation and code

OPTIONS:
  --case-sensitive    Case-sensitive search (default: insensitive)
  --max-results <n>   Maximum results per source (default: 20)
  --project-dir <dir> Project directory to search (default: ./packages)
  --docs-only         Search only documentation
  --code-only         Search only project code
  --parallel          Show parallel execution timing

EXAMPLES:
  bun run scripts/quick-search.ts "Bun.serve"
  bun run scripts/quick-search.ts "SQLite" --max-results 10
  bun run scripts/quick-search.ts "markdown" --docs-only
  bun run scripts/quick-search.ts "performance" --code-only --project-dir ./src
  bun run scripts/quick-search.ts "fetch" --parallel
    `);
    process.exit(0);
  }

  const query = args[0];
  const options: SearchOptions = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--case-sensitive':
        options.caseSensitive = true;
        break;
      case '--max-results':
        options.maxResults = parseInt(args[++i]) || 20;
        break;
      case '--project-dir':
        options.projectDir = args[++i];
        break;
      case '--docs-only':
        options.docsOnly = true;
        break;
      case '--code-only':
        options.codeOnly = true;
        break;
      case '--parallel':
        // Special flag to show timing
        break;
    }
  }

  const startTime = performance.now();
  
  console.log(`🔍 Searching for "${query}"...\n`);

  try {
    if (options.docsOnly) {
      // Documentation only search
      const docs = await searchDocs(query, {
        caseSensitive: options.caseSensitive,
        maxResults: options.maxResults
      });
      
      console.log(`--- Documentation Matches (${docs.length}) ---`);
      displayResults(docs, 'docs');
      
    } else if (options.codeOnly) {
      // Code only search
      const code = await searchProjectCode(
        query, 
        options.projectDir || './packages',
        {
          caseSensitive: options.caseSensitive,
          maxResults: options.maxResults
        }
      );
      
      console.log(`--- Code Matches (${code.length}) ---`);
      displayResults(code, 'code');
      
    } else {
      // Ghost Search - parallel docs and code
      const { docs, code } = await ghostSearch(
        query,
        options.projectDir || './packages',
        {
          caseSensitive: options.caseSensitive,
          maxResults: options.maxResults
        }
      );
      
      console.log(`--- Documentation Matches (${docs.length}) ---`);
      displayResults(docs, 'docs');
      
      console.log(`\n--- Project Code Matches (${code.length}) ---`);
      displayResults(code, 'code');
      
      const totalMatches = docs.length + code.length;
      console.log(`\n📊 Total matches: ${totalMatches}`);
    }

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    console.log(`⚡ Search completed in ${duration}ms`);

  } catch (error) {
    console.error('❌ Search failed:', error);
    process.exit(1);
  }
}

function displayResults(matches: any[], type: 'docs' | 'code'): void {
  if (matches.length === 0) {
    console.log('No matches found.');
    return;
  }

  matches.forEach((match, index) => {
    const { data } = match;
    const filename = data.path.text.split('/').pop();
    const lineNumber = data.line_number;
    const line = data.lines.text.trim();
    
    // Highlight the match
    let highlightedLine = line;
    if (data.submatches.length > 0) {
      const submatch = data.submatches[0];
      const matchText = submatch.match.text;
      highlightedLine = line.replace(matchText, `🎯${matchText}🎯`);
    }

    console.log(`${index + 1}. ${filename}:${lineNumber}`);
    console.log(`   ${highlightedLine}`);
    console.log('');
  });
}

// Performance comparison mode
if (process.argv.includes('--parallel')) {
  console.log('🏎️ Running parallel performance test...\n');
  
  const testQueries = ['Bun.serve', 'SQLite', 'fetch', 'markdown'];
  const projectDir = './packages';
  
  const parallelStart = performance.now();
  
  // Run all searches in parallel
  const parallelPromises = testQueries.map(query => 
    ghostSearch(query, projectDir, { maxResults: 10 })
  );
  
  const parallelResults = await Promise.all(parallelPromises);
  const parallelEnd = performance.now();
  
  console.log('📊 Parallel Results:');
  testQueries.forEach((query, index) => {
    const { docs, code } = parallelResults[index];
    console.log(`  ${query}: ${docs.length} docs, ${code.length} code matches`);
  });
  
  console.log(`\n⚡ Parallel execution time: ${(parallelEnd - parallelStart).toFixed(2)}ms`);
  
  // Compare with sequential execution
  const sequentialStart = performance.now();
  
  for (const query of testQueries) {
    await ghostSearch(query, projectDir, { maxResults: 10 });
  }
  
  const sequentialEnd = performance.now();
  const speedup = ((sequentialEnd - sequentialStart) / (parallelEnd - parallelStart)).toFixed(2);
  
  console.log(`🐌 Sequential execution time: ${(sequentialEnd - sequentialStart).toFixed(2)}ms`);
  console.log(`🚀 Speedup: ${speedup}x faster with parallel execution`);
  
} else {
  main();
}
