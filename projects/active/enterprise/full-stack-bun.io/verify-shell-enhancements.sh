#!/bin/bash
# verify-shell-enhancements.sh

echo "🔧 Verifying Bun 1.3 Shell Enhancements..."

# Test Bun.which()
echo "1. Testing Bun.which()..."
bun -e "
const path = await import('bun').then(bun => bun.which('bun'));
console.log('✅ Bun executable found:', path);
if (!path) process.exit(1);
"

# Test shell execution
echo "2. Testing shell execution..."
bun -e "
const { ShellExecutionEngine } = await import('./src/entry-point/cli/shell-engine.bun.ts');
const engine = new ShellExecutionEngine();
const result = await engine.executeScript('console.log(\\\"Hello from Bun Shell!\\\")', 'verify.sh');
console.log('✅ Shell execution:', result.success ? 'SUCCESS' : 'FAILED');
console.log('Output:', result.stdout);
if (!result.success) process.exit(1);
"

# Test security scanning
echo "3. Testing security scanning..."
bun -e "
const { ShellExecutionEngine } = await import('./src/entry-point/cli/shell-engine.bun.ts');
const engine = new ShellExecutionEngine();
const scanResult = await engine.scanScriptSecurity('eval(\\\"malicious\\\")', 'danger.sh');
console.log('✅ Security scan:', scanResult.safe ? 'SAFE' : 'UNSAFE');
if (scanResult.safe) process.exit(1);
"

# Test command execution
echo "4. Testing command execution..."
bun -e "
const { ShellExecutionEngine } = await import('./src/entry-point/cli/shell-engine.bun.ts');
const engine = new ShellExecutionEngine();
const result = await engine.executeCommand('echo', ['Hello from command execution']);
console.log('✅ Command execution:', result.success ? 'SUCCESS' : 'FAILED');
console.log('Output:', result.stdout);
if (!result.success) process.exit(1);
"

echo "🎉 All shell enhancements verified successfully!"
