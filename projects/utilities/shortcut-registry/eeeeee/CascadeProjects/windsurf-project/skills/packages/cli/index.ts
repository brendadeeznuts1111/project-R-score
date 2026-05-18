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
    console.info('🚀 Initializing Bun-Native Skills Workspace...');
    
    if (options.withAnnotations) {
      console.info('📝 Setting up annotation system...');
      // Create annotation configuration
      await setupAnnotationSystem();
    }
    
    console.info('✅ Skills workspace ready!');
    console.info('\\n📚 Available exercises:');
    console.info('  1. File I/O Mastery');
    console.info('  2. Concurrency Patterns');
    console.info('  3. Performance Optimization');
    console.info('  4. Security Best Practices');
    console.info('  5. Testing with bun:test');
    console.info('\\n🎯 Get started: bun run skills exercise 1');
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
    
    console.info(`🎯 Exercise ${number}: ${getExerciseTitle(exerciseDir)}`);
    console.info(`📁 Challenge: ${challengePath}`);
    console.info(`💡 Solution: ${solutionPath}`);
    console.info('\\n📝 Instructions:');
    console.info('  1. Run "bun run skills scan" to find issues');
    console.info('  2. Fix all annotations in the challenge file');
    console.info('  3. Run "bun run skills benchmark" to verify improvements');
    console.info('  4. Check your solution against solution.ts');
    
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
    console.info('🔍 Scanning for anti-patterns...');
    
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
      console.info(`\\n📄 ${report.file}:`);
      
      if (report.detections.length === 0) {
        console.info('  ✅ No issues found!');
        continue;
      }
      
      for (const detection of report.detections) {
        console.info(`  ${getSeverityIcon(detection.annotation.meta.severity)} Line ${detection.line}: ${detection.annotation.domain}[${detection.annotation.type}]`);
        console.info(`    💡 ${detection.suggestion}`);
        console.info(`    🔧 Fix: ${detection.annotation.meta.fix}`);
        
        totalDetections++;
        summary.byDomain[detection.annotation.domain] = (summary.byDomain[detection.annotation.domain] || 0) + 1;
        summary.bySeverity[detection.annotation.meta.severity] = (summary.bySeverity[detection.annotation.meta.severity] || 0) + 1;
      }
    }
    
    console.info('\\n📊 Scan Summary:');
    console.info(`  Total Issues: ${totalDetections}`);
    
    if (Object.keys(summary.byDomain).length > 0) {
      console.info('\\n  By Domain:');
      Object.entries(summary.byDomain).forEach(([domain, count]) => {
        console.info(`    ${domain}: ${count}`);
      });
    }
    
    if (Object.keys(summary.bySeverity).length > 0) {
      console.info('\\n  By Severity:');
      Object.entries(summary.bySeverity).forEach(([severity, count]) => {
        console.info(`    ${getSeverityIcon(severity)} ${severity}: ${count}`);
      });
    }
    
    if (totalDetections > 0) {
      console.info('\\n🎯 Next steps:');
      console.info('  1. Fix the issues shown above');
      console.info('  2. Run "bun run skills scan" again to verify');
      console.info('  3. Use "bun run skills benchmark" to measure improvements');
    }
  });

// Benchmark performance
program
  .command('benchmark')
  .description('Benchmark and compare performance')
  .option('--exercise <number>', 'Benchmark specific exercise')
  .option('--compare', 'Compare Node.js vs Bun performance')
  .action(async (options) => {
    console.info('⚡ Running performance benchmarks...');
    
    if (options.exercise === '1') {
      await runFileIOBenchmark(options.compare);
    } else {
      console.info('📈 Available benchmarks:');
      console.info('  Exercise 1: File I/O Performance');
      console.info('\\n🎯 Run: bun run skills benchmark --exercise 1 --compare');
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
  console.info('  ✅ Annotation system configured');
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
    console.info('\\n💡 Pro Tips:');
    exerciseTips.forEach(tip => console.info(`  ${tip}`));
  }
}

async function runFileIOBenchmark(compare: boolean = false): Promise<void> {
  console.info('📁 File I/O Performance Benchmark');
  
  // Create test data
  const testData = generateTestData(1000);
  const testFile = './benchmark-test.txt';
  await Bun.write(testFile, testData);
  
  try {
    if (compare) {
      console.info('\\n🏁 Comparing Node.js vs Bun performance...');
      
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
      
      console.info(`  Node.js sync: ${nodeTime.toFixed(2)}ms`);
      console.info(`  Bun async:   ${bunTime.toFixed(2)}ms`);
      console.info(`  Speedup:      ${speedup.toFixed(1)}x ${speedup > 1 ? '🚀' : ''}`);
    } else {
      console.info('\\n⚡ Bun performance metrics...');
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await Bun.file(testFile).text();
      }
      
      const totalTime = performance.now() - start;
      const avgTime = totalTime / iterations;
      
      console.info(`  Iterations: ${iterations}`);
      console.info(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.info(`  Average: ${avgTime.toFixed(3)}ms per operation`);
      console.info(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);
    }
  } finally {
    // Cleanup
    await Bun.file(testFile).delete();
  }
}

async function showProgressDashboard(open: boolean = false): Promise<void> {
  console.info('📊 Learning Progress Dashboard');
  console.info('\\n🎯 Overall Progress:');
  console.info('  Exercises Completed: 0/5');
  console.info('  Annotations Fixed: 0');
  console.info('  Performance Gains: 0x');
  console.info('  Badges Earned: None');
  
  console.info('\\n📚 Exercise Status:');
  console.info('  1. File I/O Mastery: ❌ Not started');
  console.info('  2. Concurrency Patterns: ❌ Not started');
  console.info('  3. Performance Optimization: ❌ Not started');
  console.info('  4. Security Best Practices: ❌ Not started');
  console.info('  5. Testing with bun:test: ❌ Not started');
  
  console.info('\\n🏆 Available Badges:');
  console.info('  ⚡ speed-demon: Fix 10 [PERF] annotations');
  console.info('  🛡️ error-slayer: Fix 10 [ERROR] annotations');
  console.info('  🔒 security-guard: Fix 5 [SECURITY] annotations');
  console.info('  🥇 bun-master: Complete all modules');
  
  if (open) {
    console.info('\\n🌐 Opening dashboard in browser...');
    // In a real implementation, this would start a web server
    console.info('  (Web dashboard coming soon!)');
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
