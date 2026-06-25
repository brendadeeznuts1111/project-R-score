#!/usr/bin/env bun
// examples/bun-secrets-best-practices.ts - Demonstrating Bun secrets API best practices

import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';

console.info('🔐 Bun Secrets API Best Practices Demo');
console.info('=====================================\n');

// Example 1: External tools with UTI-style naming
console.info('1. External Tools (UTI-style naming):');
console.info('-------------------------------------');

const dockerManager = ScopedSecretsManager.forExternalTool('docker.hub');
const vercelManager = ScopedSecretsManager.forExternalTool('vercel.cli');
const ghManager = ScopedSecretsManager.forExternalTool('github.cli');

console.info('✅ Docker Hub:', dockerManager.getStorageConfig().persist);
console.info('✅ Vercel CLI:', vercelManager.getStorageConfig().persist);
console.info('✅ GitHub CLI:', ghManager.getStorageConfig().persist);

// Example 2: Internal services with descriptive naming
console.info('\n2. Internal Services (descriptive naming):');
console.info('-----------------------------------------');

const apiManager = ScopedSecretsManager.forInternalService('empire-api', 'production');
const dashboardManager = ScopedSecretsManager.forInternalService('dashboard', 'frontend');

console.info('✅ Empire API Production:', apiManager.getStorageConfig().persist);
console.info('✅ Dashboard Frontend:', dashboardManager.getStorageConfig().persist);

// Example 3: Recommended service names
console.info('\n3. Recommended Service Names:');
console.info('---------------------------');

const tools = ['docker', 'npm', 'kubectl', 'vercel'];
tools.forEach(tool => {
  const recommended = ScopedSecretsManager.getRecommendedServiceName(tool);
  console.info(`📝 ${tool} → ${recommended}`);
});

// Example 4: Proper secret storage patterns
console.info('\n4. Secret Storage Patterns:');
console.info('--------------------------');

async function demonstrateSecrets() {
  const manager = ScopedSecretsManager.forExternalTool('demo.tool');
  
  // Good: Descriptive secret names
  const secrets = {
    'api-key': 'sk-demo-key-123456',
    'database-url': 'postgresql://localhost:5432/demo',
    'redis-password': 'redis-demo-password'
  };
  
  console.info('🔒 Storing secrets with descriptive names:');
  for (const [name, value] of Object.entries(secrets)) {
    const success = await manager.setSecret(name, value);
    console.info(`   ${success ? '✅' : '❌'} ${name}: ${'*'.repeat(value.length)}`);
  }
  
  console.info('\n🔍 Retrieving secrets:');
  for (const name of Object.keys(secrets)) {
    const value = await manager.getSecret(name);
    console.info(`   ${value ? '✅' : '❌'} ${name}: ${value ? '*'.repeat(value.length) : 'not found'}`);
  }
  
  console.info('\n🧹 Cleaning up demo secrets:');
  for (const name of Object.keys(secrets)) {
    const deleted = await manager.deleteSecret(name);
    console.info(`   ${deleted ? '✅' : '❌'} ${name}: ${deleted ? 'deleted' : 'failed'}`);
  }
}

// Example 5: Scope-aware service naming
console.info('\n5. Scope-Aware Service Naming:');
console.info('------------------------------');

const teamManager = ScopedSecretsManager.forTeam('backend');
const scopeManager = ScopedSecretsManager.forScope('ENTERPRISE');

console.info('🏢 Team Backend:', teamManager.getScopeConfig().scope);
console.info('🌐 Enterprise Scope:', scopeManager.getScopeConfig().scope);

// Example 6: Local development vs production
console.info('\n6. Local Development vs Production:');
console.info('------------------------------------');

console.info('✅ Local Development Tools:');
console.info('   - CLI tools (gh, npm, docker, kubectl)');
console.info('   - Local development servers');
console.info('   - Personal API keys for testing');

console.info('\n❌ Avoid for Production:');
console.info('   - Production servers (use proper secret management)');
console.info('   - Shared credentials across environments');
console.info('   - Sensitive application configuration');

// Run the demonstration
demonstrateSecrets().then(() => {
  console.info('\n🎉 Best practices demonstration complete!');
  console.info('\n📚 Key Takeaways:');
  console.info('   • Use descriptive service names that match the tool');
  console.info('   • Use UTI-style naming for external tools (com.example.tool)');
  console.info('   • Store credentials only, not application configuration');
  console.info('   • Use for local development tools and testing');
  console.info('   • Avoid for production servers - use proper secret management');
}).catch((error) => {
  console.error('❌ Demo failed:', error);
});
