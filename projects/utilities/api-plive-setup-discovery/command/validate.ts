// command/validate.ts - CCS + staging sentinel
// Validation engine for Central Command Station v3.1

import { glob, file, YAML } from 'bun';
import { validateDeploy } from '../staging/manager';

// Load configuration
const config = YAML.parse(await file('bun.yaml').text());
const { ccs, staging } = config.command;

/**
 * Validate all CCS command handlers
 */
async function validateCCS(): Promise<{ valid: number; errors: string[] }> {
  const errors: string[] = [];
  let valid = 0;

  try {
    // Find all command-related TypeScript files
    const files = await glob(['**/command/**/*.ts', '**/control.ts'], {
      absolute: true,
      cwd: process.cwd()
    });

    console.log(`🔍 Validating ${files.length} CCS command files...`);

    for (const filePath of files) {
      try {
        const content = await Bun.file(filePath).text();

        // Check for command dispatch function
        if (!content.includes('dispatchCommand') && !content.includes('handleCommand')) {
          errors.push(`❌ ${filePath}: Missing command handler`);
          continue;
        }

        // Check for supported command types
        const hasCommandType = ccs.schema.commandTypes.some((t: string) => 
          content.includes(`'${t}'`) || content.includes(`"${t}"`)
        );

        if (!hasCommandType) {
          errors.push(`⚠️  ${filePath}: No supported command types found`);
        }

        // Check for node ID validation
        if (!content.includes('nodeId') && !content.includes('NODE_ID')) {
          errors.push(`⚠️  ${filePath}: Missing node ID handling`);
        }

        if (errors.length === 0) {
          valid++;
          console.log(`🟢 ${filePath}: Valid CCS handler`);
        }

      } catch (error: any) {
        errors.push(`❌ ${filePath}: ${error.message}`);
      }
    }

    // Validate staging configs
    const stagedFiles = await glob(['**/*.yaml'], {
      cwd: staging.directory,
      absolute: false
    });

    console.log(`\n🔍 Validating ${stagedFiles.length} staged configs...`);

    for (const stagedFile of stagedFiles) {
      if (stagedFile === '.staging.index') continue;

      try {
        const content = await Bun.file(`${staging.directory}/${stagedFile}`).text();
        const deploy = YAML.parse(content);

        const validation = validateDeploy(deploy, staging.schema.deploy);
        if (!validation.valid) {
          errors.push(`❌ ${stagedFile}: Invalid deploy schema - ${validation.errors.join(', ')}`);
        } else {
          console.log(`🟢 ${stagedFile}: Valid deploy config`);
        }

      } catch (error: any) {
        errors.push(`❌ ${stagedFile}: ${error.message}`);
      }
    }

  } catch (error: any) {
    errors.push(`❌ Validation error: ${error.message}`);
  }

  return { valid, errors };
}

/**
 * Main validation function
 */
async function main() {
  console.log('\n🎯 CCS Validation Engine v3.1');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const result = await validateCCS();

  console.log('\n📊 Validation Results:');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`✅ Valid handlers/configs: ${result.valid}`);

  if (result.errors.length > 0) {
    console.log(`❌ Errors: ${result.errors.length}\n`);
    result.errors.forEach(error => console.log(`   ${error}`));
    console.log('\n');
    process.exit(1);
  } else {
    console.log(`🎉 All CCS handlers + staging configs valid!\n`);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

export { validateCCS };

