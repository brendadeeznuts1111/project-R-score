#!/usr/bin/env bun

/**
 * 🎬 FactoryWager MCP R2 Integration Demo
 * 
 * Demonstrates the complete R2-integrated MCP workflow
 * with mock data when credentials aren't configured.
 */

import { BunMCPClient } from '../lib/mcp/bun-mcp-client.ts';
import { styled, FW_COLORS, log, colorBar } from '../lib/theme/colors.ts';
import { r2MCPIntegration } from '../lib/mcp/r2-integration.ts';

class MCPDemo {
  constructor() {
    this.showWelcome();
  }

  private showWelcome(): void {
    console.log(styled('\n🚀 FactoryWager MCP R2 Integration Demo', 'accent'));
    console.log(styled('==========================================', 'accent'));
    console.log(styled('This demo shows how the MCP system works with R2 storage.', 'muted'));
    console.log(styled('Even without credentials, you can see the workflow!', 'muted'));
    console.log('');
  }

  async demonstrateErrorDiagnosis(): Promise<void> {
    console.log(styled('\n🔍 Error Diagnosis Workflow', 'primary'));
    console.log(colorBar('primary', 50));
    
    // Simulate an error
    const error = new Error('Bun.secrets.get: Invalid region configuration');
    error.name = 'RegionError';
    
    console.log(styled('Simulated Error:', 'error'));
    console.log(styled(`  ${error.name}: ${error.message}`, 'muted'));
    console.log('');

    // Show what would be stored in R2
    const mockDiagnosis = {
      id: `diagnosis-${Date.now()}-demo`,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      fix: `// 🔧 FactoryWager Auto-Fix v5.0
// Generated: ${new Date().toISOString()}
// Error: ${error.name}
// Context: secrets
// Confidence: 85%

try {
  const secret = await Bun.secrets.get('API_KEY', {
    region: 'auto',  // ← Changed from invalid region
    ttl: 3600
  });
} catch (error) {
  console.error('Secret retrieval failed:', error);
  // Implement retry logic with exponential backoff
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await Bun.secrets.get('API_KEY', { region: 'auto' });
    } catch (retryError) {
      if (i === maxRetries - 1) throw retryError;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}

// 📚 Documentation References:
// - https://bun.sh/docs/runtime/secrets#bun-secrets-get-options

// 🛡️ Security Considerations:
// • Always validate region parameter
// • Use secure defaults ('auto')
// • Implement proper error handling

// 📊 Performance Notes:
// • Consider implementing caching for frequently accessed secrets
// • Monitor secret access patterns
// • Use appropriate TTL values

// 🏛️ FactoryWager Pattern Applied:
// Applied proven FactoryWager resolution pattern from audit history

// 📋 Audit History:
// ✓ Found 2 similar issues in audit trail
// ✓ Most recent resolution: Updated region to 'auto'

// 🔄 Next Steps:
// 1. Apply the suggested fix above
// 2. Review the documentation links for deeper understanding
// 3. Monitor for similar issues in the future
// 4. Test the fix in a development environment
// 5. Update error handling if needed`,
      confidence: 0.85,
      context: 'secrets',
      metadata: {
        bunDocsCount: 3,
        auditHistoryCount: 2,
        hasSecurityNotes: true,
        factorywagerContext: true,
      },
    };

    console.log(styled('📦 What would be stored in R2:', 'success'));
    console.log(styled(`  Key: mcp/diagnoses/${mockDiagnosis.timestamp.replace(/[:.]/g, '-')}-${mockDiagnosis.error.name}.json`, 'muted'));
    console.log(styled(`  Size: ${JSON.stringify(mockDiagnosis).length} bytes`, 'muted'));
    console.log(styled(`  Confidence: ${Math.round(mockDiagnosis.confidence * 100)}%`, 'info'));
    console.log('');

    // Show the fix
    console.log(styled('🔧 Generated FactoryWager Fix:', 'success'));
    console.log(styled(mockDiagnosis.fix.slice(0, 500) + '...', 'background', 'primary'));
    console.log('');
  }

