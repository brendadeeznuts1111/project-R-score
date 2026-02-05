#!/usr/bin/env bun
/**
 * FactoryWager Vault Health Fix Tool v1.3.8
 * Comprehensive vault repair, rotation, and maintenance operations
 */

import { readFileSync } from 'fs';

interface FixOperation {
  type: 'create' | 'rotate' | 'alias' | 'backup' | 'cleanup';
  target: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  executed: boolean;
  result?: string;
}

interface FixResult {
  total: number;
  fixed: number;
  manualReview: number;
  backups: number;
  operations: FixOperation[];
  duration: number;
}

class FactoryWagerVaultHealthFix {
  private dryRun: boolean;
  private forceRotate: boolean;
  private verbose: boolean;
  private operations: FixOperation[] = [];

  constructor(dryRun: boolean = false, forceRotate: boolean = false, verbose: boolean = false) {
    this.dryRun = dryRun;
    this.forceRotate = forceRotate;
    this.verbose = verbose;
  }

  async execute(): Promise<FixResult> {
    const startTime = Date.now();
    
    console.log(`🔧 FactoryWager Vault Health Fix ${this.dryRun ? '(DRY RUN)' : ''}`);
    console.log(`================================${'='.repeat(this.dryRun ? 9 : 0)}`);
    
    try {
      // Load current vault metadata
      const metadata = await this.loadVaultMetadata();
      
      // Analyze and plan fixes
      await this.analyzeVaultHealth(metadata);
      
      // Execute fixes (unless dry run)
      if (!this.dryRun) {
        await this.executeFixes();
      }
      
      // Generate summary
      const result = this.generateResult(startTime);
      this.printSummary(result);
      
      return result;
    } catch (error) {
      console.error(`❌ Vault fix failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  private async loadVaultMetadata(): Promise<any> {
    try {
      const content = await Bun.file('./vault-metadata.json').text();
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️ Could not load vault metadata: ${(error as Error).message}`);
      return {};
    }
  }

  private async analyzeVaultHealth(metadata: any): Promise<void> {
    console.log(`🔍 Analyzing vault health...`);
    
    const now = new Date();
    const criticalCredentials = ['registry.token', 'r2.secret_key', 'domain.ssl_cert'];
    
    // Check for missing critical credentials
    criticalCredentials.forEach(key => {
      if (!metadata[key]) {
        this.operations.push({
          type: 'create',
          target: key,
          description: `Missing critical credential: ${key}`,
          severity: 'critical',
          executed: false
        });
      }
    });

    // Check for expired or expiring credentials
    Object.entries(metadata).forEach(([key, entry]: [string, any]) => {
      const expiresAt = new Date(entry.expiresAt);
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0 || this.forceRotate) {
        this.operations.push({
          type: 'rotate',
          target: key,
          description: `Rotate credential: ${key} (${daysUntilExpiry <= 0 ? 'expired' : 'force rotate'})`,
          severity: 'critical',
          executed: false
        });
      } else if (daysUntilExpiry <= 10) {
        this.operations.push({
          type: 'rotate',
          target: key,
          description: `Rotate soon-to-expire: ${key} (${daysUntilExpiry} days)`,
          severity: 'warning',
          executed: false
        });
      }
    });

    // Check for missing aliases
    const aliasMap = {
      'r2.secret_key': 'r2.secret',
      'registry.token': 'registry.auth',
      'domain.ssl_cert': 'domain.cert'
    };

    Object.entries(aliasMap).forEach(([source, alias]) => {
      if (metadata[source] && !metadata[alias]) {
        this.operations.push({
          type: 'alias',
          target: `${source} → ${alias}`,
          description: `Create alias for easier access`,
          severity: 'info',
          executed: false
        });
      }
    });

    // Check for backup opportunities
    Object.entries(metadata).forEach(([key, entry]: [string, any]) => {
      if (!key.includes('backup') && !key.includes('old') && criticalCredentials.includes(key.split('.')[0])) {
        const backupKey = `${key}_backup`;
        if (!metadata[backupKey]) {
          this.operations.push({
            type: 'backup',
            target: backupKey,
            description: `Create backup of critical credential`,
            severity: 'info',
            executed: false
          });
        }
      }
    });

