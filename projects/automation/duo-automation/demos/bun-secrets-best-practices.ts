#!/usr/bin/env bun
// examples/bun-secrets-best-practices.ts - Demonstrating Bun secrets API best practices

import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';

console.log('🔐 Bun Secrets API Best Practices Demo');
console.log('=====================================\n');

// Example 1: External tools with UTI-style naming
console.log('1. External Tools (UTI-style naming):');
console.log('-------------------------------------');

const dockerManager = ScopedSecretsManager.forExternalTool('docker.hub');
const vercelManager = ScopedSecretsManager.forExternalTool('vercel.cli');
const ghManager = ScopedSecretsManager.forExternalTool('github.cli');

console.log('✅ Docker Hub:', dockerManager.getStorageConfig().persist);
console.log('✅ Vercel CLI:', vercelManager.getStorageConfig().persist);
console.log('✅ GitHub CLI:', ghManager.getStorageConfig().persist);

// Example 2: Internal services with descriptive naming
console.log('\n2. Internal Services (descriptive naming):');
console.log('-----------------------------------------');

const apiManager = ScopedSecretsManager.forInternalService('empire-api', 'production');
const dashboardManager = ScopedSecretsManager.forInternalService('dashboard', 'frontend');

console.log('✅ Empire API Production:', apiManager.getStorageConfig().persist);
console.log('✅ Dashboard Frontend:', dashboardManager.getStorageConfig().persist);

// Example 3: Recommended service names
console.log('\n3. Recommended Service Names:');
console.log('---------------------------');

const tools = ['docker', 'npm', 'kubectl', 'vercel'];
tools.forEach(tool => {
  const recommended = ScopedSecretsManager.getRecommendedServiceName(tool);
  console.log(`📝 ${tool} → ${recommended}`);
});

// Example 4: Proper secret storage patterns
console.log('\n4. Secret Storage Patterns:');
console.log('--------------------------');

async function demonstrateSecrets() {
  const manager = ScopedSecretsManager.forExternalTool('demo.tool');
  
  // Good: Descriptive secret names
  const secrets = {
    'api-key': 'sk-demo-key-123456',
    'database-url': 'postgresql://localhost:5432/demo',
    'redis-password': 'redis-demo-password'
  };
  
  console.log('🔒 Storing secrets with descriptive names:');
  for (const [name, value] of Object.entries(secrets)) {
    const success = await manager.setSecret(name, value);
    console.log(`   ${success ? '✅' : '❌'} ${name}: ${'*'.repeat(value.length)}`);
  }
  
  console.log('\n🔍 Retrieving secrets:');
  for (const name of Object.keys(secrets)) {
    const value = await manager.getSecret(name);
    console.log(`   ${value ? '✅' : '❌'} ${name}: ${value ? '*'.repeat(value.length) : 'not found'}`);
  }
  
  console.log('\n🧹 Cleaning up demo secrets:');
  for (const name of Object.keys(secrets)) {
    const deleted = await manager.deleteSecret(name);
    console.log(`   ${deleted ? '✅' : '❌'} ${name}: ${deleted ? 'deleted' : 'failed'}`);
  }
}

// Example 5: Scope-aware service naming
console.log('\n5. Scope-Aware Service Naming:');
console.log('------------------------------');

const teamManager = ScopedSecretsManager.forTeam('backend');
const scopeManager = ScopedSecretsManager.forScope('ENTERPRISE');

console.log('🏢 Team Backend:', teamManager.getScopeConfig().scope);
console.log('🌐 Enterprise Scope:', scopeManager.getScopeConfig().scope);

// Example 6: Local development vs production
console.log('\n6. Local Development vs Production:');
console.log('------------------------------------');

console.log('✅ Local Development Tools:');
console.log('   - CLI tools (gh, npm, docker, kubectl)');
console.log('   - Local development servers');
console.log('   - Personal API keys for testing');

console.log('\n❌ Avoid for Production:');
console.log('   - Production servers (use proper secret management)');
console.log('   - Shared credentials across environments');
console.log('   - Sensitive application configuration');

// Run the demonstration
demonstrateSecrets().then(() => {
  console.log('\n🎉 Best practices demonstration complete!');
  console.log('\n📚 Key Takeaways:');
  console.log('   • Use descriptive service names that match the tool');
  console.log('   • Use UTI-style naming for external tools (com.example.tool)');
  console.log('   • Store credentials only, not application configuration');
  console.log('   • Use for local development tools and testing');
  console.log('   • Avoid for production servers - use proper secret management');
}).catch((error) => {
  console.error('❌ Demo failed:', error);
});
