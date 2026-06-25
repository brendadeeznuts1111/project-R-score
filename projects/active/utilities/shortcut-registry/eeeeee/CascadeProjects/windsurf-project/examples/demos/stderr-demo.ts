const proc = Bun.spawn(['sh', '-c', 'echo "ERROR: AI Model accuracy at 94.51% below threshold" >&2; echo "WARN: High memory usage detected" >&2; echo "CRITICAL: Security breach detected" >&2'], {
  stderr: 'pipe'
});

const errors = await proc.stderr.text();
console.info('🚨 AI System Error Classification:');
errors.trim().split('\n').forEach(line => {
  if (line.includes('CRITICAL')) console.info('   🚨', line);
  else if (line.includes('ERROR')) console.info('   ❌', line);
  else if (line.includes('WARN')) console.info('   ⚠️', line);
});

await proc.exited;
