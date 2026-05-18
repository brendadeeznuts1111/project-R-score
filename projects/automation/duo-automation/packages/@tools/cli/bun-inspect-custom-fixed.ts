#!/usr/bin/env bun
// Bun.inspect.custom Integration - Fixed Version
// Shows how to properly use Symbol.for("Bun.inspect.custom") for enhanced CLI display

import { DesignSystem } from '../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../terminal/src/enhanced-unicode-formatter';

// Custom objects with Bun.inspect.custom
interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: number;
  timestamp: Date;
}

class EnhancedSystemMetrics implements SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: number;
  timestamp: Date;
  scope: string;
  status: 'operational' | 'degraded' | 'downtime';

  constructor(data: SystemMetrics, scope: string, status: 'operational' | 'degraded' | 'downtime') {
    this.cpu = data.cpu;
    this.memory = data.memory;
    this.disk = data.disk;
    this.network = data.network;
    this.uptime = data.uptime;
    this.timestamp = data.timestamp;
    this.scope = scope;
    this.status = status;
  }

  // Custom Bun inspector for beautiful CLI display
  [Symbol.for("Bun.inspect.custom")](): string {
    const lines = [
      UnicodeTableFormatter.colorize('📊 Enhanced System Metrics', DesignSystem.text.accent.blue),
      '='.repeat(50),
      '',
      UnicodeTableFormatter.colorize('🌍 Scope:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.scope, 
        this.scope === 'ENTERPRISE' ? DesignSystem.status.operational :
        this.scope === 'DEVELOPMENT' ? DesignSystem.text.accent.blue :
        DesignSystem.text.muted),
      '',
      UnicodeTableFormatter.colorize('📈 Performance Metrics:', DesignSystem.text.primary),
      `  CPU: ${UnicodeTableFormatter.colorize(`${this.cpu}%`, 
        this.cpu >= 90 ? DesignSystem.status.operational :
        this.cpu >= 70 ? DesignSystem.status.degraded :
        DesignSystem.status.downtime)}`,
      `  Memory: ${UnicodeTableFormatter.colorize(`${this.memory}%`, 
        this.memory >= 80 ? DesignSystem.status.operational :
        this.memory >= 60 ? DesignSystem.status.degraded :
        DesignSystem.status.downtime)}`,
      `  Disk: ${UnicodeTableFormatter.colorize(`${this.disk}%`, 
        this.disk >= 85 ? DesignSystem.status.operational :
        this.disk >= 65 ? DesignSystem.status.degraded :
        DesignSystem.status.downtime)}`,
      `  Network: ${UnicodeTableFormatter.colorize(`${this.network} Mbps`, 
        this.network >= 100 ? DesignSystem.status.operational :
        this.network >= 50 ? DesignSystem.status.degraded :
        DesignSystem.status.downtime)}`,
      '',
      UnicodeTableFormatter.colorize('⏱️  Uptime:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(`${this.uptime} hours`, DesignSystem.text.accent.green),
      UnicodeTableFormatter.colorize('🕐 Timestamp:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.timestamp.toLocaleString(), DesignSystem.text.secondary),
      '',
      UnicodeTableFormatter.colorize('🚦 Status:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.formatStatus(this.status),
      '='.repeat(50)
    ];
    
    return lines.join('\n');
  }
}

// Secret configuration with custom inspector
interface SecretConfig {
  serviceName: string;
  backend: string;
  secretsCount: number;
  encryptionLevel: 'standard' | 'enhanced' | 'maximum';
  lastRotated: Date;
}

class EnhancedSecretConfig implements SecretConfig {
  serviceName: string;
  backend: string;
  secretsCount: number;
  encryptionLevel: 'standard' | 'enhanced' | 'maximum';
  lastRotated: Date;
  scope: string;
  accessLevel: 'read' | 'write' | 'admin';

  constructor(data: SecretConfig, scope: string, accessLevel: 'read' | 'write' | 'admin') {
    this.serviceName = data.serviceName;
    this.backend = data.backend;
    this.secretsCount = data.secretsCount;
    this.encryptionLevel = data.encryptionLevel;
    this.lastRotated = data.lastRotated;
    this.scope = scope;
    this.accessLevel = accessLevel;
  }

  [Symbol.for("Bun.inspect.custom")](): string {
    const lines = [
      UnicodeTableFormatter.colorize('🔐 Enhanced Secret Configuration', DesignSystem.text.accent.blue),
      '='.repeat(50),
      '',
      UnicodeTableFormatter.colorize('🏢 Service Name:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.serviceName, DesignSystem.text.accent.green),
      UnicodeTableFormatter.colorize('🌍 Scope:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.scope, 
        this.scope === 'ENTERPRISE' ? DesignSystem.status.operational :
        this.scope === 'DEVELOPMENT' ? DesignSystem.text.accent.blue :
        DesignSystem.text.muted),
      '',
      UnicodeTableFormatter.colorize('🗄️  Backend:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.backend, DesignSystem.text.accent.purple),
      UnicodeTableFormatter.colorize('🔢 Secrets Count:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(`${this.secretsCount}`, DesignSystem.text.accent.blue),
      '',
      UnicodeTableFormatter.colorize('🔒 Encryption Level:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.encryptionLevel, 
        this.encryptionLevel === 'maximum' ? DesignSystem.status.operational :
        this.encryptionLevel === 'enhanced' ? DesignSystem.status.degraded :
        DesignSystem.text.muted),
      UnicodeTableFormatter.colorize('🔑 Access Level:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.accessLevel, 
        this.accessLevel === 'admin' ? DesignSystem.status.operational :
        this.accessLevel === 'write' ? DesignSystem.status.degraded :
        DesignSystem.text.muted),
      '',
      UnicodeTableFormatter.colorize('🔄 Last Rotated:', DesignSystem.text.primary) + ' ' + 
      UnicodeTableFormatter.colorize(this.lastRotated.toLocaleString(), DesignSystem.text.secondary),
      '='.repeat(50)
    ];
    
    return lines.join('\n');
  }
}

// Demo function to show Bun.inspect.custom in action
function demonstrateBunInspectCustom() {
  console.info(EmpireProDashboard.generateHeader(
    'BUN.INSPECT.CUSTOM DEMO - FIXED VERSION',
    'Custom Object Formatting for Enhanced CLI Display'
  ));

  // Create enhanced metrics with custom inspector
  const metrics = new EnhancedSystemMetrics(
    {
      cpu: 94.2,
      memory: 78.5,
      disk: 87.1,
      network: 125.3,
      uptime: 72,
      timestamp: new Date()
    },
    'ENTERPRISE',
    'operational'
  );

  console.info(UnicodeTableFormatter.colorize('🔍 Custom System Metrics Display:', DesignSystem.text.accent.blue));
  console.info(metrics[Symbol.for("Bun.inspect.custom")]()); // Explicitly call custom inspector

  // Create enhanced secret config with custom inspector
  const secretConfig = new EnhancedSecretConfig(
    {
      serviceName: 'duoplus-enterprise-prod',
      backend: 'aws-secrets-manager',
      secretsCount: 8,
      encryptionLevel: 'maximum',
      lastRotated: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    'ENTERPRISE',
    'admin'
  );

  console.info('\n' + UnicodeTableFormatter.colorize('🔐 Custom Secret Config Display:', DesignSystem.text.accent.blue));
  console.info(secretConfig[Symbol.for("Bun.inspect.custom")]()); // Explicitly call custom inspector

  // Show comparison with regular objects
  console.info('\n' + UnicodeTableFormatter.colorize('📊 Comparison: Regular vs Custom Objects', DesignSystem.text.accent.blue));
  
  const regularMetrics = {
    cpu: 94.2,
    memory: 78.5,
    disk: 87.1,
    network: 125.3,
    uptime: 72,
    timestamp: new Date()
  };

  console.info('\n🔍 Regular Object (Bun.inspect default):');
  console.info(Bun.inspect(regularMetrics, { colors: true }));

  console.info('\n🎨 Enhanced Object (Bun.inspect.custom):');
  console.info(metrics[Symbol.for("Bun.inspect.custom")]());

  // Demonstrate Bun.inspect with options
  console.info('\n' + UnicodeTableFormatter.colorize('⚙️  Bun.inspect Options Demo', DesignSystem.text.accent.blue));
  
  console.info('\n🔍 Bun.inspect with custom options:');
  console.info(Bun.inspect(metrics, { colors: true, depth: 10 }));

  // Show how to use in CLI commands
  console.info('\n' + UnicodeTableFormatter.colorize('💡 CLI Integration Examples', DesignSystem.text.accent.blue));
  
  console.info('\n📋 Example 1: Status Command with Custom Display');
  console.info('// In your CLI command:');
  console.info('if (flags["--verbose"]) {');
  console.info('  console.info(metrics[Symbol.for("Bun.inspect.custom")]());');
  console.info('} else {');
  console.info('  console.info(`Status: ${metrics.status}`);');
  console.info('}');

  console.info('\n📋 Example 2: Debug Command with Full Details');
  console.info('// In your debug command:');
  console.info('function debugObject(obj: any, name: string) {');
  console.info('  console.info(`🔍 Debug: ${name}`);');
  console.info('  if (obj[Symbol.for("Bun.inspect.custom")]) {');
  console.info('    console.info(obj[Symbol.for("Bun.inspect.custom")]());');
  console.info('  } else {');
  console.info('    console.info(Bun.inspect(obj, { colors: true }));');
  console.info('  }');
  console.info('}');

  console.info('\n📋 Example 3: Table Integration');
  console.info('// Convert custom object to table row:');
  console.info('function objectToTableRow(obj: any) {');
  console.info('  if (obj[Symbol.for("Bun.inspect.custom")]) {');
  console.info('    // Extract key data from custom object');
  console.info('    return {');
  console.info('      Name: obj.name || "Unknown",');
  console.info('      Status: obj.status || "unknown",');
  console.info('      Performance: obj.performance || 0');
  console.info('    };');
  console.info('  }');
  console.info('  return obj;');
  console.info('}');

  console.info(EmpireProDashboard.generateFooter());
}

// Main execution
demonstrateBunInspectCustom();

console.info('\n🎉 BUN.INSPECT.CUSTOM DEMO COMPLETE!');
console.info('✅ Custom object formatting for enhanced CLI display');
console.info('✅ Integration with Empire Pro v3.7 color system');
console.info('✅ Professional object visualization with UnicodeTableFormatter');
console.info('✅ CLI integration examples and best practices');
console.info('✅ Comparison with regular Bun.inspect behavior');
console.info('\n📋 KEY BENEFITS:');
console.info('  🎨 Beautiful colored output with Empire Pro branding');
console.info('  📊 Structured data presentation with sections');
console.info('  🔍 Detailed debugging information when needed');
console.info('  🚀 Professional CLI experience');
console.info('  📱 Consistent object display across commands');
console.info('\n🔧 IMPLEMENTATION TIP:');
console.info('  Always call obj[Symbol.for("Bun.inspect.custom")]()');
console.info('  explicitly to ensure custom formatting is applied');
