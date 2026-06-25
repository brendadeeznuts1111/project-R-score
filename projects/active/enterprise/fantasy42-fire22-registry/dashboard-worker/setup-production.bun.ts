#!/usr/bin/env bun

/**
 * Fire22 Dashboard Production Setup Script
 * Helps configure production environment with strong secrets
 */

import { writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

console.info('🚀 Fire22 Dashboard Production Setup\n');

// Step 1: Generate strong secrets
console.info('1️⃣ Generating Strong Production Secrets...\n');

try {
  const jwtSecret = execSync('openssl rand -base64 64', { encoding: 'utf8' }).trim();
  const adminPassword = execSync('openssl rand -base64 32', { encoding: 'utf8' }).trim();
  const cronSecret = execSync('openssl rand -base64 32', { encoding: 'utf8' }).trim();

  console.info('✅ Generated strong secrets:');
  console.info(`   JWT_SECRET: ${jwtSecret.substring(0, 20)}...`);
  console.info(`   ADMIN_PASSWORD: ${adminPassword.substring(0, 20)}...`);
  console.info(`   CRON_SECRET: ${cronSecret.substring(0, 20)}...`);

  // Step 2: Create production environment file
  console.info('\n2️⃣ Creating Production Environment File...\n');

  const productionEnv = `# Fire22 Dashboard Production Environment - SECURE
NODE_ENV=production
DATABASE_URL=file:./prod.db
API_BASE_URL=https://api.fire22.com
LOG_LEVEL=info

# 🔐 AUTHENTICATION - Strong production secrets
JWT_SECRET=${jwtSecret}
ADMIN_PASSWORD=${adminPassword}
CRON_SECRET=${cronSecret}

# 🔑 EXTERNAL SERVICES - Replace with your actual production keys
FIRE22_API_KEY=REPLACE_WITH_REAL_FIRE22_PRODUCTION_API_KEY
FIRE22_API_SECRET=REPLACE_WITH_REAL_FIRE22_PRODUCTION_SECRET
FIRE22_WEBHOOK_SECRET=REPLACE_WITH_REAL_FIRE22_PRODUCTION_WEBHOOK_SECRET

# 💳 PAYMENT GATEWAY - Replace with your actual Stripe production keys
STRIPE_SECRET_KEY=REPLACE_WITH_REAL_STRIPE_PRODUCTION_SECRET_KEY
STRIPE_WEBHOOK_SECRET=REPLACE_WITH_REAL_STRIPE_PRODUCTION_WEBHOOK_SECRET

# 📧 COMMUNICATION SERVICES - Replace with your actual production keys
SENDGRID_API_KEY=REPLACE_WITH_REAL_SENDGRID_PRODUCTION_API_KEY
TWILIO_ACCOUNT_SID=REPLACE_WITH_REAL_TWILIO_PRODUCTION_SID
TWILIO_AUTH_TOKEN=REPLACE_WITH_REAL_TWILIO_PRODUCTION_AUTH_TOKEN

# 🤖 BOT CONFIGURATION - Replace with your actual production bot tokens
BOT_TOKEN=REPLACE_WITH_REAL_PRODUCTION_BOT_TOKEN
CASHIER_BOT_TOKEN=REPLACE_WITH_REAL_PRODUCTION_CASHIER_BOT_TOKEN

# Server Configuration
PORT=8080

# 🔒 SECURITY HEADERS
SECURITY_HEADERS_ENABLED=true
CORS_ORIGIN=https://your-production-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 📊 MONITORING
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000
HEALTH_CHECK_ENDPOINTS=/api/health,/api/health/system,/api/health/permissions

# 🚀 PERFORMANCE
CACHE_TTL=3600000
MAX_CONCURRENT_REQUESTS=256
REQUEST_TIMEOUT_MS=30000
`;

  const filename = '.env.production.secure';
  writeFileSync(filename, productionEnv);
  console.info(`✅ Created ${filename}`);

  // Step 3: Validate production environment
  console.info('\n3️⃣ Validating Production Environment...\n');

  try {
    execSync('bun run env:validate', { stdio: 'inherit' });
    console.info('✅ Production environment validation passed!');
  } catch (error) {
    console.info('⚠️  Production environment validation needs attention');
  }

  // Step 4: Security audit
  console.info('\n4️⃣ Running Security Audit...\n');

  try {
    execSync('bun run env:audit', { stdio: 'inherit' });
    console.info('✅ Security audit completed!');
  } catch (error) {
    console.info('⚠️  Security audit found issues to address');
  }

  console.info('\n🎉 Production Setup Complete!');
  console.info('\n📋 Next Steps:');
  console.info('   1. Review and customize .env.production.secure');
  console.info('   2. Replace placeholder values with real production keys');
  console.info('   3. Test with: bun run env:deploy');
  console.info('   4. Set up CI/CD pipeline');

  console.info('\n🔒 Security Notes:');
  console.info('   • JWT_SECRET is now 64+ characters (excellent)');
  console.info('   • ADMIN_PASSWORD is now 32+ characters (strong)');
  console.info('   • CRON_SECRET is now 32+ characters (secure)');
  console.info('   • All secrets are cryptographically random');
} catch (error) {
  console.error('❌ Error during production setup:', error.message);
  process.exit(1);
}
