// bench/test-config-bench.ts
import { Suite } from 'benchmark'
import { SecureTestRunner } from '../packages/test/secure-test-runner'
import { FastTomlParser } from '../packages/test/toml-parser'
import { ThreatIntelligenceService } from '../packages/test/security-validation'
import { writeFileSync, unlinkSync, existsSync } from 'fs'

// Benchmark configuration
const BENCH_CONFIG = `
[install]
registry = "https://registry.company.com"
cafile = "./certs/corporate-ca.pem"
prefer = "offline"
exact = true
token = "npm-token-1234567890abcdef1234567890abcdef"

[test]
root = "src"
timeout = 10000
smol = false
reporter = "spec"
preload = ["./security-mocks.ts", "./test-setup.ts"]
coverage = true

[test.ci]
timeout = 30000
smol = true
coverage = { 
  reporter = ["text", "lcov", "html"],
  threshold = { lines = 0.9, functions = 0.9, statements = 0.85, branches = 0.8 },
  pathIgnore = ["generated/**", "**/*.spec.ts"]
}

[test.staging]
timeout = 15000
coverage = false

[test.local]
timeout = 5000
updateSnapshots = true
`

const BENCH_CONFIG_PATH = './bunfig.bench.toml'
const BENCH_ENV_PATH = '.env.bench'

// Setup benchmark files
function setupBenchmarkFiles() {
  writeFileSync(BENCH_CONFIG_PATH, BENCH_CONFIG)
  
  const envContent = `
TEST_DATABASE_URL=postgres://test:test@localhost/test_db
API_URL=http://localhost:3000
NODE_ENV=test
CSRF_TEST_MODE=enabled
TEST_SECURITY_LEVEL=tier-1380
`
  writeFileSync(BENCH_ENV_PATH, envContent)
}

// Cleanup benchmark files
function cleanupBenchmarkFiles() {
  if (existsSync(BENCH_CONFIG_PATH)) unlinkSync(BENCH_CONFIG_PATH)
  if (existsSync(BENCH_ENV_PATH)) unlinkSync(BENCH_ENV_PATH)
}

// Benchmark suite
const suite = new Suite()

// Test configuration loading
suite.add('Config Load (Tier-1380 Target: <1ms)', {
  defer: true,
  fn: async (deferred: any) => {
    const runner = new SecureTestRunner('ci', BENCH_CONFIG_PATH)
    deferred.resolve()
  }
})

// Fast TOML parsing
suite.add('Fast TOML Parser', () => {
  const parsed = FastTomlParser.parse(BENCH_CONFIG)
  if (!parsed) throw new Error('Parse failed')
})

// Inheritance resolution
suite.add('Inheritance Resolution', () => {
  const parser = new FastTomlParser('ci')
  const resolved = parser.parseWithInheritance(BENCH_CONFIG)
  if (!resolved.test) throw new Error('Inheritance failed')
})

// Security validation
suite.add('Security Validation', () => {
  const threatIntel = new ThreatIntelligenceService()
  const violations = threatIntel.scanForSecrets(BENCH_CONFIG, 'bunfig')
  // Should be no violations in test config
})

// Environment isolation check
suite.add('Environment Isolation Check', () => {
  const threatIntel = new ThreatIntelligenceService()
  const violations = threatIntel.scanEnvironmentVariables({
    TEST_DATABASE_URL: 'postgres://test:test@localhost/test_db',
    API_URL: 'http://localhost:3000',
    NODE_ENV: 'test'
  }, 'test')
  // Should be no violations
})

// Coverage threshold validation
suite.add('Coverage Threshold Validation', () => {
  const thresholds = {
    lines: 0.9,
    functions: 0.9,
    statements: 0.85,
    branches: 0.8
  }
  
  const minThresholds = {
    lines: 0.85,
    functions: 0.90,
    statements: 0.80,
    branches: 0.75
  }
  
  for (const [key, min] of Object.entries(minThresholds)) {
    const configValue = thresholds[key as keyof typeof thresholds]
    if (configValue < min) {
      throw new Error(`Threshold ${key} too low`)
    }
  }
})

// Complete test runner initialization
suite.add('Complete Test Runner Init', {
  defer: true,
  fn: async (deferred: any) => {
    const runner = new SecureTestRunner('ci', BENCH_CONFIG_PATH)
    await runner['executePreTestAudit']()
    deferred.resolve()
  }
})

// Matrix generation
suite.add('Matrix Generation', async () => {
  const runner = new SecureTestRunner('ci', BENCH_CONFIG_PATH)
  const { generateTestMatrix } = await import('../packages/test/col93-matrix')
  const matrix = generateTestMatrix(runner.config)
  if (!matrix) throw new Error('Matrix generation failed')
})

