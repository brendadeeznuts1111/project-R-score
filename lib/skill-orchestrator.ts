/**
 * SkillOrchestrator - Bridges Kimi Skills with Dynamic Domain APIs
 * 
 * Parses SKILL.md files, executes flow diagrams, and maps skill instructions
 * to domain methods. Core orchestration layer for domain-aware automation.
 * 
 * Features:
 * - Resilience policies (retries, timeouts, fallback nodes)
 * - Schema-declared error handling
 * - Exponential backoff retry logic
 * - Per-step policy overrides
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

// ============================================================================
// RESILIENCE LAYER - Error Handling & Retry Logic
// ============================================================================

interface ResiliencePolicy {
  retries: number;
  retryStrategy: 'fixed' | 'exponential_backoff' | 'linear';
  timeoutMs: number;
  onFailure: 'escalate' | 'skip' | 'compensate' | 'halt' | 'fallback';
  fallbackNode?: string;
  compensationStep?: string;
  idempotent?: boolean;
}

interface StepResult {
  status: 'success' | 'error' | 'timeout' | 'compensated' | 'escalated' | 'skipped' | 'fallback';
  result?: any;
  error?: Error;
  attempts: number;
  durationMs: number;
  jumpTo?: string;
  continueTo?: string;
}

class FlowExecutionError extends Error {
  constructor(
    message: string,
    public stepId: string,
    public attempts: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FlowExecutionError';
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Default resilience policy - used when no policy specified
 */
const DEFAULT_RESILIENCE: ResiliencePolicy = {
  retries: 2,
  retryStrategy: 'exponential_backoff',
  timeoutMs: 5000,
  onFailure: 'escalate',
  idempotent: false
};

/**
 * Parse YAML frontmatter with support for nested objects
 */
function parseYamlFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const lines = match[1].split('\n');
  const result: Record<string, any> = {};
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    
    // Top-level key
    const topMatch = line.match(/^(\w+):\s*(.*)$/);
    if (topMatch) {
      const key = topMatch[1];
      const value = topMatch[2].trim();
      
      if (value === '') {
        // Nested object - parse indented content
        const { obj, nextIndex } = parseIndentedBlock(lines, i + 1, 2);
        result[key] = obj;
        i = nextIndex;
      } else {
        result[key] = parseYamlValue(value);
        i++;
      }
    } else {
      i++;
    }
  }
  
  return result;
}

