#!/usr/bin/env bun
/**
 * 🔐 FactoryWager Password Hashing Demo
 * 
 * Demonstrates Bun.password integration with FactoryWager security utilities
 * 
 * @version 5.1
 */

import { SecurityUtils } from '../lib/security/index.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { styled, log } from '../lib/theme/colors.ts';

async function demonstratePasswordHashing() {
  log.section('FactoryWager Password Hashing Demo', 'accent');
  
  // Generate a test password
  const password = SecurityUtils.generatePassword(20);
  log.metric('Generated password', password, 'muted');
  
  // Validate password strength
  const strength = SecurityUtils.validateStrength(password);
  log.metric('Strength score', strength.score.toString(), 
              strength.score > 80 ? 'success' : strength.score > 50 ? 'warning' : 'error');
  
  if (strength.issues.length > 0) {
    console.log(styled('\nIssues:', 'warning'));
    strength.issues.forEach(issue => {
      console.log(styled(`• ${issue}`, 'muted'));
    });
  }
  
  // Hash with different algorithms
  console.log(styled('\nHashing with different algorithms:', 'primary'));
  
  // Argon2id (default)
  const argon2Hash = await SecurityUtils.hashPassword(password, {
    algorithm: 'argon2id',
    memoryCost: 64,
    timeCost: 3
  });
  log.metric('Argon2id', argon2Hash.substring(0, 50) + '...', 'success');
  
  // Argon2i
  const argon2iHash = await SecurityUtils.hashPassword(password, {
    algorithm: 'argon2i',
    memoryCost: 32,
    timeCost: 2
  });
  log.metric('Argon2i', argon2iHash.substring(0, 50) + '...', 'primary');
  
  // bcrypt
  const bcryptHash = await SecurityUtils.hashPassword(password, {
    algorithm: 'bcrypt',
    cost: 12
  });
  log.metric('bcrypt', bcryptHash.substring(0, 50) + '...', 'accent');
  
  // Verify passwords
  console.log(styled('\nVerification:', 'primary'));
  
  const argon2Valid = await SecurityUtils.verifyPassword(password, argon2Hash);
  log.metric('Argon2id verification', argon2Valid.toString(), argon2Valid ? 'success' : 'error');
  
  const bcryptValid = await SecurityUtils.verifyPassword(password, bcryptHash);
  log.metric('bcrypt verification', bcryptValid.toString(), bcryptValid ? 'success' : 'error');
  
  // Test wrong password
  const wrongPassword = 'wrong-password';
  const wrongValid = await SecurityUtils.verifyPassword(wrongPassword, argon2Hash);
  log.metric('Wrong password verification', wrongValid.toString(), 'error');
  
  // Synchronous hashing
  console.log(styled('\nSynchronous hashing:', 'primary'));
  
  const syncHash = SecurityUtils.hashPasswordSync(password, {
    algorithm: 'bcrypt',
    cost: 10
  });
  log.metric('Sync hash', syncHash.substring(0, 50) + '...', 'muted');
  
  const syncValid = SecurityUtils.verifyPasswordSync(password, syncHash);
  log.metric('Sync verification', syncValid.toString(), syncValid ? 'success' : 'error');
  
  // Performance comparison
  console.log(styled('\nPerformance comparison:', 'primary'));
  
  const iterations = 100;
  
  // Async hashing performance
  const asyncStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await SecurityUtils.hashPassword(password, { algorithm: 'bcrypt', cost: 8 });
  }
  const asyncTime = performance.now() - asyncStart;
  log.metric('Async hashing', `${iterations} hashes in ${asyncTime.toFixed(2)}ms`, 'success');
  
  // Sync hashing performance
  const syncStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    SecurityUtils.hashPasswordSync(password, { algorithm: 'bcrypt', cost: 8 });
  }
  const syncTime = performance.now() - syncStart;
  log.metric('Sync hashing', `${iterations} hashes in ${syncTime.toFixed(2)}ms`, 'primary');
  
  // Show performance difference
  const diff = ((asyncTime - syncTime) / syncTime * 100).toFixed(1);
  log.metric('Performance difference', `${diff}%`, 'muted');
  
  console.log(styled('\n✅ Password hashing demo complete!', 'success'));
  console.log(styled('\n📖 Reference: https://bun.com/docs/runtime/hashing#bun-password', 'accent'));
}

// Run if called directly
if (import.meta.main) {
  await demonstratePasswordHashing();
}
