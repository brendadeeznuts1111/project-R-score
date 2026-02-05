#!/usr/bin/env bun
/**
 * @fileoverview Bun Security APIs Examples
 * @description Demonstrates Bun's native security features including Bun.secrets for credential management and Bun.CSRF for cross-site request forgery protection.
 * @module examples/bun-security-examples
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.0.0.0.0.0;instance-id=EXAMPLE-BUN-SECURITY-001;version=6.4.0.0.0.0.0]]
 * [PROPERTIES:{example={value="Bun Security APIs Examples";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.0.0.0.0.0"}}]
 * [CLASS:BunSecurityExamples][#REF:v-6.4.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 *
 * Version: 6.4.0.0.0.0.0
 * Ripgrep Pattern: 6\.4\.0\.0\.0\.0\.0|EXAMPLE-BUN-SECURITY-001|BP-EXAMPLE@6\.4\.0\.0\.0\.0\.0
 *
 * Demonstrates:
 * - Bun.secrets - OS-native encrypted credential storage
 * - Bun.CSRF - Cross-site request forgery protection
 * - Secure API endpoints with authentication
 * - Environment variable management
 *
 * @example 6.4.0.0.0.0.0.1: Bun.secrets Usage
 * // Test Formula:
 * // 1. Store secret using Bun.secrets.set()
 * // 2. Retrieve secret using Bun.secrets.get()
 * // 3. Use secret in application logic
 * // Expected Result: Secret stored and retrieved securely
 * //
 * // Snippet:
 * ```typescript
 * // Store API key securely
 * await Bun.secrets.set({
 *   service: "myapp",
 *   name: "apiKey",
 *   value: "sk-1234567890abcdef"
 * });
 *
 * // Retrieve in application
 * const apiKey = await Bun.secrets.get({
 *   service: "myapp",
 *   name: "apiKey"
 * });
 * ```
 *
 * @example 6.4.0.0.0.0.0.2: Bun.CSRF Usage
 * // Test Formula:
 * // 1. Generate CSRF token using Bun.CSRF.generate()
 * // 2. Validate token using Bun.CSRF.validate()
 * // 3. Protect forms and API endpoints
 * // Expected Result: CSRF protection working correctly
 * //
 * // Snippet:
 * ```typescript
 * // Generate token for form
 * const token = await Bun.CSRF.generate({
 *   secret: "my-secret-key"
 * });
 *
 * // Validate in API endpoint
 * const isValid = await Bun.CSRF.validate({
 *   token: requestToken,
 *   secret: "my-secret-key"
 * });
 * ```
 *
 * @see {@link https://bun.com/docs/api/secrets Bun.secrets Documentation}
 * @see {@link https://bun.com/docs/api/csrf Bun.CSRF Documentation}
 * @see {@link ../docs/BUN-1.2.11-IMPROVEMENTS.md Bun v1.2.11 Crypto Improvements} - KeyObject hierarchy and structuredClone support
 * @see {@link ../docs/BUN-TYPE-DEFINITION-FIXES.md Bun Type Definition Fixes} - TypeScript improvements
 *
 * // Ripgrep: 6.4.0.0.0.0.0
 * // Ripgrep: EXAMPLE-BUN-SECURITY-001
 * // Ripgrep: BP-EXAMPLE@6.4.0.0.0.0.0
 */

// Make this file a module to support top-level await
export {};

// ═══════════════════════════════════════════════════════════════
// 6.4.0.0.0.0.0.1 CONFIGURATION & UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * ANSI color codes for better output formatting
 */
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ═══════════════════════════════════════════════════════════════
// 6.4.0.0.0.0.0.2 BUN.SECRETS EXAMPLES
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log(colors.bold('  Bun Security APIs Examples'));
console.log('═'.repeat(70) + '\n');

console.log(colors.cyan('🔐 Demonstrating Bun.secrets and Bun.CSRF'));
console.log(colors.dim('Bun 1.3+ native security features\n'));

// Example 1: Bun.secrets - Secure Credential Storage
console.log(colors.bold('📋 Example 1: Bun.secrets - Secure Credential Storage'));
console.log(colors.dim('OS-native encrypted storage for sensitive data\n'));