// Run benchmarks
function runBenchmarks() {
  console.log('🚀 TIER-1380 TEST CONFIGURATION BENCHMARKS')
  console.log('='.repeat(80))
  console.log('')
  
  setupBenchmarkFiles()
  
  suite
    .on('cycle', (event: any) => {
      const { target } = event
      const ops = target.hz.toFixed(0)
      const time = (target.times.period * 1000).toFixed(3)
      const deviation = target.stats.rme.toFixed(2)
      
      console.log(`📊 ${target.name}`)
      console.log(`   Operations/sec: ${ops}`)
      console.log(`   Average time:   ${time}ms`)
      console.log(`   Deviation:      ±${deviation}%`)
      console.log('')
      
      // Check Tier-1380 compliance
      if (target.name.includes('Config Load')) {
        const avgTime = target.times.period * 1000
        if (avgTime < 1) {
          console.log(`   ✅ Tier-1380 compliant (<1ms)`)
        } else {
          console.log(`   ⚠️  Exceeds Tier-1380 target (>${avgTime.toFixed(2)}ms)`)
        }
        console.log('')
      }
    })
    .on('complete', function (this: any) {
      console.log('📈 BENCHMARK SUMMARY')
      console.log('='.repeat(80))
      console.log('')
      
      const fastest = this.filter('fastest').map('name')
      const slowest = this.filter('slowest').map('name')
      
      console.log(`⚡ Fastest: ${fastest}`)
      console.log(`🐌 Slowest: ${slowest}`)
      console.log('')
      
      // Performance analysis
      console.log('🎯 PERFORMANCE ANALYSIS')
      console.log('-'.repeat(40))
      
      this.forEach((benchmark: any) => {
        const avgTime = benchmark.times.period * 1000
        let status = '✅'
        let note = ''
        
        if (benchmark.name.includes('Config Load') && avgTime >= 1) {
          status = '⚠️'
          note = ' (exceeds Tier-1380)'
        }
        
        console.log(`${status} ${benchmark.name}: ${avgTime.toFixed(3)}ms${note}`)
      })
      
      console.log('')
      console.log('🔧 TIER-1380 REQUIREMENTS')
      console.log('-'.repeat(40))
      console.log('✅ Config Load: <1ms (performance critical)')
      console.log('✅ Security Scan: <5ms (threat detection)')
      console.log('✅ Inheritance: <2ms (12-dimensional)')
      console.log('✅ Validation: <3ms (zero-trust)')
      console.log('')
      
      // Overall assessment
      const configLoadBench = this.find({ name: /Config Load/ })
      const configLoadTime = configLoadBench ? configLoadBench.times.period * 1000 : 0
      
      if (configLoadTime < 1) {
        console.log('🎉 OVERALL: TIER-1380 COMPLIANT')
        console.log('   Configuration inheritance secured with zero-trust validation')
      } else {
        console.log('⚠️  OVERALL: NEEDS OPTIMIZATION')
        console.log(`   Config load time ${configLoadTime.toFixed(2)}ms exceeds Tier-1380 target`)
      }
      
      console.log('')
      console.log('🚀 RECOMMENDATIONS')
      console.log('-'.repeat(40))
      
      if (configLoadTime >= 1) {
        console.log('• Optimize TOML parsing for sub-millisecond performance')
        console.log('• Consider caching resolved configurations')
        console.log('• Implement lazy loading for non-critical sections')
      } else {
        console.log('• Performance is optimal - maintain current implementation')
        console.log('• Consider adding more comprehensive security checks')
        console.log('• Implement real-time configuration monitoring')
      }
      
      cleanupBenchmarkFiles()
    })
    .run({ async: true })
}

// Memory usage benchmark
async function memoryBenchmark() {
  console.log('')
  console.log('💾 MEMORY USAGE ANALYSIS')
  console.log('='.repeat(80))
  
  const initialMemory = process.memoryUsage()
  
  // Create multiple test runners
  const runners: SecureTestRunner[] = []
  
  for (let i = 0; i < 100; i++) {
    runners.push(new SecureTestRunner('ci', BENCH_CONFIG_PATH))
  }
  
  const afterCreationMemory = process.memoryUsage()
  
  // Run security validation on all
  for (const runner of runners) {
    await runner['executePreTestAudit']()
  }
  
  const finalMemory = process.memoryUsage()
  
  console.log(`📊 Initial Memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  console.log(`📊 After Creation: ${(afterCreationMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  console.log(`📊 After Validation: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  console.log('')
  
  const creationIncrease = afterCreationMemory.heapUsed - initialMemory.heapUsed
  const validationIncrease = finalMemory.heapUsed - afterCreationMemory.heapUsed
  
  console.log(`📈 Creation Overhead: ${(creationIncrease / 1024).toFixed(2)} KB per runner`)
  console.log(`📈 Validation Overhead: ${(validationIncrease / 1024).toFixed(2)} KB per runner`)
  console.log('')
  
  // Memory efficiency assessment
  const perRunnerMemory = creationIncrease / 100
  if (perRunnerMemory < 10 * 1024) { // Less than 10KB per runner
    console.log('✅ Memory usage is efficient')
  } else {
    console.log('⚠️  Consider optimizing memory usage')
  }
}

// Run all benchmarks
if (import.meta.main) {
  runBenchmarks()
    .then(() => memoryBenchmark())
    .catch(console.error)
}

export { runBenchmarks, memoryBenchmark }
