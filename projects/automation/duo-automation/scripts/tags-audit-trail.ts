#!/usr/bin/env bun
// [DUOPLUS][SECURITY][TS][META:{merkle,audit,git}][AUDIT][#REF:AUDIT-TRAIL-41][BUN:4.1]

import { createHash } from 'crypto';
import { mkdir, readFile, writeFile, readdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { AITagger } from './ai-tagger';
import { fileLink, commitLink, urlLink } from './tty-hyperlink';

interface TagSet {
  DOMAIN: string;
  SCOPE: string;
  TYPE: string;
  META: Record<string, any>;
  CLASS: string;
  REF: string;
  BUN: string;
}

interface AuditEntry {
  commit: string;
  timestamp: string;
  author: string;
  email: string;
  tagCount: number;
  merkleRoot: string;
  tags: Array<{ filePath: string; tags: TagSet }>;
}

interface VerificationResult {
  valid: boolean;
  commit: string;
  storedRoot: string;
  computedRoot: string;
  message: string;
}

/**
 * Merkle Tree implementation for tag audit trail
 * Replaces blockchain/IPFS with Git-backed immutable audit
 */
class MerkleTree {
  /**
   * Create SHA-256 hash of data
   */
  static hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Build Merkle root from array of tag hashes
   */
  static createRoot(tags: Array<{ filePath: string; tags: TagSet }>): string {
    if (tags.length === 0) return this.hash('empty');

    // Create leaf hashes from each tag entry
    const leaves = tags.map(entry =>
      this.hash(JSON.stringify({ filePath: entry.filePath, tags: entry.tags }))
    );

    return this.buildTree(leaves);
  }

  /**
   * Recursively build tree until we have a single root
   */
  private static buildTree(hashes: string[]): string {
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];

    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || hashes[i]; // Duplicate odd node
      const combined = this.hash(left + right);
      nextLevel.push(combined);
    }

    return this.buildTree(nextLevel);
  }

  /**
   * Verify a Merkle root matches the tag data
   */
  static verify(tags: Array<{ filePath: string; tags: TagSet }>, expectedRoot: string): boolean {
    const computedRoot = this.createRoot(tags);
    return computedRoot === expectedRoot;
  }
}

/**
 * Git-backed audit trail manager
 */
class AuditTrailManager {
  private auditDir = '.tags/audit';
  private rootsFile = '.tags/roots.txt';

