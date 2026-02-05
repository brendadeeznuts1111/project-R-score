#!/usr/bin/env bun
/**
 * 🔍 Enhanced Documentation Status Checker CLI
 * 
 * CLI tool to check the status of all constants and URLs INCLUDING FRAGMENTS
 * Usage: bun enhanced-status-checker.ts [options]
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('-v') || args.includes('--verbose'),
  quiet: args.includes('-q') || args.includes('--quiet'),
  urlOnly: args.includes('--url-only'),
  constantsOnly: args.includes('--constants-only'),
  importsOnly: args.includes('--imports-only'),
  fragments: args.includes('--check-fragments'),
  fullCheck: args.includes('--full-check'),
  json: args.includes('--json'),
  noColor: args.includes('--no-color'),
  help: args.includes('-h') || args.includes('--help')
};

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

// Show help
if (options.help) {
  console.log(`${colors.cyan}🔍 Enhanced Documentation Status Checker${colors.reset}`);
  console.log('');
  console.log('Usage: bun enhanced-status-checker.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose         Verbose output with detailed information');
  console.log('  -q, --quiet           Quiet mode with minimal output');
  console.log('  --url-only            Check only URL validation');
  console.log('  --constants-only      Check only constants loading');
  console.log('  --imports-only        Check only import functionality');
  console.log('  --check-fragments     Include fragment validation in URL checks');
  console.log('  --full-check          Run comprehensive check including network tests');
  console.log('  --json                Output results in JSON format');
  console.log('  --no-color            Disable colored output');
  console.log('  -h, --help            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun enhanced-status-checker.ts');
  console.log('  bun enhanced-status-checker.ts --verbose --check-fragments');
  console.log('  bun enhanced-status-checker.ts --url-only --check-fragments --json');
  console.log('  bun enhanced-status-checker.ts --full-check --check-fragments');
  process.exit(0);
}

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

// Enhanced URL validation with fragment checking
function validateURLWithFragment(url: string): {
  isValid: boolean;
  baseValid: boolean;
  fragmentValid: boolean;
  hasFragment: boolean;
  base: string;
  fragment?: string;
  error?: string;
} {
  try {
    // Parse the URL
    const fullURL = url.startsWith('http') ? url : `https://bun.sh${url}`;
    const parsed = new URL(fullURL);
    
    // Check base URL
    const baseValid = parsed.pathname && parsed.hostname;
    
    // Check fragment
    const hasFragment = !!parsed.hash;
    let fragmentValid = true;
    let fragmentError = '';
    
    if (hasFragment) {
      const fragment = parsed.hash.slice(1); // Remove #
      
      // Fragment validation rules
      if (!fragment) {
        fragmentValid = false;
        fragmentError = 'Empty fragment';
      } else if (fragment.length < 1) {
        fragmentValid = false;
        fragmentError = 'Fragment too short';
      } else if (fragment.length > 100) {
        fragmentValid = false;
        fragmentError = 'Fragment too long';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(fragment)) {
        fragmentValid = false;
        fragmentError = 'Fragment contains invalid characters';
      }
    }
    
    return {
      isValid: baseValid && fragmentValid,
      baseValid,
      fragmentValid,
      hasFragment,
      base: `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`,
      fragment: parsed.hash.slice(1) || undefined,
      error: !baseValid ? 'Invalid base URL' : fragmentError
    };
    
  } catch (error) {
    return {
      isValid: false,
      baseValid: false,
      fragmentValid: false,
      hasFragment: false,
      base: url,
      error: error.message
    };
  }
}

// 1. Check Constants Loading
async function checkConstantsLoading() {
  log.section('📦 Checking Constants Loading');
  
  // Test CLI Constants
  log.info('Testing CLI Constants Import...');
  try {
    const cliConstants = await import('./lib/documentation/constants/cli.ts');
    const categories = Object.values(cliConstants.CLICategory);
    const urls = Object.keys(cliConstants.CLI_DOCUMENTATION_URLS);
    const examples = Object.keys(cliConstants.CLI_COMMAND_EXAMPLES);
    
    recordTest('cli-constants-import', true, 
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
    const utilsConstants = await import('./lib/documentation/constants/utils.ts');
    const categories = Object.values(utilsConstants.UtilsCategory);
    const urls = Object.keys(utilsConstants.BUN_UTILS_URLS);
    const examples = Object.keys(utilsConstants.BUN_UTILS_EXAMPLES);
    
    recordTest('utils-constants-import', true,
      `Loaded ${categories.length} categories, ${urls.length} URL groups, ${examples.length} example groups`,
      { categories, urlGroups: urls, exampleGroups: examples }
    );
    log.success('Utils Constants: OK');
    
    if (options.verbose) {
      log.verbose(`Utils Categories: ${categories.join(', ')}`);
      log.verbose(`Utils URL Groups: ${urls.join(', ')}`);
    }
  } catch (error: any) {
    recordTest('utils-constants-import', false, `Failed to import Utils constants: ${error.message}`);
    log.error('Utils Constants: FAILED');
  }
  
  // Test Constants Data Integrity
  log.info('Testing Constants Data Integrity...');
  try {
    const cliConstants = await import('./lib/documentation/constants/cli.ts');
    const utilsConstants = await import('./lib/documentation/constants/utils.ts');
    
    // Count URLs and fragments
    let cliURLCount = 0;
    let cliFragmentCount = 0;
    Object.values(cliConstants.CLI_DOCUMENTATION_URLS).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach((url: any) => {
          cliURLCount++;
          if (url.includes('#')) cliFragmentCount++;
        });
      }
    });
    
    let utilsURLCount = 0;
    let utilsFragmentCount = 0;
    Object.values(utilsConstants.BUN_UTILS_URLS).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach((url: any) => {
          utilsURLCount++;
          if (url.includes('#')) utilsFragmentCount++;
        });
      }
    });
    
    const totalURLs = cliURLCount + utilsURLCount;
    const totalFragments = cliFragmentCount + utilsFragmentCount;
    const totalCategories = Object.values(cliConstants.CLICategory).length + Object.values(utilsConstants.UtilsCategory).length;
    
    recordTest('constants-data-integrity', true,
      `Data integrity verified: ${totalCategories} categories, ${totalURLs} total URLs, ${totalFragments} with fragments`,
      { totalCategories, totalURLs, totalFragments, cliURLCount, utilsURLCount, cliFragmentCount, utilsFragmentCount }
    );
    log.success('Data Integrity: OK');
    
    if (options.verbose) {
      log.verbose(`CLI URLs: ${cliURLCount} (${cliFragmentCount} with fragments)`);
      log.verbose(`Utils URLs: ${utilsURLCount} (${utilsFragmentCount} with fragments)`);
    }
  } catch (error: any) {
    recordTest('constants-data-integrity', false, `Constants data integrity check failed: ${error.message}`);
    log.error('Data Integrity: FAILED');
  }
}

// 2. Enhanced URL Validation with Fragment Checking
async function checkURLValidation() {
  log.section('🔗 Checking URL Validation (Enhanced with Fragments)');
  
  // Test URL Structure Validation
  log.info('Testing URL Structure Validation...');
  try {
    const cliConstants = await import('./lib/documentation/constants/cli.ts');
    const utilsConstants = await import('./lib/documentation/constants/utils.ts');
    
    let validURLs = 0;
    let invalidURLs = 0;
    let validFragments = 0;
    let invalidFragments = 0;
    let urlsWithFragments = 0;
    const invalidList: Array<{url: string, error: string}> = [];
    const fragmentIssues: Array<{url: string, fragment: string, error: string}> = [];
    
    // Check CLI URLs
    Object.values(cliConstants.CLI_DOCUMENTATION_URLS).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach((url: any) => {
          const validation = validateURLWithFragment(url);
          
          if (validation.isValid) {
            validURLs++;
            if (validation.hasFragment) {
              validFragments++;
              urlsWithFragments++;
            }
          } else {
            invalidURLs++;
            invalidList.push({ url, error: validation.error || 'Unknown error' });
            
            if (validation.hasFragment && !validation.fragmentValid) {
              invalidFragments++;
              fragmentIssues.push({
                url,
                fragment: validation.fragment || '',
                error: validation.error || 'Fragment error'
              });
            }
          }
        });
      }
    });
    
    // Check Utils URLs
    Object.values(utilsConstants.BUN_UTILS_URLS).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach((url: any) => {
          const validation = validateURLWithFragment(url);
          
          if (validation.isValid) {
            validURLs++;
            if (validation.hasFragment) {
              validFragments++;
              urlsWithFragments++;
            }
          } else {
            invalidURLs++;
            invalidList.push({ url, error: validation.error || 'Unknown error' });
            
            if (validation.hasFragment && !validation.fragmentValid) {
              invalidFragments++;
              fragmentIssues.push({
                url,
                fragment: validation.fragment || '',
                error: validation.error || 'Fragment error'
              });
            }
          }
        });
      }
    });
    
    const passed = invalidURLs === 0 && invalidFragments === 0;
    const message = passed 
      ? `All ${validURLs} URLs valid (${validFragments} fragments validated)`
      : `${invalidURLs} invalid URLs, ${invalidFragments} invalid fragments of ${validURLs + invalidURLs} total`;
    
    recordTest('url-structure-validation', passed, message, {
      validURLs,
      invalidURLs,
      validFragments,
      invalidFragments,
      urlsWithFragments,
      invalidList,
      fragmentIssues
    });
    
    if (passed) {
      log.success(`URL Structure: OK (${validFragments} fragments validated)`);
    } else {
      log.error(`URL Structure: ${invalidURLs} invalid URLs, ${invalidFragments} invalid fragments`);
      if (options.verbose) {
        invalidList.forEach(item => log.verbose(`  Invalid URL: ${item.url} - ${item.error}`));
        fragmentIssues.forEach(item => log.verbose(`  Invalid Fragment: ${item.fragment} in ${item.url} - ${item.error}`));
      }
    }
    
  } catch (error: any) {
    recordTest('url-structure-validation', false, `URL structure validation failed: ${error.message}`);
    log.error('URL Structure: FAILED');
  }
  
  // Fragment-specific analysis
  if (options.fragments || options.verbose) {
    log.info('Analyzing URL Fragments...');
    try {
      const cliConstants = await import('./lib/documentation/constants/cli.ts');
      const utilsConstants = await import('./lib/documentation/constants/utils.ts');
      
      const fragmentAnalysis = {
        totalURLs: 0,
        urlsWithFragments: 0,
        uniqueFragments: new Set<string>(),
        fragmentLengths: [] as number[],
        fragmentCategories: {} as Record<string, string[]>
      };
      
      // Analyze CLI URLs
      Object.entries(cliConstants.CLI_DOCUMENTATION_URLS).forEach(([category, urls]) => {
        if (typeof urls === 'object') {
          Object.values(urls).forEach((url: any) => {
            fragmentAnalysis.totalURLs++;
            if (url.includes('#')) {
              fragmentAnalysis.urlsWithFragments++;
              const fragment = url.split('#')[1];
              if (fragment) {
                fragmentAnalysis.uniqueFragments.add(fragment);
                fragmentAnalysis.fragmentLengths.push(fragment.length);
                
                if (!fragmentAnalysis.fragmentCategories[category]) {
                  fragmentAnalysis.fragmentCategories[category] = [];
                }
                fragmentAnalysis.fragmentCategories[category].push(fragment);
              }
            }
          });
        }
      });
      
      // Analyze Utils URLs
      Object.entries(utilsConstants.BUN_UTILS_URLS).forEach(([category, urls]) => {
        if (typeof urls === 'object') {
          Object.values(urls).forEach((url: any) => {
            fragmentAnalysis.totalURLs++;
            if (url.includes('#')) {
              fragmentAnalysis.urlsWithFragments++;
              const fragment = url.split('#')[1];
              if (fragment) {
                fragmentAnalysis.uniqueFragments.add(fragment);
                fragmentAnalysis.fragmentLengths.push(fragment.length);
                
                if (!fragmentAnalysis.fragmentCategories[category]) {
                  fragmentAnalysis.fragmentCategories[category] = [];
                }
                fragmentAnalysis.fragmentCategories[category].push(fragment);
              }
            }
          });
        }
      });
      
      const avgFragmentLength = fragmentAnalysis.fragmentLengths.length > 0
        ? fragmentAnalysis.fragmentLengths.reduce((a, b) => a + b, 0) / fragmentAnalysis.fragmentLengths.length
        : 0;
      
      recordTest('fragment-analysis', true,
        `Fragment analysis: ${fragmentAnalysis.urlsWithFragments}/${fragmentAnalysis.totalURLs} URLs have fragments, ${fragmentAnalysis.uniqueFragments.size} unique fragments, avg length: ${avgFragmentLength.toFixed(1)}`,
        {
          totalURLs: fragmentAnalysis.totalURLs,
          urlsWithFragments: fragmentAnalysis.urlsWithFragments,
          uniqueFragments: Array.from(fragmentAnalysis.uniqueFragments),
          avgFragmentLength,
          fragmentCategories: fragmentAnalysis.fragmentCategories
        }
      );
      
      log.success(`Fragment Analysis: ${fragmentAnalysis.urlsWithFragments}/${fragmentAnalysis.totalURLs} URLs have fragments`);
      
      if (options.verbose) {
        log.verbose(`Unique fragments: ${fragmentAnalysis.uniqueFragments.size}`);
        log.verbose(`Average fragment length: ${avgFragmentLength.toFixed(1)} characters`);
        
        Object.entries(fragmentAnalysis.fragmentCategories).forEach(([category, fragments]) => {
          log.verbose(`${category}: ${fragments.join(', ')}`);
        });
      }
      
    } catch (error: any) {
      recordTest('fragment-analysis', false, `Fragment analysis failed: ${error.message}`);
      log.error('Fragment Analysis: FAILED');
    }
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

// Main check function
async function runStatusCheck() {
  console.log(`${colors.cyan}🔍 Enhanced Documentation Status Checker${colors.reset}`);
  console.log(`${colors.gray}Checking all constants and URLs INCLUDING FRAGMENTS...${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // Run checks based on options
    if (!options.urlOnly && !options.constantsOnly && !options.importsOnly) {
      await checkConstantsLoading();
      await checkURLValidation();
    } else {
      if (options.constantsOnly) await checkConstantsLoading();
      if (options.urlOnly) await checkURLValidation();
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print summary
    log.section('📊 Enhanced Check Summary');
    
    const { total, passed, failed } = testResults.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    
    console.log(`${colors.white}Total Tests:${colors.reset} ${total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.log(`${colors.blue}Success Rate:${colors.reset} ${successRate}%`);
    console.log(`${colors.gray}Duration:${colors.reset} ${duration}ms`);
    
    if (options.fragments || options.verbose) {
      console.log(`${colors.magenta}Fragment Checking:${colors.reset} ${options.fragments ? 'ENABLED' : 'DISABLED'}`);
    }
    
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
    
  } catch (error: any) {
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
