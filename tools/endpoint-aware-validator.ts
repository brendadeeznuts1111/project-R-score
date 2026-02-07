#!/usr/bin/env bun
// tools/endpoint-aware-validator.ts — URL validator with endpoint-level analysis

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('-v') || args.includes('--verbose'),
  quiet: args.includes('-q') || args.includes('--quiet'),
  endpoints: args.includes('--check-endpoints'),
  consistency: args.includes('--check-consistency'),
  hierarchy: args.includes('--check-hierarchy'),
  fullAnalysis: args.includes('--full-analysis'),
  dryRun: args.includes('--dry-run'),
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
  console.log(`${colors.cyan}🔍 Endpoint-Aware URL Validator${colors.reset}`);
  console.log('');
  console.log('Usage: bun endpoint-aware-validator.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose         Verbose output with detailed information');
  console.log('  -q, --quiet           Quiet mode with minimal output');
  console.log('  --check-endpoints     Include endpoint-level validation');
  console.log('  --check-consistency   Check endpoint consistency patterns');
  console.log('  --check-hierarchy     Validate endpoint hierarchy structure');
  console.log('  --full-analysis       Complete endpoint analysis');
  console.log('  --dry-run             Show what would be checked without running');
  console.log('  --json                Output results in JSON format');
  console.log('  --no-color            Disable colored output');
  console.log('  -h, --help            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun endpoint-aware-validator.ts --full-analysis');
  console.log('  bun endpoint-aware-validator.ts --check-endpoints --verbose');
  console.log('  bun endpoint-aware-validator.ts --dry-run --full-analysis');
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

// Endpoint structure interface
interface EndpointInfo {
  id: string;
  category: string;
  key: string;
  url: string;
  fullUrl: string;
  protocol: string;
  hostname: string;
  pathname: string;
  endpoint: string;
  depth: number;
  segments: string[];
  hasFragment: boolean;
  fragment?: string;
  endpointType: 'page' | 'anchor' | 'api' | 'cli';
  isUnique: boolean;
  duplicates: string[];
}

// Parse endpoint information
function parseEndpointInfo(url: string, category: string, key: string): EndpointInfo {
  const fullUrl = url.startsWith('http') ? url : `https://bun.sh${url}`;
  const parsed = new URL(fullUrl);

  const segments = parsed.pathname.split('/').filter(segment => segment.length > 0);
  const endpoint = `/${segments.join('/')}`;
  const hasFragment = !!parsed.hash;
  const fragment = hasFragment ? parsed.hash.slice(1) : undefined;

  // Determine endpoint type
  let endpointType: 'page' | 'anchor' | 'api' | 'cli' = 'page';
  if (hasFragment) {
    endpointType = 'anchor';
  } else if (segments.includes('api')) {
    endpointType = 'api';
  } else if (segments.includes('cli')) {
    endpointType = 'cli';
  }

  return {
    id: `${category}.${key}`,
    category,
    key,
    url,
    fullUrl,
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    endpoint,
    depth: segments.length,
    segments,
    hasFragment,
    fragment,
    endpointType,
    isUnique: false, // Will be determined later
    duplicates: []
  };
}

