#!/usr/bin/env bun
// tools/comprehensive-url-validator.ts — URL validator with subpath and fragment analysis

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('-v') || args.includes('--verbose'),
  quiet: args.includes('-q') || args.includes('--quiet'),
  subpaths: args.includes('--check-subpaths'),
  fragments: args.includes('--check-fragments'),
  structure: args.includes('--check-structure'),
  fullAnalysis: args.includes('--full-analysis'),
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
  console.log(`${colors.cyan}🔍 Comprehensive URL Validator${colors.reset}`);
  console.log('');
  console.log('Usage: bun comprehensive-url-validator.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose         Verbose output with detailed information');
  console.log('  -q, --quiet           Quiet mode with minimal output');
  console.log('  --check-subpaths      Include subpath validation');
  console.log('  --check-fragments     Include fragment validation');
  console.log('  --check-structure     Include URL structure analysis');
  console.log('  --full-analysis       Complete URL analysis (all checks)');
  console.log('  --json                Output results in JSON format');
  console.log('  --no-color            Disable colored output');
  console.log('  -h, --help            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun comprehensive-url-validator.ts --full-analysis');
  console.log('  bun comprehensive-url-validator.ts --check-subpaths --verbose');
  console.log('  bun comprehensive-url-validator.ts --check-fragments --json');
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

// Comprehensive URL validation
function validateURLComprehensive(url: string): {
  isValid: boolean;
  baseValid: boolean;
  subpathValid: boolean;
  fragmentValid: boolean;
  hasSubpath: boolean;
  hasFragment: boolean;
  protocol: string;
  hostname: string;
  pathname: string;
  subpaths: string[];
  fragment?: string;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse the URL
    const fullURL = url.startsWith('http') ? url : `https://bun.sh${url}`;
    const parsed = new URL(fullURL);

    // Base URL validation
    const baseValid = !!(parsed.protocol && parsed.hostname && parsed.pathname);
    if (!baseValid) {
      errors.push('Invalid base URL structure');
    }

    // Subpath analysis
    const pathname = parsed.pathname;
    const subpaths = pathname.split('/').filter(segment => segment.length > 0);
    const hasSubpath = subpaths.length > 0;

    let subpathValid = true;
    if (hasSubpath) {
      // Subpath validation rules
      subpaths.forEach((subpath, index) => {
        if (subpath.length === 0) {
          subpathValid = false;
          errors.push(`Empty subpath at position ${index}`);
        } else if (subpath.length > 50) {
          subpathValid = false;
          errors.push(`Subpath too long: ${subpath}`);
        } else if (!/^[a-zA-Z0-9_-]+$/.test(subpath)) {
          subpathValid = false;
          errors.push(`Invalid characters in subpath: ${subpath}`);
        }
      });

      // Validate common documentation patterns
      if (subpaths[0] !== 'docs') {
        warnings.push('First subpath is not "docs"');
      }

      if (subpaths.includes('api') && subpaths.includes('cli')) {
        warnings.push('URL contains both "api" and "cli" - may be ambiguous');
      }
    } else {
      warnings.push('No subpaths found');
    }

    // Fragment validation
    const hasFragment = !!parsed.hash;
    let fragmentValid = true;
    const fragment = parsed.hash.slice(1); // Remove #

    if (hasFragment) {
      if (!fragment) {
        fragmentValid = false;
        errors.push('Empty fragment');
      } else if (fragment.length < 1) {
        fragmentValid = false;
        errors.push('Fragment too short');
      } else if (fragment.length > 100) {
        fragmentValid = false;
        errors.push('Fragment too long');
      } else if (!/^[a-zA-Z0-9_-]+$/.test(fragment)) {
        fragmentValid = false;
        errors.push('Fragment contains invalid characters');
      }
    }

    const isValid = baseValid && subpathValid && fragmentValid;

    return {
      isValid,
      baseValid,
      subpathValid,
      fragmentValid,
      hasSubpath,
      hasFragment,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname,
      subpaths,
      fragment: hasFragment ? fragment : undefined,
      errors,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      baseValid: false,
      subpathValid: false,
      fragmentValid: false,
      hasSubpath: false,
      hasFragment: false,
      protocol: '',
      hostname: '',
      pathname: '',
      subpaths: [],
      errors: [error.message],
      warnings
    };
  }
}