function parseIndentedBlock(
  lines: string[], 
  startIndex: number, 
  minIndent: number
): { obj: any; nextIndex: number } {
  const obj: any = {};
  let i = startIndex;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }
    
    const indent = line.match(/^(\s*)/)?.[1].length || 0;
    
    // Check if we've exited this block
    if (indent < minIndent) {
      break;
    }
    
    if (indent >= minIndent) {
      // Match key (supports quoted keys with spaces)
      const keyMatch = line.match(new RegExp(`^\\s{${minIndent}}([\\w"'][^:]*):\\s*(.*)$`));
      if (keyMatch) {
        const rawKey = keyMatch[1].trim();
        // Remove quotes from key
        const key = rawKey.replace(/^["']|["']$/g, '');
        const value = keyMatch[2].trim();
        
        if (value === '') {
          // Deeper nesting
          const { obj: nestedObj, nextIndex } = parseIndentedBlock(lines, i + 1, indent + 2);
          obj[key] = nestedObj;
          i = nextIndex;
        } else {
          obj[key] = parseYamlValue(value);
          i++;
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return { obj, nextIndex: i };
}

function parseYamlValue(value: string): any {
  // Remove quotes
  value = value.replace(/^["']|["']$/g, '');
  
  // Handle arrays
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
  }
  
  // Handle numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  
  // Handle booleans
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  
  return value;
}

export class SkillOrchestrator {
  private skillCache = new Map<string, { content: string; mtime: number }>();
  private defaultResilience: ResiliencePolicy = DEFAULT_RESILIENCE;
  
  /**
   * Load a skill using kimi-cli discovery priority:
   * 1. Project-level (.agents/skills/)
   * 2. User-level (~/.config/agents/skills/)
   * 3. Built-in (not implemented here)
   */
  async loadSkill(skillName: string): Promise<string> {
    const cached = this.skillCache.get(skillName);
    
    const paths = [
      join(process.cwd(), '.agents', 'skills', skillName, 'SKILL.md'),
      join(process.env.HOME || '~', '.config', 'agents', 'skills', skillName, 'SKILL.md'),
      join(process.env.HOME || '~', '.kimi', 'skills', skillName, 'SKILL.md'),
    ];

    for (const path of paths) {
      if (existsSync(path)) {
        const stats = await import('fs').then(fs => fs.statSync(path));
        
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
   * Parse SKILL.md frontmatter with nested resilience support
   */
  parseFrontmatter(content: string): Record<string, any> {
    return parseYamlFrontmatter(content);
  }

  /**
   * Extract resilience policy for a specific step
   */
  private getStepPolicy(
    stepText: string, 
    frontmatter: Record<string, any>
  ): ResiliencePolicy {
    const defaultPolicy = frontmatter.resilience?.default_policy || this.defaultResilience;
    const stepPolicies = frontmatter.resilience?.step_policies || {};
    
    // Find matching step policy (exact match or contains)
    for (const [stepName, policy] of Object.entries(stepPolicies)) {
      if (stepText.includes(stepName) || stepName === stepText) {
        return { ...defaultPolicy, ...policy };
      }
    }
    
    return defaultPolicy;
  }

  /**
   * Execute with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    policy: ResiliencePolicy,
    stepId: string
  ): Promise<{ result: T; attempts: number }> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= policy.retries + 1; attempt++) {
      try {
        const result = await fn();
        return { result, attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt <= policy.retries) {
          // Calculate backoff delay
          const delay = this.calculateBackoff(attempt, policy.retryStrategy);
          
          this.logEvent('step_retry', {
            step: stepId,
            attempt,
            maxRetries: policy.retries,
            delayMs: delay,
            error: lastError.message
          });
          
          await sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Calculate backoff delay based on strategy
   */
  private calculateBackoff(attempt: number, strategy: string): number {
    const baseDelay = 1000; // 1 second base
    
    switch (strategy) {
      case 'fixed':
        return baseDelay;
      case 'linear':
        return baseDelay * attempt;
      case 'exponential_backoff':
      default:
        return baseDelay * Math.pow(2, attempt - 1);
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    stepId: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Step "${stepId}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Execute a flow skill with resilience
   */
  async executeFlowSkill(skillName: string, targetDomain: Domain): Promise<StepResult[]> {
    const skillContent = await this.loadSkill(skillName);
    const frontmatter = this.parseFrontmatter(skillContent);
    
    if (frontmatter.type !== 'flow') {
      throw new Error(`Skill "${skillName}" is not a flow skill`);
    }

    const flowSteps = this.parseFlowDiagram(skillContent);
    const results: StepResult[] = [];
    
    for (const step of flowSteps) {
      const policy = this.getStepPolicy(step.text, frontmatter);
      const result = await this.executeResilientStep(step, targetDomain, policy);
      results.push(result);
      
      // Handle flow control (jump to fallback, halt, etc.)
      if (result.jumpTo) {
        // Find and execute fallback node
        const fallbackStep = flowSteps.find(s => s.text.includes(result.jumpTo!));
        if (fallbackStep) {
          const fallbackResult = await this.executeResilientStep(
            fallbackStep, 
            targetDomain, 
            { ...policy, onFailure: 'halt' } // Don't retry fallback
          );
          results.push(fallbackResult);
        }
        break;
      }
      
      if (result.status === 'escalated' || result.status === 'halt') {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single step with full resilience handling
   */
  private async executeResilientStep(
    step: FlowNode,
    domain: Domain,
    policy: ResiliencePolicy
  ): Promise<StepResult> {
    const startTime = Date.now();
    
    const executor = async () => {
      return await this.executeWithTimeout(
        () => this.executeFlowStep(step, domain),
        policy.timeoutMs,
        step.id
      );
    };

    try {
      const { result, attempts } = await this.executeWithRetry(
        executor,
        policy,
        step.id
      );
      
      this.logEvent('step_success', {
        step: step.text,
        attempts,
        durationMs: Date.now() - startTime
      });
      
      return {
        status: 'success',
        result,
        attempts,
        durationMs: Date.now() - startTime
      };
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const durationMs = Date.now() - startTime;
      
      this.logEvent('step_failed', {
        step: step.text,
        error: err.message,
        durationMs
      });
      
      // Handle failure according to policy
      return this.handleFailure(step, err, policy, durationMs);
    }
  }

  /**
   * Handle step failure based on policy
   */
  private handleFailure(
    step: FlowNode,
    error: Error,
    policy: ResiliencePolicy,
    durationMs: number
  ): StepResult {
    switch (policy.onFailure) {
      case 'fallback':
        if (policy.fallbackNode) {
          return {
            status: 'fallback',
            error,
            attempts: policy.retries + 1,
            durationMs,
            jumpTo: policy.fallbackNode
          };
        }
        // Fall through to escalate if no fallback specified
        
      case 'escalate':
        this.notifyDomainCouncil(step.text, error);
        return {
          status: 'escalated',
          error,
          attempts: policy.retries + 1,
          durationMs,
          jumpTo: 'END'
        };
        
      case 'skip':
        return {
          status: 'skipped',
          error,
          attempts: policy.retries + 1,
          durationMs,
          continueTo: step.next?.[0]
        };
        
      case 'compensate':
        if (policy.compensationStep) {
          this.logEvent('compensation_triggered', {
            step: step.text,
            compensation: policy.compensationStep
          });
        }
        return {
          status: 'compensated',
          error,
          attempts: policy.retries + 1,
          durationMs,
          jumpTo: 'END'
        };
        
      case 'halt':
      default:
        throw new FlowExecutionError(
          `Step "${step.text}" failed permanently: ${error.message}`,
          step.id,
          policy.retries + 1,
          error
        );
    }
  }

  /**
   * Execute a single flow step by mapping to domain methods
   */
  private async executeFlowStep(step: FlowNode, domain: Domain): Promise<any> {
    const text = step.text.toLowerCase();
    const healthIntent =
      text.includes('health') || text.includes('vital') || text.includes('status');
    const diagnosticIntent =
      text.includes('diagnose') || text.includes('diagnostic') || text.includes('diagnosis');
    
    if (text.includes('check') && healthIntent) {
      return await domain.checkHealth?.() ?? { healthy: true };
    }
    
    if (diagnosticIntent) {
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
    
    return { unmapped: true, text: step.text };
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
      const nodeMatch = line.match(/(\w+)\s*\[(.+?)\]/);
      if (nodeMatch) {
        nodes.push({
          id: nodeMatch[1],
          type: 'action',
          text: nodeMatch[2]
        });
      }
      
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
   * Get skill metadata including resilience config
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

  /**
   * Set default resilience policy
   */
  setDefaultResilience(policy: Partial<ResiliencePolicy>): void {
    this.defaultResilience = { ...DEFAULT_RESILIENCE, ...policy };
  }

  /**
   * Log event to performance monitor if available
   */
  private logEvent(type: string, data: any): void {
    if (typeof DomainPerformanceMonitor !== 'undefined') {
      DomainPerformanceMonitor.recordEvent(type, data);
    }
  }

  /**
   * Notify domain council of escalation
   */
  private notifyDomainCouncil(stepText: string, error: Error): void {
    this.logEvent('domain_council_escalation', {
      step: stepText,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Lightweight performance monitor — logs structured JSON entries
const DomainPerformanceMonitor = {
  recordEvent(type: string, data: any): void {
    const entry = { timestamp: new Date().toISOString(), type,
      ...(typeof data === 'object' ? data : { value: data }) };
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[perf:${type}]`, JSON.stringify(entry));
    }
  },
};

// Export error classes for consumers
export { FlowExecutionError, TimeoutError };
export type { ResiliencePolicy, StepResult, FlowNode, Domain };
