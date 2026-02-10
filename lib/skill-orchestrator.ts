/**
 * SkillOrchestrator - Bridges Kimi Skills with Dynamic Domain APIs
 * 
 * Parses SKILL.md files, executes flow diagrams, and maps skill instructions
 * to domain methods. Core orchestration layer for domain-aware automation.
 */

import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Domain interface (simplified for integration)
interface Domain {
  id: string;
  type: string;
  checkHealth?: () => Promise<HealthStatus>;
  optimize?: () => Promise<void>;
  collapse?: (property: string) => any;
  entangleWith?: (domains: Domain[]) => Promise<void>;
  autoDiagnose?: () => Promise<DiagnosisResult>;
  applyTreatment?: () => Promise<boolean>;
  fullRebuild?: () => Promise<void>;
}

interface HealthStatus {
  healthy: boolean;
  vitals: Record<string, number>;
  timestamp: number;
}

interface DiagnosisResult {
  found: boolean;
  issue?: string;
  severity?: 'low' | 'medium' | 'high';
  treatment?: string;
}

interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'action' | 'decision';
  text: string;
  next?: string[];
}

export class SkillOrchestrator {
  private skillCache = new Map<string, { content: string; mtime: number }>();
  
  /**
   * Load a skill using kimi-cli discovery priority:
   * 1. Project-level (.agents/skills/)
   * 2. User-level (~/.config/agents/skills/)
   * 3. Built-in (not implemented here)
   */
  async loadSkill(skillName: string): Promise<string> {
    // Check cache
    const cached = this.skillCache.get(skillName);
    
    // Discovery paths in priority order
    const paths = [
      // Project-level (RECOMMENDED)
      join(process.cwd(), '.agents', 'skills', skillName, 'SKILL.md'),
      // User-level (RECOMMENDED)
      join(process.env.HOME || '~', '.config', 'agents', 'skills', skillName, 'SKILL.md'),
      // Legacy fallback
      join(process.env.HOME || '~', '.kimi', 'skills', skillName, 'SKILL.md'),
    ];

    for (const path of paths) {
      if (existsSync(path)) {
        const stats = await import('fs').then(fs => fs.statSync(path));
        
        // Return cached if unchanged
        if (cached && cached.mtime === stats.mtime.getTime()) {
          return cached.content;
        }
        
        const content = await readFile(path, 'utf-8');
        this.skillCache.set(skillName, { content, mtime: stats.mtime.getTime() });
        return content;
      }
    }
    
    throw new Error(`Skill "${skillName}" not found in any discovery path`);
  }

  /**
   * Parse SKILL.md frontmatter
   */
  parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    
    const frontmatter: Record<string, any> = {};
    const lines = match[1].split('\n');
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key.trim()] = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^["']|["']$/g, ''));
        } else {
          frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
    
    return frontmatter;
  }

  /**
   * Execute a flow skill on a target domain
   */
  async executeFlowSkill(skillName: string, targetDomain: Domain): Promise<any[]> {
    const skillContent = await this.loadSkill(skillName);
    const frontmatter = this.parseFrontmatter(skillContent);
    
    if (frontmatter.type !== 'flow') {
      throw new Error(`Skill "${skillName}" is not a flow skill`);
    }

    // Simple flow execution (parse mermaid diagram)
    const flowSteps = this.parseFlowDiagram(skillContent);
    const results: any[] = [];
    
    for (const step of flowSteps) {
      const result = await this.executeFlowStep(step, targetDomain);
      results.push({ step: step.text, result, timestamp: Date.now() });
      
      // Log to performance monitor if available
      if (typeof DomainPerformanceMonitor !== 'undefined') {
        DomainPerformanceMonitor.recordEvent('flow_step_executed', {
          skill: skillName,
          domain: targetDomain.id,
          step: step.text,
          result
        });
      }
    }

    return results;
  }

  /**
   * Parse mermaid flowchart from SKILL.md
   */
  private parseFlowDiagram(content: string): FlowNode[] {
    const flowMatch = content.match(/```mermaid\n([\s\S]*?)```/);
    if (!flowMatch) return [];

    const lines = flowMatch[1].split('\n');
    const nodes: FlowNode[] = [];
    
    for (const line of lines) {
      // Simple parsing of node definitions
      const nodeMatch = line.match(/(\w+)\s*\[(.+?)\]/);
      if (nodeMatch) {
        nodes.push({
          id: nodeMatch[1],
          type: 'action',
          text: nodeMatch[2]
        });
      }
      
      // Decision nodes
      const decisionMatch = line.match(/(\w+)\s*\{(.+?)\}/);
      if (decisionMatch) {
        nodes.push({
          id: decisionMatch[1],
          type: 'decision',
          text: decisionMatch[2]
        });
      }
    }

    return nodes;
  }

  /**
   * Execute a single flow step by mapping to domain methods
   */
  private async executeFlowStep(step: FlowNode, domain: Domain): Promise<any> {
    const text = step.text.toLowerCase();
    
    // Map common skill instructions to domain methods
    if (text.includes('check') && text.includes('health')) {
      return await domain.checkHealth?.() ?? { healthy: true };
    }
    
    if (text.includes('diagnose')) {
      return await domain.autoDiagnose?.() ?? { found: false };
    }
    
    if (text.includes('treatment') || text.includes('heal')) {
      return await domain.applyTreatment?.() ?? false;
    }
    
    if (text.includes('rebuild')) {
      await domain.fullRebuild?.();
      return { rebuilt: true };
    }
    
    if (text.includes('optimize')) {
      await domain.optimize?.();
      return { optimized: true };
    }
    
    if (text.includes('collapse')) {
      const property = text.match(/collapse ['"](\w+)['"]/)?.[1] ?? 'state';
      return domain.collapse?.(property);
    }
    
    // Default: log unmapped step
    return { unmapped: true, text: step.text };
  }

  /**
   * Get skill metadata
   */
  async getSkillInfo(skillName: string): Promise<Record<string, any>> {
    const content = await this.loadSkill(skillName);
    return this.parseFrontmatter(content);
  }

  /**
   * Clear skill cache
   */
  clearCache(): void {
    this.skillCache.clear();
  }
}

// Global performance monitor stub (would be imported from domain system)
declare const DomainPerformanceMonitor: {
  recordEvent: (type: string, data: any) => void;
};
