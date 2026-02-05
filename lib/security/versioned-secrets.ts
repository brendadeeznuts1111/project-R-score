/**
 * 🔐 FactoryWager Versioned Secret Manager v5.1
 * 
 * Temporal-security continuum with immutable version history,
 * one-click rollback, and lifecycle management
 * 
 * @version 5.1
 */

import { styled, log, FW_COLORS } from '../theme/colors.ts';
import { Utils } from '../utils/index.ts';
import type { R2Metadata } from '../types/index.ts';

export interface VersionMetadata {
  author?: string;
  description?: string;
  level?: 'STANDARD' | 'HIGH' | 'CRITICAL';
  tags?: Record<string, string>;
  reason?: string;
}

export interface VersionNode {
  version: string;
  timestamp: string;
  author: string;
  description?: string;
  hash: string;
  previous?: string;
  action: 'SET' | 'ROLLBACK' | 'ROTATE' | 'INITIAL';
  metadata?: VersionMetadata;
  archivedKey?: string;
  visual?: {
    color: string;
    icon: string;
    theme: string;
  };
}

export interface RollbackOptions {
  confirm?: boolean;
  reason?: string;
  dryRun?: boolean;
}

export interface LifecycleRule {
  key: string;
  schedule: {
    type: 'cron' | 'interval' | 'event';
    cron?: string;
    intervalMs?: number;
    event?: string;
  };
  action: 'rotate' | 'expire' | 'notify';
  metadata?: {
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    notify?: string[];
    documentation?: string;
  };
  ruleId?: string;
  nextRotation?: Date;
}

export class VersionedSecretManager {
  private versionGraph = new Map<string, VersionNode[]>();
  private r2Bucket: any; // Would be R2 bucket instance
  
  constructor(r2Bucket?: any) {
    this.r2Bucket = r2Bucket;
  }
  
  async set(key: string, value: string, metadata: VersionMetadata = {}) {
    // Get current version
    const current = await this.getWithVersion(key);
    
    // Generate new version
    const newVersion = this.generateVersion(
      key, 
      current?.version, 
      metadata
    );
    
    // Store with version in key
    const versionedKey = `${key}@${newVersion}`;
    
    // Store in Bun secrets with version metadata
    await Bun.secrets.set(versionedKey, value, {
      description: metadata.description || `Version ${newVersion} of ${key}`,
      tags: {
        ...metadata.tags,
        'factorywager:version': newVersion,
        'factorywager:previous': current?.version || 'none',
        'factorywager:author': metadata.author || 'system',
        'factorywager:action': 'SET',
        'visual:color': FW_COLORS[metadata.level === 'CRITICAL' ? 'error' : 
                              metadata.level === 'HIGH' ? 'warning' : 'success']
      }
    });
    
    // Update version graph
    await this.updateVersionGraph(key, {
      version: newVersion,
      timestamp: new Date().toISOString(),
      author: metadata.author || 'system',
      description: metadata.description,
      hash: Bun.hash.sha256(value).toString('hex'),
      previous: current?.version,
      action: 'SET',
      metadata
    });
    
    // Update current pointer
    await Bun.secrets.set(key, value, {
      description: `Current: ${newVersion} - ${metadata.description || 'No description'}`,
      tags: { 
        'factorywager:current-version': newVersion,
        'factorywager:last-updated': new Date().toISOString()
      }
    });
    
    // Audit the change
    await this.auditVersionChange(key, newVersion, 'SET', metadata);
    
    log.success(`Set ${key} to version ${newVersion}`);
    log.metric('Versioned key', versionedKey, 'muted');
    
    return { version: newVersion, key: versionedKey };
  }
  
  async getWithVersion(key: string, version?: string) {
    const targetVersion = version || 'current';
    
    if (targetVersion === 'current') {
      try {
        const value = await Bun.secrets.get(key);
        const metadata = await this.getMetadata(key);
        return { 
          value, 
          version: metadata.tags?.['factorywager:current-version'] || 'unknown', 
          metadata 
        };
      } catch {
        throw new Error(`Secret ${key} not found`);
      }
    }
    
    // Get specific version
    const versionedKey = `${key}@${version}`;
    try {
      const value = await Bun.secrets.get(versionedKey);
      const metadata = await this.getMetadata(versionedKey);
      return { value, version, metadata };
    } catch {
      // Try to find in version graph
      const versions = this.versionGraph.get(key);
      const found = versions?.find(v => v.version === version);
      if (found?.archivedKey && this.r2Bucket) {
        // Retrieve from R2 archive
        const archived = await this.r2Bucket.get(found.archivedKey);
        return { 
          value: await archived?.text(), 
          version, 
          metadata: found 
        };
      }
      throw new Error(`Version ${version} not found for ${key}`);
    }
  }
  