// Analyze endpoint consistency
function analyzeEndpointConsistency(endpoints: EndpointInfo[]) {
  const consistency = {
    endpointTypes: new Map<string, EndpointInfo[]>(),
    fragmentPatterns: new Map<string, EndpointInfo[]>(),
    depthDistribution: new Map<number, EndpointInfo[]>(),
    categoryPatterns: new Map<string, EndpointInfo[]>(),
    duplicateEndpoints: new Map<string, EndpointInfo[]>(),
    inconsistentNaming: [] as string[],
    hierarchyIssues: [] as string[]
  };

  // Group endpoints by various properties
  endpoints.forEach(endpoint => {
    // Group by endpoint type
    if (!consistency.endpointTypes.has(endpoint.endpointType)) {
      consistency.endpointTypes.set(endpoint.endpointType, []);
    }
    consistency.endpointTypes.get(endpoint.endpointType)!.push(endpoint);

    // Group by depth
    if (!consistency.depthDistribution.has(endpoint.depth)) {
      consistency.depthDistribution.set(endpoint.depth, []);
    }
    consistency.depthDistribution.get(endpoint.depth)!.push(endpoint);

    // Group by category
    if (!consistency.categoryPatterns.has(endpoint.category)) {
      consistency.categoryPatterns.set(endpoint.category, []);
    }
    consistency.categoryPatterns.get(endpoint.category)!.push(endpoint);

    // Group by fragment patterns
    if (endpoint.hasFragment && endpoint.fragment) {
      if (!consistency.fragmentPatterns.has(endpoint.fragment)) {
        consistency.fragmentPatterns.set(endpoint.fragment, []);
      }
      consistency.fragmentPatterns.get(endpoint.fragment)!.push(endpoint);
    }

    // Find duplicate endpoints
    if (!consistency.duplicateEndpoints.has(endpoint.endpoint)) {
      consistency.duplicateEndpoints.set(endpoint.endpoint, []);
    }
    consistency.duplicateEndpoints.get(endpoint.endpoint)!.push(endpoint);
  });

  // Identify duplicates and inconsistencies
  consistency.duplicateEndpoints.forEach((duplicateEndpoints, endpoint) => {
    if (duplicateEndpoints.length > 1) {
      duplicateEndpoints.forEach(ep => {
        ep.isUnique = false;
        ep.duplicates = duplicateEndpoints
          .filter(other => other.id !== ep.id)
          .map(other => other.id);
      });
    }
  });

  // Check for naming inconsistencies
  consistency.categoryPatterns.forEach((categoryEndpoints, category) => {
    const namingPatterns = {
      uppercase: 0,
      lowercase: 0,
      camelCase: 0,
      kebabCase: 0,
      snakeCase: 0
    };

    categoryEndpoints.forEach(endpoint => {
      const key = endpoint.key;
      if (key === key.toUpperCase()) namingPatterns.uppercase++;
      else if (key === key.toLowerCase()) namingPatterns.lowercase++;
      else if (key.includes('-')) namingPatterns.kebabCase++;
      else if (key.includes('_')) namingPatterns.snakeCase++;
      else namingPatterns.camelCase++;
    });

    // Check if category has mixed naming patterns
    const patternsUsed = Object.entries(namingPatterns)
      .filter(([_, count]) => count > 0)
      .map(([pattern, _]) => pattern);

    if (patternsUsed.length > 1) {
      consistency.inconsistentNaming.push(
        `${category}: Mixed naming patterns (${patternsUsed.join(', ')})`
      );
    }
  });

  // Check hierarchy issues
  endpoints.forEach(endpoint => {
    // Check for inconsistent depths within same category
    const categoryEndpoints = consistency.categoryPatterns.get(endpoint.category)!;
    const depths = [...new Set(categoryEndpoints.map(ep => ep.depth))];

    if (depths.length > 2) {
      consistency.hierarchyIssues.push(
        `${endpoint.id}: Inconsistent depth levels (${depths.join(', ')})`
      );
    }

    // Check for fragments without proper page endpoints
    if (endpoint.hasFragment && endpoint.endpointType === 'anchor') {
      const hasPageEndpoint = endpoints.some(ep =>
        ep.endpoint === endpoint.endpoint && !ep.hasFragment
      );

      if (!hasPageEndpoint) {
        consistency.hierarchyIssues.push(
          `${endpoint.id}: Fragment without corresponding page endpoint`
        );
      }
    }
  });

  return consistency;
}

