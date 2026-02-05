#!/usr/bin/env bun

/**
 * DuoPlus CLI v4.0 - Enhanced with Matrix & Documentation Integration
 * Main entry point with cross-referenced matrix system and comprehensive CLI
 */

import { DuoPlusTerminalShell } from './cli/terminal-shell.ts';
import { ArtifactSearchEngine } from './scripts/find-artifact.ts';
import { EnhancedTagValidator } from './scripts/enhanced-validate-tags.ts';
import { TagVisualizer } from './scripts/visualize-tags.ts';
import { EnhancedCLI } from './src/@cli/enhanced-cli-integrated.ts';

// Type declarations for Node.js globals and modules
interface ProcessEvents {
  on(event: 'unhandledRejection', listener: (reason: any, promise: Promise<any>) => void): void;
  on(event: 'uncaughtException', listener: (error: Error) => void): void;
}

interface ProcessEnv {
  [key: string]: string | undefined;
}

declare const process: {
  argv: string[];
  env: ProcessEnv;
  exit(code?: number): never;
} & ProcessEvents;

// Dynamic imports for Node.js modules
const getChildProcess = () => import('child_process');
const getFs = () => import('fs');
const getPath = () => import('path');

// Feature flag detection will be available at build time

interface CLIOptions {
  interactive?: boolean;
  artifactIntegration?: boolean;
  noPty?: boolean;
  shell?: string;
  theme?: 'light' | 'dark' | 'retro';
  enhanced?: boolean;
  matrix?: boolean;
  docs?: boolean;
  verbose?: boolean;
  learn?: boolean;
}

interface CLISessionState {
  sessionId: string;
  startTime: Date;
  previousCommand?: string;
  commandHistory: string[];
  featureFlags: Map<string, boolean>;
  userPreferences: UserPreferences;
  errorHistory: CLIError[];
  learningPatterns: Map<string, number>;
}

interface UserPreferences {
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredTheme: 'light' | 'dark' | 'retro';
  showHints: boolean;
  autoSuggest: boolean;
  learningMode: boolean;
}

interface CLIError {
  timestamp: Date;
  command: string;
  error: string;
  suggestion?: string;
  resolved: boolean;
}

/**
 * Enhanced Feature Flag Manager with Dynamic Detection
 */
class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: Map<string, boolean> = new Map();
  private checkPromises: Map<string, Promise<boolean>> = new Map();

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  async checkFeature(featureName: string): Promise<boolean> {
    if (this.flags.has(featureName)) {
      return this.flags.get(featureName)!;
    }

    if (this.checkPromises.has(featureName)) {
      return this.checkPromises.get(featureName)!;
    }

    const checkPromise = this.evaluateFeature(featureName);
    this.checkPromises.set(featureName, checkPromise);
    
    try {
      const result = await checkPromise;
      this.flags.set(featureName, result);
      return result;
    } finally {
      this.checkPromises.delete(featureName);
    }
  }

  private async evaluateFeature(featureName: string): Promise<boolean> {
    switch (featureName) {
      case 'TERMINAL_PTY':
        return await this.checkPTYSupport();
      case 'ARTIFACT_INTEGRATION':
        return await this.checkArtifactSystem();
      case 'PREMIUM':
        return process.env.DUOPLUS_LICENSE === 'premium';
      case 'DEBUG':
        return process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
      case 'S3_UPLOAD':
        return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
      case 'LEARNING_MODE':
        return process.env.LEARNING_MODE === 'true';
      default:
        return process.env[`FEATURE_${featureName}`] === 'true';
    }
  }

  private async checkPTYSupport(): Promise<boolean> {
    try {
      const { spawn } = await getChildProcess();
      return new Promise((resolve) => {
        const test = spawn('echo', ['test'], { stdio: 'pipe' });
        test.on('close', (code: number | null) => resolve(code === 0));
        test.on('error', () => resolve(false));
      });
    } catch {
      return false;
    }
  }

  private async checkArtifactSystem(): Promise<boolean> {
    try {
      // Check if artifact modules are available
      await import('./scripts/find-artifact.ts');
      return true;
    } catch {
      return false;
    }
  }

  getAllFeatures(): Map<string, boolean> {
    return new Map(this.flags);
  }
}

/**
 * CLI Session State Manager
 */
class CLIStateManager {
  private state: CLISessionState;
  private stateFile: string;

  constructor() {
    this.stateFile = '.duoplus-cli-state.json'; // Will be resolved later
    this.state = this.createInitialState();
    // Initialize state loading asynchronously
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    try {
      const path = await getPath();
      this.stateFile = path.join(process.env.HOME || '.', '.duoplus-cli-state.json');
      const loadedState = await this.loadState();
      if (loadedState) {
        this.state = loadedState;
      }
    } catch {
      // Fail silently, use default state
    }
  }

