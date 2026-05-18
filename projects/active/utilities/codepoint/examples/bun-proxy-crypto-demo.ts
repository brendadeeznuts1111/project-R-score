#!/usr/bin/env bun

// 🚀 Bun Proxy Crypto Demo
// Showcasing Bun's optimized crypto performance and encryption utilities

import {
  SymmetricEncryption,
  KeyDerivation,
  HashUtils,
  PrimeUtils
} from './bun-proxy/src/security/encryption';

// Performance test configuration
const PERF_TESTS = {
  encryption: {
    algorithms: ['aes-256-gcm', 'aes-256-cbc', 'aes-128-gcm'],
    dataSizes: [1024, 10240, 102400], // 1KB, 10KB, 100KB
    iterations: 100
  },
  keyDerivation: {
    methods: ['HKDF', 'PBKDF2', 'Scrypt'],
    iterations: 50
  },
  hashing: {
    algorithms: ['sha256', 'sha512', 'blake2b512'],
    dataSizes: [1024, 10240, 512000], // 1KB, 10KB, 500KB
    iterations: 1000
  }
};

// Performance measurement utilities
class PerformanceTester {
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, time: end - start };
  }

  static formatTime(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)}${units[unitIndex]}`;
  }
}

// Test encryption performance
async function testEncryptionPerformance() {
  console.info("🔐 Testing Encryption Performance...\n");

  const key = SymmetricEncryption.generateKey();
  const results = [];

  for (const algorithm of PERF_TESTS.encryption.algorithms) {
    for (const dataSize of PERF_TESTS.encryption.dataSizes) {
      const data = Buffer.alloc(dataSize, 'x'.repeat(Math.min(dataSize, 100)));

      // Test encryption
      const encryptTimes = [];
      for (let i = 0; i < PERF_TESTS.encryption.iterations; i++) {
        const { time } = await PerformanceTester.measureTime(async () => {
          await SymmetricEncryption.encrypt(data, key, { algorithm });
        });
        encryptTimes.push(time);
      }

      // Test decryption
      const { encrypted, iv, tag } = await SymmetricEncryption.encrypt(data, key, { algorithm });
      const decryptTimes = [];
      for (let i = 0; i < PERF_TESTS.encryption.iterations; i++) {
        const { time } = await PerformanceTester.measureTime(async () => {
          await SymmetricEncryption.decrypt(encrypted, key, iv, { algorithm }, tag);
        });
        decryptTimes.push(time);
      }

      const avgEncrypt = encryptTimes.reduce((a, b) => a + b) / encryptTimes.length;
      const avgDecrypt = decryptTimes.reduce((a, b) => a + b) / decryptTimes.length;

      results.push({
        'Algorithm': algorithm,
        'Data Size': PerformanceTester.formatBytes(dataSize),
        'Encrypt (avg)': PerformanceTester.formatTime(avgEncrypt),
        'Decrypt (avg)': PerformanceTester.formatTime(avgDecrypt),
        'Throughput': `${PerformanceTester.formatBytes(dataSize / (avgEncrypt / 1000))}/s`
      });
    }
  }

  console.info(Bun.inspect.table(results, { colors: true }));

  return results;
}

// Test key derivation performance
async function testKeyDerivationPerformance() {
  console.info("\n🔑 Testing Key Derivation Performance...\n");

  const masterKey = 'super-secret-master-key';
  const salt = SymmetricEncryption.generateSalt(32);
  const results = [];

  // HKDF Test
  const hkdfTimes = [];
  for (let i = 0; i < PERF_TESTS.keyDerivation.iterations; i++) {
    const { time } = await PerformanceTester.measureTime(async () => {
      await KeyDerivation.deriveKeyHKDF(masterKey, salt, 'test-info', 32);
    });
    hkdfTimes.push(time);
  }
  const avgHKDF = hkdfTimes.reduce((a, b) => a + b) / hkdfTimes.length;

  // PBKDF2 Test
  const pbkdf2Times = [];
  for (let i = 0; i < PERF_TESTS.keyDerivation.iterations; i++) {
    const { time } = await PerformanceTester.measureTime(async () => {
      await KeyDerivation.deriveKeyPBKDF2(masterKey, salt, 10000, 32);
    });
    pbkdf2Times.push(time);
  }
  const avgPBKDF2 = pbkdf2Times.reduce((a, b) => a + b) / pbkdf2Times.length;

  // Scrypt Test
  const scryptTimes = [];
  for (let i = 0; i < PERF_TESTS.keyDerivation.iterations; i++) {
    const { time } = await PerformanceTester.measureTime(async () => {
      await KeyDerivation.deriveKeyScrypt(masterKey, salt, 32, { N: 16384, r: 8, p: 1 });
    });
    scryptTimes.push(time);
  }
  const avgScrypt = scryptTimes.reduce((a, b) => a + b) / scryptTimes.length;

  results.push(
    {
      'Method': 'HKDF',
      'Time (avg)': PerformanceTester.formatTime(avgHKDF),
      'Security': 'High',
      'Speed': 'Very Fast'
    },
    {
      'Method': 'PBKDF2',
      'Time (avg)': PerformanceTester.formatTime(avgPBKDF2),
      'Security': 'Medium-High',
      'Speed': 'Fast'
    },
    {
      'Method': 'Scrypt',
      'Time (avg)': PerformanceTester.formatTime(avgScrypt),
      'Security': 'Very High',
      'Speed': 'Slow'
    }
  );

  console.info(Bun.inspect.table(results, { colors: true }));

  return results;
}

// Test hashing performance
async function testHashingPerformance() {
  console.info("\n🔢 Testing Hashing Performance...\n");

  const results = [];

  for (const algorithm of PERF_TESTS.hashing.algorithms) {
    for (const dataSize of PERF_TESTS.hashing.dataSizes) {
      const data = Buffer.alloc(dataSize, 'x'.repeat(Math.min(dataSize, 100)));

      const hashTimes = [];
      for (let i = 0; i < PERF_TESTS.hashing.iterations; i++) {
        const { time } = await PerformanceTester.measureTime(async () => {
          await HashUtils.hash(data, algorithm);
        });
        hashTimes.push(time);
      }

      const avgTime = hashTimes.reduce((a, b) => a + b) / hashTimes.length;

      results.push({
        'Algorithm': algorithm,
        'Data Size': PerformanceTester.formatBytes(dataSize),
        'Time (avg)': PerformanceTester.formatTime(avgTime),
        'Throughput': `${PerformanceTester.formatBytes(dataSize / (avgTime / 1000))}/s`
      });
    }
  }

  console.info(Bun.inspect.table(results, { colors: true }));

  return results;
}

// Test prime number generation
async function testPrimeGeneration() {
  console.info("\n🔢 Testing Prime Number Generation...\n");

  const bitLengths = [128, 256, 512, 1024, 2048];
  const results = [];

  for (const bitLength of bitLengths) {
    // Test synchronous generation
    const syncTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const prime = PrimeUtils.generatePrimeSync(bitLength);
      const end = performance.now();
      syncTimes.push(end - start);
    }
    const avgSync = syncTimes.reduce((a, b) => a + b) / syncTimes.length;

    // Test asynchronous generation
    const asyncTimes = [];
    for (let i = 0; i < 5; i++) {
      const { time } = await PerformanceTester.measureTime(async () => {
        await PrimeUtils.generatePrime(bitLength);
      });
      asyncTimes.push(time);
    }
    const avgAsync = asyncTimes.reduce((a, b) => a + b) / asyncTimes.length;

    results.push({
      'Bit Length': bitLength,
      'Sync (avg)': PerformanceTester.formatTime(avgSync),
      'Async (avg)': PerformanceTester.formatTime(avgAsync),
      'Security': bitLength >= 2048 ? 'Very High' : bitLength >= 1024 ? 'High' : 'Medium'
    });
  }

  console.info(Bun.inspect.table(results, { colors: true }));

  return results;
}

// Test encryption/decryption workflow
async function testEncryptionWorkflow() {
  console.info("\n🔐 Testing Encryption Workflow...\n");

  const testData = [
    'Hello, World!',
    'This is a test message for encryption.',
    'A' + 'long message '.repeat(1000), // ~15KB
    JSON.stringify({ user: 'test', data: 'A'.repeat(10000) }) // ~10KB JSON
  ];

  const key = SymmetricEncryption.generateKey();
  const results = [];

  for (const data of testData) {
    const dataSize = Buffer.byteLength(data, 'utf8');

    // Encrypt
    const { time: encryptTime } = await PerformanceTester.measureTime(async () => {
      return await SymmetricEncryption.encrypt(data, key);
    });

    const { encrypted, iv, tag } = await SymmetricEncryption.encrypt(data, key);

    // Decrypt
    const { time: decryptTime } = await PerformanceTester.measureTime(async () => {
      return await SymmetricEncryption.decrypt(encrypted, key, iv, {}, tag);
    });

    const { decrypted, verified } = await SymmetricEncryption.decrypt(encrypted, key, iv, {}, tag);

    results.push({
      'Data Size': PerformanceTester.formatBytes(dataSize),
      'Encrypt Time': PerformanceTester.formatTime(encryptTime),
      'Decrypt Time': PerformanceTester.formatTime(decryptTime),
      'Verified': verified ? '✅' : '❌',
      'Compression': `${((encrypted.length / dataSize) * 100).toFixed(1)}%`
    });
  }

  console.info(Bun.inspect.table(results, { colors: true }));

  return results;
}

// Test HKDF key derivation
async function testHKDF() {
  console.info("\n🔑 Testing HKDF Key Derivation...\n");

  const masterKey = 'my-super-secret-master-key';
  const salt = 'random-salt-value';
  const info = 'encryption-key';

  const keyLengths = [16, 32, 64];
  const results = [];

  for (const length of keyLengths) {
    const { time } = await PerformanceTester.measureTime(async () => {
      return await KeyDerivation.deriveKeyHKDF(masterKey, salt, info, length);
    });

    const derivedKey = await KeyDerivation.deriveKeyHKDF(masterKey, salt, info, length);

    results.push({
      'Key Length': `${length} bytes`,
      'Derivation Time': PerformanceTester.formatTime(time),
      'Key Preview': derivedKey.subarray(0, 8).toString('hex') + '...',
      'Entropy': 'High'
    });
  }

  console.info(Bun.inspect.table(results, { colors: true }));

  return results;
}

// Performance comparison with Node.js
function displayBunVsNodeComparison() {
  console.info("\n⚡ Bun v1.2.6 Crypto Performance vs Node.js:\n");

  const comparisons = [
    {
      'Operation': 'DiffieHellman (512-bit)',
      'Bun v1.2.6': '150.61 ms',
      'Bun v1.2.5': '105.15 s',
      'Improvement': '698x faster'
    },
    {
      'Operation': 'AES-256-GCM Encrypt/Decrypt',
      'Bun v1.2.6': '3.54 µs',
      'Bun v1.2.5': '1.15 ms',
      'Improvement': '325x faster'
    },
    {
      'Operation': 'Scrypt (N=16384, p=1, r=1)',
      'Bun v1.2.6': '47.37 ms',
      'Bun v1.2.5': '365.4 ms',
      'Improvement': '7.7x faster'
    }
  ];

  console.info(Bun.inspect.table(comparisons, { colors: true }));

  console.info("\n💡 Key improvements:");
  console.info("   • Native BoringSSL implementations");
  console.info("   • Optimized cipher operations");
  console.info("   • Faster key derivation algorithms");
  console.info("   • Enhanced prime number generation");
}

// Main demo execution
async function runCryptoDemo() {
  console.info("🚀 Bun Proxy Crypto Performance Demo");
  console.info("====================================\n");

  console.info("🎯 Demonstrating Bun v1.2.6 crypto optimizations:");
  console.info("   • Native BoringSSL implementations");
  console.info("   • HKDF key derivation support");
  console.info("   • Prime number generation");
  console.info("   • Enhanced ED25519 support");
  console.info();

  try {
    // Run all performance tests
    await testEncryptionPerformance();
    await testKeyDerivationPerformance();
    await testHashingPerformance();
    await testPrimeGeneration();
    await testEncryptionWorkflow();
    await testHKDF();

    // Show Bun vs Node.js comparison
    displayBunVsNodeComparison();

    console.info("\n🏆 Crypto Performance Demo Complete!");
    console.info("===================================");
    console.info("✅ Demonstrated Bun's optimized crypto performance");
    console.info("🔐 Showcased encryption, key derivation, and hashing");
    console.info("⚡ Highlighted major performance improvements in v1.2.6");

  } catch (error) {
    console.error("💥 Demo failed:", error);
  }
}

// Run the crypto demo
runCryptoDemo();