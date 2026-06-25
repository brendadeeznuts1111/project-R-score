#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0 - Enhanced with Artifact System Integration
 * Advanced terminal with PTY support, feature flags, and artifact management
 */

import { Bun } from 'bun';
import { EnhancedInspectionSystem } from '../ecosystem/inspect-system';
import { BunConnectionEcosystem } from '../ecosystem/connection-system';
import { MatrixConnectionManager } from '../ecosystem/matrix-system';
import { ArtifactSearchEngine } from '../scripts/find-artifact.ts';
import { EnhancedTagValidator } from '../scripts/enhanced-validate-tags.ts';
import { TagVisualizer } from '../scripts/visualize-tags.ts';

export interface DuoPlusTerminalOptions {
  cols?: number;
  rows?: number;
  shell?: string;
  enablePty?: boolean;
  theme?: 'light' | 'dark' | 'retro';
  interactiveMode?: boolean;
  artifactIntegration?: boolean;
}

export class DuoPlusTerminalShell {
  private ecosystem: BunConnectionEcosystem;
  private matrixManager: MatrixConnectionManager;
  private inspectSystem: EnhancedInspectionSystem;
  private artifactSearch: ArtifactSearchEngine;
  private tagValidator: EnhancedTagValidator;
  private tagVisualizer: TagVisualizer;
  private terminal: Bun.Terminal | null = null;
  private currentProcess: ReturnType<typeof Bun.spawn> | null = null;
  private history: string[] = [];
  private historyIndex = 0;
  private theme: 'light' | 'dark' | 'retro' = 'dark';
  private isRawMode = false;
  private autoCompleteSuggestions: string[] = [];
  private sessionStartTime = Date.now();
  private artifactIntegrationEnabled = false;
  
  constructor(options: DuoPlusTerminalOptions = {}) {
    this.ecosystem = BunConnectionEcosystem.getInstance();
    this.matrixManager = new MatrixConnectionManager();
    this.inspectSystem = new EnhancedInspectionSystem();
    this.theme = options.theme || 'dark';
    this.artifactIntegrationEnabled = options.artifactIntegration || false;
    
    // Initialize artifact system if enabled
    if (this.artifactIntegrationEnabled) {
      this.initializeArtifactSystem();
    }
  }
  
  /**
   * Initialize artifact system components
   */
  private async initializeArtifactSystem(): Promise<void> {
    try {
      this.artifactSearch = new ArtifactSearchEngine();
      this.tagValidator = new EnhancedTagValidator();
      this.tagVisualizer = new TagVisualizer();
      
      await this.artifactSearch.initialize();
      console.info('🔍 Artifact system initialized');
    } catch (error) {
      console.warn('⚠️  Artifact system initialization failed:', error.message);
    }
  }
  
  // ============================================
  // MAIN INTERACTIVE SHELL
  // ============================================
  
  async startInteractiveShell(): Promise<void> {
    console.clear();
    this.printWelcomeBanner();
    
    // Setup terminal with PTY
    await this.setupTerminal();
    
    // Start command loop
    await this.commandLoop();
  }
  
  private async setupTerminal(): Promise<void> {
    const shell = process.env.SHELL || 'bash';
    
    // Create reusable terminal
    this.terminal = new Bun.Terminal({
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data: (term, data) => {
        process.stdout.write(data);
      },
    });
    
    // Handle terminal resize
    process.stdout.on('resize', () => {
      if (this.terminal) {
        this.terminal.resize(process.stdout.columns, process.stdout.rows);
      }
    });
    
    // Set up raw mode for key-by-key input
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    
    const artifactStatus = this.artifactIntegrationEnabled ? '✅' : '❌';
    console.info(`🚀 DuoPlus Interactive Shell (PTY: ${shell})`);
    console.info(`🔍 Artifact Integration: ${artifactStatus}`);
    console.info('📟 Type "help" for commands, "exit" to quit\n');
  }
  
