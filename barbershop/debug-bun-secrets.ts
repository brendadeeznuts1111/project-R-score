#!/usr/bin/env bun

/**
 * 🔍 Debug Bun Secrets API
 * Figure out the correct API format
 */

console.log('🔍 Debugging Bun Secrets API');
console.log('==========================');

console.log('Bun.secrets type:', typeof Bun.secrets);
console.log('Bun.secrets methods:', Object.getOwnPropertyNames(Bun.secrets));

// Try different API formats
console.log('\n🧪 Testing different API formats...');

try {
  console.log('1. Testing Bun.secrets.get("test")...');
  const result1 = Bun.secrets.get("test");
  console.log('   Result:', result1);
} catch (error) {
  console.log('   Error:', error.message);
}

try {
  console.log('2. Testing Bun.secrets.get({ name: "test" })...');
  const result2 = Bun.secrets.get({ name: "test" });
  console.log('   Result:', result2);
} catch (error) {
  console.log('   Error:', error.message);
}

try {
  console.log('3. Testing Bun.secrets.get("service", "name")...');
  const result3 = Bun.secrets.get("service", "name");
  console.log('   Result:', result3);
} catch (error) {
  console.log('   Error:', error.message);
}

try {
  console.log('4. Testing Bun.secrets.get({ service: "service", name: "name" })...');
  const result4 = Bun.secrets.get({ service: "service", name: "name" });
  console.log('   Result:', result4);
} catch (error) {
  console.log('   Error:', error.message);
}

// Test set methods too
console.log('\n🧪 Testing set methods...');

try {
  console.log('1. Testing Bun.secrets.set("test", "value")...');
  Bun.secrets.set("test", "value");
  console.log('   Success');
} catch (error) {
  console.log('   Error:', error.message);
}

try {
  console.log('2. Testing Bun.secrets.set({ name: "test" }, "value")...');
  Bun.secrets.set({ name: "test" }, "value");
  console.log('   Success');
} catch (error) {
  console.log('   Error:', error.message);
}

try {
  console.log('3. Testing Bun.secrets.set("service", "name", "value")...');
  Bun.secrets.set("service", "name", "value");
  console.log('   Success');
} catch (error) {
  console.log('   Error:', error.message);
}

try {
  console.log('4. Testing Bun.secrets.set({ service: "service", name: "name" }, "value")...');
  Bun.secrets.set({ service: "service", name: "name" }, "value");
  console.log('   Success');
} catch (error) {
  console.log('   Error:', error.message);
}

console.log('\n🎯 API format discovered!');