// Validate endpoint hierarchy
function validateEndpointHierarchy(endpoints: EndpointInfo[]) {
  const hierarchy = {
    valid: true,
    issues: [] as string[],
    structure: {
      docs: new Map<string, EndpointInfo[]>(),
      api: new Map<string, EndpointInfo[]>(),
      cli: new Map<string, EndpointInfo[]>(),
      other: new Map<string, EndpointInfo[]>()
    },
    recommendations: [] as string[]
  };

  // Organize endpoints by hierarchy
  endpoints.forEach(endpoint => {
    const segments = endpoint.segments;

    if (segments[0] === 'docs') {
      if (segments[1] === 'api') {
        const key = segments.slice(2).join('/');
        if (!hierarchy.structure.api.has(key)) {
          hierarchy.structure.api.set(key, []);
        }
        hierarchy.structure.api.get(key)!.push(endpoint);
      } else if (segments[1] === 'cli') {
        const key = segments.slice(2).join('/');
        if (!hierarchy.structure.cli.has(key)) {
          hierarchy.structure.cli.set(key, []);
        }
        hierarchy.structure.cli.get(key)!.push(endpoint);
      } else {
        const key = segments.slice(1).join('/');
        if (!hierarchy.structure.docs.has(key)) {
          hierarchy.structure.docs.set(key, []);
        }
        hierarchy.structure.docs.get(key)!.push(endpoint);
      }
    } else {
      const key = segments.join('/');
      if (!hierarchy.structure.other.has(key)) {
        hierarchy.structure.other.set(key, []);
      }
      hierarchy.structure.other.get(key)!.push(endpoint);
    }
  });

  // Validate hierarchy structure
  Object.entries(hierarchy.structure).forEach(([section, sectionEndpoints]) => {
    sectionEndpoints.forEach((endpoints, path) => {
      // Check for proper organization
      if (section === 'api' && !path.includes('utils')) {
        hierarchy.issues.push(`API endpoint outside utils: ${path}`);
        hierarchy.valid = false;
      }

      if (section === 'cli' && path.length === 0) {
        hierarchy.issues.push(`CLI main page missing depth: ${path}`);
        hierarchy.valid = false;
      }

      // Check for fragment organization
      const withFragments = endpoints.filter(ep => ep.hasFragment);
      const withoutFragments = endpoints.filter(ep => !ep.hasFragment);

      if (withFragments.length > 0 && withoutFragments.length === 0) {
        hierarchy.issues.push(`Only fragments without main page: ${path}`);
        hierarchy.valid = false;
      }
    });
  });

  // Generate recommendations
  if (hierarchy.structure.api.size === 1) {
    hierarchy.recommendations.push('Consider organizing API endpoints into multiple sections');
  }

  if (hierarchy.structure.cli.size > 10) {
    hierarchy.recommendations.push('Consider grouping CLI endpoints into subcategories');
  }

  return hierarchy;
}

