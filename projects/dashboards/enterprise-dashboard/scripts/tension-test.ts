#!/usr/bin/env bun
// tension-test.ts - Test the tension/guardian system with various scenarios

// Simplified version for testing - direct processing without workers
interface ThreatEvent {
  id: string;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  source: string;
  timestamp?: number;
  frequency?: number;
  metadata?: Record<string, any>;
}

interface ProcessingResult {
  processed: number;
  matches: number;
  duration: number;
  results: GuardianAction[];
}

interface GuardianAction {
  eventId: string;
  guardian: string;
  score: number;
  actions: string[];
  bufferTime: number;
  timestamp: number;
}
import fs from 'fs';
import path from 'path';

interface TestConfig {
  guardian: 'parent_highrisk' | 'parent_medium' | 'parent_low';
  score: number;
  eventCount?: number;
  batchSize?: number;
}

function generateTestEvents(count: number, config: TestConfig): ThreatEvent[] {
  const events: ThreatEvent[] = [];

  for (let i = 0; i < count; i++) {
    // Generate events that will trigger the desired guardian level
    const event: ThreatEvent = {
      id: `test-event-${i}`,
      level: config.score > 0.9 ? 'CRITICAL' : config.score > 0.8 ? 'HIGH' : config.score > 0.6 ? 'MEDIUM' : 'LOW',
      message: generateThreatMessage(config),
      source: config.guardian.includes('parent') ? 'access_control' : 'payment_system',
      timestamp: Date.now() - Math.random() * 3600000, // Within last hour
      frequency: Math.floor(Math.random() * 100) + 1,
      metadata: {
        testScenario: config.guardian,
        targetScore: config.score
      }
    };

    events.push(event);
  }

  return events;
}

function generateThreatMessage(config: TestConfig): string {
  const templates = {
    parent_highrisk: [
      'Unauthorized access attempt detected - breach imminent',
      'Suspension risk escalated - critical security violation',
      'Multiple failed authentications - account compromise suspected',
      'Data exfiltration detected - immediate action required'
    ],
    parent_medium: [
      'Elevated access patterns detected',
      'Unusual login activity from multiple locations',
      'Payment processing delays detected',
      'Resource usage spike - potential abuse'
    ],
    parent_low: [
      'Minor access anomalies detected',
      'Slight increase in failed login attempts',
      'Routine security monitoring alert',
      'Performance degradation noticed'
    ]
  };

  const messages = templates[config.guardian] || templates.parent_low;
  return messages[Math.floor(Math.random() * messages.length)];
}

// Simple pattern processor for testing
class SimplePatternProcessor {
  constructor() {
    this.patterns = new Map();
    this.loadPatterns();
  }

  loadPatterns() {
    // Guardian risk patterns
    this.patterns.set('parent_highrisk', {
      threshold: 0.9,
      actions: ['NUKE_PROJECTS', 'ESCALATE_ALERTS', 'PAUSE_PAYMENTS'],
      bufferTime: 0
    });

    this.patterns.set('parent_medium', {
      threshold: 0.8,
      actions: ['BUFFER_EVENTS', 'NOTIFY_ADMINS'],
      bufferTime: 30000 // 30 seconds
    });

    this.patterns.set('parent_low', {
      threshold: 0.6,
      actions: ['LOG_EVENTS', 'INCREASE_MONITORING'],
      bufferTime: 300000 // 5 minutes
    });
  }

  processEvents(events) {
    const results = [];
    const startTime = Date.now();

    for (const event of events) {
      const result = this.analyzeEvent(event);
      if (result) {
        results.push(result);
      }
    }

    return {
      processed: events.length,
      matches: results.length,
      duration: Date.now() - startTime,
      results
    };
  }

  analyzeEvent(event) {
    // Tension scoring based on event patterns
    const score = this.calculateTensionScore(event);

    // Find matching guardian pattern
    for (const [guardianType, config] of this.patterns) {
      if (score >= config.threshold) {
        return {
          eventId: event.id,
          guardian: guardianType,
          score,
          actions: config.actions,
          bufferTime: config.bufferTime,
          timestamp: Date.now()
        };
      }
    }

    return null;
  }

