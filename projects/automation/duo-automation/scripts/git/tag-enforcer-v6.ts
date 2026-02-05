#!/usr/bin/env bun
/**
 * [DUOPLUS][GIT][ENFORCE][SECURITY][#REF:ENFORCER-V6][BUN:6.1-NATIVE]
 * DuoPlus Tag Enforcement Engine v6.1
 * Compliance: SOC2-Type-II | Standard: ISO-27001
 */

import { $ } from "bun";

const TAG_REGEX = /^\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[#REF:([A-Z0-9_-]+)\]/i;
const MAX_TAG_LENGTH = 116;

interface Violation {
  id: string;
  message: string;
  blocking: boolean;
  ref: string;
}

class TagEnforcer {
  private violations: Violation[] = [];

  async run() {
    const stage = process.env.ENFORCEMENT_STAGE || 'pre-commit';
    console.log(`\n🔒 DuoPlus Tag Enforcement v6.1 [Stage: ${stage}]`);

    if (stage === 'pre-commit') {
      await this.enforcePreCommit();
    } else if (stage === 'ci-lint') {
      await this.enforceCILint();
    }

    this.report();
  }

  private async enforcePreCommit() {
    const changedFiles = await this.getChangedFiles();

    for (const file of changedFiles) {
      if (this.isExcluded(file)) continue;

      const content = await Bun.file(file).text();
      const tags = this.extractTags(content);

      // E-001: All changed code blocks must have valid tag
      if (tags.length === 0 && this.isCodeFile(file)) {
        this.addViolation('E-001', `File ${file} is missing mandatory DuoPlus tags`, true, '[DUO][PRECOMMIT][ENFORCE][#REF:E-001]');
      }

      // E-002: #REF must be unique (basic local check)
      const refs = tags.map(t => t.ref);
      const uniqueRefs = new Set(refs);
      if (refs.length !== uniqueRefs.size) {
        this.addViolation('E-002', `Duplicate #REF detected in ${file}`, true, '[DUO][PRECOMMIT][ENFORCE][#REF:E-002]');
      }

      for (const tag of tags) {
        // E-003: CRITICAL/HIGH requires GPG signature
        if (tag.class === 'CRITICAL' || tag.class === 'HIGH') {
          const isSigned = await this.checkGPGSignature();
          if (!isSigned) {
            this.addViolation('E-003', `CRITICAL/HIGH tag in ${file} requires GPG signature`, true, '[SEC][PRECOMMIT][ENFORCE][#REF:E-003]');
          }
        }

        // E-004: [META:{cwe:*}] validation
        if (tag.meta?.cwe && !/^CWE-\d+$/.test(tag.meta.cwe)) {
          this.addViolation('E-004', `Invalid CWE format in ${file}: ${tag.meta.cwe}`, true, '[SEC][PRECOMMIT][ENFORCE][#REF:E-004]');
        }

        // E-006: [FUNCTION] for public API changes
        if (this.isPublicAPI(file) && !tag.type.includes('FUNCTION')) {
          this.addViolation('E-006', `Public API change in ${file} requires [FUNCTION] tag`, true, '[DUO][PRECOMMIT][ENFORCE][#REF:E-006]');
        }
      }
    }
  }

  private async enforceCILint() {
    // Implementation for CI-specific rules E-007, E-008, E-009
    const allFiles = await this.getAllProjectFiles();
    for (const file of allFiles) {
      const content = await Bun.file(file).text();
      const lines = content.split('\n');

      for (const line of lines) {
        if (line.includes('[#REF:')) {
          const match = line.match(/\[.*?\]/g);
          if (!match) continue;

          const fullTag = match.join('');

          // E-008: Maximum tag length
          if (fullTag.length > MAX_TAG_LENGTH) {
            this.addViolation('E-008', `Tag too long (${fullTag.length} chars) in ${file}`, true, '[DUO][CILINT][ENFORCE][#REF:E-008]');
          }

          // E-007 & E-009: Regex match and required fields
          if (!TAG_REGEX.test(fullTag)) {
            this.addViolation('E-007', `Invalid tag format in ${file}: ${fullTag}`, true, '[DUO][CILINT][ENFORCE][#REF:E-007]');
          }
        }
      }
    }
  }

  private addViolation(id: string, message: string, blocking: boolean, ref: string) {
    this.violations.push({ id, message, blocking, ref });
  }

  private async getChangedFiles(): Promise<string[]> {
    const output = await $`git diff --cached --name-only`.text();
    const files = output.trim().split('\n');
    const existing: string[] = [];
    for (const f of files) {
      if (f && await Bun.file(f).exists()) {
        existing.push(f);
      }
    }
    return existing;
  }

  private async getAllProjectFiles(): Promise<string[]> {
    const output = await $`git ls-files`.text();
    return output.trim().split('\n').filter(f => this.isCodeFile(f));
  }

  private isCodeFile(file: string): boolean {
    return /\.(ts|tsx|js|jsx|py|go|rs)$/.test(file);
  }

  private isExcluded(file: string): boolean {
    return file.includes('node_modules') || file.includes('.git') || file.includes('dist');
  }

  private isPublicAPI(file: string): boolean {
    return file.startsWith('src/@api') || file.includes('public-api');
  }

  private async checkGPGSignature(): Promise<boolean> {
    try {
      const gpgSign = await $`git config commit.gpgsign`.text();
      return gpgSign.trim() === 'true';
    } catch {
      return false;
    }
  }

  private extractTags(content: string) {
    const tags = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(TAG_REGEX);
      if (match) {
        tags.push({
          domain: match[1],
          scope: match[2],
          type: match[3],
          class: match[4],
          ref: match[5],
          meta: this.parseMeta(line)
        });
      }
    }
    return tags;
  }

  private parseMeta(line: string): any {
    const metaMatch = line.match(/\[META:\{(.*?)\}\]/);
    if (!metaMatch) return {};
    const metaStr = metaMatch[1];
    const parts = metaStr.split(',');
    const meta: any = {};
    for (const part of parts) {
      const [key, value] = part.split(':');
      if (key && value) meta[key.trim()] = value.trim();
    }
    return meta;
  }

  private report() {
    if (this.violations.length === 0) {
      console.log('✅ All DuoPlus tag enforcement checks passed.');
      process.exit(0);
    }

    console.error(`\n❌ Found ${this.violations.length} enforcement violations:`);
    let hasBlocking = false;

    for (const v of this.violations) {
      const prefix = v.blocking ? '[BLOCKING]' : '[WARNING]';
      console.error(`${prefix} ${v.id}: ${v.message}`);
      console.error(`   Enforcement Tag: ${v.ref}\n`);
      if (v.blocking) hasBlocking = true;
    }

    if (hasBlocking) {
      console.error('🛑 Commit/Build blocked due to critical violations.');
      process.exit(1);
    }
  }
}

new TagEnforcer().run();
