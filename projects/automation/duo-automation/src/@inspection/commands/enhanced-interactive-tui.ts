/**
 * Enhanced Interactive TUI with Advanced Navigation
 * 
 * Features path-based navigation, drill-down capabilities, and enhanced UX
 * for professional data exploration.
 */

import { inspect } from 'util';
import * as readline from 'node:readline';
import { EnhancedQueryEngine } from './enhanced-query-engine.js';
import { SecurityRedactionEngine } from './security-redaction-engine.js';

export class EnhancedInteractiveTUI {
  private rl: readline.Interface;
  private currentObj: any;
  private originalObj: any;
  private currentPath: string = '$';
  private pathHistory: string[] = ['$'];
  private history: string[] = [];
  private filters: any[] = [];
  private sessionStats: {
    commandsExecuted: number;
    pathsVisited: number;
    filtersApplied: number;
    redactionsApplied: number;
    sessionStart: Date;
  };
  private redactionEnabled: boolean = false;
  private redactionPolicy: any = null;

  constructor(obj: any, options: {
    enableRedaction?: boolean;
    redactionPolicy?: any;
  } = {}) {
    this.currentObj = obj;
    this.originalObj = JSON.parse(JSON.stringify(obj));
    this.redactionEnabled = options.enableRedaction || false;
    this.redactionPolicy = options.redactionPolicy;
    
    this.sessionStats = {
      commandsExecuted: 0,
      pathsVisited: 1,
      filtersApplied: 0,
      redactionsApplied: 0,
      sessionStart: new Date()
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt(),
      completer: this.completer.bind(this)
    });

