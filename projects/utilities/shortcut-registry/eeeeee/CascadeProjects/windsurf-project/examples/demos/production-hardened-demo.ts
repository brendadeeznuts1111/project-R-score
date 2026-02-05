#!/usr/bin/env bun

// Production-Hardened Enterprise Dashboard - Complete Demo
export {};

// Import classes dynamically to avoid module resolution issues
async function loadStreamingAnalyzer() {
  const module = await import('./streaming-pattern-analyzer');
  return module.StreamingURLPatternAnalyzer;
}

async function loadGuardGenerator() {
  const module = await import('./runtime-guard-generator');
  return module.RuntimeSecurityGuardGenerator;
}

async function loadFuzzGenerator() {
  const module = await import('./fuzz-corpus-generator');
  return module.FuzzCorpusGenerator;
}

interface DemoConfig {
  generateTestData: boolean;
  runStreamingAnalysis: boolean;
  generateRuntimeGuards: boolean;
  generateFuzzCorpus: boolean;
  runRegressionTests: boolean;
}

class ProductionHardenedDemo {
  private config: DemoConfig;

  constructor(config: DemoConfig) {
    this.config = config;
  }

  async runCompleteDemo(): Promise<void> {
    console.log('🚀 Production-Hardened Enterprise Dashboard Demo');
    console.log('================================================');
    console.log('');
    console.log('This demo showcases three production-hardened capabilities:');
    console.log('1. Million-Pattern Analysis with Zero Memory Bloat');
    console.log('2. Runtime Security Guard Generation');
    console.log('3. Fuzzing + Snapshot Regression Testing');
    console.log('');

    if (this.config.generateTestData) {
      await this.generateTestData();
    }

    if (this.config.runStreamingAnalysis) {
      await this.runStreamingAnalysis();
    }

    if (this.config.generateRuntimeGuards) {
      await this.generateRuntimeGuards();
    }

    if (this.config.generateFuzzCorpus) {
      await this.generateFuzzCorpus();
    }

    if (this.config.runRegressionTests) {
      await this.runRegressionTests();
    }

    console.log('🎉 Production-Hardened Demo Complete!');
    console.log('====================================');
    console.log('');
    console.log('📁 Generated Files:');
    console.log('- patterns.ndjson (test data)');
    console.log('- results.sqlite (analysis cache)');
    console.log('- runtime-guards.ts (security controls)');
    console.log('- fuzz-corpus.json (attack vectors)');
    console.log('- urlpattern-regression.test.ts (regression tests)');
    console.log('');
    console.log('🛠️ Next Steps:');
    console.log('1. Integrate runtime-guards.ts into your application');
    console.log('2. Run regression tests in CI/CD pipeline');
    console.log('3. Monitor security guard performance in production');
    console.log('4. Update guards when patterns change');
  }

  private async generateTestData(): Promise<void> {
    console.log('📝 Generating Test Pattern Data');
    console.log('===============================');

    const patterns = [
      // High-risk patterns
      { pattern: 'https://registry.${USER}.com/:pkg/*', risk: 'critical' },
      { pattern: '/api/:service/../admin/:action', risk: 'high' },
      { pattern: 'https://169.254.169.254/metadata/:path', risk: 'critical' },
      { pattern: 'file:///etc/:config', risk: 'high' },
      
      // Medium-risk patterns
      { pattern: '/user/:username/profile', risk: 'medium' },
      { pattern: '/api/v1/:endpoint/*', risk: 'medium' },
      { pattern: 'https://localhost:3000/:path', risk: 'medium' },
      
      // Low-risk patterns
      { pattern: '/static/:file', risk: 'low' },
      { pattern: '/health/:service', risk: 'low' },
      { pattern: '/api/v2/users/:userId', risk: 'low' },
      
      // Complex patterns (potential ReDoS)
      { pattern: '/complex/((a+)+)b/:path*', risk: 'high' },
      { pattern: '/regex/([a-z]+)*[0-9]+/:id', risk: 'medium' }
    ];

    // Generate 1000 patterns for realistic testing
    const testPatterns = [];
    for (let i = 0; i < 1000; i++) {
      const basePattern = patterns[i % patterns.length];
      if (!basePattern) continue;
      
      testPatterns.push({
        pattern: basePattern.pattern.replace(':service', `service${i}`),
        metadata: {
          id: i,
          risk: basePattern.risk,
          created: new Date().toISOString()
        }
      });
    }

    const ndjsonContent = testPatterns.map(p => JSON.stringify(p)).join('\n');
    await Bun.write('./patterns.ndjson', ndjsonContent);
    
    console.log(`✅ Generated ${testPatterns.length} test patterns`);
    console.log('📁 Output: ./patterns.ndjson');
    console.log('');
  }

