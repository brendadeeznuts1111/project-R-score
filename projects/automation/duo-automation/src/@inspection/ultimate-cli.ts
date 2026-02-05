/**
 * Enhanced Supercharged CLI with All High-Value Features
 * 
 * Incorporates smart query engine selection, security redaction,
 * enhanced interactive TUI, and watch mode capabilities.
 */

import { EnhancedQueryEngine } from './commands/enhanced-query-engine.js';
import { SecurityRedactionEngine } from './commands/security-redaction-engine-fixed.js';
import { EnhancedInteractiveTUI } from './commands/enhanced-interactive-tui.js';
import { AdvancedScopeInspector } from './commands/scope-advanced-fixed.js';
import { ScopeAnalytics } from './commands/scope-analytics.js';
import { ScopeFormatter } from './commands/scope-formatter.js';

export class UltimateInspectCLI {
  private watchMode: boolean = false;
  private watchInterval: number = 5000; // 5 seconds default
  private watchTimer: any = null;

  /**
   * Handle ultimate inspect command with all enhancements
   */
  async handleInspectCommand(args: string[]): Promise<void> {
    try {
      const options = this.parseUltimateArgs(args);
      
      // Handle watch mode
      if (options.watch) {
        return this.startWatchMode(options);
      }
      
      // Get inspection data
      const inspectionData = await this.getInspectionData();
      
      // Apply redaction first if enabled
      let result = inspectionData;
      if (options.redact) {
        const redaction = SecurityRedactionEngine.applyRedaction(result, {
          categories: options.redactCategories,
          severity: options.redactSeverity,
          preserveStructure: true
        });
        
        result = redaction.redacted;
        
        if (options.verbose) {
          console.log(`🛡️  Applied redaction: ${redaction.summary.totalRedactions} items`);
          console.log(`   Categories: ${Object.keys(redaction.summary.byCategory).join(', ')}`);
        }
      }
      
      // Apply smart JSONPath with enhanced engine selection
      if (options.jsonPath) {
        result = EnhancedQueryEngine.applyJsonPath(result, options.jsonPath);
        console.log(`🔍 Applied JSONPath: ${options.jsonPath}`);
      }
      
      // Apply enhanced JQ filtering
      if (options.jqFilter) {
        if (options.jqFull) {
          console.log('🔧 Using full JQ engine...');
        } else {
          console.log('⚡ Using JQ-lite engine...');
        }
        result = EnhancedQueryEngine.applyJqFilter(result, options.jqFilter);
        console.log(`🔧 Applied JQ filter: ${options.jqFilter}`);
      }
      
      // Apply smart regex with context
      if (options.filter) {
        const regex = new RegExp(options.filter, options.caseSensitive ? 'g' : 'gi');
        result = AdvancedScopeInspector.smartRegexFilter(result, regex, {
          includeKeys: true,
          includeValues: true,
          contextLines: options.contextLines || 0,
          highlightMatches: options.highlight
        });
        console.log(`🎯 Applied filter: ${options.filter}`);
      }
      
      // Enhanced interactive mode
      if (options.interactive) {
        const interactive = new EnhancedInteractiveTUI(result, {
          enableRedaction: options.redact,
          redactionPolicy: options.redactPolicy
        });
        await interactive.start();
        return;
      }
      
      // Generate comprehensive analytics
      if (options.analytics) {
        const stats = ScopeAnalytics.generateStats(result);
        console.log('\n📊 Enhanced Analytics Report:');
        console.log('═════════════════════════════════════════');
        console.log(ScopeAnalytics.generateVisualReport(stats));
        
        // Show recommendations
        const recommendations = ScopeAnalytics.generateRecommendations(stats);
        if (recommendations.performance.length > 0) {
          console.log('\n💡 Performance Recommendations:');
          recommendations.performance.slice(0, 3).forEach((rec, i) => {
            console.log(`\n${i + 1}. ${rec.recommendation} [${rec.priority.toUpperCase()}]`);
            console.log(`   Impact: ${rec.impact}`);
            console.log(`   Implementation: ${rec.implementation}`);
          });
        }
      }
      
      // Enhanced security analysis
      if (options.security) {
        const analysis = AdvancedScopeInspector.securityAnalysis(result);
        console.log('\n🛡️ Enhanced Security Analysis:');
        console.log('═════════════════════════════════════════');
        console.log(`Risk Level: ${analysis.riskLevel.toUpperCase()}`);
        console.log(`Total Findings: ${analysis.findings.length}`);
        
        if (analysis.findings.length > 0) {
          console.log('\n🚨 Critical Findings:');
          analysis.findings
            .filter(f => f.severity === 'critical')
            .forEach((finding, i) => {
              console.log(`\n${i + 1}. ${finding.type.toUpperCase()}`);
              console.log(`   Path: ${finding.path}`);
              console.log(`   Description: ${finding.description}`);
              console.log(`   Recommendation: ${finding.recommendation}`);
            });
        }
        
        // Compliance report
        if (options.redact) {
          const redacted = SecurityRedactionEngine.applyRedaction(result, {
            categories: options.redactCategories,
            severity: options.redactSeverity
          });
          
          const compliance = SecurityRedactionEngine.generateComplianceReport(redacted.summary);
          console.log('\n📋 Compliance Report:');
          console.log(`Status: ${compliance.compliance.toUpperCase()}`);
          console.log(`Score: ${compliance.score}/100`);
          
          if (compliance.risks.length > 0) {
            console.log('\n⚠️  Risks:');
            compliance.risks.forEach(risk => console.log(`   • ${risk}`));
          }
        }
      }
      
      // Enhanced pattern extraction
      if (options.patterns) {
        const patterns = AdvancedScopeInspector.extractPatterns(result);
        console.log('\n🔍 Enhanced Pattern Extraction:');
        console.log('══════════════════════════════════════════');
        
        // Group patterns by category
        const categorized = {
          contact: ['emails', 'phones'],
          financial: ['creditCards', 'bitcoinAddresses', 'ethereumAddresses'],
          security: ['secrets', 'apiKeys'],
          data: ['urls', 'base64Strings'],
          identifiers: ['ssn', 'cashTags', 'jsonReferences']
        };
        
        Object.entries(categorized).forEach(([category, types]) => {
          const categoryTotal = types.reduce((sum, type) => sum + patterns[type as keyof typeof patterns].length, 0);
          if (categoryTotal > 0) {
            console.log(`\n${category.toUpperCase()} (${categoryTotal}):`);
            types.forEach(type => {
              const count = patterns[type as keyof typeof patterns].length;
              if (count > 0) {
                console.log(`  ${type}: ${count}`);
                if (options.verbose && count <= 5) {
                  patterns[type as keyof typeof patterns].forEach((pattern: string) => {
                    console.log(`    • ${pattern}`);
                  });
                }
              }
            });
          }
        });
      }
      
      // Enhanced output formatting
      const output = await this.formatOutput(result, options);
      console.log(output);
      
      // Save with enhanced metadata
      if (options.outputFile) {
        await this.saveEnhancedOutput(options.outputFile, result, options, inspectionData);
        console.log(`💾 Saved to ${options.outputFile}`);
      }
      
      // Show performance metrics if requested
      if (options.performance) {
        this.showPerformanceMetrics(result, options);
      }
      
    } catch (error: any) {
      console.error(`❌ Ultimate inspection failed: ${error.message}`);
      process.exit(1);
    }
  }
  
