#!/usr/bin/env bun

/**
 * Einstein Similarity - Levenshtein Normalized Perfected
 * Empire Pro Duplicate Hunter for Code/Phone/Names
 * 
 * Formula: (1 - d / max(len1, len2)) * 100%
 * Alt Formula: 1 / (1 + d) for long strings
 */

/**
 * Calculate Einstein Similarity between two strings
 * @param s1 First string
 * @param s2 Second string  
 * @param normalizeWhitespace Whether to normalize whitespace (default: true)
 * @returns Similarity percentage (0-100)
 */
export function einsteinSimilarity(s1: string, s2: string, normalizeWhitespace = true): number {
  if (normalizeWhitespace) {
    s1 = s1.replace(/[\s\n\r\t]+/g, ' ').trim();
    s2 = s2.replace(/[\s\n\r\t]+/g, ' ').trim();
  }
  
  const d = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return maxLen === 0 ? 100 : (1 - d / maxLen) * 100;
}

/**
 * Fast similarity for long strings using 1/(1+d) formula
 * @param s1 First string
 * @param s2 Second string
 * @returns Similarity score (0-1)
 */
export function fastSimilarity(s1: string, s2: string): number {
  return 1 / (1 + levenshteinDistance(s1, s2));
}

/**
 * Optimized Levenshtein distance calculation
 * O(mn) dynamic programming with space optimization
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  
  // Handle empty strings
  if (m === 0) return n;
  if (n === 0) return m;
  
  // Use single array for space optimization
  const dp = Array(n + 1).fill(0);
  
  // Initialize first row
  for (let i = 0; i <= n; i++) {
    dp[i] = i;
  }
  
  // Calculate distance
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      
      dp[j] = Math.min(
        dp[j] + 1,        // deletion
        dp[j - 1] + 1,    // insertion
        prev + cost        // substitution
      );
      
      prev = temp;
    }
  }
  
  return dp[n];
}

/**
 * Tokenize code by removing comments and extra whitespace
 * @param code Source code string
 * @returns Tokenized code string
 */
export function tokenizeCode(code: string): string {
  return code
    .replace(/\/\*.*?\*\/|\/\/.*$/gm, '') // Remove comments
    .replace(/[\s{}();,]+/g, ' ')        // Replace whitespace and punctuation
    .trim();                              // Clean up
}

/**
 * Tokenize names for comparison (normalize case, remove special chars)
 * @param name Name string
 * @returns Tokenized name
 */
export function tokenizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity for code snippets
 * @param code1 First code snippet
 * @param code2 Second code snippet
 * @returns Similarity percentage
 */
export function codeSimilarity(code1: string, code2: string): number {
  const tokens1 = tokenizeCode(code1);
  const tokens2 = tokenizeCode(code2);
  return einsteinSimilarity(tokens1, tokens2, true);
}

/**
 * Calculate similarity for names
 * @param name1 First name
 * @param name2 Second name
 * @returns Similarity percentage
 */
export function nameSimilarity(name1: string, name2: string): number {
  const tokens1 = tokenizeName(name1);
  const tokens2 = tokenizeName(name2);
  return einsteinSimilarity(tokens1, tokens2, true);
}

/**
 * Batch similarity calculator for multiple comparisons
 * @param items Array of strings to compare
 * @param threshold Minimum similarity threshold
 * @returns Array of similar pairs
 */
export function findSimilarPairs(items: string[], threshold = 80): Array<{a: string, b: string, similarity: number}> {
  const similarPairs: Array<{a: string, b: string, similarity: number}> = [];
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const similarity = einsteinSimilarity(items[i], items[j]);
      if (similarity >= threshold) {
        similarPairs.push({
          a: items[i],
          b: items[j],
          similarity
        });
      }
    }
  }
  
  return similarPairs.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Performance test for similarity functions
 */
export function performanceTest(): void {
  const testCases = [
    ['func()', 'func2()'],
    ['John Doe', 'Jon Doh'],
    ['void calculate()', 'void calculate2()'],
    ['Empire Pro Config', 'Emp Pro Config'],
    ['longstringwithlotsoftext', 'longstringwithlotsoftext2']
  ];
  
  console.log('🧪 Einstein Similarity Performance Test');
  console.log('==========================================');
  
  testCases.forEach(([s1, s2]) => {
    const start = performance.now();
    const einstein = einsteinSimilarity(s1, s2);
    const fast = fastSimilarity(s1, s2);
    const end = performance.now();
    
    console.log(`"${s1}" vs "${s2}"`);
    console.log(`  Einstein: ${einstein.toFixed(1)}% | Fast: ${fast.toFixed(3)} | Time: ${(end - start).toFixed(3)}ms`);
  });
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || (args.length < 2 && args[0] !== '--test')) {
    console.log('🚀 Einstein Similarity - Empire Pro Duplicate Hunter');
    console.log('Usage:');
    console.log('  bunx tsx einstein-similarity.ts "string1" "string2"');
    console.log('  bunx tsx einstein-similarity.ts --code "func()" "func2()"');
    console.log('  bunx tsx einstein-similarity.ts --name "John Doe" "Jon Doh"');
    console.log('  bunx tsx einstein-similarity.ts --test');
    process.exit(0);
  }
  
  if (args[0] === '--test') {
    performanceTest();
  } else if (args[0] === '--code' && args.length >= 3) {
    const similarity = codeSimilarity(args[1], args[2]);
    console.log(`Code Similarity: ${similarity.toFixed(1)}%`);
  } else if (args[0] === '--name' && args.length >= 3) {
    const similarity = nameSimilarity(args[1], args[2]);
    console.log(`Name Similarity: ${similarity.toFixed(1)}%`);
  } else {
    const s1 = args[0];
    const s2 = args[1];
    const einstein = einsteinSimilarity(s1, s2);
    const fast = fastSimilarity(s1, s2);
    console.log(`Einstein Similarity: ${einstein.toFixed(1)}%`);
    console.log(`Fast Similarity: ${fast.toFixed(3)}`);
  }
}

export { einsteinSimilarity as default };
