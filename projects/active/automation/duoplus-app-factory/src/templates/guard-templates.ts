/**
 * Nebula-Flow™ Guard Templates
 * 
 * Pre-built guard templates for common secret types.
 *
 * @version 3.6.0
 * @author DuoPlus Team
 * @license MIT
 */

export const GuardTemplates = {
  // For API key patterns
  API_KEY: `export function guard${Date.now()}() {
    return {
      validate: (ctx) => {
        const key = ctx.request.headers.get('x-api-key');
        if (!key) return { allowed: false, reason: 'Missing API key' };
        
        // Rate limiting
        const limiter = new TokenBucket({ capacity: 100, refillRate: 10 });
        if (!limiter.take()) {
          return { allowed: false, reason: 'Rate limit exceeded' };
        }
        
        // Audit logging (Bun 1.3.6+)
        Bun.write(
          'logs/security.log',
          \`\${new Date().toISOString()} API_KEY_USED \${ctx.request.url}\\n\`
        );
        
        return { allowed: true };
      }
    };
  }`,
  
  // For credential patterns
  CREDENTIALS: `export function guard${Date.now()}() {
    return {
      validate: (ctx) => {
        // Encrypted session validation
        const session = decrypt(ctx.cookies.get('session'));
        
        // IP whitelisting
        const allowedIPs = Bun.env.ALLOWED_IPS?.split(',') || [];
        if (!allowedIPs.includes(ctx.request.ip)) {
          return { allowed: false, reason: 'IP not whitelisted' };
        }
        
        // Bun's native validation
        const url = new URL(ctx.request.url);
        if (url.pathname.includes('admin') && !session.isAdmin) {
          return { allowed: false, reason: 'Admin access required' };
        }
        
        return { allowed: true };
      }
    };
  }`,

  // For token patterns
  TOKEN: `export function guard${Date.now()}() {
    return {
      validate: (ctx) => {
        const token = ctx.request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) return { allowed: false, reason: 'Missing token' };
        
        // Token validation
        const isValid = validateJWT(token);
        if (!isValid) return { allowed: false, reason: 'Invalid token' };
        
        // Audit logging
        Bun.write(
          'logs/security.log',
          \`\${new Date().toISOString()} TOKEN_USED \${ctx.request.url}\\n\`
        );
        
        return { allowed: true };
      }
    };
  }`,

  // For database connection patterns
  DATABASE: `export function guard${Date.now()}() {
    return {
      validate: (ctx) => {
        // Connection string validation
        const connection = ctx.request.headers.get('x-db-connection');
        if (!connection) return { allowed: false, reason: 'Missing connection string' };
        
        // IP whitelisting for database access
        const allowedIPs = Bun.env.DB_ALLOWED_IPS?.split(',') || [];
        if (!allowedIPs.includes(ctx.request.ip)) {
          return { allowed: false, reason: 'IP not whitelisted for database access' };
        }
        
        return { allowed: true };
      }
    };
  }`,

  // For authentication secret patterns
  AUTH_SECRET: `export function guard${Date.now()}() {
    return {
      validate: (ctx) => {
        const secret = ctx.request.headers.get('x-auth-secret');
        if (!secret) return { allowed: false, reason: 'Missing authentication secret' };
        
        // Secret validation
        if (secret !== Bun.env.AUTH_SECRET) {
          return { allowed: false, reason: 'Invalid authentication secret' };
        }
        
        return { allowed: true };
      }
    };
  }`
};
