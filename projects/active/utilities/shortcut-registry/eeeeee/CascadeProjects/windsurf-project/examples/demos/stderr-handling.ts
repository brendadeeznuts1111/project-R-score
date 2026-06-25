#!/usr/bin/env bun

// stderr-handling.ts - Advanced Stderr Management
// Enterprise-grade stderr handling for revolutionary AI system

console.info("🚀 Advanced Stderr Handling - Revolutionary AI System");

// Basic stderr capture
async function basicStderrCapture() {
  console.info("\n🚨 Basic Stderr Capture:");
  
  const proc = Bun.spawn(["sh", "-c", 'echo "🔒 Security Warning: Suspicious activity detected" >&2'], {
    stderr: "pipe"
  });
  
  const errors = await proc.stderr.text();
  if (errors) {
    console.info("   Captured stderr:", errors.trim());
  } else {
    console.info("   No stderr output");
  }
  
  await proc.exited;
}

// Combined stdout and stderr handling
async function combinedOutputHandling() {
  console.info("\n📊 Combined Output Handling:");
  
  const proc = Bun.spawn(["sh", "-c", `
    echo "🧠 AI Model: 94.51% accuracy"
    echo "🔍 Security Alert: Pattern anomaly detected" >&2
    echo "⚡ Performance: Optimal"
    echo "🚨 Critical: High memory usage" >&2
    echo "📈 Monitoring: Real-time active"
  `], {
    stderr: "pipe"
  });
  
  const [stdout, stderr] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text()
  ]);
  
  console.info("   Stdout output:");
  stdout.trim().split('\n').forEach(line => {
    if (line.trim()) console.info(`     ${line}`);
  });
  
  if (stderr.trim()) {
    console.info("   Stderr output:");
    stderr.trim().split('\n').forEach(line => {
      if (line.trim()) console.info(`     🚨 ${line}`);
    });
  }
  
  await proc.exited;
}

// Error classification and handling
async function errorClassification() {
  console.info("\n📋 Error Classification:");
  
  const proc = Bun.spawn(["sh", "-c", `
    echo "ERROR: Model accuracy dropped below threshold" >&2
    echo "WARN: High CPU usage detected" >&2
    echo "INFO: System backup completed" >&2
    echo "CRITICAL: Security breach detected" >&2
  `], {
    stderr: "pipe"
  });
  
  const errors = await proc.stderr.text();
  const errorLines = errors.trim().split('\n');
  
  const classified: {
    critical: string[];
    error: string[];
    warning: string[];
    info: string[];
  } = {
    critical: [],
    error: [],
    warning: [],
    info: []
  };
  
  errorLines.forEach(line => {
    if (line.includes('CRITICAL')) classified.critical.push(line);
    else if (line.includes('ERROR')) classified.error.push(line);
    else if (line.includes('WARN')) classified.warning.push(line);
    else if (line.includes('INFO')) classified.info.push(line);
  });
  
  Object.entries(classified).forEach(([level, messages]) => {
    if (messages.length > 0) {
      console.info(`   ${level.toUpperCase()}:`);
      messages.forEach(msg => console.info(`     ${msg}`));
    }
  });
  
  await proc.exited;
}

// Real-time stderr streaming
async function realtimeStderrStreaming() {
  console.info("\n⚡ Real-time Stderr Streaming:");
  
  const proc = Bun.spawn(["sh", "-c", `
    for i in {1..3}; do
      echo "Warning $i: Monitoring threshold exceeded" >&2
      sleep 0.1
    done
  `], {
    stderr: "pipe"
  });
  
  console.info("   Streaming stderr in real-time:");
  
  const reader = proc.stderr.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    process.stdout.write("   📡 " + text);
  }
  
  await proc.exited;
  console.info("   ✅ Streaming complete");
}

// AI system error simulation
async function aiSystemErrorSimulation() {
  console.info("\n🤖 AI System Error Simulation:");
  
  const proc = Bun.spawn(["sh", "-c", `
    echo "🧠 Enhanced AI Model Status: OPERATIONAL"
    echo "ERROR: Fraud detection accuracy at 94.51% - below optimal 95%" >&2
    echo "🔍 Real-time Processing: Active"
    echo "WARN: Network latency increased to 25ms" >&2
    echo "📊 Analytics: Real-time monitoring enabled"
    echo "CRITICAL: Memory usage at 87% capacity" >&2
    echo "✅ System Status: Degraded but functional"
  `], {
    stderr: "pipe"
  });
  
  const [stdout, stderr] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text()
  ]);
  
  console.info("   System Output:");
  stdout.trim().split('\n').forEach(line => {
    if (line.trim()) console.info(`     ${line}`);
  });
  
  if (stderr.trim()) {
    console.info("   System Errors & Warnings:");
    stderr.trim().split('\n').forEach(line => {
      if (line.trim()) {
        if (line.includes('CRITICAL')) {
          console.info(`     🚨 ${line}`);
        } else if (line.includes('ERROR')) {
          console.info(`     ❌ ${line}`);
        } else if (line.includes('WARN')) {
          console.info(`     ⚠️ ${line}`);
        }
      }
    });
  }
  
  await proc.exited;
}