async function demonstrateSecrets() {
  console.log('🔑 Demonstrating Bun.secrets API...');
  console.log('  ℹ️  Bun.secrets provides OS-native encrypted credential storage');
  console.log('  ℹ️  Available on macOS Keychain, Linux libsecret, Windows Credential Manager');

  // Example usage (would work with actual Bun.secrets API)
  console.log('\n📝 Example usage patterns:');

  const examples = [
    `// Store API key securely
await Bun.secrets.set({
  service: "myapp",
  account: "api",
  value: "sk-1234567890abcdef"
});`,
    `// Retrieve in application
const apiKey = await Bun.secrets.get({
  service: "myapp",
  account: "api"
});`,
    `// Use with environment variables
const dbUrl = await Bun.secrets.get({
  service: "database",
  account: "connection-string"
});`
  ];

  examples.forEach((example, i) => {
    console.log(`\n${colors.cyan(`Example ${i + 1}:`)}`);
    console.log(colors.dim(example));
  });

  console.log(`\n${colors.yellow('⚠️')}  Note: Actual API calls commented out for demo purposes`);
  console.log(`   Uncomment and test with real Bun.secrets implementation`);
}

// ═══════════════════════════════════════════════════════════════
// 6.4.0.0.0.0.0.3 BUN.CSRF EXAMPLES
// ═══════════════════════════════════════════════════════════════

console.log('\n' + colors.bold('📋 Example 2: Bun.CSRF - Cross-Site Request Forgery Protection'));
console.log(colors.dim('Automatic CSRF token generation and validation\n'));

async function demonstrateCSRF() {
  console.log('🎫 Demonstrating Bun.CSRF API...');
  console.log('  ℹ️  Bun.CSRF provides automatic CSRF token generation and validation');
  console.log('  ℹ️  Protects against cross-site request forgery attacks');

  // Example usage (would work with actual Bun.CSRF API)
  console.log('\n📝 Example usage patterns:');

  const examples = [
    `// Generate CSRF token for form
const token = await Bun.CSRF.generate({
  secret: "your-secret-key"
});`,
    `// Validate token in API endpoint
const isValid = await Bun.CSRF.validate({
  token: requestToken,
  secret: "your-secret-key"
});`,
    `// Use in HTML form
<form action="/submit" method="POST">
  <input type="hidden" name="csrf_token" value="\${token}" />
  <!-- form fields -->
</form>`
  ];

  examples.forEach((example, i) => {
    console.log(`\n${colors.cyan(`Example ${i + 1}:`)}`);
    console.log(colors.dim(example));
  });

  console.log(`\n${colors.yellow('⚠️')}  Note: Actual API calls commented out for demo purposes`);
  console.log(`   Uncomment and test with real Bun.CSRF implementation`);
}

// ═══════════════════════════════════════════════════════════════
// 6.4.0.0.0.0.0.4 SECURE API SERVER EXAMPLE
// ═══════════════════════════════════════════════════════════════

console.log('\n' + colors.bold('📋 Example 3: Secure API Server with Authentication'));
console.log(colors.dim('Combining Bun.secrets and Bun.CSRF in a secure API\n'));