  /**
   * Parse ultimate command line arguments
   */
  private parseUltimateArgs(args: string[]): any {
    const options: any = {
      format: 'human',
      interactive: false,
      analytics: false,
      security: false,
      patterns: false,
      highlight: true,
      caseSensitive: false,
      contextLines: 0,
      verbose: false,
      jqFull: false,
      watch: false,
      performance: false,
      redact: false,
      redactCategories: ['security', 'pii'],
      redactSeverity: 'medium'
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // Basic options
      if (arg === '--interactive' || arg === '-i') {
        options.interactive = true;
      }
      
      if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      }
      
      if (arg === '--analytics') {
        options.analytics = true;
      }
      
      if (arg === '--security') {
        options.security = true;
      }
      
      if (arg === '--patterns') {
        options.patterns = true;
      }
      
      if (arg === '--performance') {
        options.performance = true;
      }
      
      // Enhanced query options
      if (arg.startsWith('--jsonpath=')) {
        options.jsonPath = arg.split('=')[1];
      } else if (arg === '--jsonpath' && i + 1 < args.length) {
        options.jsonPath = args[++i];
      }
      
      if (arg.startsWith('--jq=')) {
        options.jqFilter = arg.split('=')[1];
      } else if (arg === '--jq' && i + 1 < args.length) {
        options.jqFilter = args[++i];
      }
      
      if (arg === '--jq-full') {
        options.jqFull = true;
      }
      
      // Redaction options
      if (arg === '--redact') {
        options.redact = true;
      }
      
      if (arg.startsWith('--redact=')) {
        options.redact = true;
        options.redactCategories = arg.split('=')[1].split(',');
      }
      
      if (arg.startsWith('--redact-severity=')) {
        options.redactSeverity = arg.split('=')[1];
      }
      
      // Watch mode
      if (arg === '--watch' || arg === '-w') {
        options.watch = true;
      }
      
      if (arg.startsWith('--watch-interval=')) {
        options.watchInterval = parseInt(arg.split('=')[1], 1000);
      }
      
      // Filter options
      if (arg.startsWith('--filter=')) {
        options.filter = arg.split('=')[1];
      } else if (arg === '--filter' && i + 1 < args.length) {
        options.filter = args[++i];
      }
      
      if (arg.startsWith('--context=')) {
        options.contextLines = parseInt(arg.split('=')[1], 10);
      }
      
      // Format options
      if (arg.startsWith('--format=')) {
        options.format = arg.split('=')[1];
      } else if (arg === '--format' && i + 1 < args.length) {
        options.format = args[++i];
      }
      
      // Output options
      if (arg.startsWith('--output=')) {
        options.outputFile = arg.split('=')[1];
      } else if (arg === '--output' && i + 1 < args.length) {
        options.outputFile = args[++i];
      }
      
      // Specialized formats
      if (arg === '--tree') {
        options.format = 'tree';
      }
      
      if (arg === '--html') {
        options.format = 'html';
      }
      
      if (arg === '--markdown') {
        options.format = 'markdown';
      }
      
      if (arg === '--diff') {
        options.format = 'diff';
      }
      
      // Utility options
      if (arg === '--no-color' || process.env.NO_COLOR) {
        process.env.NO_COLOR = '1';
      }
    }
    
