#!/usr/bin/env bun

console.log('🔍 Checking Bun Crypto APIs');
console.log('==========================');

console.log('Bun object properties:', Object.getOwnPropertyNames(Bun).filter(name => name.toLowerCase().includes('crypto') || name.toLowerCase().includes('hash')));

console.log('globalThis.crypto:', typeof globalThis.crypto);

if (typeof globalThis.crypto !== 'undefined') {
  console.log('crypto.subtle:', typeof globalThis.crypto.subtle);
}

// Test Web Crypto API
try {
  console.log('\n🧪 Testing Web Crypto API...');
  const encoder = new TextEncoder();
  const data = encoder.encode('test');
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('✅ Web Crypto API works, hash:', hashHex);
} catch (error) {
  console.log('❌ Web Crypto API failed:', error.message);
}
