/**
 * Nebula-Flow™ Cross Reference Engine
 * 
 * Performance-optimized cross-reference engine for unguarded secrets detection.
 *
 * @version 3.6.0
 * @author DuoPlus Team
 * @license MIT
 */

import { GroupConfig, PatternRecord, SecretRecord, GuardRecord } from '../nebula/orchestrator';

export interface UnguardedDetection {
  secret: SecretRecord;
  patterns: PatternRecord[];
  exposureScore: number;
}

export class CrossReferenceEngine {
  // Use Bun's native Map with memory optimization
  private secretIndex: Map<string, SecretRecord> = new Map();
  private patternIndex: Map<string, PatternRecord[]> = new Map();
  private guardIndex: Map<string, GuardRecord> = new Map();
  
  constructor(private groups: GroupConfig[]) {
    this.buildIndexes();
  }
  
  private buildIndexes() {
    // Single pass to build all indexes
    this.secretIndex = new Map();
    this.patternIndex = new Map();
    this.guardIndex = new Map();
    
    for (const group of this.groups) {
      // Index secrets by name
      group.secrets.forEach(secret => {
        this.secretIndex.set(secret.name, {
          ...secret,
          group: group.name
        });
      });
      
      // Index patterns by secret name
      group.patterns.forEach(pattern => {
        // Extract all ${SECRET_NAME} references from pattern
        const secretRefs = this.extractSecretReferences(pattern.pattern);
        
        secretRefs.forEach(secretName => {
          if (!this.patternIndex.has(secretName)) {
            this.patternIndex.set(secretName, []);
          }
          this.patternIndex.get(secretName)!.push({
            ...pattern,
            group: group.name
          });
        });
      });
      
      // Index guards by pattern hash
      group.guards?.forEach(guard => {
        this.guardIndex.set(guard.patternHash, guard);
      });
    }
  }
  
  // **Ultra-fast unguarded detection using pre-built indexes**
  findUnguardedCritical(): UnguardedDetection[] {
    const results: UnguardedDetection[] = [];
    
    for (const [secretName, secret] of this.secretIndex) {
      const patterns = this.patternIndex.get(secretName) || [];
      
      // Filter for critical patterns without guards
      const unguardedPatterns = patterns.filter(pattern => 
        pattern.risk === 'critical' && 
        !this.guardIndex.has(pattern.hash)
      );
      
      if (unguardedPatterns.length > 0) {
        results.push({
          secret,
          patterns: unguardedPatterns,
          exposureScore: this.calculateExposure(unguardedPatterns)
        });
      }
    }
    
    return results;
  }
  
  // **Bun 1.3.6+ optimized secret reference extraction**
  private extractSecretReferences(pattern: string): string[] {
    // Use Bun's regex engine for performance
    const matches = pattern.matchAll(/\$\{([A-Z_]+)\}/g);
    return Array.from(matches, m => m[1]);
  }
  
  // Calculate exposure score
  private calculateExposure(patterns: PatternRecord[]): number {
    // Each critical pattern adds 3 points, max 10
    const score = patterns.length * 3;
    return Math.min(10, score);
  }
}
