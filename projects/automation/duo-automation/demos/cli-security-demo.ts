#!/usr/bin/env bun
// examples/cli-security-demo.ts

async function demonstrateCliSecurity() {
  console.log('🔐 DuoPlus CLI Security Demo');
  console.log('=============================');

  const testApiKey = 'duoplus_demo_' + Math.random().toString(36).substring(2, 15);
  const teamId = 'demo-team-' + Math.random().toString(36).substring(2, 8);

  try {
    // Store API key securely
    console.log('\n1. Storing API key securely...');
    const storeResult = await Bun.spawn(['bun', 'run', 'packages/@tools/cli/duoplus-cli.ts', 'store-api-key', `--api-key=${testApiKey}`, `--team-id=${teamId}`], {
      cwd: process.cwd(),
      stdout: 'pipe'
    }).then(proc => proc.text());
    console.log(storeResult);

    // Retrieve API key (without showing)
    console.log('\n2. Retrieving API key (without showing)...');
    const getResult = await Bun.spawn(['bun', 'run', 'packages/@tools/cli/duoplus-cli.ts', 'get-api-key', `--team-id=${teamId}`], {
      cwd: process.cwd(),
      stdout: 'pipe'
    }).then(proc => proc.text());
    console.log(getResult);

    // Show API key
    console.log('\n3. Showing API key...');
    const showResult = await Bun.spawn(['bun', 'run', 'packages/@tools/cli/duoplus-cli.ts', 'get-api-key', `--team-id=${teamId}`, '--show'], {
      cwd: process.cwd(),
      stdout: 'pipe'
    }).then(proc => proc.text());
    console.log(showResult);

    // Check system status (includes security info)
    console.log('\n4. Checking system status (includes security info)...');
    const statusResult = await Bun.spawn(['bun', 'run', 'packages/@tools/cli/duoplus-cli.ts', 'status'], {
      cwd: process.cwd(),
      stdout: 'pipe'
    }).then(proc => proc.text());
    console.log(statusResult);

    // Store proxy credentials
    console.log('\n5. Storing proxy credentials...');
    const proxyResult = await Bun.spawn(['bun', 'run', 'packages/@tools/cli/duoplus-cli.ts', 'store-proxy', '--username=demo_user', '--password=demo_pass', '--provider=demo-proxy'], {
      cwd: process.cwd(),
      stdout: 'pipe'
    }).then(proc => proc.text());
    console.log(proxyResult);

    // Clean up - Delete API key
    console.log('\n6. Cleaning up - Deleting API key...');
    const deleteResult = await Bun.spawn(['bun', 'run', 'packages/@tools/cli/duoplus-cli.ts', 'delete-api-key', `--team-id=${teamId}`, '--confirm'], {
      cwd: process.cwd(),
      stdout: 'pipe'
    }).then(proc => proc.text());
    console.log(deleteResult);

    console.log('\n✅ Demo completed successfully!');

  } catch (error: any) {
    console.error('❌ Demo failed:', error);
    console.error('Stdout:', error.stdout);
    console.error('Stderr:', error.stderr);
  }
}

// Run demo if called directly
if (import.meta.main) {
  demonstrateCliSecurity();
}
