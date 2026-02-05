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
#!/usr/bin/env bun
/**
 * 🔍 Unicode-Aware URL Validator
 * 
 * Complete URL validation with Unicode support for Base + Subpath + Fragment
 * Usage: bun unicode-aware-validator.ts [options]
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('-v') || args.includes('--verbose'),
  quiet: args.includes('-q') || args.includes('--quiet'),
  unicode: args.includes('--unicode'),
  strict: args.includes('--strict'),
  ascii: args.includes('--ascii-only'),
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
  console.log(`${colors.cyan}🔍 Unicode-Aware URL Validator${colors.reset}`);
  console.log('');
  console.log('Usage: bun unicode-aware-validator.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose         Verbose output with detailed information');
  console.log('  -q, --quiet           Quiet mode with minimal output');
  console.log('  --unicode             Enable Unicode character support');
  console.log('  --strict              Strict Unicode validation');
  console.log('  --ascii-only          Allow ASCII characters only');
  console.log('  --json                Output results in JSON format');
  console.log('  --no-color            Disable colored output');
  console.log('  -h, --help            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun unicode-aware-validator.ts --unicode');
  console.log('  bun unicode-aware-validator.ts --strict --verbose');
  console.log('  bun unicode-aware-validator.ts --ascii-only');
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

// Unicode-aware validation functions
function isASCII(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str);
}

function hasUnicode(str: string): boolean {
  return !isASCII(str);
}

function getUnicodeInfo(str: string): {
  hasUnicode: boolean;
  isASCII: boolean;
  unicodeChars: string[];
  unicodeRanges: string[];
  byteLength: number;
  charLength: number;
  encoded: string;
} {
  const hasUnicodeChars = hasUnicode(str);
  const unicodeChars: string[] = [];
  const unicodeRanges: string[] = [];
  
  if (hasUnicodeChars) {
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (hasUnicode(char)) {
        unicodeChars.push(char);
        
        // Detect Unicode ranges
        const code = char.charCodeAt(0);
        let range = 'Unknown';
        
        if (code >= 0x00C0 && code <= 0x00FF) range = 'Latin-1 Supplement';
        else if (code >= 0x0100 && code <= 0x017F) range = 'Latin Extended-A';
        else if (code >= 0x0400 && code <= 0x04FF) range = 'Cyrillic';
        else if (code >= 0x0590 && code <= 0x05FF) range = 'Hebrew';
        else if (code >= 0x0600 && code <= 0x06FF) range = 'Arabic';
        else if (code >= 0x4E00 && code <= 0x9FFF) range = 'CJK Unified Ideographs';
        else if (code >= 0x3040 && code <= 0x309F) range = 'Hiragana';
        else if (code >= 0x30A0 && code <= 0x30FF) range = 'Katakana';
        else if (code >= 0x1F600 && code <= 0x1F64F) range = 'Emoticons';
        else if (code >= 0x1F300 && code <= 0x1F5FF) range = 'Misc Symbols';
        else if (code >= 0x1F680 && code <= 0x1F6FF) range = 'Transport and Map';
        else if (code >= 0x2600 && code <= 0x26FF) range = 'Misc Symbols';
        else if (code >= 0x2700 && code <= 0x27BF) range = 'Dingbats';
        
        if (!unicodeRanges.includes(range)) {
          unicodeRanges.push(range);
        }
      }
    }
  }
  
  return {
    hasUnicode: hasUnicodeChars,
    isASCII: !hasUnicodeChars,
    unicodeChars,
    unicodeRanges,
    byteLength: new TextEncoder().encode(str).length,
    charLength: str.length,
    encoded: encodeURIComponent(str)
  };
}

// Unicode-aware URL validation
function validateURLUnicode(url: string): {
  isValid: boolean;
  baseValid: boolean;
  subpathValid: boolean;
  fragmentValid: boolean;
  hasSubpath: boolean;
  hasFragment: boolean;
  unicodeInfo: {
    overall: any;
    subpaths: any[];
    fragment?: any;
  };
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
    
    // Get overall Unicode info
    const overallUnicodeInfo = getUnicodeInfo(url);
    
    // Subpath analysis
    const pathname = parsed.pathname;
    const subpaths = pathname.split('/').filter(segment => segment.length > 0);
    const hasSubpath = subpaths.length > 0;
    
    let subpathValid = true;
    const subpathUnicodeInfos: any[] = [];
    
    if (hasSubpath) {
      subpaths.forEach((subpath, index) => {
        const subpathUnicodeInfo = getUnicodeInfo(subpath);
        subpathUnicodeInfos.push({
          subpath,
          index,
          ...subpathUnicodeInfo
        });
        
        // Length validation
        if (subpath.length === 0) {
          subpathValid = false;
          errors.push(`Empty subpath at position ${index}`);
        } else if (subpath.length > 50) {
          subpathValid = false;
          errors.push(`Subpath too long: ${subpath}`);
        }
        
        // Character validation based on mode
        if (options.asciiOnly && subpathUnicodeInfo.hasUnicode) {
          subpathValid = false;
          errors.push(`Unicode characters not allowed in subpath: ${subpath}`);
        } else if (!options.asciiOnly) {
          // Unicode-aware validation
          if (subpathUnicodeInfo.hasUnicode) {
            if (options.strict) {
              // Strict mode: only allow certain Unicode ranges
              const allowedRanges = ['Latin-1 Supplement', 'Latin Extended-A'];
              const hasInvalidRange = subpathUnicodeInfo.unicodeRanges.some(range => !allowedRanges.includes(range));
              
              if (hasInvalidRange) {
                subpathValid = false;
                errors.push(`Unicode range not allowed in subpath: ${subpathUnicodeInfo.unicodeRanges.join(', ')}`);
              }
            }
            
            warnings.push(`Unicode characters found in subpath: ${subpath}`);
          } else if (!/^[a-zA-Z0-9_-]+$/.test(subpath)) {
            subpathValid = false;
            errors.push(`Invalid characters in subpath: ${subpath}`);
          }
        } else if (!/^[a-zA-Z0-9_-]+$/.test(subpath)) {
          subpathValid = false;
          errors.push(`Invalid characters in subpath: ${subpath}`);
        }
      });
      
      // Validate common documentation patterns
      if (subpaths[0] !== 'docs') {
        warnings.push('First subpath is not "docs"');
      }
    } else {
      warnings.push('No subpaths found');
    }
    
    // Fragment validation
    const hasFragment = !!parsed.hash;
    let fragmentValid = true;
    let fragmentUnicodeInfo: any;
    
    if (hasFragment) {
      const fragment = parsed.hash.slice(1); // Remove #
      fragmentUnicodeInfo = getUnicodeInfo(fragment);
      
      if (!fragment) {
        fragmentValid = false;
        errors.push('Empty fragment');
      } else if (fragment.length < 1) {
        fragmentValid = false;
        errors.push('Fragment too short');
      } else if (fragment.length > 100) {
        fragmentValid = false;
        errors.push('Fragment too long');
      }
      
      // Character validation based on mode
      if (options.asciiOnly && fragmentUnicodeInfo.hasUnicode) {
        fragmentValid = false;
        errors.push(`Unicode characters not allowed in fragment: ${fragment}`);
      } else if (!options.asciiOnly) {
        // Unicode-aware validation
        if (fragmentUnicodeInfo.hasUnicode) {
          if (options.strict) {
            // Strict mode: only allow certain Unicode ranges
            const allowedRanges = ['Latin-1 Supplement', 'Latin Extended-A'];
            const hasInvalidRange = fragmentUnicodeInfo.unicodeRanges.some(range => !allowedRanges.includes(range));
            
            if (hasInvalidRange) {
              fragmentValid = false;
              errors.push(`Unicode range not allowed in fragment: ${fragmentUnicodeInfo.unicodeRanges.join(', ')}`);
            }
          }
          
          warnings.push(`Unicode characters found in fragment: ${fragment}`);
        } else if (!/^[a-zA-Z0-9_-]+$/.test(fragment)) {
          fragmentValid = false;
          errors.push(`Invalid characters in fragment: ${fragment}`);
        }
      } else if (!/^[a-zA-Z0-9_-]+$/.test(fragment)) {
        fragmentValid = false;
        errors.push(`Invalid characters in fragment: ${fragment}`);
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
      unicodeInfo: {
        overall: overallUnicodeInfo,
        subpaths: subpathUnicodeInfos,
        fragment: fragmentUnicodeInfo
      },
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname,
      subpaths,
      fragment: hasFragment ? parsed.hash.slice(1) : undefined,
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
      unicodeInfo: {
        overall: getUnicodeInfo(url),
        subpaths: [],
        fragment: undefined
      },
      protocol: '',
      hostname: '',
      pathname: '',
      subpaths: [],
      errors: [error.message],
      warnings
    };
  }
}

// Main validation function
async function runUnicodeValidation() {
  console.log(`${colors.cyan}🔍 Unicode-Aware URL Validator${colors.reset}`);
  
  const mode = options.asciiOnly ? 'ASCII-Only' : options.unicode ? 'Unicode-Enabled' : 'Standard';
  const strictness = options.strict ? ' (Strict)' : '';
  console.log(`${colors.gray}Mode: ${mode}${strictness}${colors.reset}\n`);
  
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
    
    // Add Unicode test URLs
    const unicodeTestURLs = [
      '/docs/api/utils#café',
      '/docs/api/utils#naïve',
      '/docs/api/utils#测试',
      '/docs/api/utils#🚀',
      '/docs/api/útils',
      '/docs/café/utils',
      '/docs/api/utils#résumé',
      '/docs/api/utils#Москва',
      '/docs/api/utils#العربية',
      '/docs/api/utils#🔥💧🌍'
    ];
    
    unicodeTestURLs.forEach((url, index) => {
      allURLs.push(url);
      urlSources[url] = `UNICODE_TEST.${index + 1}`;
    });
    
    log.section('📊 URL Statistics');
    log.info(`Total URLs to validate: ${allURLs.length}`);
    log.info(`Original URLs: ${allURLs.length - unicodeTestURLs.length}`);
    log.info(`Unicode test URLs: ${unicodeTestURLs.length}`);
    
    // Validate all URLs
    log.section('🔗 Unicode-Aware URL Validation');
    
    let validURLs = 0;
    let invalidURLs = 0;
    let urlsWithUnicode = 0;
    let asciiOnlyURLs = 0;
    const validationResults: Record<string, any> = {};
    const unicodeSummary = {
      ranges: new Set<string>(),
      chars: new Set<string>(),
      subpathsWithUnicode: 0,
      fragmentsWithUnicode: 0
    };
    
    allURLs.forEach(url => {
      const validation = validateURLUnicode(url);
      validationResults[url] = validation;
      
      if (validation.isValid) {
        validURLs++;
      } else {
        invalidURLs++;
      }
      
      // Track Unicode usage
      if (validation.unicodeInfo.overall.hasUnicode) {
        urlsWithUnicode++;
        
        // Track Unicode ranges and characters
        validation.unicodeInfo.overall.unicodeRanges.forEach(range => unicodeSummary.ranges.add(range));
        validation.unicodeInfo.overall.unicodeChars.forEach(char => unicodeSummary.chars.add(char));
      } else {
        asciiOnlyURLs++;
      }
      
      // Track Unicode in subpaths and fragments
      validation.unicodeInfo.subpaths.forEach(subpathInfo => {
        if (subpathInfo.hasUnicode) {
          unicodeSummary.subpathsWithUnicode++;
        }
      });
      
      if (validation.unicodeInfo.fragment?.hasUnicode) {
        unicodeSummary.fragmentsWithUnicode++;
      }
    });
    
    recordTest('unicode-aware-validation', invalidURLs === 0,
      `${validURLs} valid, ${invalidURLs} invalid URLs`,
      { 
        validURLs, 
        invalidURLs, 
        totalURLs: allURLs.length,
        urlsWithUnicode,
        asciiOnlyURLs
      }
    );
    
    if (invalidURLs === 0) {
      log.success('Unicode-Aware Validation: OK');
    } else {
      log.error(`Unicode-Aware Validation: ${invalidURLs} invalid URLs found`);
      if (options.verbose) {
        Object.entries(validationResults).forEach(([url, result]) => {
          if (!result.isValid) {
            log.verbose(`  ${urlSources[url]}: ${result.errors.join(', ')}`);
          }
        });
      }
    }
    
    // Unicode analysis
    log.section('🌐 Unicode Analysis');
    
    log.info(`URLs with Unicode: ${urlsWithUnicode}/${allURLs.length}`);
    log.info(`ASCII-only URLs: ${asciiOnlyURLs}/${allURLs.length}`);
    log.info(`Subpaths with Unicode: ${unicodeSummary.subpathsWithUnicode}`);
    log.info(`Fragments with Unicode: ${unicodeSummary.fragmentsWithUnicode}`);
    
    if (unicodeSummary.ranges.size > 0) {
      log.info('Unicode ranges found:');
      Array.from(unicodeSummary.ranges).forEach(range => {
        log.verbose(`  ${range}`);
      });
    }
    
    if (unicodeSummary.chars.size > 0 && options.verbose) {
      log.info('Unicode characters found:');
      Array.from(unicodeSummary.chars).forEach(char => {
        const code = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
        log.verbose(`  ${char} (U+${code})`);
      });
    }
    
    // Show detailed results for Unicode test URLs
    if (options.verbose) {
      log.section('🧪 Unicode Test URL Details');
      
      unicodeTestURLs.forEach((url, index) => {
        const validation = validationResults[url];
        console.log(`\n${colors.cyan}${index + 1}. ${url}${colors.reset}`);
        console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
        console.log(`   Has Unicode: ${validation.unicodeInfo.overall.hasUnicode}`);
        
        if (validation.unicodeInfo.overall.hasUnicode) {
          console.log(`   Unicode Ranges: ${validation.unicodeInfo.overall.unicodeRanges.join(', ')}`);
          console.log(`   Unicode Chars: [${validation.unicodeInfo.overall.unicodeChars.join(', ')}]`);
          console.log(`   Encoded: ${validation.unicodeInfo.overall.encoded}`);
        }
        
        if (validation.errors.length > 0) {
          console.log(`   Errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.log(`   Warnings: ${validation.warnings.join(', ')}`);
        }
      });
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
    console.log(`${colors.magenta}Mode:${colors.reset} ${mode}${strictness}`);
    
    // Output JSON if requested
    if (options.json) {
      log.json({
        ...testResults,
        urlValidation: validationResults,
        urlSources,
        unicodeSummary: {
          ranges: Array.from(unicodeSummary.ranges),
          chars: Array.from(unicodeSummary.chars),
          subpathsWithUnicode: unicodeSummary.subpathsWithUnicode,
          fragmentsWithUnicode: unicodeSummary.fragmentsWithUnicode
        },
        mode: options.asciiOnly ? 'ascii-only' : options.unicode ? 'unicode-enabled' : 'standard',
        strict: options.strict
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
  runUnicodeValidation();
}
