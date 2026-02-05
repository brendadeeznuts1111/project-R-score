#!/usr/bin/env bun
/**
 * Skills CLI - Interactive Bun-Native Learning System
 * 
 * Commands:
 * - bun run skills init
 * - bun run skills exercise <number>
 * - bun run skills scan [--exercise <number>]
 * - bun run skills benchmark [--exercise <number>]
 * - bun run skills dashboard [--open]
 */

import { Command } from 'commander';
import { patternDetector } from '../../scanner/detect.js';

const program = new Command();

program
  .name('skills')
  .description('Bun-Native Mastery Curriculum CLI')
  .version('1.0.0');

// Initialize skills workspace
program
  .command('init')
  .description('Initialize skills workspace with annotations')
  .option('--with-annotations', 'Include annotation system setup')
  .action(async (options) => {
    console.log('🚀 Initializing Bun-Native Skills Workspace...');
    
    if (options.withAnnotations) {
      console.log('📝 Setting up annotation system...');
      // Create annotation configuration
      await setupAnnotationSystem();
    }
    
    console.log('✅ Skills workspace ready!');
    console.log('\\n📚 Available exercises:');
    console.log('  1. File I/O Mastery');
    console.log('  2. Concurrency Patterns');
    console.log('  3. Performance Optimization');
    console.log('  4. Security Best Practices');
    console.log('  5. Testing with bun:test');
    console.log('\\n🎯 Get started: bun run skills exercise 1');
  });

// Start interactive exercise
program
  .command('exercise <number>')
  .description('Start an interactive exercise')
  .action(async (number) => {
    const exerciseMap = {
      '1': '01-file-io',
      '2': '02-concurrency', 
      '3': '03-performance',
      '4': '04-security',
      '5': '05-testing'
    };
    
    const exerciseDir = exerciseMap[number as keyof typeof exerciseMap];
    if (!exerciseDir) {
      console.error('❌ Invalid exercise number. Choose 1-5.');
      process.exit(1);
    }
    
    const challengePath = `./packages/exercises/${exerciseDir}/challenge.ts`;
    const solutionPath = `./packages/exercises/${exerciseDir}/solution.ts`;
    
    if (!await Bun.file(challengePath).exists()) {
      console.error(`❌ Exercise ${number} not found.`);
      process.exit(1);
    }
    
    console.log(`🎯 Exercise ${number}: ${getExerciseTitle(exerciseDir)}`);
    console.log(`📁 Challenge: ${challengePath}`);
    console.log(`💡 Solution: ${solutionPath}`);
    console.log('\\n📝 Instructions:');
    console.log('  1. Run "bun run skills scan" to find issues');
    console.log('  2. Fix all annotations in the challenge file');
    console.log('  3. Run "bun run skills benchmark" to verify improvements');
    console.log('  4. Check your solution against solution.ts');
    
    // Show exercise-specific tips
    await showExerciseTips(exerciseDir);
  });