  private createInitialState(): CLISessionState {
    return {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      commandHistory: [],
      featureFlags: new Map(),
      userPreferences: {
        expertiseLevel: 'intermediate',
        preferredTheme: 'dark',
        showHints: true,
        autoSuggest: true,
        learningMode: false
      },
      errorHistory: [],
      learningPatterns: new Map()
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadState(): Promise<CLISessionState | null> {
    try {
      const fs = getFs();
      if ((await fs).existsSync(this.stateFile)) {
        const data = (await fs).readFileSync(this.stateFile, 'utf8');
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          startTime: new Date(parsed.startTime),
          featureFlags: new Map(parsed.featureFlags),
          learningPatterns: new Map(parsed.learningPatterns)
        };
      }
    } catch {
      // Fail silently
    }
    return null;
  }

  private async saveState(): Promise<void> {
    try {
      const fs = getFs();
      const serialized = {
        ...this.state,
        startTime: this.state.startTime.toISOString(),
        featureFlags: Array.from(this.state.featureFlags.entries()),
        learningPatterns: Array.from(this.state.learningPatterns.entries())
      };
      (await fs).writeFileSync(this.stateFile, JSON.stringify(serialized, null, 2));
    } catch {
      // Fail silently
    }
  }

  getState(): CLISessionState {
    return this.state;
  }

  async updateCommand(command: string): Promise<void> {
    this.state.previousCommand = command;
    this.state.commandHistory.push(command);
    
    // Update learning patterns
    const pattern = this.extractPattern(command);
    this.state.learningPatterns.set(pattern, (this.state.learningPatterns.get(pattern) || 0) + 1);
    
    await this.saveState();
  }

  private extractPattern(command: string): string {
    // Extract command pattern for learning
    const parts = command.split(' ');
    return parts[0] || 'unknown';
  }

  async logError(error: Error, context: string): Promise<void> {
    const cliError: CLIError = {
      timestamp: new Date(),
      command: context,
      error: error.message,
      resolved: false
    };
    this.state.errorHistory.push(cliError);
    await this.saveState();
  }

  suggestFollowUp(): string[] {
    const suggestions: string[] = [];
    
    // Based on command history
    if (this.state.commandHistory.length > 0) {
      const lastCommand = this.state.commandHistory[this.state.commandHistory.length - 1];
      if (lastCommand.includes('search')) {
        suggestions.push('Try: validate --strict', 'Try: visualize --output all');
      } else if (lastCommand.includes('validate')) {
        suggestions.push('Try: audit --include-recommendations', 'Try: search --tag "#fixed"');
      }
    }
    
    // Based on learning patterns
    const mostUsed = Array.from(this.state.learningPatterns.entries())
      .sort(([,a], [,b]) => b - a)[0];
    if (mostUsed) {
      suggestions.push(`Frequently used: ${mostUsed[0]}`);
    }
    
    return suggestions;
  }
}

/**
 * Enhanced Error Handler with Context Awareness
 */
class CLIErrorHandler {
  constructor(private sessionManager: CLIStateManager) {}

  async handleError(error: Error, context: string): Promise<void> {
    await this.sessionManager.logError(error, context);
    
    const suggestions = this.generateSuggestions(error, context);
    console.error('\n❌ Error:', error.message);
    
    if (suggestions.length > 0) {
      console.log('\n💡 Suggested fixes:');
      suggestions.forEach((suggestion, i) => {
        console.log(`   ${i + 1}. ${suggestion}`);
      });
    }
    
    // Show follow-up suggestions
    const followUps = this.sessionManager.suggestFollowUp();
    if (followUps.length > 0) {
      console.log('\n🔗 Related commands:');
      followUps.forEach((suggestion, i) => {
        console.log(`   ${i + 1}. ${suggestion}`);
      });
    }
  }