  calculateTensionScore(event) {
    let score = 0;

    // Base scoring factors
    if (event.level === 'CRITICAL') score += 0.4;
    else if (event.level === 'HIGH') score += 0.3;
    else if (event.level === 'MEDIUM') score += 0.2;
    else if (event.level === 'LOW') score += 0.1;

    // Pattern-based scoring
    if (event.message?.includes('unauthorized')) score += 0.3;
    if (event.message?.includes('suspension')) score += 0.4;
    if (event.message?.includes('breach')) score += 0.5;
    if (event.source === 'payment_system') score += 0.3;
    if (event.source === 'access_control') score += 0.4;

    // Frequency factor (if available)
    if (event.frequency > 10) score += 0.2;
    if (event.frequency > 50) score += 0.3;

    // Time-based escalation
    const now = Date.now();
    const eventTime = event.timestamp || now;
    const hoursOld = (now - eventTime) / (1000 * 60 * 60);

    if (hoursOld < 1) score += 0.1; // Recent events more concerning
    if (hoursOld > 24) score -= 0.1; // Older events less urgent

    return Math.min(1.0, Math.max(0.0, score));
  }
}

async function runTensionTest(config: TestConfig) {
  console.log(`\n🧪 Running Tension Test:`);
  console.log(`   Guardian: ${config.guardian}`);
  console.log(`   Target Score: ${config.score}`);
  console.log(`   Event Count: ${config.eventCount || 100}`);

  const processor = new SimplePatternProcessor();
  const events = generateTestEvents(config.eventCount || 100, config);
  const batchSize = config.batchSize || 50;

  console.log(`\n📊 Processing ${events.length} events in batches of ${batchSize}...`);

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalMatches = 0;
  const allResults: any[] = [];

  // Process in batches
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    try {
      const result = await processor.processEvents(batch);
      totalProcessed += result.processed;
      totalMatches += result.matches;
      allResults.push(...result.results);

      console.log(`   Batch ${Math.floor(i/batchSize) + 1}: ${result.processed} processed, ${result.matches} matches (${result.duration}ms)`);
    } catch (error) {
      console.error(`   Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
    }
  }

  const totalDuration = Date.now() - startTime;
  const throughput = Math.round((totalProcessed / totalDuration) * 1000);

  console.log(`\n📈 Results:`);
  console.log(`   Total Events: ${totalProcessed}`);
  console.log(`   Total Matches: ${totalMatches}`);
  console.log(`   Throughput: ${throughput} events/sec`);
  console.log(`   Duration: ${totalDuration}ms`);

  // Log tension revoke events
  if (allResults.length > 0) {
    console.log(`\n🚨 TENSION REVOKE EVENTS:`);
    allResults.forEach((result, idx) => {
      const timestamp = new Date(result.timestamp).toISOString();
      console.log(`   [${timestamp}] ${result.guardian.toUpperCase()} - Score: ${(result.score * 100).toFixed(1)}%`);
      console.log(`      Actions: ${result.actions.join(', ')}`);
      console.log(`      Buffer: ${result.bufferTime}ms`);
      console.log(`      Event ID: ${result.eventId}`);
      console.log('');
    });

    // Save to log file
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const logFile = path.join(logDir, 'nebula.log');
    const logEntries = allResults.map(result => {
      const timestamp = new Date(result.timestamp).toISOString();
      return `[${timestamp}] TENSION REVOKE - Guardian: ${result.guardian}, Score: ${(result.score * 100).toFixed(1)}%, Actions: ${result.actions.join(',')}, Event: ${result.eventId}`;
    }).join('\n');

    fs.appendFileSync(logFile, '\n' + logEntries + '\n');
    console.log(`📝 Events logged to ${logFile}`);
  }

  return {
    totalProcessed,
    totalMatches,
    throughput,
    duration: totalDuration,
    results: allResults
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  bun run tension-test.ts --guardian=parent_highrisk --score=0.95');
    console.log('  bun run tension-test.ts --guardian=parent_medium --score=0.87');
    console.log('');
    console.log('Options:');
    console.log('  --guardian=<type>    Guardian type (parent_highrisk, parent_medium, parent_low)');
    console.log('  --score=<number>     Target tension score (0.0-1.0)');
    console.log('  --count=<number>     Number of test events (default: 100)');
    console.log('  --batch=<number>     Batch size for processing (default: 50)');
    return;
  }

  const config: TestConfig = {
    guardian: 'parent_medium',
    score: 0.8
  };

  // Parse arguments
  args.forEach(arg => {
    if (arg.startsWith('--guardian=')) {
      config.guardian = arg.split('=')[1] as any;
    } else if (arg.startsWith('--score=')) {
      config.score = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--count=')) {
      config.eventCount = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--batch=')) {
      config.batchSize = parseInt(arg.split('=')[1]);
    }
  });

  try {
    await runTensionTest(config);
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { runTensionTest, generateTestEvents };
export type { TestConfig };

// Run CLI if called directly
if (import.meta.main) {
  main();
}