  async rollback(key: string, targetVersion: string, options: RollbackOptions = {}) {
    const { confirm = true, reason = 'Manual rollback', dryRun = false } = options;
    
    // Get target version
    const target = await this.getWithVersion(key, targetVersion);
    
    // Get current for comparison
    const current = await this.getWithVersion(key);
    
    // Show diff
    const diff = this.generateDiff(current.value, target.value);
    
    log.section(`Rollback ${key}`, 'warning');
    log.metric('From version', current.version, 'muted');
    log.metric('To version', targetVersion, 'primary');
    log.metric('Changed', diff.changed ? 'Yes' : 'No', diff.changed ? 'warning' : 'success');
    
    if (diff.changed) {
      console.log(styled('   Preview (first 100 chars):', 'muted'));
      console.log(styled(`   - ${current.value.substring(0, 100)}...`, 'error'));
      console.log(styled(`   + ${target.value.substring(0, 100)}...`, 'success'));
    }
    
    // Confirm if needed
    if (confirm && !dryRun) {
      const confirmed = await this.promptConfirmation(
        `Rollback ${key} to version ${targetVersion}?` 
      );
      if (!confirmed) {
        log.warning('Rollback cancelled');
        return { cancelled: true };
      }
    }
    
    if (!dryRun) {
      // Perform rollback by updating current pointer
      await Bun.secrets.set(key, target.value, {
        description: `Rollback to ${targetVersion}: ${reason}`,
        tags: {
          'factorywager:current-version': targetVersion,
          'factorywager:rollback-from': current.version,
          'factorywager:rollback-reason': reason,
          'factorywager:rollback-timestamp': new Date().toISOString(),
          'factorywager:action': 'ROLLBACK',
          'visual:color': FW_COLORS.warning
        }
      });
      
      // Update version graph
      await this.updateVersionGraph(key, {
        version: targetVersion,
        timestamp: new Date().toISOString(),
        author: 'system',
        description: `Rollback: ${reason}`,
        hash: target.hash,
        previous: current.version,
        action: 'ROLLBACK',
        metadata: { reason, from: current.version }
      });
      
      // Audit the rollback
      await this.auditVersionChange(
        key, 
        targetVersion, 
        'ROLLBACK', 
        { reason, from: current.version }
      );
      
      log.success(`Rolled back ${key} to ${targetVersion}`);
    }
    
    return {
      success: !dryRun,
      dryRun,
      from: current.version,
      to: targetVersion,
      diff,
      reason
    };
  }
  
  async getHistory(key: string, limit = 10) {
    // Try to get from version graph
    let history = this.versionGraph.get(key) || [];
    
    // If not in memory, try to load from R2
    if (history.length === 0 && this.r2Bucket) {
      const graphKey = `versions/graph/${key}.json`;
      try {
        const graphData = await this.r2Bucket.get(graphKey);
        history = JSON.parse(await graphData.text());
        this.versionGraph.set(key, history);
      } catch {
        // No history found
      }
    }
    
    return history.slice(-limit).reverse(); // Latest first
  }
  
  private generateVersion(key: string, currentVersion?: string, metadata?: VersionMetadata): string {
    const timestamp = Date.now();
    const base = key.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    if (metadata?.tags?.['version-scheme'] === 'semantic') {
      // Semantic versioning
      const current = currentVersion || 'v0.0.0';
      const parts = current.replace('v', '').split('.').map(Number);
      parts[2]++; // Increment patch
      return `v${parts.join('.')}`;
    }
    
    if (metadata?.tags?.['version-scheme'] === 'date') {
      // Date-based versioning
      const date = new Date().toISOString().split('T')[0];
      return `${base}-${date}`;
    }
    
    // Default: timestamp-based
    return `${base}-${timestamp}`;
  }
  
  private generateDiff(oldVal: string, newVal: string) {
    const oldHash = Bun.hash.sha256(oldVal).toString('hex');
    const newHash = Bun.hash.sha256(newVal).toString('hex');
    
    return {
      changed: oldHash !== newHash,
      lengthChange: newVal.length - oldVal.length,
      oldHash,
      newHash,
      similarity: this.calculateSimilarity(oldVal, newVal)
    };
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private async updateVersionGraph(key: string, node: VersionNode) {
    const history = this.versionGraph.get(key) || [];
    
    // Add visual metadata
    node.visual = {
      color: this.getColorForAction(node.action),
      icon: this.getIconForAction(node.action),
      theme: `factorywager-version-${node.action.toLowerCase()}` 
    };
    
    history.push(node);
    this.versionGraph.set(key, history);
    
    // Store in R2 if available
    if (this.r2Bucket) {
      const graphKey = `versions/graph/${key}.json`;
      await this.r2Bucket.put(graphKey, JSON.stringify(history, null, 2), {
        customMetadata: {
          'graph:type': 'secret-versions',
          'graph:key': key,
          'graph:versions': history.length.toString(),
          'graph:latest': node.version,
          'visual:render': 'force-directed',
          'factorywager:version': '5.1'
        }
      });
    }
  }
  
  private getColorForAction(action: string): string {
    switch (action) {
      case 'SET': return FW_COLORS.success;
      case 'ROLLBACK': return FW_COLORS.warning;
      case 'ROTATE': return FW_COLORS.accent;
      case 'INITIAL': return FW_COLORS.primary;
      default: return FW_COLORS.muted;
    }
  }
  
  private getIconForAction(action: string): string {
    switch (action) {
      case 'SET': return '✅';
      case 'ROLLBACK': return '🔄';
      case 'ROTATE': return '🔄';
      case 'INITIAL': return '🎯';
      default: return '📝';
    }
  }
  
  private async getMetadata(key: string): Promise<any> {
    // This would need to be implemented based on Bun.secrets API capabilities
    // For now, return empty metadata
    return { tags: {} };
  }
  
  private async auditVersionChange(key: string, version: string, action: string, metadata?: any) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      key,
      version,
      action,
      metadata,
      factorywager: '5.1'
    };
    
    // Store audit in R2 if available
    if (this.r2Bucket) {
      const auditKey = `audit/secrets/${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await this.r2Bucket.put(auditKey, JSON.stringify(auditEntry, null, 2), {
        customMetadata: {
          'audit:type': 'secret-version-change',
          'audit:key': key,
          'audit:version': version,
          'audit:action': action,
          'factorywager:version': '5.1'
        }
      });
    }
  }
  
  private async promptConfirmation(message: string): Promise<boolean> {
    // In a real implementation, this would prompt the user
    // For now, return true for demo purposes
    console.log(styled(`\n${message} (y/N):`, 'warning'));
    return true;
  }
}

export default VersionedSecretManager;