// Analyze URL structure patterns
function analyzeURLPatterns(urls: string[]) {
  const patterns = {
    protocols: new Set<string>(),
    hostnames: new Set<string>(),
    firstSubpaths: new Set<string>(),
    commonPaths: new Map<string, number>(),
    pathDepths: [] as number[],
    fragmentUsage: { with: 0, without: 0 },
    subpathCounts: new Map<number, number>()
  };

  urls.forEach(url => {
    const validation = validateURLComprehensive(url);

    if (validation.baseValid) {
      patterns.protocols.add(validation.protocol);
      patterns.hostnames.add(validation.hostname);

      if (validation.subpaths.length > 0) {
        patterns.firstSubpaths.add(validation.subpaths[0]);
        patterns.pathDepths.push(validation.subpaths.length);
        patterns.subpathCounts.set(validation.subpaths.length, (patterns.subpathCounts.get(validation.subpaths.length) || 0) + 1);

        const pathKey = validation.subpaths.join('/');
        patterns.commonPaths.set(pathKey, (patterns.commonPaths.get(pathKey) || 0) + 1);
      }

      if (validation.hasFragment) {
        patterns.fragmentUsage.with++;
      } else {
        patterns.fragmentUsage.without++;
      }
    }
  });

  return {
    protocols: Array.from(patterns.protocols),
    hostnames: Array.from(patterns.hostnames),
    firstSubpaths: Array.from(patterns.firstSubpaths),
    commonPaths: Array.from(patterns.commonPaths.entries()).sort((a, b) => b[1] - a[1]),
    avgPathDepth: patterns.pathDepths.length > 0 ? patterns.pathDepths.reduce((a, b) => a + b, 0) / patterns.pathDepths.length : 0,
    fragmentUsage: patterns.fragmentUsage,
    subpathDistribution: Array.from(patterns.subpathCounts.entries()).sort((a, b) => a[0] - b[0])
  };
}