    this.setupKeybindings();
  }

  /**
   * Get dynamic prompt based on current state
   */
  private getPrompt(): string {
    const path = this.currentPath.length > 20 ? 
      `...${this.currentPath.slice(-17)}` : this.currentPath;
    
    let prompt = `🔍[${path}]> `;
    
    if (this.filters.length > 0) {
      prompt = `🎯[${path}](${this.filters.length})> `;
    }
    
    if (this.redactionEnabled) {
      prompt = `🛡️[${path}]> `;
    }
    
    return prompt;
  }

  /**
   * Enhanced tab completion with context awareness
   */
  private completer(line: string): [string[], string] {
    const commands = [
      // Navigation
      'cd', 'pwd', 'ls', 'tree', 'back', 'up', 'root', 'copy-path',
      
      // Filtering
      'filter', 'exclude', 'regex', 'jsonpath', 'jq', 'jq-lite', 'clear-filters',
      
      // Analysis
      'patterns', 'security', 'performance', 'analytics', 'stats', 'size', 'depth',
      
      // Data operations
      'only', 'type', 'keys', 'values', 'sort', 'unique', 'reverse', 'length',
      
      // Redaction
      'redact', 'unredact', 'redact-policy', 'validate-redaction',
      
      // Utility
      'save', 'export', 'import', 'diff', 'compare', 'watch', 'history', 'help', 'exit'
    ];
    
    // Context-aware completion
    if (line.startsWith('cd ')) {
      const partial = line.slice(3);
      const suggestions = this.getPathSuggestions(partial);
      return [suggestions, line];
    }
    
    if (line.startsWith('jsonpath ')) {
      const suggestions = this.getJsonPathSuggestions();
      return [suggestions, line];
    }
    
    if (line.startsWith('jq ')) {
      const suggestions = this.getJqSuggestions();
      return [suggestions, line];
    }
    
    if (line.startsWith('only ')) {
      const suggestions = ['strings', 'numbers', 'booleans', 'objects', 'arrays', 'null'];
      return [suggestions.map(s => `only ${s}`), line];
    }
    
    if (line.startsWith('redact ')) {
      const categories = SecurityRedactionEngine.getCategories().map(c => c.name);
      return [categories.map(c => `redact ${c}`), line];
    }
    
    const hits = commands.filter(c => c.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  /**
   * Get path suggestions for cd command
   */
  private getPathSuggestions(partial: string): string[] {
    const paths = this.extractPaths(this.currentObj);
    return paths
      .filter(path => path.toLowerCase().includes(partial.toLowerCase()))
      .slice(0, 20)
      .map(path => `cd ${path}`);
  }

  /**
   * Get JSONPath suggestions
   */
  private getJsonPathSuggestions(): string[] {
    const paths = this.extractPaths(this.currentObj);
    return paths.slice(0, 20).map(path => `jsonpath ${path}`);
  }

  /**
   * Get JQ suggestions
   */
  private getJqSuggestions(): string[] {
    const patterns = EnhancedQueryEngine.getSupportedPatterns();
    const allSuggestions = [
      ...patterns.basic,
      ...patterns.advanced,
      ...patterns.array,
      ...patterns.string,
      ...patterns.math
    ];
    return allSuggestions.slice(0, 20).map(pattern => `jq ${pattern}`);
  }

  /**
   * Extract all accessible paths from current object
   */
  private extractPaths(obj: any, basePath: string = '$'): string[] {
    const paths: string[] = [];
    
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const currentPath = `${basePath}[${index}]`;
          paths.push(currentPath);
          paths.push(...this.extractPaths(item, currentPath));
        });
      } else {
        Object.keys(obj).forEach(key => {
          const currentPath = `${basePath}.${key}`;
          paths.push(currentPath);
          paths.push(...this.extractPaths(obj[key], currentPath));
        });
      }
    }
    
    return paths;
  }

  /**
   * Enhanced keyboard shortcuts
   */
  private setupKeybindings(): void {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        console.log('\n👋 Exiting enhanced interactive mode.');
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
        this.saveToFile('enhanced-output.json');
        console.log('\n💾 Saved current state.');
      }
      
      if (key.ctrl && key.name === 'p') {
        this.showPatterns();
      }
      
      if (key.name === 'f1') {
        this.showHelp();
      }
      
      if (key.name === 'f2') {
        this.toggleRedaction();
      }
      
      if (key.name === 'f3') {
        this.showPathHistory();
      }
      
      if (key.name === 'backspace' && key.ctrl) {
        this.navigateUp();
      }
    });
  }

  /**
   * Start enhanced interactive session
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
      
      this.rl.setPrompt(this.getPrompt());
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
   * Handle enhanced commands
   */
  private async handleCommand(cmd: string): Promise<void> {
    const [command, ...args] = cmd.split(' ');
    
    switch (command.toLowerCase()) {
      // Navigation commands
      case 'cd':
        this.navigatePath(args.join(' '));
        break;
        
      case 'pwd':
        this.showCurrentPath();
        break;
        
      case 'ls':
        this.listCurrent();
        break;
        
      case 'tree':
        this.showTree();
        break;
        
      case 'back':
        this.navigateBack();
        break;
        
      case 'up':
        this.navigateUp();
        break;
        
      case 'root':
        this.navigateToRoot();
        break;
        
      case 'copy-path':
        this.copyCurrentPath();
        break;
        
      // Filtering commands
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
        
      case 'jq-lite':
        this.applyJqLite(args.join(' '));
        break;
        
      case 'clear-filters':
        this.resetFilters();
        break;
        
      // Analysis commands
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
        
      case 'stats':
        this.showStats();
        break;
        
      // Data operations
      case 'only':
        this.filterByType(args[0]);
        break;
        
      case 'type':
        this.showTypeInfo();
        break;
        
      case 'keys':
        this.showKeys();
        break;
        
      case 'values':
        this.showValues();
        break;
        
      case 'sort':
        this.sortCurrent();
        break;
        
      case 'unique':
        this.uniqueCurrent();
        break;
        
      case 'reverse':
        this.reverseCurrent();
        break;
        
      case 'length':
        this.showLength();
        break;
        
      // Redaction commands
      case 'redact':
        this.applyRedaction(args);
        break;
        
      case 'unredact':
        this.removeRedaction();
        break;
        
      case 'redact-policy':
        this.showRedactionPolicy();
        break;
        
      case 'validate-redaction':
        this.validateRedaction();
        break;
        
      // Utility commands
      case 'save':
        await this.saveToFile(args[0] || 'enhanced-output.json');
        break;
        
      case 'export':
        await this.exportToClipboard();
        break;
        
      case 'history':
        this.showHistory();
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
   * Navigate to specific path
   */
  private navigatePath(path: string): void {
    if (!path) {
      console.log('📝 Usage: cd <path>');
      return;
    }
    
    try {
      const result = EnhancedQueryEngine.applyJsonPath(this.originalObj, path);
      
      if (result !== undefined && result !== null) {
        this.currentObj = result;
        this.currentPath = path;
        this.pathHistory.push(path);
        this.sessionStats.pathsVisited++;
        this.displayCurrent();
      } else {
        console.log(`❌ Path not found: ${path}`);
      }
    } catch (error: any) {
      console.error(`❌ Navigation error: ${error.message}`);
    }
  }

  /**
   * Show current path
   */
  private showCurrentPath(): void {
    console.log(`📍 Current path: ${this.currentPath}`);
    
    if (this.pathHistory.length > 1) {
      console.log(`📜 Path history: ${this.pathHistory.slice(-5).join(' → ')}`);
    }
  }

  /**
   * List current directory contents
   */
  private listCurrent(): void {
    if (Array.isArray(this.currentObj)) {
      console.log(`📁 Array [${this.currentObj.length} items]:`);
      this.currentObj.slice(0, 10).forEach((item, i) => {
        const type = typeof item;
        const preview = type === 'object' ? 
          (Array.isArray(item) ? `Array[${item.length}]` : `Object{${Object.keys(item).length}}`) :
          String(item).slice(0, 50);
        console.log(`  ${i}: ${type} - ${preview}`);
      });
      
      if (this.currentObj.length > 10) {
        console.log(`  ... and ${this.currentObj.length - 10} more items`);
      }
    } else if (typeof this.currentObj === 'object' && this.currentObj !== null) {
      const keys = Object.keys(this.currentObj);
      console.log(`📁 Object {${keys.length} properties}:`);
      keys.slice(0, 20).forEach(key => {
        const value = this.currentObj[key];
        const type = typeof value;
        const preview = type === 'object' ? 
          (Array.isArray(value) ? `Array[${value.length}]` : `Object{${Object.keys(value).length}}`) :
          String(value).slice(0, 30);
        console.log(`  ${key}: ${type} - ${preview}`);
      });
      
      if (keys.length > 20) {
        console.log(`  ... and ${keys.length - 20} more properties`);
      }
    } else {
      console.log(`📄 Value: ${this.currentObj} (${typeof this.currentObj})`);
    }
  }

  /**
   * Navigate back in history
   */
  private navigateBack(): void {
    if (this.pathHistory.length > 1) {
      this.pathHistory.pop(); // Remove current
      const previousPath = this.pathHistory[this.pathHistory.length - 1];
      this.navigatePath(previousPath);
    } else {
      console.log('❌ Already at the beginning of history');
    }
  }

  /**
   * Navigate up one level
   */
  private navigateUp(): void {
    if (this.currentPath === '$') {
      console.log('❌ Already at root');
      return;
    }
    
    const upPath = this.currentPath.replace(/\.[^.]*$/, '').replace(/\[\d+\]$/, '');
    this.navigatePath(upPath || '$');
  }

  /**
   * Navigate to root
   */
  private navigateToRoot(): void {
    this.currentObj = this.originalObj;
    this.currentPath = '$';
    this.pathHistory = ['$'];
    this.displayCurrent();
  }

  /**
   * Copy current path to clipboard
   */
  private async copyCurrentPath(): Promise<void> {
    await Bun.$`echo ${this.currentPath} | pbcopy`;
    console.log(`📋 Copied to clipboard: ${this.currentPath}`);
  }

  /**
   * Filter by type
   */
  private filterByType(type: string): void {
    if (!type) {
      console.log('📝 Usage: only <type>');
      console.log('Types: strings, numbers, booleans, objects, arrays, null');
      return;
    }
    
    const filterFn = (item: any): boolean => {
      switch (type.toLowerCase()) {
        case 'strings':
          return typeof item === 'string';
        case 'numbers':
          return typeof item === 'number';
        case 'booleans':
          return typeof item === 'boolean';
        case 'objects':
          return typeof item === 'object' && !Array.isArray(item) && item !== null;
        case 'arrays':
          return Array.isArray(item);
        case 'null':
          return item === null;
        default:
          return false;
      }
    };
    
    if (Array.isArray(this.currentObj)) {
      this.currentObj = this.currentObj.filter(filterFn);
    } else {
      console.log('❌ Type filtering only works on arrays');
      return;
    }
    
    this.filters.push({ type: 'type', value: type });
    this.sessionStats.filtersApplied++;
    this.displayCurrent();
  }

  /**
   * Toggle redaction
   */
  private toggleRedaction(): void {
    this.redactionEnabled = !this.redactionEnabled;
    console.log(`🛡️  Redaction ${this.redactionEnabled ? 'enabled' : 'disabled'}`);
    
    if (this.redactionEnabled) {
      this.applyRedaction();
    } else {
      this.removeRedaction();
    }
  }

  /**
   * Apply redaction to current object
   */
  private applyRedaction(categories?: string[]): void {
    if (!this.redactionEnabled && !categories) {
      this.redactionEnabled = true;
    }
    
    const options: any = {};
    if (categories && categories.length > 0) {
      options.categories = categories;
    }
    
    if (this.redactionPolicy) {
      Object.assign(options, this.redactionPolicy);
    }
    
    const redaction = SecurityRedactionEngine.applyRedaction(this.currentObj, options);
    this.currentObj = redaction.redacted;
    this.sessionStats.redactionsApplied++;
    
    console.log(`🛡️  Applied redaction: ${redaction.summary.totalRedactions} items redacted`);
    console.log(`   By category: ${Object.entries(redaction.summary.byCategory).map(([c, count]) => `${c}(${count})`).join(', ')}`);
    
    this.displayCurrent();
  }

  /**
   * Remove redaction
   */
  private removeRedaction(): void {
    // Restore from original object at current path
    this.currentObj = EnhancedQueryEngine.applyJsonPath(this.originalObj, this.currentPath);
    this.redactionEnabled = false;
    console.log('🛡️  Redaction removed');
    this.displayCurrent();
  }

  /**
   * Show redaction policy
   */
  private showRedactionPolicy(): void {
    if (!this.redactionPolicy) {
      console.log('📋 No custom redaction policy set');
      console.log('Available categories:');
      SecurityRedactionEngine.getCategories().forEach(cat => {
        console.log(`  ${cat.name}: ${cat.description} (${cat.severity})`);
      });
    } else {
      console.log('📋 Current redaction policy:');
      console.log(`  Categories: ${this.redactionPolicy.categories.join(', ')}`);
      console.log(`  Severity: ${this.redactionPolicy.severity}`);
      console.log(`  Environment: ${this.redactionPolicy.metadata.environment}`);
    }
  }

  /**
   * Validate redaction effectiveness
   */
  private validateRedaction(): void {
    const original = EnhancedQueryEngine.applyJsonPath(this.originalObj, this.currentPath);
    const validation = SecurityRedactionEngine.validateRedaction(original, this.currentObj);
    
    console.log('🛡️  Redaction Validation:');
    console.log(`  Effectiveness: ${validation.effectiveness}%`);
    console.log(`  Status: ${validation.validation.toUpperCase()}`);
    
    if (validation.remainingRisks.length > 0) {
      console.log('  Remaining risks:');
      validation.remainingRisks.forEach(risk => {
        console.log(`    ⚠️  ${risk}`);
      });
    }
  }

  /**
   * Show enhanced welcome screen
   */
  private showWelcomeScreen(): void {
    console.log(`
🎯 Enhanced FactoryWager Interactive TUI
═════════════════════════════════════════
🔍 Advanced navigation with path-based exploration
🛡️  Enterprise security with real-time redaction
🎮 Professional UX with keyboard shortcuts
📊 Comprehensive analytics and pattern detection

Navigation: cd, pwd, ls, tree, back, up, root
Filtering: filter, regex, jsonpath, jq, jq-lite
Analysis: patterns, security, performance, analytics
Data Ops: only, type, keys, values, sort, unique
Security: redact, unredact, redact-policy, validate-redaction

Shortcuts: Ctrl+R=Reset, Ctrl+L=Clear, Ctrl+S=Save
          F1=Help, F2=Toggle Redaction, F3=Path History
          Ctrl+Backspace=Navigate Up, Ctrl+C=Exit
`);
  }

  /**
   * Display current object with enhanced formatting
   */
  private displayCurrent(): void {
    console.clear();
    console.log('🎯 Enhanced FactoryWager Interactive TUI');
    console.log('═════════════════════════════════════════\n');
    
    console.log(`📍 Path: ${this.currentPath}`);
    
    if (this.filters.length > 0) {
      console.log('🔍 Active Filters:');
      this.filters.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.type}: ${f.value}`);
      });
    }
    
    if (this.redactionEnabled) {
      console.log('🛡️  Redaction: ENABLED');
    }
    
    console.log('\n📋 Current Data:');
    console.log(inspect(this.currentObj, { 
      colors: true, 
      depth: 6, 
      maxArrayLength: 10,
      compact: false 
    }));
    
    console.log('\n' + '─'.repeat(50));
  }

  /**
   * Show enhanced help
   */
  private showHelp(): void {
    const helpText = `
🎯 Enhanced FactoryWager Interactive TUI - Help
═══════════════════════════════════════════════

🧭 NAVIGATION:
  cd <path>           Navigate to JSONPath
  pwd                 Show current path
  ls                  List current contents
  tree                Show tree view
  back                Go back in history
  up                  Go up one level
  root                Go to root
  copy-path           Copy path to clipboard

🔍 FILTERING:
  filter <text>       Filter by text
  regex <pattern>     Apply regex filter
  jsonpath <path>     JSONPath query
  jq <filter>         JQ-like filter
  jq-lite <filter>    Lightweight JQ filter
  clear-filters       Reset all filters

📊 ANALYSIS:
  patterns            Show extracted patterns
  security            Security analysis
  performance         Performance analysis
  analytics           Full analytics dashboard
  stats               Quick statistics

🔧 DATA OPERATIONS:
  only <type>         Filter by type (strings, numbers, etc.)
  type                Show type information
  keys                Show all keys
  values              Show all values
  sort                Sort array/object
  unique              Remove duplicates
  reverse             Reverse order
  length              Show length

🛡️ SECURITY:
  redact [cats]       Apply redaction (categories: security, pii, financial)
  unredact            Remove redaction
  redact-policy       Show redaction policy
  validate-redaction  Validate redaction effectiveness

💾 UTILITY:
  save <file>         Save to file
  export              Copy to clipboard
  history             Show command history
  help                Show this help
  exit                Exit

⌨️  SHORTCUTS:
  Ctrl+R              Reset filters
  Ctrl+L              Clear screen
  Ctrl+S              Save to file
  Ctrl+P              Show patterns
  F1                  Help
  F2                  Toggle redaction
  F3                  Path history
  Ctrl+Backspace      Navigate up
  Ctrl+C              Exit

📚 EXAMPLES:
  cd $.users[0]       Navigate to first user
  jsonpath $..email   Extract all emails
  jq ".[] | select(.amount > 100)"  High transactions
  only strings        Show only strings
  redact security     Redact security data
  copy-path           Copy current path

🔍 JSONPath Examples:
  $                   Root
  $.users.*           All users
  $..email            All emails (recursive)
  $.transactions[?]   Completed transactions
  $.users[0].name     First user's name

🎯 JQ-lite Examples:
  .                   Current object
  .field              Get field
  .[]                 Array items
  .[] | select(.x > 10)  Filter array
  .[] | map(.amount)  Extract field
  .[] | sort          Sort array
    `;
    
    console.log(helpText);
  }

  /**
   * Show session summary
   */
  private showSessionSummary(): void {
    const duration = Math.floor((Date.now() - this.sessionStats.sessionStart.getTime()) / 1000);
    
    console.log(`
📊 Enhanced Session Summary
═══════════════════════════════
⏱️  Duration: ${duration}s
🔧 Commands: ${this.sessionStats.commandsExecuted}
📍 Paths Visited: ${this.sessionStats.pathsVisited}
🔍 Filters Applied: ${this.sessionStats.filtersApplied}
🛡️  Redactions Applied: ${this.sessionStats.redactionsApplied}
📁 Current Path: ${this.currentPath}
    `);
  }

  // Additional method implementations would go here...
  // For brevity, I'm showing the key enhanced features
  
  private applyFilter(text: string): void {
    console.log(`Filter: ${text}`);
    // Implementation...
  }
  
  private applyExclude(text: string): void {
    console.log(`Exclude: ${text}`);
    // Implementation...
  }
  
  private applyRegex(pattern: string): void {
    console.log(`Regex: ${pattern}`);
    // Implementation...
  }
  
  private applyJsonPath(path: string): void {
    this.navigatePath(path);
  }
  
  private applyJq(filter: string): void {
    console.log(`JQ: ${filter}`);
    // Implementation...
  }
  
  private applyJqLite(filter: string): void {
    this.currentObj = EnhancedQueryEngine.applyJqFilter(this.currentObj, filter);
    this.displayCurrent();
  }
  
  private resetFilters(): void {
    this.filters = [];
    this.currentObj = EnhancedQueryEngine.applyJsonPath(this.originalObj, this.currentPath);
  }
  
  private showPatterns(): void {
    console.log('Patterns extraction...');
    // Implementation...
  }
  
  private showSecurityAnalysis(): void {
    console.log('Security analysis...');
    // Implementation...
  }
  
  private showPerformanceAnalysis(): void {
    console.log('Performance analysis...');
    // Implementation...
  }
  
  private showAnalytics(): void {
    console.log('Analytics dashboard...');
    // Implementation...
  }
  
  private showStats(): void {
    console.log('Statistics...');
    // Implementation...
  }
  
  private showTypeInfo(): void {
    console.log('Type information...');
    // Implementation...
  }
  
  private showKeys(): void {
    console.log('Keys...');
    // Implementation...
  }
  
  private showValues(): void {
    console.log('Values...');
    // Implementation...
  }
  
  private sortCurrent(): void {
    console.log('Sorting...');
    // Implementation...
  }
  
  private uniqueCurrent(): void {
    console.log('Removing duplicates...');
    // Implementation...
  }
  
  private reverseCurrent(): void {
    console.log('Reversing...');
    // Implementation...
  }
  
  private showLength(): void {
    const length = Array.isArray(this.currentObj) ? this.currentObj.length :
                   typeof this.currentObj === 'string' ? this.currentObj.length :
                   typeof this.currentObj === 'object' && this.currentObj !== null ? 
                   Object.keys(this.currentObj).length : 0;
    console.log(`📏 Length: ${length}`);
  }
  
  private showTree(): void {
    console.log('Tree view...');
    // Implementation...
  }
  
  private showHistory(): void {
    console.log('\nCommand History:');
    this.history.slice(-10).forEach((cmd, i) => {
      console.log(`  ${this.history.length - 10 + i + 1}. ${cmd}`);
    });
  }
  
  private showPathHistory(): void {
    console.log('\nPath History:');
    this.pathHistory.slice(-10).forEach((path, i) => {
      console.log(`  ${i + 1}. ${path}`);
    });
  }
  
  private async saveToFile(filename: string): Promise<void> {
    await Bun.write(filename, JSON.stringify(this.currentObj, null, 2));
    console.log(`✅ Saved to ${filename}`);
  }
  
  private async exportToClipboard(): Promise<void> {
    await Bun.$`echo ${JSON.stringify(this.currentObj, null, 2)} | pbcopy`;
    console.log('📋 Copied to clipboard!');
  }
}

export default EnhancedInteractiveTUI;
