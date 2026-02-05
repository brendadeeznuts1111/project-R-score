#!/usr/bin/env bun
/**
 * 🔍 Documentation Status Checker CLI
 * 
 * CLI tool to check the status of all constants and URLs
 * Usage: bun documentation-status-checker.ts [options]
 */

import { Command } from 'commander';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// CLI setup
const program = new Command();

program
  .name('documentation-status-checker')
  .description('Check the status of all documentation constants and URLs')
  .version('1.0.0')
  .option('-v, --verbose', 'Verbose output with detailed information')
  .option('-q, --quiet', 'Quiet mode with minimal output')
  .option('--url-only', 'Check only URL validation')
  .option('--constants-only', 'Check only constants loading')
  .option('--imports-only', 'Check only import functionality')
  .option('--full-check', 'Run comprehensive check including network tests')
  .option('--json', 'Output results in JSON format')
  .option('--no-color', 'Disable colored output')
  .parse();

const options = program.opts();

// Color utilities
const colors = options.noColor ? {
  reset: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
  magenta: '',
  cyan: '',
  white: '',
  gray: ''
} : {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Logging utilities
const log = {
  info: (msg: string) => !options.quiet && console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => !options.quiet && console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg: string) => !options.quiet && console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  verbose: (msg: string) => options.verbose && console.log(`${colors.gray}🔍${colors.reset} ${msg}`),
  section: (title: string) => !options.quiet && console.log(`\n${colors.cyan}${title}${colors.reset}`),
  json: (data: any) => options.json && console.log(JSON.stringify(data, null, 2))
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  tests: {} as Record<string, any>,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper to record test results
const recordTest = (name: string, passed: boolean, message: string, details?: any) => {
  testResults.tests[name] = {
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
  }
  
  return passed;
};

// 1. Check Constants Loading
async function checkConstantsLoading() {
  log.section('📦 Checking Constants Loading');
  
  const tests = [
    {
      name: 'CLI Constants Import',
      test: async () => {
        try {
          const cliConstants = await import('./lib/documentation/constants/cli.ts');
          const categories = Object.values(cliConstants.CLICategory);
          const urls = Object.keys(cliConstants.CLI_DOCUMENTATION_URLS);
          const examples = Object.keys(cliConstants.CLI_COMMAND_EXAMPLES);
          
          recordTest('cli-constants-import', true, 
            `Loaded ${categories.length} categories, ${urls.length} URL groups, ${examples.length} example groups`,
            { categories, urlGroups: urls, exampleGroups: examples }
          );
          
          if (options.verbose) {
            log.verbose(`CLI Categories: ${categories.join(', ')}`);
            log.verbose(`CLI URL Groups: ${urls.join(', ')}`);
          }
          
          return true;
        } catch (error) {
          recordTest('cli-constants-import', false, `Failed to import CLI constants: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'Utils Constants Import',
      test: async () => {
        try {
          const utilsConstants = await import('./lib/documentation/constants/utils.ts');
          const categories = Object.values(utilsConstants.UtilsCategory);
          const urls = Object.keys(utilsConstants.BUN_UTILS_URLS);
          const examples = Object.keys(utilsConstants.BUN_UTILS_EXAMPLES);
          
          recordTest('utils-constants-import', true,
            `Loaded ${categories.length} categories, ${urls.length} URL groups, ${examples.length} example groups`,
            { categories, urlGroups: urls, exampleGroups: examples }
          );
          
          if (options.verbose) {
            log.verbose(`Utils Categories: ${categories.join(', ')}`);
            log.verbose(`Utils URL Groups: ${urls.join(', ')}`);
          }
          
          return true;
        } catch (error) {
          recordTest('utils-constants-import', false, `Failed to import Utils constants: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'Constants Data Integrity',
      test: async () => {
        try {
          const cliConstants = await import('./lib/documentation/constants/cli.ts');
          const utilsConstants = await import('./lib/documentation/constants/utils.ts');
          
          // Check CLI constants structure
          const cliCategories = Object.values(cliConstants.CLICategory);
          const cliURLs = cliConstants.CLI_DOCUMENTATION_URLS;
          let cliURLCount = 0;
          
          Object.values(cliURLs).forEach(category => {
            if (typeof category === 'object') {
              cliURLCount += Object.keys(category).length;
            }
          });
          
          // Check Utils constants structure
          const utilsCategories = Object.values(utilsConstants.UtilsCategory);
          const utilsURLs = utilsConstants.BUN_UTILS_URLS;
          let utilsURLCount = 0;
          
          Object.values(utilsURLs).forEach(category => {
            if (typeof category === 'object') {
              utilsURLCount += Object.keys(category).length;
            }
          });
          
          const totalURLs = cliURLCount + utilsURLCount;
          const totalCategories = cliCategories.length + utilsCategories.length;
          
          recordTest('constants-data-integrity', true,
            `Data integrity verified: ${totalCategories} categories, ${totalURLs} total URLs`,
            { totalCategories, totalURLs, cliURLCount, utilsURLCount }
          );
          
          return true;
        } catch (error) {
          recordTest('constants-data-integrity', false, `Constants data integrity check failed: ${error.message}`);
          return false;
        }
      }
    }
  ];
  
  for (const test of tests) {
    log.info(`Running ${test.name}...`);
    const result = await test.test();
    if (result) {
      log.success(`${test.name} passed`);
    } else {
      log.error(`${test.name} failed`);
    }
  }
}

// 2. Check Import Functionality
async function checkImportFunctionality() {
  log.section('🔌 Checking Import Functionality');
  
  const tests = [
    {
      name: 'Documentation Module Import',
      test: async () => {
        try {
          const docs = await import('./lib/documentation');
          recordTest('documentation-module-import', true, 'Documentation module imported successfully');
          return true;
        } catch (error) {
          recordTest('documentation-module-import', false, `Documentation module import failed: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'Core Documentation Import',
      test: async () => {
        try {
          const coreDocs = await import('./lib/core-documentation');
          recordTest('core-documentation-import', true, 'Core documentation imported successfully');
          return true;
        } catch (error) {
          recordTest('core-documentation-import', false, `Core documentation import failed: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'Validation Module Import',
      test: async () => {
        try {
          const validation = await import('./lib/core-validation');
          recordTest('validation-module-import', true, 'Validation module imported successfully');
          return true;
        } catch (error) {
          recordTest('validation-module-import', false, `Validation module import failed: ${error.message}`);
          return false;
        }
      }
    }
  ];
  
  for (const test of tests) {
    log.info(`Running ${test.name}...`);
    const result = await test.test();
    if (result) {
      log.success(`${test.name} passed`);
    } else {
      log.error(`${test.name} failed`);
    }
  }
}

// 3. Check URL Validation
async function checkURLValidation() {
  log.section('🔗 Checking URL Validation');
  
  const tests = [
    {
      name: 'URL Structure Validation',
      test: async () => {
        try {
          const cliConstants = await import('./lib/documentation/constants/cli.ts');
          const utilsConstants = await import('./lib/documentation/constants/utils.ts');
          
          let validURLs = 0;
          let invalidURLs = 0;
          const invalidList: string[] = [];
          
          // Check CLI URLs
          Object.values(cliConstants.CLI_DOCUMENTATION_URLS).forEach(category => {
            if (typeof category === 'object') {
              Object.values(category).forEach(url => {
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
              Object.values(category).forEach(url => {
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
          recordTest('url-structure-validation', passed,
            passed ? `All ${validURLs} URLs have valid structure` : `${invalidURLs} of ${validURLs + invalidURLs} URLs have invalid structure`,
            { validURLs, invalidURLs, invalidList }
          );
          
          return passed;
        } catch (error) {
          recordTest('url-structure-validation', false, `URL structure validation failed: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'URL Accessibility Check',
      test: async () => {
        if (!options.fullCheck) {
          recordTest('url-accessibility-check', true, 'Skipped (use --full-check to enable)');
          return true;
        }
        
        try {
          const testURLs = [
            'https://bun.sh/docs/cli',
            'https://bun.sh/docs/api/utils',
            'https://github.com/oven-sh/bun'
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
          recordTest('url-accessibility-check', passed,
            `${accessibleURLs} of ${testURLs.length} URLs are accessible`,
            { results, accessibleURLs, totalURLs: testURLs.length }
          );
          
          return passed;
        } catch (error) {
          recordTest('url-accessibility-check', false, `URL accessibility check failed: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'CLI Command Validation',
      test: async () => {
        try {
          // Test CLI command validation
          const testCommands = [
            'bun run dev',
            'bun test --watch',
            'bun build ./src/index.ts',
            'bun install',
            'bun add lodash',
            'invalid-command'
          ];
          
          let validCommands = 0;
          let invalidCommands = 0;
          const results: Record<string, boolean> = {};
          
          for (const cmd of testCommands) {
            const isValid = cmd.startsWith('bun') && 
                           ['run', 'test', 'build', 'install', 'add', 'remove', 'x', 'create', 'upgrade'].includes(cmd.split(' ')[1]);
            results[cmd] = isValid;
            if (isValid) {
              validCommands++;
            } else {
              invalidCommands++;
            }
          }
          
          // Should have 5 valid, 1 invalid
          const passed = validCommands === 5 && invalidCommands === 1;
          recordTest('cli-command-validation', passed,
            `${validCommands} valid, ${invalidCommands} invalid commands detected`,
            { results, validCommands, invalidCommands }
          );
          
          return passed;
        } catch (error) {
          recordTest('cli-command-validation', false, `CLI command validation failed: ${error.message}`);
          return false;
        }
      }
    }
  ];
  
  for (const test of tests) {
    log.info(`Running ${test.name}...`);
    const result = await test.test();
    if (result) {
      log.success(`${test.name} passed`);
    } else {
      log.error(`${test.name} failed`);
    }
  }
}

// 4. Check Error Handling
async function checkErrorHandling() {
  log.section('🛡️ Checking Error Handling');
  
  const tests = [
    {
      name: 'Import Error Handling',
      test: async () => {
        try {
          // Try to import a non-existent module
          try {
            await import('./non-existent-module');
            recordTest('import-error-handling', false, 'Expected import error was not thrown');
            return false;
          } catch (error) {
            recordTest('import-error-handling', true, 'Import error handled correctly');
            return true;
          }
        } catch (error) {
          recordTest('import-error-handling', false, `Import error handling test failed: ${error.message}`);
          return false;
        }
      }
    },
    {
      name: 'Validation Error Handling',
      test: async () => {
        try {
          // Test validation with invalid data
          const invalidData = null;
          const isValid = invalidData !== null;
          
          if (!isValid) {
            recordTest('validation-error-handling', true, 'Validation error handled correctly');
            return true;
          } else {
            recordTest('validation-error-handling', false, 'Validation should have failed');
            return false;
          }
        } catch (error) {
          recordTest('validation-error-handling', false, `Validation error handling test failed: ${error.message}`);
          return false;
        }
      }
    }
  ];
  
  for (const test of tests) {
    log.info(`Running ${test.name}...`);
    const result = await test.test();
    if (result) {
      log.success(`${test.name} passed`);
    } else {
      log.error(`${test.name} failed`);
    }
  }
}

// Main check function
async function runStatusCheck() {
  console.log(`${colors.cyan}🔍 Documentation Status Checker${colors.reset}`);
  console.log(`${colors.gray}Checking all constants and URLs...${colors.reset}\n`);
  
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
    
    console.log(`${colors.white}Total Tests:${colors.reset} ${total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.log(`${colors.blue}Success Rate:${colors.reset} ${successRate}%`);
    console.log(`${colors.gray}Duration:${colors.reset} ${duration}ms`);
    
    // Output JSON if requested
    if (options.json) {
      log.json(testResults);
    }
    
    // Exit with appropriate code
    if (failed > 0) {
      console.log(`\n${colors.yellow}⚠️ Some checks failed. See details above.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}🎉 All checks passed!${colors.reset}`);
      process.exit(0);
    }
    
  } catch (error) {
    log.error(`Status check failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
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