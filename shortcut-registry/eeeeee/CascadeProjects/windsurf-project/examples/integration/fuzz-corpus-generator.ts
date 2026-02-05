#!/usr/bin/env bun

// Fuzzing + Snapshot Regression Testing System
export {};

// Import Database type from bun:sqlite
interface Database {
  run(sql: string, ...args: any[]): void;
  query(sql: string): {
    all(): any[];
    get(): any;
  };
  close(): void;
}

interface FuzzTestCase {
  pattern: string;
  attack: {
    input: string | Record<string, any>;
    type: string;
    description: string;
  };
  expectedError?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface RegressionTest {
  pattern: string;
  description: string;
  testCases: FuzzTestCase[];
}

class FuzzCorpusGenerator {
  private db: Database;
  private corpus: FuzzTestCase[] = [];

  constructor(cacheDb: string) {
    const { Database } = require('bun:sqlite');
    this.db = new Database(cacheDb);
  }

  async generateCorpus(): Promise<void> {
    console.log('🧪 Generating Fuzz Corpus from Error Analysis');
    console.log('=============================================');

    const patterns = this.db.query('SELECT * FROM cached_results').all() as any[];
    
    for (const patternData of patterns) {
      const testCases = this.generateTestCases(patternData);
      this.corpus.push(...testCases);
    }

    await this.writeCorpusFile();
    await this.generateRegressionTests();
    
    console.log(`✅ Generated ${this.corpus.length} fuzz test cases`);
    console.log('📁 Output: ./fuzz-corpus.json');
    console.log('🧪 Output: ./urlpattern-regression.test.ts');
  }

  private generateTestCases(patternData: any): FuzzTestCase[] {
    const testCases: FuzzTestCase[] = [];
    const pattern = patternData.pattern_text;

    // Path Traversal Tests
    if (pattern.includes(':path') || pattern.includes('*')) {
      testCases.push({
        pattern,
        attack: {
          input: 'a'.repeat(10000),
          type: 'redos',
          description: 'Excessive input length for ReDoS testing'
        },
        expectedError: 'timeout',
        riskLevel: 'high'
      });

      testCases.push({
        pattern,
        attack: {
          input: '../../../etc/passwd',
          type: 'path_traversal',
          description: 'Directory traversal attempt'
        },
        expectedError: 'path_traversal_blocked',
        riskLevel: 'critical'
      });
    }

    // Environment Variable Injection Tests
    if (pattern.includes('${USER}') || pattern.includes('${')) {
      testCases.push({
        pattern,
        attack: {
          input: { USER: '../../etc/passwd' },
          type: 'env_injection',
          description: 'Environment variable injection'
        },
        expectedError: 'env_injection_blocked',
        riskLevel: 'critical'
      });

      testCases.push({
        pattern,
        attack: {
          input: { USER: 'admin@domain.com%00' },
          type: 'env_injection',
          description: 'Malicious characters in env var'
        },
        expectedError: 'invalid_env_var',
        riskLevel: 'high'
      });
    }

    // SSRF Tests
    if (pattern.includes('https://') || pattern.includes(':host')) {
      testCases.push({
        pattern,
        attack: {
          input: '169.254.169.254',
          type: 'ssrf',
          description: 'AWS metadata service SSRF'
        },
        expectedError: 'ssrf_blocked',
        riskLevel: 'critical'
      });

      testCases.push({
        pattern,
        attack: {
          input: '127.0.0.1',
          type: 'ssrf',
          description: 'Localhost SSRF'
        },
        expectedError: 'ssrf_blocked',
        riskLevel: 'high'
      });

      testCases.push({
        pattern,
        attack: {
          input: '0.0.0.0',
          type: 'ssrf',
          description: 'Null route SSRF'
        },
        expectedError: 'ssrf_blocked',
        riskLevel: 'medium'
      });
    }

    // ReDoS Tests
    const complexity = this.calculatePatternComplexity(pattern);
    if (complexity > 5) {
      testCases.push({
        pattern,
        attack: {
          input: 'a'.repeat(1000) + 'b' + 'a'.repeat(1000),
          type: 'redos',
          description: 'Catastrophic backtracking pattern'
        },
        expectedError: 'timeout',
        riskLevel: 'critical'
      });
    }

    // Unicode and Encoding Tests
    if (pattern.includes('*') || pattern.includes(':')) {
      testCases.push({
        pattern,
        attack: {
          input: '\\x00\\x01\\x02\\x03',
          type: 'encoding',
          description: 'Control character injection'
        },
        expectedError: 'invalid_encoding',
        riskLevel: 'medium'
      });
    }

    return testCases;
  }