// Scan for anti-patterns
program
  .command('scan')
  .description('Scan code for anti-patterns and generate annotations')
  .option('--exercise <number>', 'Scan specific exercise')
  .option('--file <path>', 'Scan specific file')
  .action(async (options) => {
    console.log('🔍 Scanning for anti-patterns...');
    
    let filesToScan: string[] = [];
    
    if (options.file) {
      filesToScan = [options.file];
    } else if (options.exercise) {
      const exerciseMap = {
        '1': '01-file-io',
        '2': '02-concurrency',
        '3': '03-performance', 
        '4': '04-security',
        '5': '05-testing'
      };
      
      const exerciseDir = exerciseMap[options.exercise as keyof typeof exerciseMap];
      if (!exerciseDir) {
        console.error('❌ Invalid exercise number.');
        process.exit(1);
      }
      
      filesToScan = [`./packages/exercises/${exerciseDir}/challenge.ts`];
    } else {
      // Scan all challenge files
      filesToScan = [
        './packages/exercises/01-file-io/challenge.ts',
        './packages/exercises/02-concurrency/challenge.ts',
        './packages/exercises/03-performance/challenge.ts',
        './packages/exercises/04-security/challenge.ts',
        './packages/exercises/05-testing/challenge.ts'
      ];
    }
    
    const reports = await patternDetector.scanFiles(filesToScan);
    
    let totalDetections = 0;
    const summary = {
      byDomain: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };
    
    for (const report of reports) {
      console.log(`\\n📄 ${report.file}:`);
      
      if (report.detections.length === 0) {
        console.log('  ✅ No issues found!');
        continue;
      }
      
      for (const detection of report.detections) {
        console.log(`  ${getSeverityIcon(detection.annotation.meta.severity)} Line ${detection.line}: ${detection.annotation.domain}[${detection.annotation.type}]`);
        console.log(`    💡 ${detection.suggestion}`);
        console.log(`    🔧 Fix: ${detection.annotation.meta.fix}`);
        
        totalDetections++;
        summary.byDomain[detection.annotation.domain] = (summary.byDomain[detection.annotation.domain] || 0) + 1;
        summary.bySeverity[detection.annotation.meta.severity] = (summary.bySeverity[detection.annotation.meta.severity] || 0) + 1;
      }
    }
    
    console.log('\\n📊 Scan Summary:');
    console.log(`  Total Issues: ${totalDetections}`);
    
    if (Object.keys(summary.byDomain).length > 0) {
      console.log('\\n  By Domain:');
      Object.entries(summary.byDomain).forEach(([domain, count]) => {
        console.log(`    ${domain}: ${count}`);
      });
    }
    
    if (Object.keys(summary.bySeverity).length > 0) {
      console.log('\\n  By Severity:');
      Object.entries(summary.bySeverity).forEach(([severity, count]) => {
        console.log(`    ${getSeverityIcon(severity)} ${severity}: ${count}`);
      });
    }
    
    if (totalDetections > 0) {
      console.log('\\n🎯 Next steps:');
      console.log('  1. Fix the issues shown above');
      console.log('  2. Run "bun run skills scan" again to verify');
      console.log('  3. Use "bun run skills benchmark" to measure improvements');
    }
  });

// Benchmark performance
program
  .command('benchmark')
  .description('Benchmark and compare performance')
  .option('--exercise <number>', 'Benchmark specific exercise')
  .option('--compare', 'Compare Node.js vs Bun performance')
  .action(async (options) => {
    console.log('⚡ Running performance benchmarks...');
    
    if (options.exercise === '1') {
      await runFileIOBenchmark(options.compare);
    } else {
      console.log('📈 Available benchmarks:');
      console.log('  Exercise 1: File I/O Performance');
      console.log('\\n🎯 Run: bun run skills benchmark --exercise 1 --compare');
    }
  });

// Show progress dashboard
program
  .command('dashboard')
  .description('View learning progress dashboard')
  .option('--open', 'Open in browser')
  .action(async (options) => {
    await showProgressDashboard(options.open);
  });

// Helper functions
async function setupAnnotationSystem(): Promise<void> {
  // Create annotation configuration
  const config = {
    enabled: true,
    domains: ['PERF', 'ERROR', 'SECURITY', 'BUN_NATIVE'],
    autoGenerate: true,
    outputFormat: 'sarif'
  };
  
  await Bun.write('./skills.config.json', JSON.stringify(config, null, 2));
  console.log('  ✅ Annotation system configured');
}

function getExerciseTitle(exerciseDir: string): string {
  const titles = {
    '01-file-io': 'File I/O Mastery',
    '02-concurrency': 'Concurrency Patterns',
    '03-performance': 'Performance Optimization',
    '04-security': 'Security Best Practices',
    '05-testing': 'Testing with bun:test'
  };
  return titles[exerciseDir as keyof typeof titles] || 'Unknown Exercise';
}

function getSeverityIcon(severity: string): string {
  const icons = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: '💡'
  };
  return icons[severity as keyof typeof icons] || '❓';
}

