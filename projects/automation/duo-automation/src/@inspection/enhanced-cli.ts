/**
 * Enhanced CLI with Custom Inspect Depth Flag
 * 
 * Adds --inspect-depth=N flag to control scoping hierarchy rendering depth
 * with Bun-native, zero-dependency integration.
 */

import { EnhancedDomainContext } from "./contexts/EnhancedDomainContext.js";
import { formatHuman, formatJson, formatShell } from "./utils/formatters.js";
import { filterInspectionTree, formatShellFromObject, createFilterSummary, validateFilterKeyword } from "./utils/filter.js";
import { applySecurityMeasures, AuditLogger, validateInspectSecurity, SECURITY_CONFIG } from "./utils/security.js";
import { filterInspectionTreeOptimized, filterLargeInspectionAsync, PerformanceMonitor } from "./utils/performance.js";
import { parseFilterConfig, applyFilterConfig, validateFilterConfig } from "./utils/advanced-filter.js";
import * as config from "./config/scope.config.js";

export interface InspectOptions {
  depth?: number;
  format?: "human" | "json" | "shell";
  includeUser?: boolean;
  filter?: string;
  filterRegex?: string;
  exclude?: string;
  excludePaths?: string[];
  enableRedaction?: boolean;
  enableAuditLogging?: boolean;
  maxDepth?: number;
  asyncProcessing?: boolean;
}

