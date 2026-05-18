#!/usr/bin/env bun

/**
 * 🏛️ ARB Decision Manager
 * 
 * Utility script for managing Architecture Review Board decisions.
 * Provides commands to create, list, search, and validate ARB decisions.
 * 
 * Usage:
 *   bun run scripts/arb-decision-manager.ts <command> [options]
 * 
 * Commands:
 *   create    Create a new ARB decision
 *   list      List all ARB decisions
 *   search    Search decisions by criteria
 *   validate  Validate decision format
 *   stats     Show decision statistics
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ARBDecision {
  id: string;
  title: string;
  date: string;
  status: 'approved' | 'rejected' | 'conditional' | 'pending';
  participants: string[];
  context: string;
  decision: string;
  consequences?: string[];
  alternatives?: Array<{
    option: string;
    reason?: string;
    status?: string;
  }>;
  conditions?: Array<{
    requirement: string;
    rationale: string;
    owner: string;
    deadline: string;
  }>;
  implementation?: {
    timeline: string;
    owner: string;
    tracking?: string;
    phases?: string[];
  };
  playbookAlignment: {
    tenets: string[];
    lenses: string[];
    score: number;
    notes?: string;
  };
  riskAssessment?: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
    mitigations?: string[];
  };
  successCriteria?: string[];
  reviewDate?: string;
  followUpActions?: string[];
}

class ARBDecisionManager {
  private decisionsDir = 'docs/arb-decisions';

  async createDecision(template: Partial<ARBDecision>): Promise<string> {
    const nextId = this.generateNextId();
    
    const decision: ARBDecision = {
      id: nextId,
      title: template.title || 'New ARB Decision',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      participants: template.participants || ['CTO', 'Principal Engineer'],
      context: template.context || 'Context to be filled',
      decision: template.decision || 'Decision to be made',
      playbookAlignment: {
        tenets: [],
        lenses: [],
        score: 0,
        ...template.playbookAlignment
      },
      ...template
    };

    const filename = join(this.decisionsDir, `${nextId}.json`);
    writeFileSync(filename, JSON.stringify(decision, null, 2));
    
    console.info(`✅ Created ARB decision: ${nextId}`);
    console.info(`📄 File: ${filename}`);
    
    return nextId;
  }

  async listDecisions(status?: string): Promise<ARBDecision[]> {
    const files = readdirSync(this.decisionsDir)
      .filter(f => f.endsWith('.json'))
      .sort();

    const decisions: ARBDecision[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(this.decisionsDir, file), 'utf-8');
        const decision: ARBDecision = JSON.parse(content);
        
        if (!status || decision.status === status) {
          decisions.push(decision);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse ${file}:`, error);
      }
    }

    return decisions;
  }

  async searchDecisions(query: string): Promise<ARBDecision[]> {
    const decisions = await this.listDecisions();
    const lowerQuery = query.toLowerCase();

    return decisions.filter(decision => 
      decision.title.toLowerCase().includes(lowerQuery) ||
      decision.context.toLowerCase().includes(lowerQuery) ||
      decision.decision.toLowerCase().includes(lowerQuery) ||
      decision.participants.some(p => p.toLowerCase().includes(lowerQuery))
    );
  }

  async validateDecision(decisionId: string): Promise<boolean> {
    const filename = join(this.decisionsDir, `${decisionId}.json`);
    
    if (!existsSync(filename)) {
      console.error(`❌ Decision file not found: ${filename}`);
      return false;
    }

    try {
      const content = readFileSync(filename, 'utf-8');
      const decision: ARBDecision = JSON.parse(content);

      const errors: string[] = [];

      // Required fields validation
      if (!decision.id) errors.push('Missing id');
      if (!decision.title) errors.push('Missing title');
      if (!decision.date) errors.push('Missing date');
      if (!decision.status) errors.push('Missing status');
      if (!decision.participants?.length) errors.push('Missing participants');
      if (!decision.context) errors.push('Missing context');
      if (!decision.decision) errors.push('Missing decision');
      if (!decision.playbookAlignment) errors.push('Missing playbookAlignment');

      // Status validation
      const validStatuses = ['approved', 'rejected', 'conditional', 'pending'];
      if (decision.status && !validStatuses.includes(decision.status)) {
        errors.push(`Invalid status: ${decision.status}`);
      }

      // Date format validation
      if (decision.date && !/^\d{4}-\d{2}-\d{2}$/.test(decision.date)) {
        errors.push('Invalid date format (should be YYYY-MM-DD)');
      }

      // Playbook alignment validation
      if (decision.playbookAlignment) {
        if (typeof decision.playbookAlignment.score !== 'number' || 
            decision.playbookAlignment.score < 0 || 
            decision.playbookAlignment.score > 100) {
          errors.push('Playbook alignment score must be between 0-100');
        }
      }

      if (errors.length > 0) {
        console.error(`❌ Validation failed for ${decisionId}:`);
        errors.forEach(error => console.error(`  - ${error}`));
        return false;
      }

      console.info(`✅ Decision ${decisionId} is valid`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to validate ${decisionId}:`, error);
      return false;
    }
  }

  async showStats(): Promise<void> {
    const decisions = await this.listDecisions();
    
    const stats = {
      total: decisions.length,
      approved: decisions.filter(d => d.status === 'approved').length,
      rejected: decisions.filter(d => d.status === 'rejected').length,
      conditional: decisions.filter(d => d.status === 'conditional').length,
      pending: decisions.filter(d => d.status === 'pending').length,
      averageScore: decisions.reduce((sum, d) => sum + d.playbookAlignment.score, 0) / decisions.length || 0
    };

    console.info('📊 ARB Decisions Statistics');
    console.info('═══════════════════════════');
    console.info(`Total Decisions: ${stats.total}`);
    console.info(`✅ Approved: ${stats.approved} (${(stats.approved/stats.total*100).toFixed(1)}%)`);
    console.info(`❌ Rejected: ${stats.rejected} (${(stats.rejected/stats.total*100).toFixed(1)}%)`);
    console.info(`⚠️ Conditional: ${stats.conditional} (${(stats.conditional/stats.total*100).toFixed(1)}%)`);
    console.info(`⏳ Pending: ${stats.pending} (${(stats.pending/stats.total*100).toFixed(1)}%)`);
    console.info(`📈 Average Playbook Score: ${stats.averageScore.toFixed(1)}`);

    // Recent decisions
    const recent = decisions
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    console.info('\n📅 Recent Decisions:');
    recent.forEach(decision => {
      const statusIcon = {
        approved: '✅',
        rejected: '❌', 
        conditional: '⚠️',
        pending: '⏳'
      }[decision.status];
      
      console.info(`  ${statusIcon} ${decision.id}: ${decision.title} (${decision.date})`);
    });
  }

  private generateNextId(): string {
    const year = new Date().getFullYear();
    const files = readdirSync(this.decisionsDir)
      .filter(f => f.startsWith(`ARB-${year}-`))
      .map(f => f.replace('.json', ''))
      .sort();

    if (files.length === 0) {
      return `ARB-${year}-001`;
    }

    const lastFile = files[files.length - 1];
    const lastNumber = parseInt(lastFile.split('-')[2]);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    
    return `ARB-${year}-${nextNumber}`;
  }

  async printDecisionTable(decisions: ARBDecision[]): Promise<void> {
    if (decisions.length === 0) {
      console.info('No decisions found.');
      return;
    }

    console.info('\n📋 ARB Decisions');
    console.info('═══════════════════════════════════════════════════════════════');
    console.info('ID           | Date       | Status      | Score | Title');
    console.info('─────────────┼────────────┼─────────────┼───────┼──────────────────');

    decisions.forEach(decision => {
      const statusIcon = {
        approved: '✅',
        rejected: '❌',
        conditional: '⚠️',
        pending: '⏳'
      }[decision.status];

      const title = decision.title.length > 30 
        ? decision.title.substring(0, 27) + '...'
        : decision.title;

      console.info(
        `${decision.id.padEnd(12)} | ${decision.date} | ${statusIcon} ${decision.status.padEnd(9)} | ${decision.playbookAlignment.score.toString().padStart(3)}%  | ${title}`
      );
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const manager = new ARBDecisionManager();

  try {
    switch (command) {
      case 'create':
        const title = args[1] || 'New ARB Decision';
        await manager.createDecision({ title });
        break;

      case 'list':
        const status = args[1];
        const decisions = await manager.listDecisions(status);
        await manager.printDecisionTable(decisions);
        break;

      case 'search':
        const query = args[1];
        if (!query) {
          console.error('❌ Search query required');
          process.exit(1);
        }
        const results = await manager.searchDecisions(query);
        console.info(`🔍 Search results for "${query}":`);
        await manager.printDecisionTable(results);
        break;

      case 'validate':
        const decisionId = args[1];
        if (!decisionId) {
          console.error('❌ Decision ID required');
          process.exit(1);
        }
        const isValid = await manager.validateDecision(decisionId);
        process.exit(isValid ? 0 : 1);
        break;

      case 'stats':
        await manager.showStats();
        break;

      default:
        console.info('🏛️ ARB Decision Manager');
        console.info('');
        console.info('Usage: bun run scripts/arb-decision-manager.ts <command> [options]');
        console.info('');
        console.info('Commands:');
        console.info('  create [title]     Create a new ARB decision');
        console.info('  list [status]      List all decisions (optionally filter by status)');
        console.info('  search <query>     Search decisions by title, context, or participants');
        console.info('  validate <id>      Validate decision format');
        console.info('  stats              Show decision statistics');
        console.info('');
        console.info('Examples:');
        console.info('  bun run scripts/arb-decision-manager.ts create "New API Gateway"');
        console.info('  bun run scripts/arb-decision-manager.ts list approved');
        console.info('  bun run scripts/arb-decision-manager.ts search "payment"');
        console.info('  bun run scripts/arb-decision-manager.ts validate ARB-2025-001');
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
