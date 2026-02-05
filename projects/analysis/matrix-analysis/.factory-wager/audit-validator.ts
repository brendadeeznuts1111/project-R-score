#!/usr/bin/env bun

/**
 * FactoryWager Audit Log Validator
 * Ensures audit log integrity and fixes mixed format issues
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AuditEntry {
  timestamp: string;
  workflow: string;
  exit_code: number;
  duration_seconds?: number;
  environment?: string;
  config_file?: string;
  risk_score?: number;
  metadata?: Record<string, any>;
  error?: {
    type: string;
    message: string;
    code?: string;
    context?: Record<string, any>;
  };
}

class AuditValidator {
  private auditPath: string;

  constructor(auditPath: string = '.factory-wager/audit.log') {
    this.auditPath = auditPath;
  }

  /**
   * Validates and fixes audit log format issues
   */
  async validateAndFix(): Promise<{ fixed: number; errors: string[] }> {
    if (!existsSync(this.auditPath)) {
      return { fixed: 0, errors: ['Audit file does not exist'] };
    }

    const content = readFileSync(this.auditPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const validEntries: AuditEntry[] = [];
    const errors: string[] = [];
    let fixedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Check if line is JSON format
        if (line.startsWith('{')) {
          const entry = JSON.parse(line) as AuditEntry;
          if (this.validateEntry(entry)) {
            validEntries.push(entry);
          } else {
            errors.push(`Invalid entry at line ${i + 1}: ${JSON.stringify(entry)}`);
          }
        } else {
          // Convert plain text format to JSON
          const convertedEntry = this.convertPlainTextEntry(line);
          if (convertedEntry) {
            validEntries.push(convertedEntry);
            fixedCount++;
          } else {
            errors.push(`Cannot convert line ${i + 1}: ${line}`);
          }
        }
      } catch (error) {
        errors.push(`Parse error at line ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Write back validated entries
    const validatedContent = validEntries
      .map(entry => JSON.stringify(entry))
      .join('\n') + '\n';

    writeFileSync(this.auditPath, validatedContent, 'utf-8');

    return { fixed: fixedCount, errors };
  }

  /**
   * Validates individual audit entry against schema
   */
  private validateEntry(entry: AuditEntry): boolean {
    // Required fields
    if (!entry.timestamp || !entry.workflow || typeof entry.exit_code !== 'number') {
      return false;
    }

    // Validate timestamp format
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!timestampRegex.test(entry.timestamp)) {
      return false;
    }

    // Validate workflow enum
    const validWorkflows = ['fw-analyze', 'fw-validate', 'fw-changelog', 'fw-deploy', 'fw-nexus-status', 'fw-release'];
    if (!validWorkflows.includes(entry.workflow)) {
      return false;
    }

    // Validate exit code range
    if (entry.exit_code < 0 || entry.exit_code > 255) {
      return false;
    }

    return true;
  }

  /**
   * Converts plain text audit entries to JSON format
   */
  private convertPlainTextEntry(line: string): AuditEntry | null {
    // Parse format: [timestamp] workflow args exit=X
    const match = line.match(/^\[([^\]]+)\]\s+fw-(\w+)\s+(.+?)\s+exit=(\d+)(?:\s+duration=(\d+))?(?:\s+risk_score=(\d+))?$/);
    if (!match) return null;

    const [, timestamp, workflow, args, exitCodeStr, durationStr, riskScoreStr] = match;

    // Extract additional info from args
    const envMatch = args.match(/--env=(\w+)/);
    const configMatch = args.match(/(\w+\.yaml|\.yaml)/);
    const gatesMatch = args.match(/gates=(\d+)\/(\d+)/);
    const changesMatch = args.match(/changes=(\d+)/);

    const entry: AuditEntry = {
      timestamp,
      workflow: `fw-${workflow}`,
      exit_code: parseInt(exitCodeStr, 10),
    };

    if (durationStr) entry.duration_seconds = parseInt(durationStr, 10);
    if (riskScoreStr) entry.risk_score = parseInt(riskScoreStr, 10);
    if (envMatch) entry.environment = envMatch[1];
    if (configMatch) entry.config_file = configMatch[1];

    if (gatesMatch) {
      entry.metadata = {
        gates_passed: parseInt(gatesMatch[1], 10),
        gates_total: parseInt(gatesMatch[2], 10),
      };
    }

    if (changesMatch) {
      entry.metadata = {
        ...entry.metadata,
        changes_detected: parseInt(changesMatch[1], 10),
      };
    }

    return entry;
  }

  /**
   * Validates audit schema consistency
   */
  validateSchema(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if audit schema exists and is valid
    const schemaPath = '.factory-wager/audit-schema.json';
    if (!existsSync(schemaPath)) {
      issues.push('Audit schema file missing');
      return { valid: false, issues };
    }

    try {
      const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

      // Validate schema structure
      if (!schema.properties || !schema.required) {
        issues.push('Invalid schema structure');
      }

      // Check required fields
      const requiredFields = ['timestamp', 'workflow', 'exit_code'];
      for (const field of requiredFields) {
        if (!schema.required.includes(field)) {
          issues.push(`Required field '${field}' missing from schema`);
        }
      }

    } catch (error) {
      issues.push(`Schema parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { valid: issues.length === 0, issues };
  }
}

// CLI interface
if (import.meta.main) {
  const validator = new AuditValidator();

  console.log('🔍 FactoryWager Audit Log Validator');
  console.log('==================================');
  console.log();

  // Validate schema first
  const schemaResult = validator.validateSchema();
  if (!schemaResult.valid) {
    console.log('❌ Schema validation failed:');
    schemaResult.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  // Validate and fix audit log
  const result = await validator.validateAndFix();

  console.log(`📊 Audit Log Validation Results:`);
  console.log(`  ✅ Entries fixed: ${result.fixed}`);
  console.log(`  ❌ Errors found: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\n🔧 Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (result.fixed > 0) {
    console.log('\n✅ Audit log has been fixed and standardized to JSON format');
  }

  console.log('\n🎯 Recommendation: Run this validator before each deployment');
}

export { AuditValidator, type AuditEntry };