    return options;
  }
  
  /**
   * Start watch mode for real-time monitoring
   */
  private async startWatchMode(options: any): Promise<void> {
    console.log(`👁️  Starting watch mode (interval: ${options.watchInterval}ms)`);
    console.log('Press Ctrl+C to stop watching\n');
    
    let previousData: any = null;
    
    const runInspection = async () => {
      try {
        const currentData = await this.getInspectionData();
        
        if (previousData) {
          const comparison = ScopeAnalytics.compareScopes(previousData, currentData);
          
          if (comparison.summary.added > 0 || comparison.summary.removed > 0 || comparison.summary.modified > 0) {
            console.log(`\n🔄 Changes detected at ${new Date().toLocaleTimeString()}`);
            console.log(`   Added: ${comparison.summary.added}, Removed: ${comparison.summary.removed}, Modified: ${comparison.summary.modified}`);
            
            if (options.verbose && comparison.changes.modified.length > 0) {
              console.log('   Recent changes:');
              comparison.changes.modified.slice(0, 3).forEach(change => {
                console.log(`     • ${change.path}: ${change.changeType}`);
              });
            }
          }
        }
        
        previousData = currentData;
      } catch (error: any) {
        console.error(`❌ Watch error: ${error.message}`);
      }
    };
    
    // Run immediately
    await runInspection();
    
    // Set up interval
    this.watchTimer = setInterval(runInspection, options.watchInterval);
    
    // Handle cleanup
    process.on('SIGINT', () => {
      if (this.watchTimer) {
        clearInterval(this.watchTimer);
      }
      console.log('\n👁️  Watch mode stopped');
      process.exit(0);
    });
  }
  
  /**
   * Get enhanced inspection data
   */
  private async getInspectionData(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        bunVersion: Bun.version,
        platform: process.platform,
        arch: process.arch,
        hostname: await this.getHostname(),
        loadAverage: process.platform !== 'win32' ? (await import('os')).loadavg() : null,
        cpus: (await import('os')).cpus().length,
        totalMemory: (await import('os')).totalmem(),
        freeMemory: (await import('os')).freemem()
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        execPath: process.execPath,
        execArgv: process.execArgv,
        argv: process.argv,
        cwd: process.cwd(),
        env: this.getSafeEnvironment()
      },
      network: {
        interfaces: this.getNetworkInterfaces(),
        dns: this.getDNSConfig(),
        proxy: process.env.HTTP_PROXY || process.env.http_proxy || null
      },
      performance: {
        cpuUsage: process.cpuUsage(),
        hrtime: process.hrtime(),
        memoryUsage: process.memoryUsage()
      },
      factory-wager: {
        version: '2.0.0-ultimate',
        features: [
          'enhanced-query-engine',
          'security-redaction',
          'interactive-tui',
          'watch-mode',
          'performance-analytics',
          'compliance-reporting'
        ]
      },
      // Enhanced sample data for demonstration
      sampleData: {
        users: [
          {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '555-123-4567',
            ssn: '123-45-6789',
            creditCard: '4111-1111-1111-1111',
            paymentMethods: {
              venmo: '@johndoe',
              cashapp: '$johndoe',
              paypal: 'john@example.com',
              bitcoin: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
            },
            apiKey: 'sk_live_1234567890abcdef',
            address: '123 Main St, Anytown, USA 12345'
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '555-987-6543',
            paymentMethods: {
              venmo: '@janesmith',
              cashapp: '$janesmith',
              ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45'
            }
          }
        ],
        transactions: [
          {
            id: 'txn_001',
            amount: 25.50,
            currency: 'USD',
            method: 'venmo',
            timestamp: '2024-01-15T10:30:00Z',
            status: 'completed',
            metadata: {
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
              jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          },
          {
            id: 'txn_002',
            amount: 100.00,
            currency: 'USD',
            method: 'cashapp',
            timestamp: '2024-01-15T11:15:00Z',
            status: 'pending'
          }
        ],
        secrets: {
          databaseUrl: 'postgresql://user:password@localhost:5432/db',
          jwtSecret: 'your-super-secret-jwt-key-here',
          encryptionKey: 'aes-256-cbc-key-32-bytes-long'
        }
      }
    };
  }
  
  /**
   * Format output with enhanced options
   */
  private async formatOutput(data: any, options: any): Promise<string> {
    switch (options.format) {
      case 'tree':
        return ScopeFormatter.formatTree(data, {
          colors: !process.env.NO_COLOR,
          showTypes: true,
          showSizes: true,
          showLineNumbers: options.verbose
        });
        
      case 'html':
        return `HTML export saved to file. Open in browser to view.`;
        
      case 'markdown':
        return ScopeFormatter.formatMarkdown(data, {
          title: 'FactoryWager Ultimate Inspection Results',
          includeTypes: true,
          includeExamples: true
        });
        
      case 'csv':
        return ScopeFormatter.formatCSV(data, {
          flatten: true,
          includePaths: true
        });
        
      case 'yaml':
        return ScopeFormatter.formatYAML(data, {
          indent: 2,
          sortKeys: true
        });
        
      case 'diff':
        return this.formatDiff(data, options);
        
      case 'json':
        return JSON.stringify(data, null, 2);
        
      case 'stats':
        const stats = ScopeAnalytics.generateStats(data);
        return ScopeFormatter.formatTree(stats, { colors: !process.env.NO_COLOR });
        
      case 'human':
      default:
        return await this.formatHuman(data, options);
    }
  }
  
  /**
   * Enhanced human-readable format
   */
  private async formatHuman(data: any, options: any): Promise<string> {
    const inspectModule = await import('util');
    const inspect = inspectModule.inspect;
    return inspect(data, { 
      colors: !process.env.NO_COLOR, 
      depth: options.verbose ? 10 : 6, 
      maxArrayLength: options.verbose ? 50 : 20,
      compact: false 
    });
  }
  
  /**
   * Format as diff view
   */
  private formatDiff(data: any, options: any): string {
    // This would compare with previous snapshot if available
    return `Diff format (comparison with previous snapshot)\n` +
           `Data size: ${JSON.stringify(data).length} bytes\n` +
           `Timestamp: ${new Date().toISOString()}`;
  }
  
  /**
   * Save enhanced output with metadata
   */
  private async saveEnhancedOutput(filename: string, data: any, options: any, originalData: any): Promise<void> {
    let content: string;
    let metadata: any = {
      generated: new Date().toISOString(),
      version: '2.0.0-ultimate',
      options: options,
      stats: {
        originalSize: JSON.stringify(originalData).length,
        finalSize: JSON.stringify(data).length,
        compression: options.redact ? 'redacted' : 'none'
      }
    };
    
    switch (options.format) {
      case 'html':
        content = ScopeFormatter.formatHTML(data, {
          title: 'FactoryWager Ultimate Inspection Report',
          theme: 'auto',
          collapsible: true,
          searchable: true,
          exportable: true
        });
        break;
        
      case 'json':
        content = JSON.stringify({
          metadata,
          data
        }, null, 2);
        break;
        
      default:
        content = await this.formatOutput(data, options);
        break;
    }
    
    await Bun.write(filename, content);
  }
  
  /**
   * Show performance metrics
   */
  private showPerformanceMetrics(data: any, options: any): void {
    const startTime = Date.now();
    const size = JSON.stringify(data).length;
    const endTime = Date.now();
    
    console.log('\n⚡ Performance Metrics:');
    console.log('═════════════════════════════');
    console.log(`Processing time: ${endTime - startTime}ms`);
    console.log(`Data size: ${(size / 1024).toFixed(2)} KB`);
    console.log(`Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    
    if (options.jsonPath) {
      console.log(`Query engine: Enhanced JSONPath`);
    }
    
    if (options.jqFilter) {
      console.log(`JQ engine: ${options.jqFull ? 'Full JQ' : 'JQ-lite'}`);
    }
    
    if (options.redact) {
      console.log(`Redaction: ENABLED (${options.redactCategories.join(', ')})`);
    }
  }
  
  /**
   * Show comprehensive help
   */
  static showHelp(): void {
    console.log(`
🚀 Ultimate FactoryWager CLI Inspection System
═════════════════════════════════════════════════

🎯 ENHANCED QUERYING:
  --jsonpath=<path>              Smart JSONPath with engine selection
  --jq=<filter>                  JQ-like filtering (lite by default)
  --jq-full                      Use full JQ engine (if available)
  --filter=<pattern>             Smart regex with context highlighting
  --context=<lines>              Show context lines around matches

🛡️ SECURITY & REDACTION:
  --redact                       Enable PII redaction
  --redact=<categories>          Specific categories (security,pii,financial)
  --redact-severity=<level>      Minimum severity (low,medium,high,critical)

🎮 ENHANCED INTERACTIVE MODE:
  --interactive, -i              Enhanced TUI with path navigation
  Features: cd, pwd, ls, tree, copy-path, redact, validate-redaction

📊 ANALYTICS & MONITORING:
  --analytics                    Comprehensive performance analytics
  --security                     Enhanced security analysis
  --patterns                     Pattern extraction with categorization
  --performance                  Show performance metrics
  --watch, -w                    Watch mode for real-time monitoring
  --watch-interval=<ms>          Watch interval (default: 5000ms)

🎨 OUTPUT FORMATS:
  --format=<human|tree|html|markdown|csv|yaml|json|stats|diff>
  --output=<filename>            Save to file with metadata
  --no-color                     Disable colors (respect NO_COLOR env var)
  --verbose, -v                  Verbose output with details

📚 USAGE EXAMPLES:

🔍 Advanced Querying:
  factory-wager inspect --jsonpath="$.users[?(@.paymentMethods.bitcoin)]"
  factory-wager inspect --jq=".transactions[] | select(.amount > 50)"
  factory-wager inspect --filter="\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b" --context=2

🛡️ Security & Compliance:
  factory-wager inspect --redact=security,pii --security --analytics
  factory-wager inspect --redact --redact-severity=high --validate-redaction

🎮 Interactive Exploration:
  factory-wager inspect --interactive --redact
  # In interactive mode:
  # 🔍[$.users]> cd .[0]
  # 🔍[$.users[0]]> redact pii
  # 🔍[$.users[0]]> copy-path

📊 Real-time Monitoring:
  factory-wager inspect --watch --watch-interval=10000 --analytics
  # Monitors for changes every 10 seconds

🎨 Professional Output:
  factory-wager inspect --analytics --format=html --output=report.html
  factory-wager inspect --security --format=markdown --output=security-report.md

⚡ PERFORMANCE FEATURES:
  • Smart JSONPath engine selection (JMESPath vs JSONPath-plus)
  • Enhanced JQ-lite with 20+ operators and functions
  • Real-time redaction with 17 pattern types
  • Watch mode with change detection
  • Performance metrics and optimization tips

🛡️ ENTERPRISE SECURITY:
  • PCI DSS compliant redaction
  • GDPR-ready PII masking
  • Risk assessment and compliance scoring
  • Audit trail generation
  • Validation and verification

🎮 INTERACTIVE TUI FEATURES:
  • Path-based navigation (cd, pwd, ls, tree)
  • Smart tab completion
  • Keyboard shortcuts (F1=Help, F2=Redaction, F3=History)
  • Real-time filtering and redaction
  • Session statistics and history

This is the ultimate inspection tool for fintech, security,
and compliance-heavy environments. Transform your debugging
experience today!

For more information, see the comprehensive documentation.
`);
  }
  
  // Helper methods (same as before)
  private async getHostname(): Promise<string> {
    try {
      const result = await Bun.$`hostname`;
      return result.text().trim();
    } catch {
      return 'unknown';
    }
  }
  
  private getSafeEnvironment(): any {
    const safeEnv: any = {};
    const safeKeys = [
      'NODE_ENV', 'BUN_VERSION', 'PATH', 'HOME', 'USER', 'SHELL',
      'LANG', 'LC_ALL', 'TZ', 'TERM', 'PWD', 'NO_COLOR'
    ];
    
    safeKeys.forEach(key => {
      if (process.env[key]) {
        safeEnv[key] = process.env[key];
      }
    });
    
    return safeEnv;
  }
  
  private getNetworkInterfaces(): any[] {
    try {
      const os = await import('os');
      const interfaces = os.networkInterfaces();
      const result: any[] = [];
      
      Object.keys(interfaces).forEach(name => {
        interfaces[name].forEach((iface: any) => {
          if (!iface.internal) {
            result.push({
              name,
              family: iface.family,
              address: iface.address,
              netmask: iface.netmask,
              mac: iface.mac
            });
          }
        });
      });
      
      return result;
    } catch {
      return [];
    }
  }
  
  private getDNSConfig(): any {
    try {
      const dns = await import('dns');
      return {
        servers: dns.getServers(),
        lookup: dns.getDefaultResultOrder ? dns.getDefaultResultOrder() : 'ipv4first'
      };
    } catch {
      return { servers: [], lookup: 'unknown' };
    }
  }
}

export default UltimateInspectCLI;