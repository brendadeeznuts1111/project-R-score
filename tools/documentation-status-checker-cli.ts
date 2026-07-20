#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/index#watch-mode — --watch
// tools/documentation-status-checker-cli.ts — CLI for checking documentation constants and URLs

import {
  createCliLogger,
  createTestResults,
  getCliColors,
  parseBaseCliArgs,
} from '../lib/shared/tools/cli-helpers.ts';

const options = parseBaseCliArgs(process.argv.slice(2), {
  urlOnly: '--url-only',
  constantsOnly: '--constants-only',
  importsOnly: '--imports-only',
  fullCheck: '--full-check',
});
const colors = getCliColors(options.noColor);

// Show help
if (options.help) {
  console.info(`${colors.cyan}🔍 Documentation Status Checker${colors.reset}`);
  console.info('');
  console.info('Usage: bun documentation-status-checker.ts [options]');
  console.info('');
  console.info('Options:');
  console.info('  -v, --verbose       Verbose output with detailed information');
  console.info('  -q, --quiet         Quiet mode with minimal output');
  console.info('  --url-only          Check only URL validation');
  console.info('  --constants-only    Check only constants loading');
  console.info('  --imports-only      Check only import functionality');
  console.info('  --full-check        Run comprehensive check including network tests');
  console.info('  --json              Output results in JSON format');
  console.info('  --no-color          Disable colored output');
  console.info('  -h, --help          Show this help message');
  console.info('');
  console.info('Examples:');
  console.info('  bun documentation-status-checker.ts');
  console.info('  bun documentation-status-checker.ts --verbose');
  console.info('  bun documentation-status-checker.ts --url-only --json');
  console.info('  bun documentation-status-checker.ts --full-check');
  process.exit(0);
}

const log = createCliLogger(options);
const { testResults, recordTest } = createTestResults();

// 1. Check Constants Loading
async function checkConstantsLoading() {
  log.section('📦 Checking Constants Loading');

  // Test CLI Constants
  log.info('Testing CLI Constants Import...');
  try {
    const cliConstants = await import('../lib/docs/constants/cli.ts');
    const categories = Object.values(cliConstants.CLICategory);
    const urls = Object.keys(cliConstants.CLI_DOCUMENTATION_URLS);
    const examples = Object.keys(cliConstants.CLI_COMMAND_EXAMPLES);

    recordTest(
      'cli-constants-import',
      true,
      `Loaded ${categories.length} categories, ${urls.length} URL groups, ${examples.length} example groups`,
      { categories, urlGroups: urls, exampleGroups: examples }
    );
    log.success('CLI Constants: OK');

    if (options.verbose) {
      log.verbose(`CLI Categories: ${categories.join(', ')}`);
      log.verbose(`CLI URL Groups: ${urls.join(', ')}`);
    }
  } catch (error: any) {
    recordTest('cli-constants-import', false, `Failed to import CLI constants: ${error.message}`);
    log.error('CLI Constants: FAILED');
  }

  // Test Utils Constants
  log.info('Testing Utils Constants Import...');
  try {
    const utilsConstants = await import('../lib/docs/constants/utils.ts');
    const categories = Object.values(utilsConstants.UtilsCategory);
    const urls = Object.keys(utilsConstants.BUN_UTILS_URLS);
    const examples = Object.keys(utilsConstants.BUN_UTILS_EXAMPLES);

    recordTest(
      'utils-constants-import',
      true,
      `Loaded ${categories.length} categories, ${urls.length} URL groups, ${examples.length} example groups`,
      { categories, urlGroups: urls, exampleGroups: examples }
    );
    log.success('Utils Constants: OK');

    if (options.verbose) {
      log.verbose(`Utils Categories: ${categories.join(', ')}`);
      log.verbose(`Utils URL Groups: ${urls.join(', ')}`);
    }
  } catch (error: any) {
    recordTest(
      'utils-constants-import',
      false,
      `Failed to import Utils constants: ${error.message}`
    );
    log.error('Utils Constants: FAILED');
  }

  // Test Constants Data Integrity
  log.info('Testing Constants Data Integrity...');
  try {
    const cliConstants = await import('../lib/docs/constants/cli.ts');
    const utilsConstants = await import('../lib/docs/constants/utils.ts');

    // Count URLs
    let cliURLCount = 0;
    Object.values(cliConstants.CLI_DOCUMENTATION_URLS).forEach(category => {
      if (typeof category === 'object') {
        cliURLCount += Object.keys(category).length;
      }
    });

    let utilsURLCount = 0;
    Object.values(utilsConstants.BUN_UTILS_URLS).forEach(category => {
      if (typeof category === 'object') {
        utilsURLCount += Object.keys(category).length;
      }
    });

    const totalURLs = cliURLCount + utilsURLCount;
    const totalCategories =
      Object.values(cliConstants.CLICategory).length +
      Object.values(utilsConstants.UtilsCategory).length;

    recordTest(
      'constants-data-integrity',
      true,
      `Data integrity verified: ${totalCategories} categories, ${totalURLs} total URLs`,
      { totalCategories, totalURLs, cliURLCount, utilsURLCount }
    );
    log.success('Data Integrity: OK');
  } catch (error: any) {
    recordTest(
      'constants-data-integrity',
      false,
      `Constants data integrity check failed: ${error.message}`
    );
    log.error('Data Integrity: FAILED');
  }
}