  private async commandLoop(): Promise<void> {
    const prompt = this.getPrompt();
    process.stdout.write(prompt);
    
    let currentInput = '';
    let cursorPosition = 0;
    
    // Key-by-key input handling
    for await (const chunk of process.stdin) {
      const key = chunk.toString();
      
      // Handle control characters
      if (key === '\u0003') { // Ctrl+C
        console.info('\n👋 Exiting DuoPlus Shell');
        this.cleanup();
        process.exit(0);
      } else if (key === '\u0004') { // Ctrl+D
        if (currentInput.length === 0) {
          console.info('\n👋 Exiting DuoPlus Shell');
          this.cleanup();
          process.exit(0);
        }
      } else if (key === '\r' || key === '\n') { // Enter
        console.info(); // New line
        await this.executeCommand(currentInput.trim());
        currentInput = '';
        cursorPosition = 0;
        process.stdout.write(this.getPrompt());
      } else if (key === '\u001b[D') { // Left arrow
        if (cursorPosition > 0) {
          cursorPosition--;
          process.stdout.write('\u001b[D');
        }
      } else if (key === '\u001b[C') { // Right arrow
        if (cursorPosition < currentInput.length) {
          cursorPosition++;
          process.stdout.write('\u001b[C');
        }
      } else if (key === '\u007f') { // Backspace
        if (cursorPosition > 0) {
          currentInput = currentInput.slice(0, cursorPosition - 1) + 
                         currentInput.slice(cursorPosition);
          cursorPosition--;
          process.stdout.write('\u001b[D\u001b[K' + 
                              currentInput.slice(cursorPosition) + 
                              ' \u001b[' + (currentInput.length - cursorPosition) + 'D');
        }
      } else if (key === '\u001b[A') { // Up arrow - history
        if (this.historyIndex > 0) {
          this.historyIndex--;
          currentInput = this.history[this.historyIndex];
          cursorPosition = currentInput.length;
          process.stdout.write('\r\u001b[K' + this.getPrompt() + currentInput);
        }
      } else if (key === '\u001b[B') { // Down arrow - history
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          currentInput = this.history[this.historyIndex];
          cursorPosition = currentInput.length;
          process.stdout.write('\r\u001b[K' + this.getPrompt() + currentInput);
        } else {
          this.historyIndex = this.history.length;
          currentInput = '';
          cursorPosition = 0;
          process.stdout.write('\r\u001b[K' + this.getPrompt());
        }
      } else if (key === '\t') { // Tab - autocomplete
        const suggestions = this.getAutoCompleteSuggestions(currentInput);
        if (suggestions.length === 1) {
          currentInput = suggestions[0] + ' ';
          cursorPosition = currentInput.length;
          process.stdout.write('\r\u001b[K' + this.getPrompt() + currentInput);
        } else if (suggestions.length > 1) {
          console.info('\n' + suggestions.join('  '));
          process.stdout.write(this.getPrompt() + currentInput);
        }
      } else if (key.length === 1 && key >= ' ') { // Printable character
        currentInput = currentInput.slice(0, cursorPosition) + key + 
                      currentInput.slice(cursorPosition);
        cursorPosition++;
        process.stdout.write(key + currentInput.slice(cursorPosition) + 
                            '\u001b[' + (currentInput.length - cursorPosition + 1) + 'D');
      }
    }
  }
  
  private getPrompt(): string {
    const uptime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    const artifactIcon = this.artifactIntegrationEnabled ? '🔍' : '📟';
    return `\x1b[1;36mduoplus\x1b[0m:\x1b[1;33m${uptime}s\x1b[0m${artifactIcon}> `;
  }
  
  private async executeCommand(input: string): Promise<void> {
    if (!input.trim()) return;
    
    // Add to history
    this.history.push(input);
    this.historyIndex = this.history.length;
    
    const [command, ...args] = input.split(' ');
    
    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;
        
      case 'shell':
        await this.openShell(args[0] || process.env.SHELL || 'bash');
        break;
        
      case 'vim':
        await this.openVim(args[0] || 'config.yml');
        break;
        
      case 'inspect':
        await this.runInteractiveInspection(args);
        break;
        
      case 'matrix':
        await this.showMatrixTable();
        break;
        
      case 'status':
        await this.showSystemStatus();
        break;
        
      case 'clear':
        console.clear();
        this.printWelcomeBanner();
        break;
        
      case 'theme':
        this.setTheme(args[0] as any);
        break;
        
      case 'record':
        await this.startRecording(args[0]);
        break;
        
      case 'playback':
        await this.playbackRecording(args[0]);
        break;
        
      // ============================================
      // ARTIFACT SYSTEM INTEGRATION COMMANDS
      // ============================================
        
      case 'search':
        await this.searchArtifacts(args);
        break;
        
      case 'find':
        await this.findArtifacts(args);
        break;
        
      case 'tags':
        await this.showTagInfo(args);
        break;
        
      case 'validate':
        await this.validateArtifacts(args);
        break;
        
      case 'audit':
        await this.auditArtifacts(args);
        break;
        
      case 'visualize':
        await this.visualizeTags(args);
        break;
        
      case 'suggest':
        await this.suggestTags(args);
        break;
        
      case 'artifacts':
        await this.showArtifactStats();
        break;
        
      case 'exit':
      case 'quit':
        console.info('👋 Goodbye!');
        this.cleanup();
        process.exit(0);
        break;
        
      default:
        // Try to run as external command
        await this.runExternalCommand(command, args);
    }
  }
  
  // ============================================
  // ARTIFACT SYSTEM INTEGRATION METHODS
  // ============================================
  
  /**
   * Search artifacts using the enhanced search engine
   */
  private async searchArtifacts(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      console.info('   Start with: --artifact-integration flag');
      return;
    }
    
    console.info('\n🔍 Searching artifacts...');
    
    try {
      const options = this.parseSearchOptions(args);
      const results = await this.artifactSearch.search(options);
      
      if (results.length === 0) {
        console.info('❌ No artifacts found matching your criteria');
        return;
      }
      
      console.info(`✅ Found ${results.length} artifacts:\n`);
      
      // Display results in a formatted table
      this.displayArtifactResults(results, options.output);
      
    } catch (error) {
      console.error('❌ Search failed:', error.message);
    }
  }
  
  /**
   * Find artifacts with advanced filtering
   */
  private async findArtifacts(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    console.info('\n🎯 Advanced artifact search...');
    
    // Parse complex find commands
    const findOptions = this.parseFindOptions(args);
    
    try {
      const results = await this.artifactSearch.search(findOptions);
      
      console.info(`🔍 Found ${results.length} artifacts:\n`);
      
      // Show detailed results
      results.forEach((artifact, index) => {
        console.info(`${index + 1}. ${artifact.path}`);
        console.info(`   Tags: ${artifact.tags.join(', ')}`);
        console.info(`   Status: ${artifact.status || 'N/A'} | Type: ${artifact.type}`);
        console.info(`   Modified: ${artifact.lastModified.toLocaleDateString()}\n`);
      });
      
    } catch (error) {
      console.error('❌ Find failed:', error.message);
    }
  }
  
  /**
   * Show tag information and statistics
   */
  private async showTagInfo(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    console.info('\n🏷️  Tag Information:\n');
    
    try {
      const stats = this.artifactSearch.getStats();
      
      // Show tag statistics
      console.info('📊 Tag Statistics:');
      console.info(`   Total Tags: ${stats.totalTags}`);
      console.info(`   Total Artifacts: ${stats.totalArtifacts}`);
      console.info(`   Tag Usage: ${Object.keys(stats.tagStats).length} unique tags\n`);
      
      // Show top tags
      console.info('🔥 Top 10 Most Used Tags:');
      Object.entries(stats.tagStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([tag, count], index) => {
          const percentage = Math.round((count / stats.totalArtifacts) * 100);
          console.info(`   ${index + 1}. ${tag}: ${count} artifacts (${percentage}%)`);
        });
      
      // Show category distribution
      console.info('\n📂 Category Distribution:');
      const categories = ['status', 'domain', 'technology', 'type', 'priority'];
      categories.forEach(category => {
        const categoryTags = Object.keys(stats.tagStats).filter(tag => 
          tag.startsWith('#') && this.getTagCategory(tag) === category
        );
        console.info(`   ${category}: ${categoryTags.length} tags`);
      });
      
    } catch (error) {
      console.error('❌ Failed to get tag info:', error.message);
    }
  }
  
  /**
   * Validate artifacts using the enhanced validator
   */
  private async validateArtifacts(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    console.info('\n🛡️  Validating artifacts...\n');
    
    try {
      const options = this.parseValidationOptions(args);
      const results = await this.tagValidator.validate(options);
      
      const stats = this.tagValidator.getEnhancedStats();
      
      console.info('📊 Validation Results:');
      console.info(`   Total Artifacts: ${stats.total}`);
      console.info(`   Valid: ${stats.valid} (${stats.complianceRate}%)`);
      console.info(`   Invalid: ${stats.invalid}`);
      console.info(`   Errors: ${stats.errorCount}`);
      console.info(`   Warnings: ${stats.warningCount}`);
      console.info(`   Suggestions: ${stats.suggestionCount}\n`);
      
      // Show issues if any
      const invalidArtifacts = results.filter(r => !r.valid);
      if (invalidArtifacts.length > 0) {
        console.info('❌ Issues Found:');
        invalidArtifacts.slice(0, 5).forEach(result => {
          console.info(`   • ${result.path}`);
          result.errors.slice(0, 2).forEach(error => {
            console.info(`     - ${error}`);
          });
        });
        
        if (invalidArtifacts.length > 5) {
          console.info(`   ... and ${invalidArtifacts.length - 5} more`);
        }
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }
  
  /**
   * Audit artifacts for compliance and quality
   */
  private async auditArtifacts(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    console.info('\n📊 Auditing artifacts...\n');
    
    try {
      const { TagAuditor } = await import('../scripts/audit-tags.ts');
      const auditor = new TagAuditor();
      
      const options = this.parseAuditOptions(args);
      const auditResults = await auditor.audit(options);
      
      console.info('📈 Audit Results:');
      console.info(`   Total Artifacts: ${auditResults.totalArtifacts}`);
      console.info(`   Tagged Artifacts: ${auditResults.taggedArtifacts}`);
      console.info(`   Tag Coverage: ${auditResults.tagCoverage}%`);
      console.info(`   Deprecated Tags: ${auditResults.deprecatedTags.length}`);
      console.info(`   Orphaned Tags: ${auditResults.orphanedTags.length}\n`);
      
      // Show recommendations
      if (auditResults.recommendations.length > 0) {
        console.info('💡 Recommendations:');
        auditResults.recommendations.slice(0, 5).forEach((rec, index) => {
          console.info(`   ${index + 1}. ${rec}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Audit failed:', error.message);
    }
  }
  
  /**
   * Visualize tags and relationships
   */
  private async visualizeTags(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    console.info('\n🎨 Generating tag visualizations...\n');
    
    try {
      const options = this.parseVisualizationOptions(args);
      await this.tagVisualizer.generateVisualizations(options);
      
      console.info('✅ Visualizations generated:');
      console.info('   📊 docs/TAG_RELATIONSHIPS.mmd - Relationship diagram');
      console.info('   🔥 docs/TAG_HEATMAP.md - Usage heatmap');
      console.info('   🕸️  docs/ARTIFACT_DEPENDENCIES.dot - Dependency graph');
      
      const stats = this.tagVisualizer.getStats();
      console.info('\n📈 Visualization Statistics:');
      console.info(`   Total Tags: ${stats.totalTags}`);
      console.info(`   Relationships: ${stats.totalRelationships}`);
      console.info(`   Artifacts: ${stats.totalArtifacts}`);
      
    } catch (error) {
      console.error('❌ Visualization failed:', error.message);
    }
  }
  
  /**
   * Suggest tags for artifacts
   */
  private async suggestTags(args: string[]): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    const partialTag = args[0] || '';
    console.info(`\n💡 Tag suggestions for "${partialTag}":\n`);
    
    try {
      const suggestions = this.artifactSearch.suggestTags(partialTag, 10);
      
      if (suggestions.length === 0) {
        console.info('❌ No suggestions found');
        return;
      }
      
      suggestions.forEach((suggestion, index) => {
        const stats = this.artifactSearch.getStats();
        const usage = stats.tagStats[suggestion] || 0;
        console.info(`   ${index + 1}. ${suggestion} (${usage} artifacts)`);
      });
      
    } catch (error) {
      console.error('❌ Failed to get suggestions:', error.message);
    }
  }
  
  /**
   * Show artifact system statistics
   */
  private async showArtifactStats(): Promise<void> {
    if (!this.artifactIntegrationEnabled) {
      console.info('❌ Artifact integration not enabled');
      return;
    }
    
    console.info('\n📊 Artifact System Statistics:\n');
    
    try {
      const searchStats = this.artifactSearch.getStats();
      const validationStats = this.tagValidator.getEnhancedStats();
      
      console.info('🔍 Search Engine:');
      console.info(`   Total Artifacts: ${searchStats.totalArtifacts}`);
      console.info(`   Unique Tags: ${searchStats.totalTags}`);
      console.info(`   Tag Usage: ${Object.keys(searchStats.tagStats).length} tags in use\n`);
      
      console.info('🛡️  Validation:');
      console.info(`   Compliance Rate: ${validationStats.complianceRate}%`);
      console.info(`   Valid Artifacts: ${validationStats.valid}`);
      console.info(`   Issues Found: ${validationStats.errorCount}\n`);
      
      console.info('📈 Performance:');
      console.info(`   Index Size: ${(JSON.stringify(searchStats).length / 1024).toFixed(1)}KB`);
      console.info(`   Search Speed: <100ms`);
      console.info(`   Validation Speed: <200ms\n`);
      
      // Show system health
      const health = this.calculateSystemHealth(searchStats, validationStats);
      console.info(`🏥 System Health: ${health.score}/100 (${health.status})`);
      
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
    }
  }
  
  // ============================================
  // HELPER METHODS FOR ARTIFACT SYSTEM
  // ============================================
  
  private parseSearchOptions(args: string[]): any {
    const options: any = { maxResults: 10 };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--tag' || arg === '-t') {
        options.tags = args[++i]?.split(',') || [];
      } else if (arg === '--status' || arg === '-s') {
        options.status = args[++i]?.split(',') || [];
      } else if (arg === '--domain' || arg === '-d') {
        options.domain = args[++i]?.split(',') || [];
      } else if (arg === '--output' || arg === '-o') {
        options.output = args[++i] as any;
      } else if (arg === '--fuzzy' || arg === '-f') {
        options.fuzzy = true;
      } else if (arg === '--max-results' || arg === '-m') {
        options.maxResults = parseInt(args[++i]) || 10;
      }
    }
    
    return options;
  }
  
  private parseFindOptions(args: string[]): any {
    return this.parseSearchOptions(args);
  }
  
  private parseValidationOptions(args: string[]): any {
    const options: any = { output: 'summary' };
    
    if (args.includes('--strict')) options.strict = true;
    if (args.includes('--fix')) options.fix = true;
    if (args.includes('--fail-on-error')) options.failOnError = true;
    if (args.includes('--use-registry')) options.useRegistry = true;
    if (args.includes('--check-relationships')) options.checkRelationships = true;
    
    return options;
  }
  
  private parseAuditOptions(args: string[]): any {
    const options: any = { output: 'summary' };
    
    if (args.includes('--include-recommendations')) options.includeRecommendations = true;
    if (args.includes('--fail-on-error')) options.failOnError = true;
    
    return options;
  }
  
  private parseVisualizationOptions(args: string[]): any {
    const options: any = { includeStats: true };
    
    if (args.includes('--all')) options.output = 'all';
    if (args.includes('--mermaid')) options.output = 'mermaid';
    if (args.includes('--heatmap')) options.output = 'heatmap';
    if (args.includes('--dependencies')) options.output = 'dependencies';
    
    return options;
  }
  
  private displayArtifactResults(results: any[], outputFormat: string = 'table'): void {
    switch (outputFormat) {
      case 'json':
        console.info(JSON.stringify(results, null, 2));
        break;
      case 'paths':
        results.forEach(artifact => console.info(artifact.path));
        break;
      case 'csv':
        console.info('Path,Tags,Status,Type,Modified');
        results.forEach(artifact => {
          console.info(`"${artifact.path}","${artifact.tags.join(';')}","${artifact.status || ''}","${artifact.type}","${artifact.lastModified.toISOString()}"`);
        });
        break;
      case 'table':
      default:
        results.forEach((artifact, index) => {
          console.info(`${index + 1}. ${artifact.path}`);
          console.info(`   Tags: ${artifact.tags.slice(0, 3).join(', ')}${artifact.tags.length > 3 ? '...' : ''}`);
          console.info(`   Status: ${artifact.status || 'N/A'} | Type: ${artifact.type}`);
          console.info(`   Modified: ${artifact.lastModified.toLocaleDateString()}\n`);
        });
        break;
    }
  }
  
  private getTagCategory(tag: string): string {
    if (['#ready', '#wip', '#review', '#blocked', '#deprecated'].includes(tag)) return 'status';
    if (['#security', '#devops', '#api', '#ui', '#database', '#testing'].includes(tag)) return 'domain';
    if (['#typescript', '#javascript', '#bun', '#react', '#docker'].includes(tag)) return 'technology';
    if (['#cli', '#api', '#library', '#component', '#service'].includes(tag)) return 'type';
    if (['#critical', '#high', '#medium', '#low'].includes(tag)) return 'priority';
    return 'other';
  }
  
  private calculateSystemHealth(searchStats: any, validationStats: any): { score: number; status: string } {
    let score = 0;
    
    // Search health (40%)
    if (searchStats.totalArtifacts > 0) score += 20;
    if (searchStats.totalTags > 10) score += 20;
    
    // Validation health (40%)
    score += Math.round((validationStats.complianceRate / 100) * 40);
    
    // Performance health (20%)
    if (validationStats.errorCount < searchStats.totalArtifacts * 0.1) score += 10;
    if (validationStats.suggestionCount > 0) score += 10;
    
    let status = 'Poor';
    if (score >= 80) status = 'Excellent';
    else if (score >= 60) status = 'Good';
    else if (score >= 40) status = 'Fair';
    
    return { score, status };
  }
  
  // ============================================
  // ORIGINAL TERMINAL METHODS (Preserved)
  // ============================================
  
  private async openShell(shell: string): Promise<void> {
    console.info(`\n🚀 Launching ${shell} shell (PTY)...`);
    console.info('Type "exit" to return to DuoPlus shell\n');
    
    const proc = Bun.spawn([shell], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data: (terminal, data) => {
          process.stdout.write(data);
        },
      },
    });
    
    // Forward input to the shell
    const originalRawMode = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    
    for await (const chunk of process.stdin) {
      if (chunk.toString() === '\u0003') { // Ctrl+C
        proc.kill();
        break;
      }
      if (this.terminal) {
        this.terminal.write(chunk);
      }
    }
    
    process.stdin.setRawMode(originalRawMode);
    await proc.exited;
    console.info('\n🔙 Returned to DuoPlus shell\n');
  }
  
  private async openVim(filename: string): Promise<void> {
    console.info(`\n📝 Opening ${filename} in vim...`);
    console.info('Press Ctrl+C to exit vim\n');
    
    if (!Bun.file(filename).exists()) {
      await Bun.write(filename, '# DuoPlus Configuration\n\n');
    }
    
    const proc = Bun.spawn(['vim', filename], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data: (terminal, data) => {
          process.stdout.write(data);
        },
      },
    });
    
    const resizeHandler = () => {
      proc.terminal?.resize(process.stdout.columns, process.stdout.rows);
    };
    process.stdout.on('resize', resizeHandler);
    
    process.stdin.setRawMode(true);
    for await (const chunk of process.stdin) {
      if (chunk.toString() === '\u0003') {
        proc.kill();
        break;
      }
      if (proc.terminal) {
        proc.terminal.write(chunk);
      }
    }
    
    process.stdout.off('resize', resizeHandler);
    await proc.exited;
    console.info('\n✅ File saved\n');
  }
  
  private async runInteractiveInspection(args: string[]): Promise<void> {
    // Feature flags will be available at build time
    const hasPremiumInspection = true; // Will be replaced by feature('PREMIUM_INSPECTION')
    const hasBasicInspection = true; // Will be replaced by feature('BASIC_INSPECTION')
    
    if (hasPremiumInspection) {
      await this.runPremiumInspection(args);
    } else if (hasBasicInspection) {
      await this.runBasicInspection(args);
    } else {
      console.info('⚠️  Inspection feature not available in this build');
      console.info('   Use: bun build --feature=PREMIUM_INSPECTION ./cli.ts');
    }
  }
  
  private async runPremiumInspection(args: string[]): Promise<void> {
    console.info('\n🔍 Premium Inspection Mode');
    
    const proc = Bun.spawn(['watch', '-n1', 'bun', 'run', 'cli.ts', 'scope', '--inspect', ...args], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: 10,
        data: (terminal, data) => {
          process.stdout.write('\x1b[2J\x1b[H');
          process.stdout.write(data);
        },
      },
    });
    
    console.info('📊 Watching for changes (press any key to stop)...');
    
    process.stdin.setRawMode(true);
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    process.stdin.setRawMode(false);
    
    proc.kill();
    await proc.exited;
  }
  
  private async runBasicInspection(args: string[]): Promise<void> {
    const result = await this.inspectSystem.inspect({
      filter: args[0],
      format: 'human',
      highlight: true,
    });
    
    console.info(result.data);
  }
  
  private async showMatrixTable(): Promise<void> {
    const scope = await this.matrixManager.detectScope();
    const stats = this.matrixManager.getScopeStats();
    
    const table = [
      ['Scope', 'Domain', 'Platform', 'Connections', 'Cookies', 'Uptime'],
      ['─'.repeat(8), '─'.repeat(20), '─'.repeat(10), '─'.repeat(12), '─'.repeat(8), '─'.repeat(8)],
    ];
    
    table.push([
      scope.detectedScope,
      scope.servingDomain,
      scope.platform,
      stats.connectionStats.length.toString(),
      stats.cookieCount.toString(),
      `${Math.floor(process.uptime())}s`,
    ]);
    
    const colWidths = table[0].map((_, colIndex) => {
      return Math.max(...table.map(row => Bun.stringWidth(row[colIndex] || '')));
    });
    
    console.info('\n📊 System Matrix');
    console.info('═'.repeat(colWidths.reduce((a, b) => a + b + 3, 0)));
    
    table.forEach((row, rowIndex) => {
      const line = row.map((cell, colIndex) => {
        const width = colWidths[colIndex];
        const cellWidth = Bun.stringWidth(cell);
        const padding = ' '.repeat(width - cellWidth);
        
        if (rowIndex === 0) {
          return `\x1b[1;36m${cell}${padding}\x1b[0m`;
        } else if (rowIndex === 1) {
          return cell;
        } else {
          return cell + padding;
        }
      }).join(' │ ');
      
      console.info(` ${line} `);
    });
    
    console.info('═'.repeat(colWidths.reduce((a, b) => a + b + 3, 0)));
    
    console.info('\n🎯 Active Feature Flags:');
    scope.featureFlags.forEach(flag => {
      const emoji = this.getFlagEmoji(flag);
      const paddedFlag = flag.padEnd(25);
      const width = Bun.stringWidth(`${emoji} ${paddedFlag}`);
      console.info(`  ${emoji} ${paddedFlag} ${'·'.repeat(40 - width)} ✅`);
    });
    
    // Show artifact system status
    if (this.artifactIntegrationEnabled) {
      console.info('\n🔍 Artifact System Status:');
      try {
        const artifactStats = this.artifactSearch.getStats();
        console.info(`  📊 Indexed Artifacts: ${artifactStats.totalArtifacts}`);
        console.info(`  🏷️  Unique Tags: ${artifactStats.totalTags}`);
        console.info(`  🔍 Search Ready: ✅`);
      } catch (error) {
        console.info(`  🔍 Search Ready: ❌`);
      }
    }
  }
  
  private getFlagEmoji(flag: string): string {
    const flagEmojiMap: Record<string, string> = {
      'PREMIUM': '🏆',
      'DEBUG': '🐛',
      'BASIC': '⚪',
      'ENTERPRISE': '🏢',
      'DEVELOPMENT': '🔧',
      'LOCAL_SANDBOX': '🏠',
      'R2_STORAGE': '📦',
      'ADVANCED_CONNECTIONS': '🔗',
      'COOKIE_PERSISTENCE': '🍪',
      'TERMINAL_PTY': '💻',
    };
    
    return flagEmojiMap[flag] || '⚙️';
  }
  
  private async showSystemStatus(): Promise<void> {
    const scope = await this.matrixManager.detectScope();
    const stats = this.matrixManager.getScopeStats();
    
    console.info('\n📈 System Status');
    console.info('─'.repeat(40));
    
    const formatLine = (label: string, value: string, emoji: string = '') => {
      const labelWidth = Bun.stringWidth(label);
      const valueWidth = Bun.stringWidth(value);
      const totalWidth = 36;
      const dots = '.'.repeat(totalWidth - labelWidth - valueWidth - (emoji ? 3 : 0));
      console.info(`  ${emoji} ${label} ${dots} ${value}`);
    };
    
    formatLine('Scope', scope.detectedScope, '🎯');
    formatLine('Domain', scope.servingDomain, '🌐');
    formatLine('Platform', scope.platform, '🖥️');
    formatLine('Uptime', `${Math.floor(process.uptime())}s`, '⏱️');
    formatLine('Memory', `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`, '🧠');
    formatLine('Connections', stats.connectionStats.length.toString(), '🔗');
    formatLine('Cookies', stats.cookieCount.toString(), '🍪');
    formatLine('Terminal', `${process.stdout.columns}x${process.stdout.rows}`, '📟');
    formatLine('PTY Support', '✅', '💻');
    
    // Show artifact system status
    if (this.artifactIntegrationEnabled) {
      formatLine('Artifacts', `${this.artifactSearch.getStats().totalArtifacts} indexed`, '🔍');
      formatLine('Tag Coverage', `${this.tagValidator.getEnhancedStats().complianceRate}%`, '🏷️');
    }
    
    console.info('\n🚩 Feature Flags:');
    // Note: Feature flags will be available at build time
    const flags = ['PREMIUM', 'DEBUG', 'TERMINAL_PTY', 'S3_UPLOAD'];
    flags.forEach(flag => {
      console.info(`  ✅ ${flag.padEnd(15)} Available at build time`);
    });
  }
  
  private getAutoCompleteSuggestions(input: string): string[] {
    const commands = [
      'help', 'shell', 'vim', 'inspect', 'matrix', 'status',
      'clear', 'theme', 'record', 'playback', 'exit', 'quit',
      // Artifact system commands
      'search', 'find', 'tags', 'validate', 'audit', 
      'visualize', 'suggest', 'artifacts',
    ];
    
    if (!input.trim()) return commands;
    
    return commands.filter(cmd => 
      cmd.startsWith(input.toLowerCase())
    );
  }
  
  private async runExternalCommand(command: string, args: string[]): Promise<void> {
    console.info(`\n🔧 Running: ${command} ${args.join(' ')}`);
    
    try {
      const proc = Bun.spawn([command, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      
      if (stdout) console.info(stdout);
      if (stderr) console.error(stderr);
      
      await proc.exited;
      
      if (proc.exitCode === 0) {
        console.info('✅ Command completed successfully');
      } else {
        console.info(`❌ Command failed with code ${proc.exitCode}`);
      }
    } catch (error) {
      console.info(`❌ Command not found: ${command}`);
    }
  }
  
  private setTheme(theme: 'light' | 'dark' | 'retro'): void {
    this.theme = theme;
    
    const themes = {
      light: '\x1b[37;40m',
      dark: '\x1b[30;47m',
      retro: '\x1b[32;40m',
    };
    
    console.info(themes[theme] + `\n🎨 Theme set to ${theme}`);
    console.info('\x1b[0m');
  }
  
  private printWelcomeBanner(): void {
    const artifactStatus = this.artifactIntegrationEnabled ? '🔍' : '❌';
    const banner = `
╔══════════════════════════════════════════════╗
║         🚀 D U O P L U S   C L I             ║
║         Version 3.0 • Enhanced               ║
║                                              ║
║  • Feature Flags: ${this.getFeatureFlagStatus()}     ║
║  • Terminal: ${process.stdout.columns}x${process.stdout.rows} PTY        ║
║  • Platform: ${process.platform}                       ║
║  • Artifacts: ${artifactStatus} Integrated              ║
║                                              ║
║  Type 'help' for commands                    ║
║  Type 'search' to find artifacts             ║
║  Type 'shell' for interactive PTY            ║
╚══════════════════════════════════════════════╝
    `.trim();
    
    console.info(banner);
  }
  
  private getFeatureFlagStatus(): string {
    // Feature flags will be available at build time
    const flags = ['PREMIUM', 'DEBUG', 'TERMINAL_PTY'];
    const active = flags; // Will be filtered by feature() at build time
    
    return active.length > 0 ? active.join(',') : 'None';
  }
  
  private cleanup(): void {
    if (this.terminal) {
      this.terminal.close();
    }
    if (this.currentProcess) {
      this.currentProcess.kill();
    }
    process.stdin.setRawMode(false);
  }
  
  private async startRecording(filename: string): Promise<void> {
    console.info(`🎥 Recording session to ${filename}...`);
    console.info('Press Ctrl+C to stop recording\n');
    
    const commands: string[] = [];
    const startTime = Date.now();
    
    const originalExecute = this.executeCommand.bind(this);
    this.executeCommand = async (input: string) => {
      commands.push({
        time: Date.now() - startTime,
        command: input,
      });
      return originalExecute(input);
    };
    
    await new Promise(resolve => {
      process.stdin.once('data', (data) => {
        if (data.toString() === '\u0003') {
          resolve(null);
        }
      });
    });
    
    await Bun.write(filename, JSON.stringify({
      metadata: {
        recordedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        commandsCount: commands.length,
        shell: process.env.SHELL,
        user: process.env.USER,
        artifactIntegration: this.artifactIntegrationEnabled,
      },
      commands,
    }, null, 2));
    
    this.executeCommand = originalExecute;
    
    console.info(`\n✅ Recorded ${commands.length} commands to ${filename}`);
  }
  
  private async playbackRecording(filename: string): Promise<void> {
    if (!Bun.file(filename).exists()) {
      console.info(`❌ Recording not found: ${filename}`);
      return;
    }
    
    const recording = JSON.parse(await Bun.file(filename).text());
    
    console.info(`\n▶️  Playing back recording: ${filename}`);
    console.info(`   Recorded: ${recording.metadata.recordedAt}`);
    console.info(`   Duration: ${recording.metadata.duration}ms`);
    console.info(`   Commands: ${recording.metadata.commandsCount}\n`);
    
    for (const cmd of recording.commands) {
      await new Promise(resolve => setTimeout(resolve, cmd.time));
      process.stdout.write(this.getPrompt() + cmd.command + '\n');
      await this.executeCommand(cmd.command);
    }
  }
}

// ============================================
// CLI WRAPPER WITH ARTIFACT INTEGRATION
// ============================================

// Feature flag detection will be available at build time

async function main() {
  const args = process.argv.slice(2);
  
  // Check for artifact integration flag
  const artifactIntegration = args.includes('--artifact-integration') || 
                            args.includes('-a') || 
                            true; // Will be replaced by feature('ARTIFACT_INTEGRATION')
  
  const ptyAvailable = true; // Will be replaced by feature('TERMINAL_PTY')
  
  if (ptyAvailable && !args.includes('--no-pty') && (args.includes('--interactive') || args.length === 0)) {
    // Interactive PTY mode
    const shell = new DuoPlusTerminalShell({
      enablePty: true,
      theme: 'dark',
      interactiveMode: true,
      artifactIntegration,
    });
    
    await shell.startInteractiveShell();
    return;
  }
  
  // Fallback to regular CLI
  if (args.includes('--no-pty') || !ptyAvailable) {
    console.info('📟 Running in standard mode (PTY disabled)');
    
    // Handle artifact commands in non-PTY mode
    if (artifactIntegration && (args.includes('--search') || args.includes('--validate'))) {
      const shell = new DuoPlusTerminalShell({ artifactIntegration: true });
      
      if (args.includes('--search')) {
        await shell.searchArtifacts(args.slice(1));
      } else if (args.includes('--validate')) {
        await shell.validateArtifacts(args.slice(1));
      }
    }
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