  private generateSuggestions(error: Error, context: string): string[] {
    const suggestions: string[] = [];
    
    if (error.message.includes('ENOENT')) {
      suggestions.push('Check if the file exists', 'Use absolute paths', 'Verify permissions');
    } else if (error.message.includes('permission')) {
      suggestions.push('Run with appropriate permissions', 'Check file ownership');
    } else if (error.message.includes('feature')) {
      suggestions.push('Check feature flags with --verbose', 'Enable required features');
    } else if (context.includes('artifact')) {
      suggestions.push('Try: --artifact-integration flag', 'Check artifact system status');
    }
    
    return suggestions;
  }
}

/**
 * Parse command line arguments with validation
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--artifact-integration':
      case '-a':
        options.artifactIntegration = true;
        break;
      case '--enhanced':
      case '-e':
        options.enhanced = true;
        break;
      case '--matrix':
      case '-m':
        options.matrix = true;
        break;
      case '--docs':
      case '-d':
        options.docs = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--learn':
      case '-l':
        options.learn = true;
        break;
      case '--no-pty':
        options.noPty = true;
        break;
      case '--shell':
        options.shell = args[++i];
        break;
      case '--theme':
        options.theme = args[++i] as any;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * Validate CLI options
 */
function validateOptions(options: CLIOptions): void {
  if (options.noPty && options.interactive) {
    throw new Error('Cannot use --no-pty with --interactive mode');
  }
  
  if (options.theme && !['light', 'dark', 'retro'].includes(options.theme)) {
    throw new Error('Invalid theme. Use: light, dark, or retro');
  }
}

/**
 * Show help information
 */
function showHelp(): void {
  const artifactStatus = '✅'; // Will be replaced by feature('ARTIFACT_INTEGRATION') ? '✅' : '❌'
  const ptyStatus = '✅'; // Will be replaced by feature('TERMINAL_PTY') ? '✅' : '❌'
  
  console.log(`
🚀 DuoPlus CLI v3.0 - Enhanced with Artifact System Integration

USAGE:
  bun run cli.ts [OPTIONS] [COMMAND]

OPTIONS:
  -i, --interactive              Start interactive PTY shell
  -a, --artifact-integration     Enable artifact system features ${artifactStatus}
  --no-pty                       Disable PTY (fallback mode)
  --shell <shell>                Specify shell (default: $SHELL)
  --theme <theme>                Set theme: light, dark, retro
  -h, --help                     Show this help

FEATURE FLAGS:
  ${ptyStatus} TERMINAL_PTY        - PTY support for interactive shell
  ${artifactStatus} ARTIFACT_INTEGRATION - Artifact search and management
  ✅ PREMIUM               - Premium features enabled
  ✅ DEBUG                 - Debug mode enabled

COMMANDS:
  Interactive Mode (PTY ${ptyStatus}):
    help                    Show available commands
    shell                   Open interactive shell
    vim <file>              Edit file with vim
    search <options>        Search artifacts ${artifactStatus}
    find <options>          Find artifacts ${artifactStatus}
    tags                    Show tag statistics ${artifactStatus}
    validate <options>      Validate artifacts ${artifactStatus}
    audit <options>         Audit artifacts ${artifactStatus}
    visualize <options>     Generate visualizations ${artifactStatus}
    suggest <tag>           Suggest tags ${artifactStatus}
    artifacts               Show artifact statistics ${artifactStatus}
    matrix                  Show system matrix
    status                  Show system status
    clear                   Clear screen
    record <file>           Record session
    playback <file>         Playback recording
    theme <theme>           Set terminal theme
    exit                    Exit shell

  Non-Interactive Mode:
    --search <query>        Quick artifact search
    --validate              Quick validation check
    --stats                 Show system statistics

EXAMPLES:
  # Start interactive shell with artifacts
  bun run cli.ts --interactive --artifact-integration
  
  # Quick artifact search
  bun run cli.ts --search --tag "#typescript,#api"
  
  # Validate artifacts
  bun run cli.ts --validate --strict
  
  # Start with custom theme
  bun run cli.ts --interactive --theme retro
  
  # Non-PTY mode with artifacts
  bun run cli.ts --no-pty --artifact-integration

ARTIFACT SYSTEM COMMANDS ${artifactStatus}:
  search --tag "#typescript" --status "ready"
  find --domain "#security" --output json
  tags --show-stats
  validate --strict --use-registry
  audit --include-recommendations
  visualize --output all
  suggest "sec"
  artifacts --health

BUILD COMMANDS:
  bun build --feature=TERMINAL_PTY --feature=ARTIFACT_INTEGRATION cli.ts
  bun build --feature=PREMIUM --feature=DEBUG cli.ts

For more information, see: docs/CLI_GUIDE.md
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Default to artifact integration if feature flag is enabled
  if (true && !options.noPty) { // Will be replaced by feature('ARTIFACT_INTEGRATION')
    options.artifactIntegration = true;
  }
  
  // Show welcome banner
  console.log('🚀 DuoPlus CLI v3.0 - Enhanced with Artifact System');
  
  // Check feature flags
  const ptyAvailable = true; // Will be replaced by feature('TERMINAL_PTY')
  const artifactAvailable = true; // Will be replaced by feature('ARTIFACT_INTEGRATION')
  
  console.log(`   PTY Support: ${ptyAvailable ? '✅' : '❌'}`);
  console.log(`   Artifact Integration: ${artifactAvailable ? '✅' : '❌'}`);
  console.log(`   Build Features: ${getActiveFeatures()}\n`);
  
  // Route to appropriate mode
  if (ptyAvailable && !options.noPty && (options.interactive || args.length === 0)) {
    // Interactive PTY mode
    const shell = new DuoPlusTerminalShell({
      enablePty: true,
      theme: options.theme || 'dark',
      interactiveMode: true,
      artifactIntegration: options.artifactIntegration || false,
    });
    
    await shell.startInteractiveShell();
  } else {
    // Non-interactive or fallback mode
    await runNonInteractiveMode(args, options);
  }
}

/**
 * Run in non-interactive mode
 */
async function runNonInteractiveMode(args: string[], options: CLIOptions): Promise<void> {
  console.log('📟 DuoPlus CLI v4.0 - Enhanced Mode\n');
  
  // Route to enhanced CLI if enhanced features are requested
  if (options.enhanced || options.matrix || options.docs) {
    const enhancedCLI = new EnhancedCLI();
    
    // Convert CLI options to enhanced CLI arguments
    const enhancedArgs: string[] = [];
    
    if (options.matrix) {
      enhancedArgs.push('matrix');
    }
    
    if (options.docs) {
      enhancedArgs.push('docs');
    }
    
    // Add any remaining arguments
    enhancedArgs.push(...args.filter(arg => !arg.startsWith('--')));
    
    await enhancedCLI.run();
    return;
  }
  
  // Original artifact integration logic
  if (options.artifactIntegration) {
    await runArtifactCommands(args);
  } else {
    console.log('📋 Available Options:');
    console.log('   --enhanced, -e     : Enable enhanced CLI with matrix & docs');
    console.log('   --matrix, -m       : Show scope matrix');
    console.log('   --docs, -d         : Access documentation system');
    console.log('   --artifact-integration, -a : Enable artifact system');
    console.log('');
    console.log('💡 Try: --enhanced for full featured CLI');
  }
}

/**
 * Handle artifact system commands in non-interactive mode
 */
async function runArtifactCommands(args: string[]): Promise<void> {
  const shell = new DuoPlusTerminalShell({ artifactIntegration: true });
  
  if (args.includes('--search') || args.includes('-s')) {
    const searchArgs = args.filter(arg => arg !== '--search' && arg !== '-s');
    // Note: These methods need to be made public in DuoPlusTerminalShell
    console.log('Search functionality requires public method access in DuoPlusTerminalShell');
  } else if (args.includes('--validate') || args.includes('-v')) {
    const validateArgs = args.filter(arg => arg !== '--validate' && arg !== '-v');
    console.log('Validate functionality requires public method access in DuoPlusTerminalShell');
  } else if (args.includes('--stats')) {
    console.log('Stats functionality requires public method access in DuoPlusTerminalShell');
  } else if (args.includes('--help')) {
    showArtifactHelp();
  } else {
    console.log('ℹ️  No command specified');
    console.log('   Use --search, --validate, --stats, or --help');
  }
}

/**
 * Show artifact-specific help
 */
function showArtifactHelp(): void {
  console.log(`
🔍 Artifact System Commands:

SEARCH OPTIONS:
  --tag <tags>           Search by tags (comma-separated)
  --status <status>      Filter by status
  --domain <domain>      Filter by domain
  --output <format>      Output: table, json, csv, paths
  --fuzzy               Enable fuzzy matching
  --max-results <n>      Limit results

VALIDATION OPTIONS:
  --strict              Enable strict validation
  --fix                 Auto-fix common issues
  --use-registry        Use tag registry
  --check-relationships Validate tag relationships

EXAMPLES:
  bun run cli.ts --search --tag "#typescript,#api" --output json
  bun run cli.ts --validate --strict --use-registry
  bun run cli.ts --stats

For interactive mode, use: --interactive
`);
}

/**
 * Get active feature flags
 */
function getActiveFeatures(): string {
  const features = [];
  
  if (true) features.push('PREMIUM'); // Will be replaced by feature('PREMIUM')
  if (true) features.push('DEBUG'); // Will be replaced by feature('DEBUG')
  if (true) features.push('TERMINAL_PTY'); // Will be replaced by feature('TERMINAL_PTY')
  if (true) features.push('ARTIFACT_INTEGRATION'); // Will be replaced by feature('ARTIFACT_INTEGRATION')
  if (true) features.push('S3_UPLOAD'); // Will be replaced by feature('S3_UPLOAD')
  
  return features.length > 0 ? features.join(', ') : 'None';
}

// Error handling
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled error:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run main function
if (import.meta.main) {
  main().catch(console.error);
}

export { main, parseArgs, showHelp };
