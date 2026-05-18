#!/usr/bin/env bun

/**
 * 📊 FactoryWager Graph Generation v5.1
 *
 * Generate version graphs for all secrets or specific keys
 *
 * @version 5.1
 */

import { VersionedSecretManager } from '../lib/security/versioned-secrets.ts';
import { styled } from '../lib/theme/colors.ts';
import { refs } from '@fw/business';

const versionedManager = new VersionedSecretManager(refs);

async function main() {
  const args = Bun.argv.slice(2);
  const allSecrets = args.includes('--all-secrets');
  const outputR2 = args.includes('--output') && args[args.indexOf('--output') + 1] === 'r2';
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.info(styled('📊 FactoryWager Graph Generation v5.1', 'accent'));
  console.info(styled('======================================', 'muted'));
  console.info('');

  if (dryRun) {
    console.info(styled('🔍 DRY RUN MODE - No graphs will be generated', 'warning'));
    console.info('');
  }

  try {
    let secretsToProcess: string[] = [];

    if (allSecrets) {
      // Get all secrets with versions (this would need to be implemented)
      secretsToProcess = await getAllVersionedSecrets();
      console.info(
        styled(`📋 Processing all ${secretsToProcess.length} versioned secrets`, 'primary')
      );
    } else {
      // Process specific keys from arguments
      const keyArgs = args.filter(arg => !arg.startsWith('--'));
      secretsToProcess = keyArgs;

      if (secretsToProcess.length === 0) {
        console.info(
          styled('❌ No secrets specified. Use --all-secrets or provide key names', 'error')
        );
        process.exit(1);
      }

      console.info(styled(`📋 Processing ${secretsToProcess.length} specified secrets`, 'primary'));
    }

    console.info('');

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const key of secretsToProcess) {
      try {
        if (verbose) {
          console.info(styled(`📊 Generating graph for ${key}...`, 'primary'));
        }

        if (!dryRun) {
          const { mermaidUrl, d3Url, nodeCount } = await versionedManager.visualize(key);

          console.info(styled(`   ✅ Generated graph with ${nodeCount} versions`, 'success'));
          console.info(styled(`   Mermaid: ${mermaidUrl}`, 'primary'));
          console.info(styled(`   D3 JSON: ${d3Url}`, 'primary'));

          generated++;
        } else {
          console.info(styled(`   🔍 Would generate graph (dry run)`, 'warning'));
          generated++;
        }
      } catch (error) {
        console.info(styled(`   ❌ Error: ${error.message}`, 'error'));
        errors++;
      }
    }

    console.info('');
    console.info(styled('📊 Generation Summary:', 'accent'));
    console.info(styled(`   Generated: ${generated}`, 'success'));
    console.info(styled(`   Skipped: ${skipped}`, 'muted'));
    console.info(styled(`   Errors: ${errors}`, 'error'));

    if (!dryRun && generated > 0) {
      console.info('');
      console.info(styled('🎉 Graph generation complete!', 'success'));
      console.info(
        styled('📖 Docs: https://bun.com/docs/runtime/secrets/version-visualization', 'accent')
      );

      if (outputR2) {
        console.info(styled('💾 All graphs stored in R2 bucket', 'success'));
      }
    }
  } catch (error) {
    console.error(styled(`❌ Graph generation failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Mock function - replace with actual implementation
async function getAllVersionedSecrets(): Promise<string[]> {
  // This would scan R2 for version graphs or query a registry
  // For now, return sample keys
  return ['API_KEY_V3', 'DATABASE_URL', 'JWT_SECRET', 'R2_ACCESS_KEY'];
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});
