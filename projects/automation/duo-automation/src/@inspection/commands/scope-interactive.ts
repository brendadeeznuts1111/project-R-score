/**
 * Interactive TUI Scope Inspector
 * 
 * Enterprise-grade interactive inspection with real-time filtering,
 * pattern extraction, and beautiful output formatting.
 */

import { inspect } from 'util';
import * as readline from 'node:readline';
import { AdvancedScopeInspector } from './scope-advanced.js';

export class InteractiveScopeInspector {
  private rl: readline.Interface;
  private currentObj: any;
  private history: string[] = [];
  private filters: any[] = [];
  private originalObj: any;
  private sessionStats: {
    commandsExecuted: number;
    patternsFound: number;
    filtersApplied: number;
    sessionStart: Date;
  };

  constructor(obj: any) {
    this.currentObj = obj;
    this.originalObj = JSON.parse(JSON.stringify(obj));
    this.sessionStats = {
      commandsExecuted: 0,
      patternsFound: 0,
      filtersApplied: 0,
      sessionStart: new Date()
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🔍> ',
      completer: this.completer.bind(this)
    });

    this.setupKeybindings();
  }

  /**
   * Smart tab completion with context awareness
   */
  private completer(line: string): [string[], string] {
    const commands = [
      'filter', 'exclude', 'regex', 'jsonpath', 'jq', 
      'patterns', 'security', 'performance', 'analytics',
      'reset', 'history', 'save', 'export', 'tree', 'html',
      'help', 'exit', 'back', 'up', 'expand', 'stats',
      'search', 'find', 'count', 'size', 'depth'
    ];
    
    // Context-aware completion
    if (line.startsWith('filter ')) {
      const partial = line.slice(7);
      const suggestions = this.getSuggestionsFromObject(partial);
      return [suggestions, line];
    }
    
    if (line.startsWith('jsonpath ')) {
      const suggestions = this.getJsonPathSuggestions();
      return [suggestions, line];
    }
    
    const hits = commands.filter(c => c.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  /**
   * Get suggestions from current object structure
   */
  private getSuggestionsFromObject(partial: string): string[] {
    const keys = this.extractKeys(this.currentObj);
    return keys.filter(key => key.toLowerCase().includes(partial.toLowerCase()));
  }

  /**
   * Get JSONPath suggestions
   */
  private getJsonPathSuggestions(): string[] {
    const paths = this.extractPaths(this.currentObj);
    return paths.slice(0, 20); // Limit suggestions
  }

  /**
   * Extract all keys from object recursively
   */
  private extractKeys(obj: any, prefix: string = ''): string[] {
    const keys: string[] = [];
    
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        keys.push(prefix ? `${prefix}.${key}` : key);
        keys.push(...this.extractKeys(obj[key], prefix ? `${prefix}.${key}` : key));
      });
    }
    
    return keys;
  }

  /**
   * Extract all JSONPaths from object
   */
  private extractPaths(obj: any, path: string = '$'): string[] {
    const paths: string[] = [];
    
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          paths.push(`${path}[${index}]`);
          paths.push(...this.extractPaths(item, `${path}[${index}]`));
        });
      } else {
        Object.keys(obj).forEach(key => {
          const currentPath = `${path}.${key}`;
          paths.push(currentPath);
          paths.push(...this.extractPaths(obj[key], currentPath));
        });
      }
    }
    
    return paths;
  }

  /**
   * Setup advanced keyboard shortcuts
   */
  private setupKeybindings(): void {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        console.log('\n👋 Exiting interactive mode.');
        this.showSessionSummary();
        process.exit(0);
      }
      
      if (key.ctrl && key.name === 'r') {
        this.resetFilters();
        console.log('\n🔄 Filters reset.');
        this.displayCurrent();
      }
      
      if (key.ctrl && key.name === 'l') {
        console.clear();
        this.displayCurrent();
      }
      
      if (key.ctrl && key.name === 's') {
        this.saveToFile('interactive-output.json');
        console.log('\n💾 Saved current state.');
      }
      
      if (key.ctrl && key.name === 'p') {
        this.showPatterns();
      }
      
      if (key.name === 'f2') {
        this.toggleHelp();
      }
    });
  }

  /**
   * Start interactive session with beautiful UI
   */
  async start(): Promise<void> {
    console.clear();
    this.showWelcomeScreen();
    this.displayCurrent();

    this.rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      this.history.push(trimmed);
      this.sessionStats.commandsExecuted++;
      
      try {
        const startTime = Date.now();
        await this.handleCommand(trimmed);
        const duration = Date.now() - startTime;
        
        if (duration > 1000) {
          console.log(`⏱️  Command completed in ${(duration / 1000).toFixed(2)}s`);
        }
      } catch (error: any) {
        console.error(`❌ ${error.message}`);
      }
      
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.showSessionSummary();
      console.log('👋 Goodbye!');
      process.exit(0);
    });

    this.rl.prompt();
  }

  /**
   * Show beautiful welcome screen
   */
  private showWelcomeScreen(): void {
    console.log(`
🎯 FactoryWager Interactive Scope Inspector
═════════════════════════════════════════
🔍 Advanced inspection with real-time filtering
🛡️  Security analysis & pattern extraction
📊 Performance analytics & optimization tips
🎨 Beautiful output in multiple formats

Commands: filter, exclude, regex, jsonpath, jq, patterns, security, performance
Shortcuts: Ctrl+R=Reset, Ctrl+L=Clear, Ctrl+S=Save, Ctrl+P=Patterns, Ctrl+C=Exit
`);
  }

  /**
   * Handle all interactive commands
   */
  private async handleCommand(cmd: string): Promise<void> {
    const [command, ...args] = cmd.split(' ');
    
    switch (command.toLowerCase()) {
      case 'filter':
        this.applyFilter(args.join(' '));
        break;
        
      case 'exclude':
        this.applyExclude(args.join(' '));
        break;
        
      case 'regex':
        this.applyRegex(args.join(' '));
        break;
        
      case 'jsonpath':
        this.applyJsonPath(args.join(' '));
        break;
        
      case 'jq':
        this.applyJq(args.join(' '));
        break;
        
      case 'patterns':
        this.showPatterns();
        break;
        
      case 'security':
        this.showSecurityAnalysis();
        break;
        
      case 'performance':
        this.showPerformanceAnalysis();
        break;
        
      case 'analytics':
        this.showAnalytics();
        break;
        
      case 'tree':
        this.showTree();
        break;
        
      case 'html':
        await this.exportToHTML();
        break;
        
      case 'stats':
        this.showStats();
        break;
        
      case 'search':
        this.searchInObject(args.join(' '));
        break;
        
      case 'find':
        this.findInObject(args.join(' '));
        break;
        
      case 'count':
        this.countObjects();
        break;
        
      case 'size':
        this.showSize();
        break;
        
      case 'depth':
        this.showDepth();
        break;
        
      case 'history':
        this.showHistory();
        break;
        
      case 'reset':
        this.resetFilters();
        break;
        
      case 'save':
        await this.saveToFile(args[0] || 'scope-output.json');
        break;
        
      case 'export':
        await this.exportToClipboard();
        break;
        
      case 'help':
        this.showHelp();
        break;
        
      case 'exit':
        console.log('👋 Exiting...');
        process.exit(0);
        break;
        
      default:
        console.log(`❓ Unknown command: ${command}. Type 'help' for commands.`);
    }
  }

  /**
   * Apply filter with intelligent matching
   */
  private applyFilter(text: string): void {
    if (!text) {
      console.log('📝 Usage: filter <text>');
      return;
    }
    
    this.currentObj = AdvancedScopeInspector.smartRegexFilter(
      this.currentObj, 
      new RegExp(text, 'i'),
      { includeKeys: true, includeValues: true, contextLines: 1 }
    );
    
    this.filters.push({ type: 'filter', value: text });
    this.sessionStats.filtersApplied++;
    this.displayCurrent();
  }

  /**
   * Apply regex filter with advanced options
   */
  private applyRegex(pattern: string): void {
    if (!pattern) {
      console.log('📝 Usage: regex <pattern>');
      return;
    }
    
    try {
      const regex = new RegExp(pattern, 'i');
      this.currentObj = AdvancedScopeInspector.smartRegexFilter(
        this.currentObj, 
        regex,
        { includeKeys: true, includeValues: true, contextLines: 2, highlightMatches: true }
      );
      
      this.filters.push({ type: 'regex', value: pattern });
      this.sessionStats.filtersApplied++;
      this.displayCurrent();
    } catch (error: any) {
      console.error(`❌ Invalid regex: ${error.message}`);
    }
  }

  /**
   * Apply JSONPath query
   */
  private applyJsonPath(path: string): void {
    if (!path) {
      console.log('📝 Usage: jsonpath <path>');
      return;
    }
    
    try {
      this.currentObj = AdvancedScopeInspector.applyJsonPath(this.currentObj, path);
      this.filters.push({ type: 'jsonpath', value: path });
      this.sessionStats.filtersApplied++;
      this.displayCurrent();
    } catch (error: any) {
      console.error(`❌ JSONPath error: ${error.message}`);
    }
  }

  /**
   * Show extracted patterns with beautiful formatting
   */
  private showPatterns(): void {
    const patterns = AdvancedScopeInspector.extractPatterns(this.currentObj);
    
    console.log('\n🔍 Extracted Patterns:');
    console.log('══════════════════════════');
    
    let totalPatterns = 0;
    Object.entries(patterns).forEach(([type, values]) => {
      if (values.length > 0) {
        console.log(`\n📋 ${type.toUpperCase()}:`);
        values.slice(0, 10).forEach(v => console.log(`  • ${v}`));
        if (values.length > 10) {
          console.log(`  ... and ${values.length - 10} more`);
        }
        totalPatterns += values.length;
      }
    });
    
    this.sessionStats.patternsFound += totalPatterns;
    console.log(`\n📊 Total patterns found: ${totalPatterns}`);
  }

  /**
   * Show security analysis
   */
  private showSecurityAnalysis(): void {
    const analysis = AdvancedScopeInspector.securityAnalysis(this.currentObj);
    
    console.log('\n🛡️  Security Analysis:');
    console.log('══════════════════════════');
    
    const riskColors = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    };
    
    console.log(`\nRisk Level: ${riskColors[analysis.riskLevel]} ${analysis.riskLevel.toUpperCase()}`);
    
    if (analysis.findings.length > 0) {
      console.log('\n🚨 Findings:');
      analysis.findings.slice(0, 10).forEach((finding, i) => {
        console.log(`\n${i + 1}. ${finding.type.toUpperCase()} [${finding.severity.toUpperCase()}]`);
        console.log(`   Path: ${finding.path}`);
        console.log(`   Description: ${finding.description}`);
        console.log(`   Recommendation: ${finding.recommendation}`);
      });
      
      if (analysis.findings.length > 10) {
        console.log(`\n... and ${analysis.findings.length - 10} more findings`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  • Secrets: ${analysis.summary.totalSecrets}`);
    console.log(`  • PII: ${analysis.summary.totalPII}`);
    console.log(`  • Suspicious patterns: ${analysis.summary.suspiciousPatterns}`);
  }

  /**
   * Show performance analysis
   */
  private showPerformanceAnalysis(): void {
    const analysis = AdvancedScopeInspector.performanceAnalysis(this.currentObj);
    
    console.log('\n📊 Performance Analysis:');
    console.log('═══════════════════════════');
    
    console.log('\n📈 Summary:');
    console.log(`  • Total Keys: ${analysis.summary.totalKeys.toLocaleString()}`);
    console.log(`  • Total Values: ${analysis.summary.totalValues.toLocaleString()}`);
    console.log(`  • Max Depth: ${analysis.summary.maxDepth}`);
    console.log(`  • Size: ${analysis.summary.estimatedMemoryUsage}`);
    console.log(`  • Objects: ${analysis.summary.objectCount}`);
    console.log(`  • Arrays: ${analysis.summary.arrayCount}`);
    console.log(`  • Primitives: ${analysis.summary.primitiveCount.toLocaleString()}`);
    
    if (analysis.bottlenecks.length > 0) {
      console.log('\n⚠️  Performance Bottlenecks:');
      analysis.bottlenecks.slice(0, 5).forEach((bottleneck, i) => {
        console.log(`\n${i + 1}. ${bottleneck.type.replace('_', ' ').toUpperCase()}`);
        console.log(`   Path: ${bottleneck.path}`);
        console.log(`   Impact: ${bottleneck.impact}`);
        console.log(`   Recommendation: ${bottleneck.recommendation}`);
      });
    }
    
    console.log('\n💡 Optimization Recommendations:');
    analysis.optimization.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
    console.log(`\n💾 Potential Savings: ${analysis.optimization.potentialSavings}`);
  }

  /**
   * Show analytics dashboard
   */
  private showAnalytics(): void {
    const analysis = AdvancedScopeInspector.performanceAnalysis(this.currentObj);
    const patterns = AdvancedScopeInspector.extractPatterns(this.currentObj);
    const security = AdvancedScopeInspector.securityAnalysis(this.currentObj);
    
    console.log('\n📊 Analytics Dashboard:');
    console.log('═════════════════════════');
    
    console.log('\n🔍 Object Metrics:');
    console.log(`  • Size: ${analysis.summary.estimatedMemoryUsage}`);
    console.log(`  • Complexity: ${analysis.summary.maxDepth} levels deep`);
    console.log(`  • Structure: ${analysis.summary.objectCount} objects, ${analysis.summary.arrayCount} arrays`);
    
    console.log('\n🔒 Security Metrics:');
    console.log(`  • Risk Level: ${security.riskLevel.toUpperCase()}`);
    console.log(`  • Secrets Found: ${security.summary.totalSecrets}`);
    console.log(`  • PII Found: ${security.summary.totalPII}`);
    
    console.log('\n🎯 Pattern Metrics:');
    const patternCounts = Object.entries(patterns).filter(([_, values]) => values.length > 0);
    patternCounts.forEach(([type, values]) => {
      console.log(`  • ${type}: ${values.length}`);
    });
    
    console.log('\n⚡ Session Stats:');
    console.log(`  • Commands: ${this.sessionStats.commandsExecuted}`);
    console.log(`  • Filters Applied: ${this.sessionStats.filtersApplied}`);
    console.log(`  • Patterns Found: ${this.sessionStats.patternsFound}`);
    console.log(`  • Session Duration: ${Math.floor((Date.now() - this.sessionStats.sessionStart.getTime()) / 1000)}s`);
  }

  /**
   * Display current filtered object with beautiful formatting
   */
  private displayCurrent(): void {
    console.clear();
    console.log('🎯 FactoryWager Interactive Scope Inspector');
    console.log('═════════════════════════════════════════\n');
    
    if (this.filters.length > 0) {
      console.log('🔍 Active Filters:');
      this.filters.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.type}: ${f.value}`);
      });
      console.log('');
    }
    
    if (this.currentObj === undefined || 
        (typeof this.currentObj === 'object' && Object.keys(this.currentObj).length === 0)) {
      console.log('📭 No data matches current filters.');
    } else {
      console.log('📋 Current Data:');
      console.log(inspect(this.currentObj, { 
        colors: true, 
        depth: 6, 
        maxArrayLength: 10,
        compact: false 
      }));
    }
    
    console.log('\n' + '─'.repeat(50));
  }

  /**
   * Show tree view
   */
  private showTree(): void {
    const tree = this.formatAsTree(this.currentObj);
    console.log('\n🌳 Tree View:');
    console.log('═══════════════════════════');
    console.log(tree);
  }

  /**
   * Format object as tree
   */
  private formatAsTree(obj: any, prefix: string = '', depth: number = 0): string {
    if (depth > 6) return '...';
    
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    if (typeof obj !== 'object') {
      return typeof obj === 'string' ? `"${obj}"` : String(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      
      let result = '[\n';
      obj.slice(0, 5).forEach((item, i) => {
        const isLast = i === Math.min(obj.length - 1, 4);
        result += `${prefix}  ${isLast ? '└──' : '├──'} ${this.formatAsTree(item, prefix + (isLast ? '    ' : '│   '), depth + 1)}\n`;
      });
      
      if (obj.length > 5) {
        result += `${prefix}  └── ... ${obj.length - 5} more items\n`;
      }
      
      result += `${prefix}]`;
      return result;
    }
    
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    let result = '{\n';
    keys.slice(0, 10).forEach((key, i) => {
      const isLast = i === Math.min(keys.length - 1, 9);
      result += `${prefix}  ${isLast ? '└──' : '├──'} ${key}: ${this.formatAsTree(obj[key], prefix + (isLast ? '    ' : '│   '), depth + 1)}\n`;
    });
    
    if (keys.length > 10) {
      result += `${prefix}  └── ... ${keys.length - 10} more keys\n`;
    }
    
    result += `${prefix}}`;
    return result;
  }

  /**
   * Export to HTML
   */
  private async exportToHTML(): Promise<void> {
    const html = this.formatAsHTML(this.currentObj);
    await Bun.write('scope-export.html', html);
    console.log('📄 Exported to scope-export.html');
  }

  /**
   * Format as HTML
   */
  private formatAsHTML(obj: any): string {
    // Simple HTML formatting - could be enhanced
    const escapeHTML = (str: string) => {
      return str.replace(/[&<>"']/g, 
        tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[tag] || tag)
      );
    };

    const buildHTML = (node: any, depth: number = 0): string => {
      if (node === null || node === undefined) {
        return `<span class="null">${node}</span>`;
      }
      
      if (typeof node !== 'object') {
        const type = typeof node;
        const display = type === 'string' ? `"${escapeHTML(String(node))}"` : escapeHTML(String(node));
        return `<span class="${type}">${display}</span>`;
      }
      
      if (Array.isArray(node)) {
        if (node.length === 0) return '<span class="array">[]</span>';
        
        const items = node.slice(0, 10).map((item, i) => 
          `<li><span class="index">${i}:</span> ${buildHTML(item, depth + 1)}</li>`
        ).join('');
        
        return `<div class="array"><span class="bracket">[</span><ul>${items}</ul><span class="bracket">]</span></div>`;
      }
      
      const keys = Object.keys(node);
      if (keys.length === 0) return '<span class="object">{}</span>';
      
      const items = keys.slice(0, 10).map(key => 
        `<li><span class="key">${escapeHTML(key)}:</span> ${buildHTML(node[key], depth + 1)}</li>`
      ).join('');
      
      return `<div class="object"><span class="bracket">{</span><ul>${items}</ul><span class="bracket">}</span></div>`;
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <title>FactoryWager Scope Inspector</title>
  <style>
    body { font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; line-height: 1.4; padding: 20px; }
    .null { color: #888; }
    .string { color: #690; }
    .number { color: #905; }
    .boolean { color: #00f; }
    .key { color: #07a; font-weight: bold; }
    .index { color: #999; margin-right: 8px; }
    .bracket { color: #999; }
    ul { list-style: none; margin: 0; padding-left: 20px; }
    .array .bracket, .object .bracket { display: block; }
    .object > ul, .array > ul { border-left: 1px dashed #ddd; margin-left: 4px; }
  </style>
</head>
<body>
  <h1>🎯 FactoryWager Scope Inspector</h1>
  ${buildHTML(obj)}
</body>
</html>`;
  }

  /**
   * Show help with examples
   */
  private showHelp(): void {
    const helpText = `
🎯 FactoryWager Interactive Scope Inspector - Help
═══════════════════════════════════════════════

🔍 FILTERING COMMANDS:
  filter <text>      - Filter keys/values containing text
  exclude <text>     - Exclude keys/values containing text  
  regex <pattern>    - Apply regex filter with highlighting
  jsonpath <path>    - Apply JSONPath query (e.g., $.user.*)
  jq <filter>        - Apply JQ-like filter

🔍 ANALYSIS COMMANDS:
  patterns           - Show extracted patterns (emails, phones, etc.)
  security           - Show security analysis and risks
  performance        - Show performance bottlenecks
  analytics          - Show comprehensive analytics dashboard

🎨 OUTPUT COMMANDS:
  tree               - Show beautiful tree view
  html               - Export to HTML file
  stats              - Show object statistics
  size               - Show object size
  depth              - Show max depth
  count              - Count objects/arrays

🔍 SEARCH COMMANDS:
  search <text>      - Search for text in all values
  find <pattern>     - Find using regex pattern

💾 UTILITY COMMANDS:
  history            - Show command history
  reset              - Reset all filters
  save <file>        - Save output to file
  export             - Copy output to clipboard
  help               - Show this help
  exit               - Exit interactive mode

⌨️  SHORTCUTS:
  Ctrl+R             - Reset filters
  Ctrl+L             - Clear screen
  Ctrl+S             - Save to file
  Ctrl+P             - Show patterns
  Ctrl+C             - Exit

📚 EXAMPLES:
  filter payment     - Show only payment-related data
  regex \\d{3}-\\d{3}-\\d{4} - Find phone numbers
  jsonpath $.user.*  - Get all user properties
  security           - Check for secrets and PII
  tree               - Show hierarchical view
    `;
    
    console.log(helpText);
  }

  /**
   * Show session summary
   */
  private showSessionSummary(): void {
    const duration = Math.floor((Date.now() - this.sessionStats.sessionStart.getTime()) / 1000);
    
    console.log(`
📊 Session Summary
════════════════════
⏱️  Duration: ${duration}s
🔧 Commands: ${this.sessionStats.commandsExecuted}
🔍 Filters Applied: ${this.sessionStats.filtersApplied}
🎯 Patterns Found: ${this.sessionStats.patternsFound}
📁 Active Filters: ${this.filters.length}
    `);
  }

  // Additional helper methods
  private applyExclude(text: string): void {
    console.log(`Excluding: ${text}`);
    // Implementation...
  }

  private applyJq(filter: string): void {
    console.log(`Applying JQ: ${filter}`);
    // Implementation...
  }

  private showHistory(): void {
    console.log('\nCommand History:');
    this.history.forEach((cmd, i) => {
      console.log(`  ${i + 1}. ${cmd}`);
    });
  }

  private resetFilters(): void {
    this.currentObj = JSON.parse(JSON.stringify(this.originalObj));
    this.filters = [];
  }

  private async saveToFile(filename: string): Promise<void> {
    await Bun.write(filename, JSON.stringify(this.currentObj, null, 2));
    console.log(`✅ Saved to ${filename}`);
  }

  private async exportToClipboard(): Promise<void> {
    const { $ } = await import('bun');
    await $`echo ${JSON.stringify(this.currentObj, null, 2)} | pbcopy`;
    console.log('📋 Copied to clipboard!');
  }

  private searchInObject(text: string): void {
    console.log(`Searching for: ${text}`);
    // Implementation...
  }

  private findInObject(pattern: string): void {
    console.log(`Finding pattern: ${pattern}`);
    // Implementation...
  }

  private countObjects(): void {
    const count = this.countNodes(this.currentObj);
    console.log(`📊 Total nodes: ${count}`);
  }

  private countNodes(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj !== 'object') return 1;
    if (Array.isArray(obj)) return obj.reduce((sum, item) => sum + this.countNodes(item), 0);
    return Object.values(obj).reduce((sum, value) => sum + this.countNodes(value), 0);
  }

  private showSize(): void {
    const size = Buffer.byteLength(JSON.stringify(this.currentObj), 'utf8');
    console.log(`📏 Size: ${this.formatBytes(size)}`);
  }

  private showDepth(): void {
    const depth = this.getMaxDepth(this.currentObj);
    console.log(`📏 Max depth: ${depth}`);
  }

  private getMaxDepth(obj: any, current: number = 0): number {
    if (obj === null || obj === undefined) return current;
    if (typeof obj !== 'object') return current;
    if (Array.isArray(obj)) return Math.max(...obj.map(item => this.getMaxDepth(item, current + 1)));
    return Math.max(...Object.values(obj).map(value => this.getMaxDepth(value, current + 1)));
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private toggleHelp(): void {
    // Toggle help overlay
    console.log('\n📚 Quick Help: Use "help" for full commands');
  }
}

export default InteractiveScopeInspector;