// Main validation function
async function runComprehensiveValidation() {
  console.log(`${colors.cyan}🔍 Comprehensive URL Validator${colors.reset}`);
  console.log(`${colors.gray}Validating URLs with Base + Subpath + Fragment analysis...${colors.reset}\n`);

  const startTime = Date.now();

  try {
    // Load constants
    const cliConstants = await import('./lib/documentation/constants/cli.ts');
    const utilsConstants = await import('./lib/documentation/constants/utils.ts');

    // Collect all URLs
    const allURLs: string[] = [];
    const urlSources: Record<string, string> = {};

    // Collect CLI URLs
    Object.entries(cliConstants.CLI_DOCUMENTATION_URLS).forEach(([category, urls]) => {
      if (typeof urls === 'object') {
        Object.entries(urls).forEach(([key, url]) => {
          allURLs.push(url);
          urlSources[url] = `CLI.${category}.${key}`;
        });
      }
    });

    // Collect Utils URLs
    Object.entries(utilsConstants.BUN_UTILS_URLS).forEach(([category, urls]) => {
      if (typeof urls === 'object') {
        Object.entries(urls).forEach(([key, url]) => {
          allURLs.push(url);
          urlSources[url] = `UTILS.${category}.${key}`;
        });
      }
    });

    log.section('📊 URL Statistics');
    log.info(`Total URLs to validate: ${allURLs.length}`);
    log.info(`CLI URLs: ${Object.keys(cliConstants.CLI_DOCUMENTATION_URLS).length} categories`);
    log.info(`Utils URLs: ${Object.keys(utilsConstants.BUN_UTILS_URLS).length} categories`);

    // Basic URL validation
    log.section('🔗 Basic URL Validation');
    let validURLs = 0;
    let invalidURLs = 0;
    const validationResults: Record<string, any> = {};

    allURLs.forEach(url => {
      const validation = validateURLComprehensive(url);
      validationResults[url] = validation;

      if (validation.isValid) {
        validURLs++;
      } else {
        invalidURLs++;
      }
    });

    recordTest('basic-url-validation', invalidURLs === 0,
      `${validURLs} valid, ${invalidURLs} invalid URLs`,
      { validURLs, invalidURLs, totalURLs: allURLs.length }
    );

    if (invalidURLs === 0) {
      log.success('Basic URL Validation: OK');
    } else {
      log.error(`Basic URL Validation: ${invalidURLs} invalid URLs found`);
      if (options.verbose) {
        Object.entries(validationResults).forEach(([url, result]) => {
          if (!result.isValid) {
            log.verbose(`  ${urlSources[url]}: ${result.errors.join(', ')}`);
          }
        });
      }
    }

    // Subpath analysis
    if (options.subpaths || options.fullAnalysis) {
      log.section('📁 Subpath Analysis');

      const subpathStats = {
        totalURLs: allURLs.length,
        urlsWithSubpaths: 0,
        urlsWithoutSubpaths: 0,
        uniqueSubpaths: new Set<string>(),
        subpathLengths: [] as number[],
        invalidSubpaths: 0,
        commonSubpaths: new Map<string, number>()
      };

      allURLs.forEach(url => {
        const validation = validationResults[url];
        if (validation.hasSubpath) {
          subpathStats.urlsWithSubpaths++;
          validation.subpaths.forEach(subpath => {
            subpathStats.uniqueSubpaths.add(subpath);
            subpathStats.subpathLengths.push(subpath.length);
            subpathStats.commonSubpaths.set(subpath, (subpathStats.commonSubpaths.get(subpath) || 0) + 1);
          });

          if (!validation.subpathValid) {
            subpathStats.invalidSubpaths++;
          }
        } else {
          subpathStats.urlsWithoutSubpaths++;
        }
      });

      const avgSubpathLength = subpathStats.subpathLengths.length > 0
        ? subpathStats.subpathLengths.reduce((a, b) => a + b, 0) / subpathStats.subpathLengths.length
        : 0;

      const commonSubpathsList = Array.from(subpathStats.commonSubpaths.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      recordTest('subpath-analysis', subpathStats.invalidSubpaths === 0,
        `${subpathStats.urlsWithSubpaths}/${subpathStats.totalURLs} URLs have subpaths, ${subpathStats.invalidSubpaths} invalid`,
        {
          totalURLs: subpathStats.totalURLs,
          urlsWithSubpaths: subpathStats.urlsWithSubpaths,
          urlsWithoutSubpaths: subpathStats.urlsWithoutSubpaths,
          uniqueSubpaths: Array.from(subpathStats.uniqueSubpaths),
          avgSubpathLength,
          invalidSubpaths: subpathStats.invalidSubpaths,
          commonSubpaths: commonSubpathsList
        }
      );

      if (subpathStats.invalidSubpaths === 0) {
        log.success(`Subpath Analysis: OK (${subpathStats.urlsWithSubpaths} URLs with subpaths)`);
      } else {
        log.error(`Subpath Analysis: ${subpathStats.invalidSubpaths} invalid subpaths found`);
      }

      if (options.verbose) {
        log.verbose(`Unique subpaths: ${subpathStats.uniqueSubpaths.size}`);
        log.verbose(`Average subpath length: ${avgSubpathLength.toFixed(1)} characters`);
        log.verbose('Top 10 common subpaths:');
        commonSubpathsList.forEach(([subpath, count]) => {
          log.verbose(`  ${subpath}: ${count} occurrences`);
        });
      }
    }

    // Fragment analysis
    if (options.fragments || options.fullAnalysis) {
      log.section('🔗 Fragment Analysis');

      const fragmentStats = {
        totalURLs: allURLs.length,
        urlsWithFragments: 0,
        urlsWithoutFragments: 0,
        uniqueFragments: new Set<string>(),
        fragmentLengths: [] as number[],
        invalidFragments: 0,
        commonFragments: new Map<string, number>()
      };

      allURLs.forEach(url => {
        const validation = validationResults[url];
        if (validation.hasFragment) {
          fragmentStats.urlsWithFragments++;
          if (validation.fragment) {
            fragmentStats.uniqueFragments.add(validation.fragment);
            fragmentStats.fragmentLengths.push(validation.fragment.length);
            fragmentStats.commonFragments.set(validation.fragment, (fragmentStats.commonFragments.get(validation.fragment) || 0) + 1);
          }

          if (!validation.fragmentValid) {
            fragmentStats.invalidFragments++;
          }
        } else {
          fragmentStats.urlsWithoutFragments++;
        }
      });

      const avgFragmentLength = fragmentStats.fragmentLengths.length > 0
        ? fragmentStats.fragmentLengths.reduce((a, b) => a + b, 0) / fragmentStats.fragmentLengths.length
        : 0;

      const commonFragmentsList = Array.from(fragmentStats.commonFragments.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      recordTest('fragment-analysis', fragmentStats.invalidFragments === 0,
        `${fragmentStats.urlsWithFragments}/${fragmentStats.totalURLs} URLs have fragments, ${fragmentStats.invalidFragments} invalid`,
        {
          totalURLs: fragmentStats.totalURLs,
          urlsWithFragments: fragmentStats.urlsWithFragments,
          urlsWithoutFragments: fragmentStats.urlsWithoutFragments,
          uniqueFragments: Array.from(fragmentStats.uniqueFragments),
          avgFragmentLength,
          invalidFragments: fragmentStats.invalidFragments,
          commonFragments: commonFragmentsList
        }
      );

      if (fragmentStats.invalidFragments === 0) {
        log.success(`Fragment Analysis: OK (${fragmentStats.urlsWithFragments} URLs with fragments)`);
      } else {
        log.error(`Fragment Analysis: ${fragmentStats.invalidFragments} invalid fragments found`);
      }

      if (options.verbose) {
        log.verbose(`Unique fragments: ${fragmentStats.uniqueFragments.size}`);
        log.verbose(`Average fragment length: ${avgFragmentLength.toFixed(1)} characters`);
        log.verbose('Top 10 common fragments:');
        commonFragmentsList.forEach(([fragment, count]) => {
          log.verbose(`  ${fragment}: ${count} occurrences`);
        });
      }
    }

    // Structure analysis
    if (options.structure || options.fullAnalysis) {
      log.section('🏗️ URL Structure Analysis');

      const patterns = analyzeURLPatterns(allURLs);

      recordTest('structure-analysis', true,
        `Analyzed ${allURLs.length} URLs, found ${patterns.commonPaths.length} unique paths`,
        patterns
      );

      log.success('Structure Analysis: OK');

      if (options.verbose) {
        log.verbose(`Protocols: ${patterns.protocols.join(', ')}`);
        log.verbose(`Hostnames: ${patterns.hostnames.join(', ')}`);
        log.verbose(`First subpaths: ${patterns.firstSubpaths.join(', ')}`);
        log.verbose(`Average path depth: ${patterns.avgPathDepth.toFixed(1)}`);
        log.verbose(`Fragment usage: ${patterns.fragmentUsage.with} with, ${patterns.fragmentUsage.without} without`);

        log.verbose('Top 5 common paths:');
        patterns.commonPaths.slice(0, 5).forEach(([path, count]) => {
          log.verbose(`  /${path}: ${count} URLs`);
        });
      }
    }

    // Summary
    const endTime = Date.now();
    const duration = endTime - startTime;

    log.section('📊 Validation Summary');

    const { total, passed, failed } = testResults.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

    console.log(`${colors.white}Total Tests:${colors.reset} ${total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.log(`${colors.blue}Success Rate:${colors.reset} ${successRate}%`);
    console.log(`${colors.gray}Duration:${colors.reset} ${duration}ms`);

    // Output JSON if requested
    if (options.json) {
      log.json({
        ...testResults,
        urlValidation: validationResults,
        urlSources
      });
    }

    // Exit with appropriate code
    if (failed > 0) {
      console.log(`\n${colors.yellow}⚠️ Some validations failed. See details above.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}🎉 All validations passed!${colors.reset}`);
      process.exit(0);
    }

  } catch (error: any) {
    log.error(`Validation failed: ${error.message}`);
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

// Run the validation
if (import.meta.main) {
  runComprehensiveValidation();
}