  async demonstrateAuditSearch(): Promise<void> {
    console.log(styled('\n📋 Audit Trail Search', 'warning'));
    console.log(colorBar('warning', 50));
    
    console.log(styled('Searching for similar past errors...', 'info'));
    console.log('');

    // Mock audit results (what would come from R2)
    const mockAudits = [
      {
        id: 'audit-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        errorType: 'RegionError',
        errorMessage: 'Bun.secrets.get: Invalid region configuration',
        resolution: 'Updated region to auto in configuration',
        successfulFix: 'Changed region parameter from "us-west-99" to "auto"',
        context: 'secrets',
        severity: 'medium' as const,
      },
      {
        id: 'audit-002',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        errorType: 'RegionError',
        errorMessage: 'Invalid region specified for secrets manager',
        resolution: 'Implemented region validation and fallback',
        context: 'secrets',
        severity: 'low' as const,
      },
    ];

    console.log(styled('🔍 Found 2 similar issues in audit trail:', 'success'));
    mockAudits.forEach((audit, i) => {
      console.log(styled(`\n${i + 1}. ${audit.id}`, 'accent'));
      console.log(styled(`   When: ${new Date(audit.timestamp).toLocaleString()}`, 'muted'));
      console.log(styled(`   Context: ${audit.context}`, 'info'));
      console.log(styled(`   Severity: ${audit.severity}`, audit.severity === 'medium' ? 'warning' : 'muted'));
      console.log(styled(`   Resolution: ${audit.resolution}`, 'muted'));
      if (audit.successfulFix) {
        console.log(styled(`   ✅ Fix: ${audit.successfulFix}`, 'success'));
      }
    });
    console.log('');
  }

  async demonstrateMetrics(): Promise<void> {
    console.log(styled('\n📊 Usage Analytics', 'info'));
    console.log(colorBar('info', 50));
    
    // Mock metrics (what would be stored in R2)
    const mockMetrics = {
      timestamp: new Date().toISOString(),
      usage: {
        searches: 1250,
        diagnoses: 85,
        examples: 320,
        validations: 180,
      },
      performance: {
        avgResponseTime: 45,
        cacheHitRate: 0.78,
        errorRate: 0.02,
      },
      popularQueries: [
        { query: 'Bun.secrets.get', count: 45, context: 'secrets' },
        { query: 'Bun.file upload', count: 32, context: 'r2' },
        { query: 'scanner validation', count: 28, context: 'scanner' },
        { query: 'error handling', count: 25, context: 'general' },
      ],
    };

    console.log(styled('📈 MCP Usage Statistics (Last 24h):', 'accent'));
    console.log(styled(`  Searches: ${mockMetrics.usage.searches}`, 'primary'));
    console.log(styled(`  Diagnoses: ${mockMetrics.usage.diagnoses}`, 'success'));
    console.log(styled(`  Examples: ${mockMetrics.usage.examples}`, 'info'));
    console.log(styled(`  Validations: ${mockMetrics.usage.validations}`, 'warning'));
    console.log('');

    console.log(styled('⚡ Performance Metrics:', 'accent'));
    console.log(styled(`  Avg Response: ${mockMetrics.performance.avgResponseTime}ms`, 'primary'));
    console.log(styled(`  Cache Hit Rate: ${Math.round(mockMetrics.performance.cacheHitRate * 100)}%`, 'success'));
    console.log(styled(`  Error Rate: ${Math.round(mockMetrics.performance.errorRate * 100)}%`, 'error'));
    console.log('');

    console.log(styled('🔥 Popular Queries:', 'accent'));
    mockMetrics.popularQueries.forEach((query, i) => {
      console.log(styled(`  ${i + 1}. "${query.query}" (${query.count} times, ${query.context})`, 'info'));
    });
    console.log('');
  }

  async demonstrateR2Storage(): Promise<void> {
    console.log(styled('\n☁️ R2 Storage Structure', 'success'));
    console.log(colorBar('success', 50));
    
    console.log(styled('Your scanner-cookies bucket would contain:', 'muted'));
    console.log('');

    const structure = [
      { path: 'mcp/diagnoses/', description: 'Error diagnoses with FactoryWager fixes', count: 85 },
      { path: 'mcp/audits/', description: 'Audit trail entries and resolutions', count: 125 },
      { path: 'mcp/metrics/', description: 'Usage analytics and performance data', count: 30 },
      { path: 'mcp/indexes/', description: 'Search indexes for fast lookups', count: 3 },
    ];

    structure.forEach(item => {
      console.log(styled(`📁 ${item.path}`, 'primary'));
      console.log(styled(`   ${item.description}`, 'muted'));
      console.log(styled(`   Files: ${item.count}`, 'info'));
      console.log('');
    });

    // Show storage stats
    const mockStats = {
      objectCount: 243,
      totalSize: '15.7MB',
      mcpDataCount: 243,
      mcpDataSize: '15.7MB',
    };

    console.log(styled('📊 Bucket Statistics:', 'accent'));
    console.log(styled(`  Total Objects: ${mockStats.objectCount}`, 'primary'));
    console.log(styled(`  Total Size: ${mockStats.totalSize}`, 'info'));
    console.log(styled(`  MCP Data: ${mockStats.mcpDataCount} objects (${mockStats.mcpDataSize})`, 'success'));
    console.log('');
  }