// Main validation function
async function runEndpointValidation() {
  console.log(`${colors.cyan}🔍 Endpoint-Aware URL Validator${colors.reset}`);

  if (options.dryRun) {
    console.log(`${colors.yellow}DRY RUN MODE: Showing what would be validated${colors.reset}`);
  } else {
    console.log(`${colors.gray}Validating URLs with endpoint-level analysis...${colors.reset}`);
  }
  console.log('');

  const startTime = Date.now();

  try {
    if (options.dryRun) {
      log.section('🔍 DRY RUN: Validation Plan');

      console.log('Would perform the following validations:');
      console.log('');

      if (options.fullAnalysis || options.endpoints) {
        console.log('✅ Endpoint-Level Analysis:');
        console.log('   - Check endpoint uniqueness');
        console.log('   - Identify duplicate base URLs');
        console.log('   - Analyze endpoint type distribution');
        console.log('   - Validate endpoint structure');
        console.log('');
      }

      if (options.fullAnalysis || options.consistency) {
        console.log('✅ Consistency Analysis:');
        console.log('   - Check naming pattern consistency');
        console.log('   - Validate endpoint organization');
        console.log('   - Identify hierarchy issues');
        console.log('   - Detect fragment-page relationships');
        console.log('');
      }

      if (options.fullAnalysis || options.hierarchy) {
        console.log('✅ Hierarchy Validation:');
        console.log('   - Validate endpoint organization levels');
        console.log('   - Check for missing main pages');
        console.log('   - Analyze depth distribution');
        console.log('   - Generate structure recommendations');
        console.log('');
      }

      console.log('Expected output:');
      console.log('📊 Endpoint Statistics (75 total endpoints)');
      console.log('🔗 Basic URL Validation (expected: 1 pass, 3 fail)');
      console.log('🎯 Endpoint-Level Analysis (expected: duplicates found)');
      console.log('🔄 Consistency Analysis (expected: issues found)');
      console.log('🏗️ Hierarchy Validation (expected: issues found)');
      console.log('');

      console.log(`${colors.blue}💡 To run actual validation, use: bun endpoint-aware-validator.ts --full-analysis${colors.reset}`);
      return;
    }

    // Load constants
    const cliConstants = await import('./lib/documentation/constants/cli.ts');
    const utilsConstants = await import('./lib/documentation/constants/utils.ts');

    // Collect all endpoints
    const endpoints: EndpointInfo[] = [];

    // Collect CLI endpoints
    Object.entries(cliConstants.CLI_DOCUMENTATION_URLS).forEach(([category, urls]) => {
      if (typeof urls === 'object') {
        Object.entries(urls).forEach(([key, url]) => {
          endpoints.push(parseEndpointInfo(url, `CLI.${category}`, key));
        });
      }
    });

    // Collect Utils endpoints
    Object.entries(utilsConstants.BUN_UTILS_URLS).forEach(([category, urls]) => {
      if (typeof urls === 'object') {
        Object.entries(urls).forEach(([key, url]) => {
          endpoints.push(parseEndpointInfo(url, `UTILS.${category}`, key));
        });
      }
    });

    log.section('📊 Endpoint Statistics');
    log.info(`Total endpoints: ${endpoints.length}`);

    const endpointTypes = new Map<string, number>();
    const depths = new Map<number, number>();
    const categories = new Set<string>();

    endpoints.forEach(endpoint => {
      endpointTypes.set(endpoint.endpointType, (endpointTypes.get(endpoint.endpointType) || 0) + 1);
      depths.set(endpoint.depth, (depths.get(endpoint.depth) || 0) + 1);
      categories.add(endpoint.category);
    });

    log.info(`Categories: ${categories.size}`);
    log.info(`Endpoint types: ${Array.from(endpointTypes.entries()).map(([type, count]) => `${type}(${count})`).join(', ')}`);
    log.info(`Depth levels: ${Array.from(depths.entries()).map(([depth, count]) => `L${depth}(${count})`).join(', ')}`);

    // Basic URL validation
    log.section('🔗 Basic URL Validation');

    let validURLs = 0;
    let invalidURLs = 0;

    endpoints.forEach(endpoint => {
      try {
        new URL(endpoint.fullUrl);
        validURLs++;
      } catch {
        invalidURLs++;
      }
    });

    recordTest('basic-url-validation', invalidURLs === 0,
      `${validURLs} valid, ${invalidURLs} invalid URLs`,
      { validURLs, invalidURLs, totalURLs: endpoints.length }
    );

    if (invalidURLs === 0) {
      log.success('Basic URL Validation: OK');
    } else {
      log.error(`Basic URL Validation: ${invalidURLs} invalid URLs found`);
    }

    // Endpoint-level validation
    if (options.endpoints || options.fullAnalysis) {
      log.section('🎯 Endpoint-Level Analysis');

      const uniqueEndpoints = new Set<string>();
      const duplicateEndpoints: EndpointInfo[] = [];

      endpoints.forEach(endpoint => {
        if (uniqueEndpoints.has(endpoint.endpoint)) {
          duplicateEndpoints.push(endpoint);
        } else {
          uniqueEndpoints.add(endpoint.endpoint);
        }
      });

      recordTest('endpoint-uniqueness', duplicateEndpoints.length === 0,
        `${uniqueEndpoints.size} unique endpoints, ${duplicateEndpoints.length} duplicates`,
        {
          totalEndpoints: endpoints.length,
          uniqueEndpoints: uniqueEndpoints.size,
          duplicateEndpoints: duplicateEndpoints.length,
          duplicates: duplicateEndpoints.map(ep => ep.id)
        }
      );

      if (duplicateEndpoints.length === 0) {
        log.success(`Endpoint Uniqueness: OK (${uniqueEndpoints.size} unique)`);
      } else {
        log.warning(`Endpoint Uniqueness: ${duplicateEndpoints.length} duplicates found`);
        if (options.verbose) {
          duplicateEndpoints.forEach(endpoint => {
            log.verbose(`  ${endpoint.id}: ${endpoint.endpoint}`);
          });
        }
      }

      // Endpoint type analysis
      const typeDistribution = new Map<string, EndpointInfo[]>();
      endpoints.forEach(endpoint => {
        if (!typeDistribution.has(endpoint.endpointType)) {
          typeDistribution.set(endpoint.endpointType, []);
        }
        typeDistribution.get(endpoint.endpointType)!.push(endpoint);
      });

      log.info('Endpoint Type Distribution:');
      typeDistribution.forEach((typeEndpoints, type) => {
        log.verbose(`  ${type}: ${typeEndpoints.length} endpoints`);
      });
    }

    // Consistency analysis
    if (options.consistency || options.fullAnalysis) {
      log.section('🔄 Consistency Analysis');

      const consistency = analyzeEndpointConsistency(endpoints);

      const hasIssues = consistency.inconsistentNaming.length > 0 ||
                       consistency.hierarchyIssues.length > 0 ||
                       Array.from(consistency.duplicateEndpoints.values()).some(dups => dups.length > 1);

      recordTest('consistency-analysis', !hasIssues,
        `Naming: ${consistency.inconsistentNaming.length} issues, Hierarchy: ${consistency.hierarchyIssues.length} issues`,
        {
          inconsistentNaming: consistency.inconsistentNaming,
          hierarchyIssues: consistency.hierarchyIssues,
          duplicateGroups: Array.from(consistency.duplicateEndpoints.entries())
            .filter(([_, endpoints]) => endpoints.length > 1)
            .map(([endpoint, endpoints]) => ({ endpoint, count: endpoints.length, ids: endpoints.map(ep => ep.id) }))
        }
      );

      if (!hasIssues) {
        log.success('Consistency Analysis: OK');
      } else {
        log.warning('Consistency Analysis: Issues found');

        if (consistency.inconsistentNaming.length > 0) {
          log.info('Inconsistent Naming:');
          consistency.inconsistentNaming.forEach(issue => {
            log.verbose(`  ${issue}`);
          });
        }

        if (consistency.hierarchyIssues.length > 0) {
          log.info('Hierarchy Issues:');
          consistency.hierarchyIssues.forEach(issue => {
            log.verbose(`  ${issue}`);
          });
        }
      }
    }

    // Hierarchy validation
    if (options.hierarchy || options.fullAnalysis) {
      log.section('🏗️ Hierarchy Validation');

      const hierarchy = validateEndpointHierarchy(endpoints);

      recordTest('hierarchy-validation', hierarchy.valid,
        hierarchy.valid ? 'Hierarchy structure is valid' : `${hierarchy.issues.length} hierarchy issues found`,
        {
          valid: hierarchy.valid,
          issues: hierarchy.issues,
          structure: {
            docs: hierarchy.structure.docs.size,
            api: hierarchy.structure.api.size,
            cli: hierarchy.structure.cli.size,
            other: hierarchy.structure.other.size
          },
          recommendations: hierarchy.recommendations
        }
      );

      if (hierarchy.valid) {
        log.success('Hierarchy Validation: OK');
      } else {
        log.warning(`Hierarchy Validation: ${hierarchy.issues.length} issues found`);
        if (options.verbose) {
          hierarchy.issues.forEach(issue => {
            log.verbose(`  ${issue}`);
          });
        }
      }

      if (hierarchy.recommendations.length > 0) {
        log.info('Recommendations:');
        hierarchy.recommendations.forEach(rec => {
          log.verbose(`  💡 ${rec}`);
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
        endpoints: endpoints.map(ep => ({
          id: ep.id,
          category: ep.category,
          key: ep.key,
          endpoint: ep.endpoint,
          type: ep.endpointType,
          depth: ep.depth,
          hasFragment: ep.hasFragment,
          fragment: ep.fragment,
          isUnique: ep.isUnique
        }))
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
  runEndpointValidation();
}