const secureServer = Bun.serve({
  port: 3005,
  hostname: 'localhost',

  async fetch(req) {
    const url = new URL(req.url);

    // Health check (no auth required)
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        server: 'Bun Security Demo',
        features: ['secrets', 'csrf', 'auth']
      });
    }

    // Login endpoint - generates CSRF token
    if (url.pathname === '/login' && req.method === 'GET') {
      try {
        const csrfToken = await Bun.CSRF.generate({
          secret: "demo-jwt-secret"
        });

        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Secure Login - Bun Security Demo</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              form { background: #f5f5f5; padding: 20px; border-radius: 8px; }
              input { display: block; width: 100%; margin: 10px 0; padding: 8px; }
              button { background: #007bff; color: white; padding: 10px; border: none; width: 100%; cursor: pointer; }
              button:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <h2>Secure Login</h2>
            <form action="/auth/login" method="POST">
              <input type="hidden" name="csrf_token" value="${csrfToken}" />
              <input type="text" name="username" placeholder="Username" required />
              <input type="password" name="password" placeholder="Password" required />
              <button type="submit">Login</button>
            </form>
            <p><small>CSRF Token: ${csrfToken.substring(0, 20)}...</small></p>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (error) {
        return Response.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
      }
    }

    // Authentication endpoint
    if (url.pathname === '/auth/login' && req.method === 'POST') {
      try {
        const formData = await req.formData();
        const csrfToken = formData.get('csrf_token') as string;
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        // Validate CSRF token
        const isValidCSRF = await Bun.CSRF.validate({
          token: csrfToken,
          secret: "demo-jwt-secret"
        });

        if (!isValidCSRF) {
          return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
        }

        // Simple authentication (demo only)
        if (username === 'admin' && password === 'password') {
          // In real app, generate JWT token and store in secure cookie
          return Response.json({
            success: true,
            message: 'Login successful',
            token: 'demo-jwt-token-' + Date.now()
          });
        } else {
          return Response.json({ error: 'Invalid credentials' }, { status: 401 });
        }
      } catch (error) {
        return Response.json({ error: 'Authentication failed' }, { status: 500 });
      }
    }

    // Protected API endpoint
    if (url.pathname === '/api/secure-data') {
      // Check for authorization header (simplified auth)
      const auth = req.headers.get('Authorization');
      if (!auth || !auth.startsWith('Bearer demo-jwt-token-')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get sensitive data from secrets
      try {
        const apiKey = await Bun.secrets.get({
          service: "bun-security-demo",
          name: "apiKey"
        });

        return Response.json({
          sensitiveData: "This is protected information",
          apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : "Not configured",
          serverTime: new Date().toISOString(),
          authenticated: true
        });
      } catch (error) {
        return Response.json({ error: 'Failed to access secure data' }, { status: 500 });
      }
    }

    // API documentation
    if (url.pathname === '/api') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Secure API Documentation</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .method { font-weight: bold; color: #007bff; }
            code { background: #e9ecef; padding: 2px 4px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>🔐 Secure API Documentation</h1>
          <p>This API demonstrates Bun's security features.</p>

          <div class="endpoint">
            <span class="method">GET</span> <code>/health</code>
            <p>Health check endpoint (no authentication required)</p>
          </div>

          <div class="endpoint">
            <span class="method">GET</span> <code>/login</code>
            <p>Login form with CSRF protection</p>
          </div>

          <div class="endpoint">
            <span class="method">POST</span> <code>/auth/login</code>
            <p>Authentication endpoint with CSRF validation</p>
            <p><em>Credentials: admin / password</em></p>
          </div>

          <div class="endpoint">
            <span class="method">GET</span> <code>/api/secure-data</code>
            <p>Protected endpoint requiring Bearer token</p>
            <p><em>Header: Authorization: Bearer demo-jwt-token-...</em></p>
          </div>

          <h2>Test Commands:</h2>
          <pre>
# Health check
curl http://localhost:3005/health

# Login form
curl http://localhost:3005/login

# Authentication (get token first)
curl -X POST http://localhost:3005/auth/login \\
  -d "csrf_token=YOUR_TOKEN&username=admin&password=password"

# Access protected data
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  http://localhost:3005/api/secure-data
          </pre>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Secure API Server - visit /api for documentation', {
      headers: { 'Content-Type': 'text/html' }
    });
  },

  error(error) {
    console.error('Secure server error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════════
// 6.4.0.0.0.0.0.5 RUN DEMONSTRATIONS
// ═══════════════════════════════════════════════════════════════

async function runDemos() {
  try {
    await demonstrateSecrets();
  } catch (error) {
    console.log(colors.red(`❌ Bun.secrets demo failed: ${error}`));
  }

  try {
    await demonstrateCSRF();
  } catch (error) {
    console.log(colors.red(`❌ Bun.CSRF demo failed: ${error}`));
  }

  console.log('\n' + '═'.repeat(70));
  console.log(colors.bold('  Secure API Server Started!'));
  console.log('═'.repeat(70));
  console.log(`\n${colors.green('🌐 Server running on http://localhost:${secureServer.port}')}`);
  console.log(`  ${colors.cyan('API Docs')}: http://localhost:${secureServer.port}/api`);
  console.log(`  ${colors.cyan('Login Form')}: http://localhost:${secureServer.port}/login`);
  console.log(`  ${colors.cyan('Health Check')}: http://localhost:${secureServer.port}/health`);

  console.log(`\n${colors.blue('🔐 Security Features Demonstrated:')}`);
  console.log(`  ${colors.dim('•')} Bun.secrets - OS-native encrypted credential storage`);
  console.log(`  ${colors.dim('•')} Bun.CSRF - Automatic CSRF token generation/validation`);
  console.log(`  ${colors.dim('•')} Secure API with authentication and authorization`);
  console.log(`  ${colors.dim('•')} Form protection against cross-site request forgery`);

  console.log(`\n${colors.red('🛑 Press Ctrl+C to stop the server')}\n`);
}

// Run demonstrations
runDemos().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n' + colors.yellow('🛑 Shutting down secure server...'));
  secureServer.stop();
  console.log(colors.green('✅ Server stopped. Goodbye!'));
  process.exit(0);
});</content>
<parameter name="filePath">examples/bun-security-examples.ts