// Error logging and monitoring
async function errorLoggingAndMonitoring() {
  console.info("\n📊 Error Logging and Monitoring:");
  
  const proc = Bun.spawn(["sh", "-c", `
    echo "$(date): [ERROR] AI Model timeout detected" >&2
    echo "$(date): [WARN] High memory usage warning" >&2
    echo "$(date): [INFO] System health check completed" >&2
  `], {
    stderr: "pipe"
  });
  
  const errors = await proc.stderr.text();
  const errorLines = errors.trim().split('\n');
  
  console.info("   Error Log:");
  errorLines.forEach((line, index) => {
    console.info(`     ${index + 1}. ${line.trim()}`);
  });
  
  // Analyze error patterns
  const errorTypes = {
    ERROR: errorLines.filter(line => line.includes('[ERROR]')).length,
    WARN: errorLines.filter(line => line.includes('[WARN]')).length,
    INFO: errorLines.filter(line => line.includes('[INFO]')).length
  };
  
  console.info("   Error Summary:");
  Object.entries(errorTypes).forEach(([type, count]) => {
    if (count > 0) {
      console.info(`     ${type}: ${count} occurrences`);
    }
  });
  
  await proc.exited;
}

// Performance impact of stderr handling
async function stderrPerformanceImpact() {
  console.info("\n⚡ Stderr Performance Impact:");
  
  // Test without stderr piping
  const start1 = performance.now();
  const proc1 = Bun.spawn(["sh", "-c", 'echo "test" >&2']);
  await proc1.exited;
  const time1 = performance.now() - start1;
  
  // Test with stderr piping
  const start2 = performance.now();
  const proc2 = Bun.spawn(["sh", "-c", 'echo "test" >&2'], {
    stderr: "pipe"
  });
  await proc2.stderr.text();
  await proc2.exited;
  const time2 = performance.now() - start2;
  
  console.info(`   Without stderr piping: ${time1.toFixed(2)}ms`);
  console.info(`   With stderr piping: ${time2.toFixed(2)}ms`);
  console.info(`   Performance overhead: ${(time2 - time1).toFixed(2)}ms`);
}

// Security system error handling
async function securitySystemErrorHandling() {
  console.info("\n🔒 Security System Error Handling:");
  
  const proc = Bun.spawn(["sh", "-c", `
    echo "🛡️ Security Suite Status: ACTIVE"
    echo "ALERT: Biometric authentication failure rate: 2.3%" >&2
    echo "🔍 Zero-Trust Architecture: ENABLED"
    echo "WARNING: Unusual access pattern detected" >&2
    echo "🚨 Intrusion Detection: MONITORING"
    echo "CRITICAL: Potential security breach identified" >&2
    echo "✅ Security Status: HEIGHTENED ALERT"
  `], {
    stderr: "pipe"
  });
  
  const [stdout, stderr] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text()
  ]);
  
  console.info("   Security Status:");
  stdout.trim().split('\n').forEach(line => {
    if (line.trim()) console.info(`     ${line}`);
  });
  
  if (stderr.trim()) {
    console.info("   Security Alerts:");
    stderr.trim().split('\n').forEach(line => {
      if (line.trim()) {
        if (line.includes('CRITICAL')) {
          console.info(`     🚨 ${line}`);
        } else if (line.includes('ALERT')) {
          console.info(`     🚨 ${line}`);
        } else if (line.includes('WARNING')) {
          console.info(`     ⚠️ ${line}`);
        }
      }
    });
  }
  
  await proc.exited;
}

// Main demonstration
async function demonstrateStderrHandling() {
  console.info("🚀 Revolutionary AI System - Advanced Stderr Handling");
  console.info("=" .repeat(60));
  
  try {
    await basicStderrCapture();
    await combinedOutputHandling();
    await errorClassification();
    await realtimeStderrStreaming();
    await aiSystemErrorSimulation();
    await errorLoggingAndMonitoring();
    await stderrPerformanceImpact();
    await securitySystemErrorHandling();
    
    console.info("\n🎉 Stderr Handling Demo Complete!");
    console.info("💚 All stderr operations executed successfully!");
    
  } catch (error) {
    console.error("❌ Error in stderr demonstration:", error instanceof Error ? error.message : String(error));
  }
}

// Run demonstration
if (import.meta.main) {
  demonstrateStderrHandling().catch(console.error);
}

export { 
  basicStderrCapture,
  combinedOutputHandling,
  errorClassification,
  realtimeStderrStreaming,
  aiSystemErrorSimulation,
  errorLoggingAndMonitoring,
  stderrPerformanceImpact,
  securitySystemErrorHandling
};