  private async runStreamingAnalysis(): Promise<void> {
    console.log('🔄 Running Streaming Pattern Analysis');
    console.log('=====================================');

    const StreamingURLPatternAnalyzer = await loadStreamingAnalyzer();
    const analyzer = new StreamingURLPatternAnalyzer({
      inputFile: './patterns.ndjson',
      cacheDb: './results.sqlite',
      workerThreads: 4,
      chunkSize: 65536
    });

    try {
      const startTime = Bun.nanoseconds();
      const results = await analyzer.analyzePatterns({
        inputFile: './patterns.ndjson',
        cacheDb: './results.sqlite',
        workerThreads: 4,
        chunkSize: 65536
      });
      const duration = (Bun.nanoseconds() - startTime) / 1e9;

      console.log(`✅ Analysis completed in ${duration.toFixed(2)}s`);
      console.log(`📊 Processed: ${results.totalProcessed} patterns`);
      console.log(`🎯 Cache hits: ${results.cacheHits}`);
      console.log(`🚨 Security issues: ${results.securityIssues}`);
      console.log(`⚡ ReDoS risks: ${results.redosRisks}`);
      console.log('');

      analyzer.generateReport();
      console.log('');
    } finally {
      analyzer.cleanup();
    }
  }

  private async generateRuntimeGuards(): Promise<void> {
    console.log('🛡️ Generating Runtime Security Guards');
    console.log('===================================');

    const RuntimeSecurityGuardGenerator = await loadGuardGenerator();
    const generator = new RuntimeSecurityGuardGenerator('./results.sqlite');
    
    try {
      await generator.generateGuards();
      console.log('✅ Runtime guards generated successfully');
      console.log('📁 Output: ./runtime-guards.ts');
      console.log('');
      
      // Show a sample of generated guards
      const guardContent = await Bun.file('./runtime-guards.ts').text();
      const sampleLines = guardContent.split('\n').slice(0, 20).join('\n');
      console.log('📄 Sample guard code:');
      console.log(sampleLines);
      console.log('...');
      console.log('');
    } catch (error) {
      console.error('❌ Error generating guards:', error);
    }
  }

  private async generateFuzzCorpus(): Promise<void> {
    console.log('🧪 Generating Fuzz Corpus & Regression Tests');
    console.log('=============================================');

    const FuzzCorpusGenerator = await loadFuzzGenerator();
    const generator = new FuzzCorpusGenerator('./results.sqlite');
    
    try {
      await generator.generateCorpus();
      console.log('✅ Fuzz corpus generated successfully');
      console.log('📁 Output: ./fuzz-corpus.json');
      console.log('🧪 Output: ./urlpattern-regression.test.ts');
      console.log('');
      
      // Show sample test cases
      const corpusContent = await Bun.file('./fuzz-corpus.json').text();
      const corpus = JSON.parse(corpusContent);
      console.log(`📊 Generated ${corpus.totalTests} test cases`);
      console.log('');
      
      console.log('🧪 Sample attack vectors:');
      corpus.testCases.slice(0, 3).forEach((testCase: any, index: number) => {
        console.log(`${index + 1}. ${testCase.attack.type}: ${testCase.attack.description}`);
        console.log(`   Risk Level: ${testCase.riskLevel}`);
        console.log(`   Expected Error: ${testCase.expectedError || 'none'}`);
      });
      console.log('');
    } catch (error) {
      console.error('❌ Error generating fuzz corpus:', error);
    }
  }

  private async runRegressionTests(): Promise<void> {
    console.log('🧪 Running Regression Tests');
    console.log('===========================');

    try {
      // Check if test file exists
      const testFile = Bun.file('./urlpattern-regression.test.ts');
      if (!testFile.exists()) {
        console.log('⚠️  Regression test file not found. Run fuzz corpus generation first.');
        return;
      }

      console.log('🏃 Running tests...');
      const result = await Bun.$`bun test urlpattern-regression.test.ts`.quiet();
      
      if (result.exitCode === 0) {
        console.log('✅ All regression tests passed!');
      } else {
        console.log('❌ Some regression tests failed');
        console.log('Run: bun test urlpattern-regression.test.ts for details');
      }
      console.log('');
    } catch (error) {
      console.error('❌ Error running regression tests:', error);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const config: DemoConfig = {
    generateTestData: !args.includes('--skip-test-data'),
    runStreamingAnalysis: !args.includes('--skip-analysis'),
    generateRuntimeGuards: !args.includes('--skip-guards'),
    generateFuzzCorpus: !args.includes('--skip-fuzz'),
    runRegressionTests: args.includes('--run-tests')
  };

  const demo = new ProductionHardenedDemo(config);
  await demo.runCompleteDemo();
}

// Check if this file is being run directly
if (require.main === module) {
  main().catch(console.error);
}
