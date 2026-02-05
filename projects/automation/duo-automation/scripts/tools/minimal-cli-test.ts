#!/usr/bin/env bun
// Minimal CLI test to isolate issues

console.log('🔧 Testing minimal CLI...');

// Test basic flag parsing
const args = process.argv.slice(2);
console.log('Args:', args);

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

console.log('Parsed flags:', flags);

// Test specific flags
if (flags['--metrics']) {
  console.log('✅ --metrics flag detected');
}

if (flags['--hex-colors']) {
  console.log('✅ --hex-colors flag detected');
}

if (flags['--domains']) {
  console.log(`✅ --domains flag: ${flags['--domains']}`);
}

console.log('🎉 Minimal CLI test completed successfully!');