  private calculatePatternComplexity(pattern: string): number {
    let complexity = 0;
    complexity += (pattern.match(/\(/g) || []).length;
    complexity += (pattern.match(/\*/g) || []).length * 2;
    complexity += (pattern.match(/\+/g) || []).length * 2;
    complexity += (pattern.match(/\?/g) || []).length;
    complexity += (pattern.match(/\[.*?\]/g) || []).length * 3;
    return complexity;
  }

  private async writeCorpusFile(): Promise<void> {
    const corpusData = {
      generated: new Date().toISOString(),
      totalTests: this.corpus.length,
      testCases: this.corpus
    };

    await Bun.write('./fuzz-corpus.json', JSON.stringify(corpusData, null, 2));
  }

  private async generateRegressionTests(): Promise<void> {
    const patterns = Array.from(new Set(this.corpus.map(tc => tc.pattern)));
    
    let testCode = `// Auto-generated Regression Tests
// Generated on: ${new Date().toISOString()}
// WARNING: Do not edit manually - regenerate with fuzz corpus

import { test, expect } from 'bun:test';
import { runtimeGuards } from './runtime-guards';

interface FuzzTestCase {
  pattern: string;
  attack: {
    input: string | Record<string, any>;
    type: string;
    description: string;
  };
  expectedError?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const fuzzCorpus: FuzzTestCase[] = ${JSON.stringify(this.corpus, null, 2)};

// Helper function to sanitize results for snapshot testing
function sanitizeResult(result: URLPatternResult | null): any {
  if (!result) return null;
  
  return {
    pathname: result.pathname,
    search: result.search,
    hash: result.hash,
    groups: Object.fromEntries(
      Object.entries(result.groups).map(([key, value]) => [
        key,
        typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value
      ])
    )
  };
}

// Generate tests for each pattern
const patternsByPattern = new Map<string, FuzzTestCase[]>();

for (const testCase of fuzzCorpus) {
  if (!patternsByPattern.has(testCase.pattern)) {
    patternsByPattern.set(testCase.pattern, []);
  }
  patternsByPattern.get(testCase.pattern)!.push(testCase);
}

for (const [pattern, testCases] of patternsByPattern) {
  describe(\`Pattern: \${pattern}\`, () => {
    let urlPattern: URLPattern;
    
    beforeAll(() => {
      try {
        urlPattern = new URLPattern(pattern);
      } catch (error) {
        console.warn(\`Invalid pattern: \${pattern}\`, error);
      }
    });

    for (const testCase of testCases) {
      test(\`resists \${testCase.attack.type} - \${testCase.attack.description}\`, async () => {
        if (!urlPattern) {
          test.skip(\`Invalid pattern: \${pattern}\`);
          return;
        }

        const start = Bun.nanoseconds();
        let result: URLPatternResult | null = null;
        let errorThrown = false;

        try {
          // Apply runtime guards if available
          const safePattern = pattern.replace(/[^a-zA-Z0-9_]/g, '_');
          const guard = runtimeGuards[safePattern];
          
          if (guard?.beforeExec) {
            const url = typeof testCase.attack.input === 'string' 
              ? testCase.attack.input 
              : \`https://example.com/\${testCase.attack.input}\`;
            const groups = typeof testCase.attack.input === 'object' 
              ? testCase.attack.input 
              : {};
            
            guard.beforeExec(url, groups);
          }

          // Execute pattern matching
          const input = typeof testCase.attack.input === 'string' 
            ? \`https://example.com/\${testCase.attack.input}\`
            : \`https://example.com/\`;
            
          result = urlPattern.exec(input);
          
          // Apply after-exec guard
          if (guard?.afterExec) {
            guard.afterExec(result);
          }
        } catch (error) {
          errorThrown = true;
          
          // Expected error handling
          if (testCase.expectedError) {
            expect(error.message).toMatch(new RegExp(testCase.expectedError, 'i'));
          }
        }

        const duration = (Bun.nanoseconds() - start) / 1e6;

        // ReDoS protection - should complete within reasonable time
        expect(duration).toBeLessThan(testCase.expectedError === 'timeout' ? 100 : 10);

        // If no error expected, snapshot the safe result
        if (!testCase.expectedError && !errorThrown) {
          expect(sanitizeResult(result)).toMatchSnapshot();
        }

        // If error was expected, ensure it was thrown
        if (testCase.expectedError && !errorThrown) {
          throw new Error(\`Expected error '\${testCase.expectedError}' but none was thrown\`);
        }
      });
    }
  });
}

// Performance regression test
test('pattern matching performance regression', () => {
  const testPattern = '/api/:service/*';
  const urlPattern = new URLPattern(testPattern);
  
  const start = Bun.nanoseconds();
  
  // Execute 1000 pattern matches
  for (let i = 0; i < 1000; i++) {
    urlPattern.exec(\`https://example.com/api/service\${i}\`);
  }
  
  const duration = (Bun.nanoseconds() - start) / 1e6;
  
  // Should complete within 100ms for 1000 operations
  expect(duration).toBeLessThan(100);
});

// Memory usage test
test('pattern matching memory usage', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Create many patterns and execute matches
  const patterns = [];
  for (let i = 0; i < 100; i++) {
    patterns.push(new URLPattern(\`/api/:service\${i}/*\`));
  }
  
  patterns.forEach((pattern, i) => {
    pattern.exec(\`https://example.com/api/service\${i}/endpoint\`);
  });
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  // Should not increase memory by more than 10MB
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
});
`;

    await Bun.write('./urlpattern-regression.test.ts', testCode);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const cacheDb = args.find(arg => arg.startsWith('--cache-db='))?.split('=')[1] || 'results.sqlite';

  console.log('🧪 Fuzz Corpus & Regression Test Generator');
  console.log('===========================================');

  const generator = new FuzzCorpusGenerator(cacheDb);
  
  try {
    await generator.generateCorpus();
    console.log('');
    console.log('🧪 Testing Integration:');
    console.log('bun test urlpattern-regression.test.ts');
    console.log('bun test --update-snapshots urlpattern-regression.test.ts');
  } catch (error) {
    console.error('❌ Error generating fuzz corpus:', error);
    process.exit(1);
  }
}

export { FuzzCorpusGenerator };

// Check if this file is being run directly
if (require.main === module) {
  main().catch(console.error);
}