  async demonstrateClaudeIntegration(): Promise<void> {
    console.log(styled('\n🤖 Claude Desktop Integration', 'accent'));
    console.log(colorBar('accent', 50));
    
    console.log(styled('With R2 integration, Claude Desktop gains these abilities:', 'muted'));
    console.log('');

    const capabilities = [
      {
        tool: 'SearchBunEnhanced',
        description: 'Search Bun docs with FactoryWager context',
        example: 'Search for Bun.secrets.get with secrets management context',
      },
      {
        tool: 'AuditSearch',
        description: 'Search your actual audit history in R2',
        example: 'Find similar permission errors from the last 24 hours',
      },
      {
        tool: 'StoreDiagnosis',
        description: 'Store diagnoses for institutional learning',
        example: 'Save this error diagnosis for future reference',
      },
      {
        tool: 'GetFactoryWagerMetrics',
        description: 'Get R2 storage and usage metrics',
        example: 'Show MCP usage statistics and storage info',
      },
    ];

    capabilities.forEach((cap, i) => {
      console.log(styled(`${i + 1}. ${cap.tool}`, 'success'));
      console.log(styled(`   ${cap.description}`, 'muted'));
      console.log(styled(`   Example: "${cap.example}"`, 'info'));
      console.log('');
    });
  }

  showSetupInstructions(): void {
    console.log(styled('\n🛠️ Setup Instructions', 'warning'));
    console.log(colorBar('warning', 50));
    
    console.log(styled('To enable R2 storage, follow these steps:', 'muted'));
    console.log('');

    const steps = [
      {
        step: 1,
        title: 'Configure R2 Credentials',
        command: 'cp .env.example .env',
        details: 'Edit .env with your Cloudflare R2 credentials',
      },
      {
        step: 2,
        title: 'Test Connection',
        command: 'bun run test:r2',
        details: 'Verify R2 connectivity and permissions',
      },
      {
        step: 3,
        title: 'Run Full Setup',
        command: 'bun run setup:mcp',
        details: 'Configure Claude Desktop and test all components',
      },
      {
        step: 4,
        title: 'Start Using MCP',
        command: 'bun run fw-docs search "Bun.secrets.get"',
        details: 'Begin using the enhanced documentation system',
      },
    ];

    steps.forEach(step => {
      console.log(styled(`${step.step}. ${step.title}`, 'primary'));
      console.log(styled(`   Command: ${step.command}`, 'info'));
      console.log(styled(`   ${step.details}`, 'muted'));
      console.log('');
    });

    console.log(styled('📚 For detailed instructions, see:', 'accent'));
    console.log(styled('   - R2_MCP_INTEGRATION.md', 'info'));
    console.log(styled('   - MCP_INTEGRATION.md', 'info'));
    console.log(styled('   - MCP_USAGE.md (generated after setup)', 'info'));
    console.log('');
  }

  async run(): Promise<void> {
    try {
      await this.demonstrateErrorDiagnosis();
      await this.demonstrateAuditSearch();
      await this.demonstrateMetrics();
      await this.demonstrateR2Storage();
      await this.demonstrateClaudeIntegration();
      this.showSetupInstructions();

      console.log(styled('🎉 Demo Complete!', 'success'));
      console.log(styled('Your FactoryWager MCP system is ready for R2 integration!', 'accent'));
      console.log(styled('Configure your R2 credentials to enable full functionality.', 'muted'));
      console.log('');

    } catch (error) {
      console.error(styled(`❌ Demo failed: ${error.message}`, 'error'));
    }
  }
}

// Run the demo
if (import.meta.main) {
  const demo = new MCPDemo();
  await demo.run();
}