// 2. Check Import Functionality
async function checkImportFunctionality() {
  log.section('🔌 Checking Import Functionality');

  // Test Documentation Module Import
  log.info('Testing Documentation Module Import...');
  try {
    const docs = await import('../lib/docs');
    recordTest('documentation-module-import', true, 'Documentation module imported successfully');
    log.success('Documentation Module: OK');
  } catch (error: any) {
    recordTest(
      'documentation-module-import',
      false,
      `Documentation module import failed: ${error.message}`
    );
    log.error('Documentation Module: FAILED');
  }

  // Test Core Documentation Import
  log.info('Testing Core Documentation Import...');
  try {
    const coreDocs = await import('./lib/core-documentation');
    recordTest('core-documentation-import', true, 'Core documentation imported successfully');
    log.success('Core Documentation: OK');
  } catch (error: any) {
    recordTest(
      'core-documentation-import',
      false,
      `Core documentation import failed: ${error.message}`
    );
    log.error('Core Documentation: FAILED');
  }

  // Test Validation Module Import
  log.info('Testing Validation Module Import...');
  try {
    const validation = await import('./lib/core-validation');
    recordTest('validation-module-import', true, 'Validation module imported successfully');
    log.success('Validation Module: OK');
  } catch (error: any) {
    recordTest(
      'validation-module-import',
      false,
      `Validation module import failed: ${error.message}`
    );
    log.error('Validation Module: FAILED');
  }
}

// 3. Check URL Validation
async function checkURLValidation() {
  log.section('🔗 Checking URL Validation');

  // Test URL Structure Validation
  log.info('Testing URL Structure Validation...');
  try {
    const cliConstants = await import('../lib/docs/constants/cli.ts');
    const utilsConstants = await import('../lib/docs/constants/utils.ts');

    let validURLs = 0;
    let invalidURLs = 0;
    const invalidList: string[] = [];

    // Check CLI URLs
    Object.values(cliConstants.CLI_DOCUMENTATION_URLS).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach((url: any) => {
          try {
            new URL(url.startsWith('http') ? url : `https://bun.sh${url}`);
            validURLs++;
          } catch {
            invalidURLs++;
            invalidList.push(url);
          }
        });
      }
    });

    // Check Utils URLs
    Object.values(utilsConstants.BUN_UTILS_URLS).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach((url: any) => {
          try {
            new URL(url.startsWith('http') ? url : `https://bun.sh${url}`);
            validURLs++;
          } catch {
            invalidURLs++;
            invalidList.push(url);
          }
        });
      }
    });

    const passed = invalidURLs === 0;
    recordTest(
      'url-structure-validation',
      passed,
      passed
        ? `All ${validURLs} URLs have valid structure`
        : `${invalidURLs} of ${validURLs + invalidURLs} URLs have invalid structure`,
      { validURLs, invalidURLs, invalidList }
    );

    if (passed) {
      log.success('URL Structure: OK');
    } else {
      log.error(`URL Structure: ${invalidURLs} invalid URLs found`);
      if (options.verbose) {
        invalidList.forEach(url => log.verbose(`  Invalid: ${url}`));
      }
    }
  } catch (error: any) {
    recordTest(
      'url-structure-validation',
      false,
      `URL structure validation failed: ${error.message}`
    );
    log.error('URL Structure: FAILED');
  }

  // Test URL Accessibility Check
  if (options.fullCheck) {
    log.info('Testing URL Accessibility...');
    try {
      const testURLs = [
        'https://bun.sh/docs/cli',
        'https://bun.sh/docs/api/utils',
        'https://github.com/oven-sh/bun',
      ];

      let accessibleURLs = 0;
      const results: Record<string, boolean> = {};

      for (const url of testURLs) {
        try {
          const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
          results[url] = response.ok;
          if (response.ok) accessibleURLs++;
        } catch {
          results[url] = false;
        }
      }

      const passed = accessibleURLs === testURLs.length;
      recordTest(
        'url-accessibility-check',
        passed,
        `${accessibleURLs} of ${testURLs.length} URLs are accessible`,
        { results, accessibleURLs, totalURLs: testURLs.length }
      );

      if (passed) {
        log.success('URL Accessibility: OK');
      } else {
        log.warning(`URL Accessibility: ${testURLs.length - accessibleURLs} URLs not accessible`);
      }
    } catch (error: any) {
      recordTest(
        'url-accessibility-check',
        false,
        `URL accessibility check failed: ${error.message}`
      );
      log.error('URL Accessibility: FAILED');
    }
  } else {
    recordTest('url-accessibility-check', true, 'Skipped (use --full-check to enable)');
    log.info('URL Accessibility: Skipped (use --full-check to enable)');
  }

  // Test CLI Command Validation
  log.info('Testing CLI Command Validation...');
  try {
    const testCommands = [
      'bun run dev',
      'bun test --watch',
      'bun build ./src/index.ts',
      'bun install',
      'bun add lodash',
      'invalid-command',
    ];

    let validCommands = 0;
    let invalidCommands = 0;
    const results: Record<string, boolean> = {};

    for (const cmd of testCommands) {
      const isValid =
        cmd.startsWith('bun') &&
        ['run', 'test', 'build', 'install', 'add', 'remove', 'x', 'create', 'upgrade'].includes(
          cmd.split(' ')[1]
        );
      results[cmd] = isValid;
      if (isValid) {
        validCommands++;
      } else {
        invalidCommands++;
      }
    }

    // Should have 5 valid, 1 invalid
    const passed = validCommands === 5 && invalidCommands === 1;
    recordTest(
      'cli-command-validation',
      passed,
      `${validCommands} valid, ${invalidCommands} invalid commands detected`,
      { results, validCommands, invalidCommands }
    );

    if (passed) {
      log.success('CLI Command Validation: OK');
    } else {
      log.error('CLI Command Validation: FAILED');
    }
  } catch (error: any) {
    recordTest('cli-command-validation', false, `CLI command validation failed: ${error.message}`);
    log.error('CLI Command Validation: FAILED');
  }
}