export async function inspectScope(options: InspectOptions = {}): Promise<void> {
  const depth = Math.min(options.depth ?? 6, options.maxDepth ?? SECURITY_CONFIG.maxDepth);
  const format = options.format ?? "human";
  const filter = options.filter;
  const filterRegex = options.filterRegex;
  const exclude = options.exclude;
  const excludePaths = options.excludePaths || [];
  const enableRedaction = options.enableRedaction ?? true;
  const enableAuditLogging = options.enableAuditLogging ?? true;
  const asyncProcessing = options.asyncProcessing ?? false;
  
  // Initialize performance monitoring
  const performanceMonitor = new PerformanceMonitor();
  performanceMonitor.start();
  
  // Initialize audit logging
  const auditLogger = new AuditLogger();
  
  // Validate filter and exclude keywords
  if (filter) {
    const validation = validateFilterKeyword(filter);
    if (!validation.valid) {
      console.error(`❌ Invalid filter: ${validation.error}`);
      await auditLogger.log({
        userId: process.env.USER || 'unknown',
        command: 'scope --inspect',
        flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
        timestamp: new Date().toISOString(),
        success: false,
        error: validation.error
      });
      process.exit(1);
    }
  }
  
  // Validate regex filter
  if (filterRegex) {
    try {
      new RegExp(filterRegex, 'i'); // Test regex compilation
    } catch (error) {
      console.error(`❌ Invalid regex: ${error}`);
      await auditLogger.log({
        userId: process.env.USER || 'unknown',
        command: 'scope --inspect',
        flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
        timestamp: new Date().toISOString(),
        success: false,
        error: `Invalid regex: ${error}`
      });
      process.exit(1);
    }
  }
  
  // Validate exclude paths
  for (const path of excludePaths) {
    if (!path || typeof path !== 'string') {
      console.error(`❌ Invalid exclude path: ${path}`);
      await auditLogger.log({
        userId: process.env.USER || 'unknown',
        command: 'scope --inspect',
        flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
        timestamp: new Date().toISOString(),
        success: false,
        error: `Invalid exclude path: ${path}`
      });
      process.exit(1);
    }
  }
  
  if (exclude) {
    const validation = validateFilterKeyword(exclude);
    if (!validation.valid) {
      console.error(`❌ Invalid exclude: ${validation.error}`);
      await auditLogger.log({
        userId: process.env.USER || 'unknown',
        command: 'scope --inspect',
        flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
        timestamp: new Date().toISOString(),
        success: false,
        error: validation.error
      });
      process.exit(1);
    }
  }
  
  // Security validation
  const securityValidation = validateInspectSecurity({
    enableRedaction,
    enableAuditLogging,
    maxDepth: options.maxDepth
  }, {
    includeUser: options.includeUser,
    format,
    depth,
    filter,
    filterRegex,
    exclude,
    excludePaths
  });
  
  if (!securityValidation.valid) {
    console.error("❌ Security validation failed:");
    securityValidation.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  
  // Show security warnings
  if (securityValidation.warnings.length > 0) {
    console.warn("⚠️  Security warnings:");
    securityValidation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  try {
    // Create domain context
    const domainCtx = new EnhancedDomainContext(config.DOMAIN);
    
    // Always include user context if explicitly requested or in debug mode
    if (options.includeUser || import.meta.env.DEBUG) {
      domainCtx.setUserContext({
        userId: "usr_demo",
        email: "demo@factory-wager.local",
        username: "demo_user",
        phoneNumber: "+1-555-DEMO",
        lastActive: new Date(),
        accountType: "demo",
        familyId: "FAM_DEMO",
        paymentApps: {
          venmo: {
            cashtag: "@demo",
            deepLink: "venmo://pay?recipients=@demo&amount=0",
            status: "connected"
          },
          cashapp: {
            cashtag: "$demo",
            deepLink: "cashapp://pay?cashtag=$demo&amount=0",
            status: "connected"
          },
          crypto: {
            bitcoin: "bitcoin:bc1q...?amount=0",
            ethereum: "ethereum:0x...?amount=0",
            status: "configured"
          }
        },
        preferences: {
          theme: "dark",
          notifications: true,
          privacy: "private"
        },
        permissions: ["debug", "inspect", "admin"],
        metadata: {
          sessionId: "demo_session_" + Date.now(),
          debugMode: true
        }
      });
    }

    // Get base inspection object
    const inspectionObj = domainCtx[Symbol.for("Bun.inspect.custom")]();
    
    // Apply field-specific exclusions FIRST (most precise)
    let processedObj = inspectionObj;
    let excludeSummary = "";
    
    if (excludePaths && excludePaths.length > 0) {
      const { excludePathsFromInspectionTree, createExcludePathsSummary } = await import("./utils/filter.js");
      processedObj = excludePathsFromInspectionTree(inspectionObj, excludePaths);
      excludeSummary = createExcludePathsSummary(excludePaths, inspectionObj, processedObj);
      performanceMonitor.incrementOperation('excludes');
      
      if (!processedObj) {
        console.log(`🚫 All content excluded by paths: ${excludePaths.join(", ")}`);
        await auditLogger.log({
          userId: process.env.USER || 'unknown',
          command: 'scope --inspect',
          flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
          timestamp: new Date().toISOString(),
          success: true
        });
        return;
      }
    }
    
    // Apply general exclude
    if (exclude) {
      const { excludeFromInspectionTree, createExcludeSummary } = await import("./utils/filter.js");
      processedObj = excludeFromInspectionTree(processedObj, exclude.toLowerCase());
      excludeSummary += (excludeSummary ? "\n" : "") + createExcludeSummary(exclude, inspectionObj, processedObj);
      performanceMonitor.incrementOperation('excludes');
      
      if (!processedObj) {
        console.log(`🚫 All content excluded by "${exclude}"`);
        await auditLogger.log({
          userId: process.env.USER || 'unknown',
          command: 'scope --inspect',
          flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
          timestamp: new Date().toISOString(),
          success: true
        });
        return;
      }
    }
    
    // Apply filter with performance optimization
    let filterSummary = "";
    
    if (filterRegex) {
      // Use regex filtering (most powerful)
      const { filterInspectionTreeWithRegex, createFilterSummary } = await import("./utils/filter.js");
      const regex = new RegExp(filterRegex, 'i');
      processedObj = filterInspectionTreeWithRegex(processedObj, regex);
      filterSummary = createFilterSummary(`regex:/${filterRegex}/i`, inspectionObj, processedObj);
      performanceMonitor.incrementOperation('filters');
      
      if (!processedObj) {
        console.log(`🔍 No matches found for regex "${filterRegex}"`);
        await auditLogger.log({
          userId: process.env.USER || 'unknown',
          command: 'scope --inspect',
          flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
          timestamp: new Date().toISOString(),
          success: true
        });
        return;
      }
    }
    else if (filter) {
      // Check if filter is a regex or advanced pattern
      const filterConfig = parseFilterConfig(filter);
      const filterValidation = validateFilterConfig(filterConfig);
      
      if (!filterValidation.valid) {
        console.error(`❌ Invalid filter pattern: ${filterValidation.error}`);
        process.exit(1);
      }
      
      if (asyncProcessing) {
        processedObj = await filterLargeInspectionAsync(processedObj, filter);
      } else {
        // Use optimized filtering
        const { result, terminated, terminationReason } = filterInspectionTreeOptimized(
          processedObj, 
          filter.toLowerCase(),
          {
            maxDepth: depth,
            maxNodes: 10000,
            maxDuration: 5000,
            maxMemory: 100 * 1024 * 1024
          }
        );
        
        processedObj = result;
        performanceMonitor.incrementOperation('filters');
        
        if (terminated) {
          console.warn(`⚠️  Filter terminated early: ${terminationReason}`);
        }
      }
      
      filterSummary = createFilterSummary(filter, inspectionObj, processedObj);
      
      if (!processedObj) {
        console.log(`🔍 No matches found for filter "${filter}"`);
        await auditLogger.log({
          userId: process.env.USER || 'unknown',
          command: 'scope --inspect',
          flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
          timestamp: new Date().toISOString(),
          success: true
        });
        return;
      }
    }

    // Apply security measures
    if (enableRedaction) {
      processedObj = applySecurityMeasures(JSON.stringify(processedObj), {
        enableRedaction: true,
        allowedPatterns: [],
        blockedPatterns: []
      });
      processedObj = JSON.parse(processedObj);
      performanceMonitor.incrementOperation('redactions');
    }

    // Format output
    let output: string;
    
    switch (format) {
      case "json":
        output = formatJson(processedObj, depth);
        break;
      case "shell":
        output = formatShellFromObject(processedObj);
        break;
      case "human":
      default:
        output = formatHuman(processedObj, depth, filter);
        break;
    }

    // Add summaries and performance info for human format
    if (format === "human") {
      const summaries = [];
      if (exclude) summaries.push(excludeSummary);
      if (filter) summaries.push(filterSummary);
      
      // Add performance metrics
      const metrics = performanceMonitor.end();
      const perfInfo = `⚡ Processed in ${metrics.duration.toFixed(2)}ms (${metrics.nodeCount || 0} nodes)`;
      summaries.push(perfInfo);
      
      if (summaries.length > 0) {
        output = `${summaries.join("\n")}\n\n${output}`;
      }
    }

    // Final security check before output
    if (enableRedaction) {
      output = applySecurityMeasures(output, { enableRedaction: true });
    }

    await Bun.write(Bun.stdout, output + "\n");
    
    // Log successful inspection
    await auditLogger.log({
      userId: process.env.USER || 'unknown',
      command: 'scope --inspect',
      flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser, format },
      timestamp: new Date().toISOString(),
      success: true
    });
    
  } catch (error) {
    console.error("❌ Inspection failed:", error instanceof Error ? error.message : error);
    
    await auditLogger.log({
      userId: process.env.USER || 'unknown',
      command: 'scope --inspect',
      flags: { filter, filterRegex, exclude, excludePaths, includeUser: options.includeUser },
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    process.exit(1);
  }
}

/**
 * Parse CLI arguments for inspect commands
 */
export function parseInspectArgs(args: string[]): {
  hasInspect: boolean;
  depth: number;
  format: "human" | "json" | "shell";
  includeUser: boolean;
  filter?: string;
  filterRegex?: string;
  exclude?: string;
  excludePaths?: string[];
} {
  let hasInspect = false;
  let depth = 6; // default depth
  let format: "human" | "json" | "shell" = "human";
  let includeUser = false;
  let filter: string | undefined;
  let filterRegex: string | undefined;
  let exclude: string | undefined;
  let excludePaths: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--inspect") {
      hasInspect = true;
    }
    
    // Handle --inspect-depth=10
    else if (arg.startsWith("--inspect-depth=")) {
      const depthStr = arg.split("=")[1];
      const parsedDepth = parseInt(depthStr, 10);
      if (!isNaN(parsedDepth) && parsedDepth >= 1 && parsedDepth <= 20) {
        depth = parsedDepth;
      } else {
        console.warn(`Invalid inspect depth: ${depthStr}. Using default: 6`);
      }
    }
    
    // Handle --inspect-depth 10
    else if (arg === "--inspect-depth" && i + 1 < args.length) {
      const depthStr = args[i + 1];
      const parsedDepth = parseInt(depthStr, 10);
      if (!isNaN(parsedDepth) && parsedDepth >= 1 && parsedDepth <= 20) {
        depth = parsedDepth;
        i++; // skip next arg
      } else {
        console.warn(`Invalid inspect depth: ${depthStr}. Using default: 6`);
      }
    }
    
    // Handle --inspect-filter=TEXT
    else if (arg.startsWith("--inspect-filter=")) {
      filter = arg.split("=")[1];
    }
    
    // Handle --inspect-filter TEXT
    else if (arg === "--inspect-filter" && i + 1 < args.length) {
      filter = args[i + 1];
      i++; // skip next arg
    }
    
    // Handle --inspect-filter-regex=PATTERN
    else if (arg.startsWith("--inspect-filter-regex=")) {
      filterRegex = arg.split("=")[1];
    }
    
    // Handle --inspect-filter-regex PATTERN
    else if (arg === "--inspect-filter-regex" && i + 1 < args.length) {
      filterRegex = args[i + 1];
      i++; // skip next arg
    }
    
    // Handle --inspect-exclude=TEXT
    else if (arg.startsWith("--inspect-exclude=")) {
      exclude = arg.split("=")[1];
    }
    
    // Handle --inspect-exclude TEXT
    else if (arg === "--inspect-exclude" && i + 1 < args.length) {
      exclude = args[i + 1];
      i++; // skip next arg
    }
    
    // Handle --inspect-exclude-path=PATH
    else if (arg.startsWith("--inspect-exclude-path=")) {
      excludePaths.push(arg.split("=")[1]);
    }
    
    // Handle --inspect-exclude-path PATH
    else if (arg === "--inspect-exclude-path" && i + 1 < args.length) {
      excludePaths.push(args[i + 1]);
      i++; // skip next arg
    }
    
    // Handle --inspect-include-user
    else if (arg === "--inspect-include-user") {
      includeUser = true;
    }
    
    // Handle --format=json
    else if (arg.startsWith("--format=")) {
      const formatStr = arg.split("=")[1];
      if (["human", "json", "shell"].includes(formatStr)) {
        format = formatStr as "human" | "json" | "shell";
      } else {
        console.warn(`Invalid format: ${formatStr}. Using default: human`);
      }
    }
    
    // Handle --format json
    else if (arg === "--format" && i + 1 < args.length) {
      const formatStr = args[i + 1];
      if (["human", "json", "shell"].includes(formatStr)) {
        format = formatStr as "human" | "json" | "shell";
        i++; // skip next arg
      } else {
        console.warn(`Invalid format: ${formatStr}. Using default: human`);
      }
    }
  }
  
  return { hasInspect, depth, format, includeUser, filter, filterRegex, exclude, excludePaths };
}

/**
 * Enhanced CLI entry point with inspect depth support
 */
export async function runCLI(): Promise<void> {
  const [, , cmd, ...args] = Bun.argv;
  
  if (cmd === "scope") {
    const { hasInspect, depth, format, includeUser, filter, filterRegex, exclude, excludePaths } = parseInspectArgs(args);
    
    if (hasInspect) {
      await inspectScope({ 
        depth, 
        filter, 
        filterRegex,
        exclude,
        excludePaths,
        includeUser, 
        format 
      });
      process.exit(0);
    }
    
    // Handle other scope commands...
    console.log("Use --inspect to enable inspection mode");
    process.exit(1);
  }
  
  // Handle other commands...
  console.log("Unknown command. Use 'scope --inspect' for inspection.");
}

/**
 * Enhanced CLI help text
 */
export const help = `
FactoryWager CLI v3.7 — Bun-native scoping inspector

USAGE:
  factory-wager scope --inspect [OPTIONS]

OPTIONS:
  --inspect                      Enable inspection mode
  --inspect-depth=N              Set inspection depth (1-20, default: 6)
  --inspect-filter=TEXT          Filter output to show only matching keys/values
  --inspect-filter-regex=PATTERN Advanced regex filtering (case-insensitive)
  --inspect-exclude=TEXT         Exclude keys/values containing specified text
  --inspect-exclude-path=PATH    Exclude specific fields using dot notation
  --inspect-include-user         Include user context (email, phone, payment apps)
  --format=human|json|shell      Output format (default: human)

PATH EXAMPLES:
  [USER_CONTEXT].email           Exclude user email
  [SCOPES].LOCAL-SANDBOX.metrics Exclude metrics from LOCAL-SANDBOX scope
  paymentApps.venmo.token        Exclude Venmo token specifically

REGEX EXAMPLES:
  --inspect-filter-regex="\\\\d{3}-\\\\d{3}-\\\\d{4}"  Find phone numbers
  --inspect-filter-regex="bc1[a-z0-9]{25,39}"    Find Bitcoin addresses
  --inspect-exclude-regex="secret|token"         Hide credentials (use --inspect-exclude for this)

EXAMPLES:
  factory-wager scope --inspect --inspect-exclude-path=[USER_CONTEXT].email --inspect-exclude-path=[USER_CONTEXT].phoneNumber
  factory-wager scope --inspect --inspect-filter-regex="\\\\$(\\\\w+)"  # Find Cash App cashtags
  factory-wager scope --inspect --inspect-exclude-path=paymentApps.crypto --inspect-filter=venmo

FILTERING PRECEDENCE:
  1. --inspect-exclude-path (most precise field removal)
  2. --inspect-exclude (general keyword removal)
  3. --inspect-filter-regex (powerful pattern matching)
  4. --inspect-filter (simple keyword matching)

SECURITY FEATURES:
  • PII redaction automatically enabled for user context
  • Audit logging tracks all inspection activities
  • Regex validation prevents malformed patterns
  • Path validation prevents unsafe traversal
  • Depth limits prevent resource exhaustion

For more examples, see the documentation at:
  docs/ENHANCED_CLI_COMPLETE_DOCUMENTATION.md
  docs/INTERACTIVE_DEMO_DASHBOARDS.md
  --inspect-exclude=keychain   Remove macOS Keychain references
  --inspect-exclude=secret     Hide secrets/backend info
  --inspect-exclude=email      Remove email addresses (PII sanitization)
  --inspect-exclude=metrics    Hide performance counters
  --inspect-exclude=crypto     Remove cryptocurrency addresses

COMBINED USAGE:
  --inspect-filter=payment --inspect-exclude=crypto  Show payments, hide crypto
  --inspect-include-user --inspect-exclude=email --inspect-exclude=phone  User context without PII

SAFETY:
  - Min depth: 1 (prevents empty output)
  - Max depth: 20 (prevents infinite recursion)
  - Default: 6 (matches Bun's console.log depth)
  - Filter is case-insensitive and recursive
  - Exclude runs before filter (security-first approach)
  - User context only shown when explicitly requested
`;

// Export for testing
export default { inspectScope, parseInspectArgs, runCLI, help };