  /**
   * Get current git commit SHA
   */
  private getCommitSha(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      // Fallback to timestamp-based ID if not in git repo
      return `local-${Date.now().toString(36)}`;
    }
  }

  /**
   * Get git author info
   */
  private getAuthorInfo(): { name: string; email: string } {
    try {
      const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
      return { name, email };
    } catch {
      return { name: 'unknown', email: 'unknown@local' };
    }
  }

  /**
   * Get git repository URL for hyperlinks
   */
  private getRepoUrl(): string | undefined {
    try {
      const url = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      // Convert SSH to HTTPS format
      if (url.startsWith('git@')) {
        return url
          .replace('git@', 'https://')
          .replace(':', '/')
          .replace(/\.git$/, '');
      }
      return url.replace(/\.git$/, '');
    } catch {
      return undefined;
    }
  }

  /**
   * Ensure audit directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await mkdir(this.auditDir, { recursive: true });
  }

  /**
   * Generate audit entry for current state
   */
  async generateAudit(): Promise<AuditEntry> {
    console.info('🔐 Generating audit trail...');

    await this.ensureDirectories();

    const commit = this.getCommitSha();
    const author = this.getAuthorInfo();
    const timestamp = new Date().toISOString();

    const repoUrl = this.getRepoUrl();
    console.info(`📋 Commit: ${commitLink(commit, repoUrl)}`);
    console.info(`👤 Author: ${author.name} <${author.email}>`);

    // Collect all tags using AI tagger
    const aiTagger = new AITagger();
    const tags: Array<{ filePath: string; tags: TagSet }> = [];

    console.info('📁 Scanning files for tags...');

    const files = await this.getAllTypeScriptFiles('.');
    let processed = 0;

    for (const filePath of files) {
      try {
        const tagSet = await aiTagger.autoTag(filePath);
        tags.push({ filePath, tags: tagSet });
        processed++;

        if (processed % 50 === 0) {
          console.info(`   Processed ${processed}/${files.length} files...`);
        }
      } catch {
        // Skip files that can't be tagged
      }
    }

    console.info(`✅ Tagged ${tags.length} files`);

    // Generate Merkle root
    const merkleRoot = MerkleTree.createRoot(tags);
    console.info(`🌳 Merkle root: ${merkleRoot}`);

    const entry: AuditEntry = {
      commit,
      timestamp,
      author: author.name,
      email: author.email,
      tagCount: tags.length,
      merkleRoot,
      tags,
    };

    // Write audit file
    const auditFilePath = join(this.auditDir, `${commit}.json`);
    await writeFile(auditFilePath, JSON.stringify(entry, null, 2));
    console.info(`📄 Audit file: ${fileLink(auditFilePath)}`);

    // Append to roots file
    await appendFile(this.rootsFile, `${commit}:${merkleRoot}:${timestamp}\n`);
    console.info(`📝 Root appended to: ${fileLink(this.rootsFile)}`);

    return entry;
  }

  /**
   * Verify audit entry integrity
   */
  async verify(commitSha?: string): Promise<VerificationResult[]> {
    console.info('🔍 Verifying audit trail integrity...');

    await this.ensureDirectories();

    const results: VerificationResult[] = [];

    // If specific commit provided, verify just that one
    if (commitSha) {
      const result = await this.verifySingleCommit(commitSha);
      results.push(result);
    } else {
      // Verify all audit entries
      try {
        const files = await readdir(this.auditDir);
        const auditFiles = files.filter(f => f.endsWith('.json'));

        console.info(`📋 Found ${auditFiles.length} audit entries to verify`);

        for (const file of auditFiles) {
          const commit = file.replace('.json', '');
          const result = await this.verifySingleCommit(commit);
          results.push(result);
        }
      } catch {
        console.info('⚠️ No audit entries found');
      }
    }

    // Summary
    const valid = results.filter(r => r.valid).length;
    const invalid = results.filter(r => !r.valid).length;

    console.info('\n📊 VERIFICATION SUMMARY');
    console.info('═'.repeat(50));
    console.info(`✅ Valid:   ${valid}`);
    console.info(`❌ Invalid: ${invalid}`);
    console.info('═'.repeat(50));

    if (invalid === 0) {
      console.info('✅ All audit entries verified successfully');
    } else {
      console.info('⚠️ Some audit entries failed verification');
    }

    return results;
  }

  /**
   * Verify a single commit's audit entry
   */
  private async verifySingleCommit(commit: string): Promise<VerificationResult> {
    const auditFilePath = join(this.auditDir, `${commit}.json`);
    const repoUrl = this.getRepoUrl();

    try {
      const content = await readFile(auditFilePath, 'utf-8');
      const entry: AuditEntry = JSON.parse(content);

      const computedRoot = MerkleTree.createRoot(entry.tags);
      const valid = computedRoot === entry.merkleRoot;

      const status = valid ? '✅' : '❌';
      const commitDisplay = commitLink(commit.slice(0, 8), repoUrl);
      console.info(`${status} ${commitDisplay}: ${valid ? 'Valid' : 'INVALID - Merkle root mismatch'}`);

      return {
        valid,
        commit,
        storedRoot: entry.merkleRoot,
        computedRoot,
        message: valid ? 'Merkle root verified' : 'Merkle root mismatch - tags may have been tampered',
      };
    } catch (error) {
      const commitDisplay = commitLink(commit.slice(0, 8), repoUrl);
      console.info(`❌ ${commitDisplay}: Audit file not found or corrupted`);

      return {
        valid: false,
        commit,
        storedRoot: 'N/A',
        computedRoot: 'N/A',
        message: `Audit file not found: ${auditFilePath}`,
      };
    }
  }

  /**
   * Show audit history
   */
  async showHistory(): Promise<void> {
    console.info('📜 Audit Trail History');
    console.info('═'.repeat(70));

    const repoUrl = this.getRepoUrl();

    try {
      const content = await readFile(this.rootsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);

      if (lines.length === 0) {
        console.info('No audit entries found');
        return;
      }

      console.info(`| ${'Commit'.padEnd(12)} | ${'Merkle Root'.padEnd(20)} | ${'Timestamp'.padEnd(25)} |`);
      console.info(`|${'-'.repeat(14)}|${'-'.repeat(22)}|${'-'.repeat(27)}|`);

      for (const line of lines.slice(-20)) { // Show last 20
        const [commit, root, timestamp] = line.split(':');
        const commitDisplay = commitLink(commit.slice(0, 12), repoUrl);
        console.info(`| ${commitDisplay.padEnd(12)} | ${root.slice(0, 20).padEnd(20)} | ${timestamp.padEnd(25)} |`);
      }

      console.info('═'.repeat(70));
      console.info(`Total entries: ${lines.length}`);
      console.info(`📄 Roots file: ${fileLink(this.rootsFile)}`);
    } catch {
      console.info('No audit history found. Run --audit to create first entry.');
    }
  }

  /**
   * Get all TypeScript files recursively
   */
  private async getAllTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist') {
          files.push(...await this.getAllTypeScriptFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return files;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const manager = new AuditTrailManager();

  switch (command) {
    case '--audit':
    case undefined:
      await manager.generateAudit();
      break;

    case '--verify':
      const commit = process.argv[3];
      await manager.verify(commit);
      break;

    case '--history':
      await manager.showHistory();
      break;

    case '--help':
    default:
      console.info(`
🔐 Tags Audit Trail v4.1

Git-backed immutable audit trail with SHA-256 Merkle tree verification.
Replaces blockchain/IPFS with free, auditable Git history.

Usage:
  bun run tags-audit-trail.ts                    # Generate audit for current state
  bun run tags-audit-trail.ts --audit            # Generate audit for current state
  bun run tags-audit-trail.ts --verify           # Verify all audit entries
  bun run tags-audit-trail.ts --verify <commit>  # Verify specific commit
  bun run tags-audit-trail.ts --history          # Show audit history

npm scripts:
  bun run tags:audit                             # Generate audit
  bun run tags:audit:verify                      # Verify all entries

Output Files:
  .tags/audit/<commit>.json                      # Per-commit audit entries
  .tags/roots.txt                                # Merkle root history

Security:
  - SHA-256 Merkle tree ensures tamper detection
  - Git history provides immutable audit trail
  - No external dependencies (blockchain, IPFS)
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { AuditTrailManager, MerkleTree, AuditEntry, VerificationResult };