async function showExerciseTips(exerciseDir: string): Promise<void> {
  const tips = {
    '01-file-io': [
      '🔥 Use Bun.file() instead of fs.readFileSync()',
      '⚡ Replace synchronous operations with async/await',
      '💡 Use Bun.glob() for pattern matching instead of readdirSync()',
      '🌊 Stream large files with Bun.file().stream()',
      '👀 Use Bun.watch() instead of setInterval() for file watching'
    ],
    '02-concurrency': [
      '⚠️ Always handle promise rejections',
      '🛡️ Use try/catch blocks for error handling',
      '⏰ Set timeouts with AbortSignal.timeout()',
      '🔄 Use Promise.all() for concurrent operations',
      '🧹 Clean up resources with proper finally blocks'
    ]
  };
  
  const exerciseTips = tips[exerciseDir as keyof typeof tips];
  if (exerciseTips) {
    console.log('\\n💡 Pro Tips:');
    exerciseTips.forEach(tip => console.log(`  ${tip}`));
  }
}

async function runFileIOBenchmark(compare: boolean = false): Promise<void> {
  console.log('📁 File I/O Performance Benchmark');
  
  // Create test data
  const testData = generateTestData(1000);
  const testFile = './benchmark-test.txt';
  await Bun.write(testFile, testData);
  
  try {
    if (compare) {
      console.log('\\n🏁 Comparing Node.js vs Bun performance...');
      
      // Node.js sync benchmark
      const nodeStart = performance.now();
      for (let i = 0; i < 100; i++) {
        require('fs').readFileSync(testFile, 'utf8');
      }
      const nodeTime = performance.now() - nodeStart;
      
      // Bun async benchmark
      const bunStart = performance.now();
      for (let i = 0; i < 100; i++) {
        await Bun.file(testFile).text();
      }
      const bunTime = performance.now() - bunStart;
      
      const speedup = nodeTime / bunTime;
      
      console.log(`  Node.js sync: ${nodeTime.toFixed(2)}ms`);
      console.log(`  Bun async:   ${bunTime.toFixed(2)}ms`);
      console.log(`  Speedup:      ${speedup.toFixed(1)}x ${speedup > 1 ? '🚀' : ''}`);
    } else {
      console.log('\\n⚡ Bun performance metrics...');
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await Bun.file(testFile).text();
      }
      
      const totalTime = performance.now() - start;
      const avgTime = totalTime / iterations;
      
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average: ${avgTime.toFixed(3)}ms per operation`);
      console.log(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);
    }
  } finally {
    // Cleanup
    await Bun.file(testFile).delete();
  }
}

async function showProgressDashboard(open: boolean = false): Promise<void> {
  console.log('📊 Learning Progress Dashboard');
  console.log('\\n🎯 Overall Progress:');
  console.log('  Exercises Completed: 0/5');
  console.log('  Annotations Fixed: 0');
  console.log('  Performance Gains: 0x');
  console.log('  Badges Earned: None');
  
  console.log('\\n📚 Exercise Status:');
  console.log('  1. File I/O Mastery: ❌ Not started');
  console.log('  2. Concurrency Patterns: ❌ Not started');
  console.log('  3. Performance Optimization: ❌ Not started');
  console.log('  4. Security Best Practices: ❌ Not started');
  console.log('  5. Testing with bun:test: ❌ Not started');
  
  console.log('\\n🏆 Available Badges:');
  console.log('  ⚡ speed-demon: Fix 10 [PERF] annotations');
  console.log('  🛡️ error-slayer: Fix 10 [ERROR] annotations');
  console.log('  🔒 security-guard: Fix 5 [SECURITY] annotations');
  console.log('  🥇 bun-master: Complete all modules');
  
  if (open) {
    console.log('\\n🌐 Opening dashboard in browser...');
    // In a real implementation, this would start a web server
    console.log('  (Web dashboard coming soon!)');
  }
}

function generateTestData(size: number): string {
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(`Line ${i}: ${Math.random().toString(36).repeat(50)}`);
  }
  return lines.join('\\n');
}

// Run the CLI
program.parse();
