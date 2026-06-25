#!/usr/bin/env bun
// Minimal CLI test to isolate issues

console.info('🔧 Testing minimal CLI...');

// Test basic flag parsing
const args = process.argv.slice(2);
console.info('Args:', args);

const flags: any = {};

// Parse flags
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const nextArg = args[i + 1];
    if (nextArg && !nextArg.startsWith('--')) {
      flags[arg] = nextArg;
      i++; // Skip next arg as it's a value
    } else {
      flags[arg] = true;
    }
  }
}

console.info('Parsed flags:', flags);

// Test specific flags
if (flags['--metrics']) {
  console.info('✅ --metrics flag detected');
}

if (flags['--hex-colors']) {
  console.info('✅ --hex-colors flag detected');
}

if (flags['--domains']) {
  console.info(`✅ --domains flag: ${flags['--domains']}`);
}

console.info('🎉 Minimal CLI test completed successfully!');