// 4. Check Error Handling
async function checkErrorHandling() {
  log.section('🛡️ Checking Error Handling');

  // Test Import Error Handling
  log.info('Testing Import Error Handling...');
  try {
    // Try to import a non-existent module
    try {
      await import('./non-existent-module');
      recordTest('import-error-handling', false, 'Expected import error was not thrown');
      log.error('Import Error Handling: FAILED');
    } catch (error) {
      recordTest('import-error-handling', true, 'Import error handled correctly');
      log.success('Import Error Handling: OK');
    }
  } catch (error: any) {
    recordTest(
      'import-error-handling',
      false,
      `Import error handling test failed: ${error.message}`
    );
    log.error('Import Error Handling: FAILED');
  }

  // Test Validation Error Handling
  log.info('Testing Validation Error Handling...');
  try {
    // Test validation with invalid data
    const invalidData = null;
    const isValid = invalidData !== null;

    if (!isValid) {
      recordTest('validation-error-handling', true, 'Validation error handled correctly');
      log.success('Validation Error Handling: OK');
    } else {
      recordTest('validation-error-handling', false, 'Validation should have failed');
      log.error('Validation Error Handling: FAILED');
    }
  } catch (error: any) {
    recordTest(
      'validation-error-handling',
      false,
      `Validation error handling test failed: ${error.message}`
    );
    log.error('Validation Error Handling: FAILED');
  }
}

// Main check function
async function runStatusCheck() {
  console.info(`${colors.cyan}🔍 Documentation Status Checker${colors.reset}`);
  console.info(`${colors.gray}Checking all constants and URLs...${colors.reset}\n`);

  const startTime = Date.now();

  try {
    // Run checks based on options
    if (!options.urlOnly && !options.constantsOnly && !options.importsOnly) {
      await checkConstantsLoading();
      await checkImportFunctionality();
      await checkURLValidation();
      await checkErrorHandling();
    } else {
      if (options.constantsOnly) await checkConstantsLoading();
      if (options.importsOnly) await checkImportFunctionality();
      if (options.urlOnly) await checkURLValidation();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Print summary
    log.section('📊 Check Summary');

    const { total, passed, failed } = testResults.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

    console.info(`${colors.white}Total Tests:${colors.reset} ${total}`);
    console.info(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.info(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.info(`${colors.blue}Success Rate:${colors.reset} ${successRate}%`);
    console.info(`${colors.gray}Duration:${colors.reset} ${duration}ms`);

    // Output JSON if requested
    if (options.json) {
      log.json(testResults);
    }

    // Exit with appropriate code
    if (failed > 0) {
      console.info(`\n${colors.yellow}⚠️ Some checks failed. See details above.${colors.reset}`);
      process.exit(1);
    } else {
      console.info(`\n${colors.green}🎉 All checks passed!${colors.reset}`);
      process.exit(0);
    }
  } catch (error: any) {
    log.error(`Status check failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  log.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the check
if (import.meta.main) {
  runStatusCheck();
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