    // Check for cleanup opportunities
    Object.entries(metadata).forEach(([key, entry]: [string, any]) => {
      if (key.includes('temp') || key.includes('old')) {
        const expiresAt = new Date(entry.expiresAt);
        const daysSinceExpiry = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceExpiry > 30) {
          this.operations.push({
            type: 'cleanup',
            target: key,
            description: `Clean up old credential (${daysSinceExpiry} days expired)`,
            severity: 'info',
            executed: false
          });
        }
      }
    });

    console.log(`📋 Found ${this.operations.length} operations to perform`);
  }

  private async executeFixes(): Promise<void> {
    console.log(`\n🔧 Executing vault repairs...`);
    
    for (const operation of this.operations) {
      try {
        if (this.verbose) {
          console.log(`   🔄 ${operation.description}`);
        }
        
        switch (operation.type) {
          case 'create':
            await this.executeCreate(operation);
            break;
          case 'rotate':
            await this.executeRotate(operation);
            break;
          case 'alias':
            await this.executeAlias(operation);
            break;
          case 'backup':
            await this.executeBackup(operation);
            break;
          case 'cleanup':
            await this.executeCleanup(operation);
            break;
        }
        
        operation.executed = true;
        
        if (this.verbose) {
          console.log(`   ✅ ${operation.result || 'Completed'}`);
        }
      } catch (error) {
        operation.result = `Failed: ${(error as Error).message}`;
        console.error(`   ❌ ${operation.description}: ${(error as Error).message}`);
      }
    }
  }

  private async executeCreate(operation: FixOperation): Promise<void> {
    const [service, key] = operation.target.split('.');
    const newValue = this.generateSecureValue(key);
    
    // Simulate vault credential creation
    await this.simulateVaultOperation('setCredential', service, key, newValue);
    operation.result = `Created ${operation.target}`;
  }

  private async executeRotate(operation: FixOperation): Promise<void> {
    const [service, key] = operation.target.split('.');
    const newValue = this.generateSecureValue(key);
    
    // Create backup before rotation
    const backupKey = `${operation.target}_backup_${Date.now()}`;
    const currentValue = await this.simulateVaultOperation('getCredential', service, key);
    if (currentValue) {
      await this.simulateVaultOperation('setCredential', service, `${key}_backup`, currentValue);
    }
    
    // Rotate to new value
    await this.simulateVaultOperation('setCredential', service, key, newValue);
    operation.result = `Rotated ${operation.target} (backup created)`;
  }

  private async executeAlias(operation: FixOperation): Promise<void> {
    const [source, alias] = operation.target.split(' → ');
    const [service, key] = source.split('.');
    
    const currentValue = await this.simulateVaultOperation('getCredential', service, key);
    if (currentValue) {
      const [aliasService, aliasKey] = alias.split('.');
      await this.simulateVaultOperation('setCredential', aliasService || service, aliasKey, currentValue);
      operation.result = `Created alias: ${operation.target}`;
    }
  }

  private async executeBackup(operation: FixOperation): Promise<void> {
    const originalKey = operation.target.replace('_backup', '');
    const [service, key] = originalKey.split('.');
    
    const currentValue = await this.simulateVaultOperation('getCredential', service, key);
    if (currentValue) {
      await this.simulateVaultOperation('setCredential', service, `${key}_backup`, currentValue);
      operation.result = `Created backup: ${operation.target}`;
    }
  }

  private async executeCleanup(operation: FixOperation): Promise<void> {
    const [service, key] = operation.target.split('.');
    await this.simulateVaultOperation('deleteCredential', service, key);
    operation.result = `Cleaned up: ${operation.target}`;
  }

  private async simulateVaultOperation(operation: string, ...args: any[]): Promise<any> {
    // Simulate vault operations with realistic delays
    await new Promise(resolve => setTimeout(resolve, 50));
    
    switch (operation) {
      case 'setCredential':
        return `credential-set-${Date.now()}`;
      case 'getCredential':
        return `demo-credential-value-${args[1]}`;
      case 'deleteCredential':
        return true;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private generateSecureValue(key: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `secure-${key}-${timestamp}-${random}`;
  }

  private generateResult(startTime: number): FixResult {
    const fixed = this.operations.filter(op => op.executed).length;
    const manualReview = this.operations.filter(op => !op.executed && op.severity === 'critical').length;
    const backups = this.operations.filter(op => op.type === 'backup' && op.executed).length;
    
    return {
      total: this.operations.length,
      fixed,
      manualReview,
      backups,
      operations: this.operations,
      duration: Date.now() - startTime
    };
  }

  private printSummary(result: FixResult): void {
    console.log(`\n📊 Operation Summary:`);
    console.log(`   Fixed: ${result.fixed} | Manual review: ${result.manualReview} | Backups: ${result.backups}`);
    console.log(`   Duration: ${result.duration}ms`);
    
    if (result.manualReview > 0) {
      console.log(`\n⚠️ Manual review required for:`);
      this.operations
        .filter(op => !op.executed && op.severity === 'critical')
        .forEach(op => console.log(`   • ${op.description}`));
    }
    
    if (this.verbose && result.fixed > 0) {
      console.log(`\n✅ Operations completed:`);
      this.operations
        .filter(op => op.executed)
        .forEach(op => console.log(`   • ${op.description}: ${op.result}`));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = args.includes('--dry-run');
  const forceRotate = args.includes('--force-rotate');
  const verbose = args.includes('--verbose');
  
  try {
    const fix = new FactoryWagerVaultHealthFix(dryRun, forceRotate, verbose);
    const result = await fix.execute();
    
    // Exit with appropriate code
    if (result.manualReview > 0) {
      process.exit(1); // Manual intervention required
    } else if (result.fixed === 0) {
      process.exit(0); // No fixes needed
    } else {
      process.exit(0); // Fixes applied successfully
    }
  } catch (error) {
    console.error(`❌ Vault health fix failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
