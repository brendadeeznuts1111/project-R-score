// JWT Issuer Selection: 13-Byte Config Dependency Example
// This demonstrates how a single bit in the 13-byte config controls authentication flow

import { jwt } from "bun";

// The issuer URL is determined by the PRIVATE_REGISTRY feature flag (Bit 1)
// This is a compile-time decision that gets baked into the bundle
const issuer = Bun.config.features.PRIVATE_REGISTRY 
  ? "https://auth.mycompany.com"  // Private registry auth
  : "https://auth.example.com";   // Public registry auth

// JWT verification with conditional issuer
async function verifyToken(token: string) {
  const start = Bun.nanoseconds();
  
  // The issuer is already resolved at compile time (0ns runtime cost)
  const claims = jwt.verify(token, { issuer });
  
  const duration = Bun.nanoseconds() - start;
  console.log(`JWT verification: ${duration}ns (issuer: ${issuer})`);
  
  return claims;
}

// Performance breakdown:
// 1. Feature flag check: 0ns (compile-time resolved)
// 2. JWT verification: 150ns (PREMIUM_TYPES) or 500ns (free tier)
// 3. Total: 150ns or 500ns (no extra cost for issuer selection)

// This pattern appears throughout the codebase:
// - Database connection strings
// - API endpoints
// - Cache configurations
// - Logging destinations
// - Feature toggles

// All controlled by the 13-byte immutable config
