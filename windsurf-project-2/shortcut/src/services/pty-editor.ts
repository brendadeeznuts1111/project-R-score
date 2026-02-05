import { TomlSecretsEditor, SecurityValidator } from './toml-editor';

export class PTYTomlEditor {
  private editor: TomlSecretsEditor;
  private currentContent: string = '';
  private isActive: boolean = false;

  constructor(private filePath: string) {
    this.editor = new TomlSecretsEditor(filePath);
  }

  async startInteractiveSession(): Promise<void> {
    if (!Bun.feature('INTERACTIVE')) {
      throw new Error('Interactive mode requires --feature INTERACTIVE');
    }

    // Load initial content
    try {
      this.currentContent = await Bun.file(this.filePath).text();
    } catch (error) {
      console.error(`❌ Failed to load file: ${error.message}`);
      return;
    }

    this.isActive = true;
    this.showWelcomeScreen();

    // Simple interactive loop
    while (this.isActive) {
      const input = await this.prompt('> ');
      await this.handleCommand(input.trim());
    }
  }

  private showWelcomeScreen(): void {
    console.clear();
    console.log('\x1b[1;36m🔐 TOML Secrets Editor - Interactive Mode\x1b[0m');
    console.log('\x1b[90m' + '─'.repeat(process.stdout.columns || 80) + '\x1b[0m');
    console.log(`\x1b[33mFile:\x1b[0m ${this.filePath}`);
    console.log(`\x1b[33mSize:\x1b[0m ${this.currentContent.length} bytes`);
    console.log('');
    console.log('\x1b[32mCurrent Content:\x1b[0m');
    console.log('\x1b[90m' + '─'.repeat(process.stdout.columns || 80) + '\x1b[0m');
    console.log(this.currentContent);
    console.log('\x1b[90m' + '─'.repeat(process.stdout.columns || 80) + '\x1b[0m');
    console.log('');
    this.showCommands();
  }

  private showCommands(): void {
    console.log('\x1b[33mAvailable Commands:\x1b[0m');
    console.log('  \x1b[32m:validate\x1b[0m     - Run security validation');
    console.log('  \x1b[32m:optimize\x1b[0m     - Optimize and minify');
    console.log('  \x1b[32m:edit <key>=<value>\x1b[0m - Edit a value');
    console.log('  \x1b[32m:save\x1b[0m         - Write changes to file');
    console.log('  \x1b[32m:reload\x1b[0m       - Reload from disk');
    console.log('  \x1b[32m:patterns\x1b[0m     - Show URL patterns');
    console.log('  \x1b[32m:help\x1b[0m         - Show this help');
    console.log('  \x1b[32m:quit\x1b[0m         - Exit editor');
    console.log('');
  }

  private async handleCommand(command: string): Promise<void> {
    if (!command) return;

    if (command.startsWith(':')) {
      const [cmd, ...args] = command.slice(1).split(' ');
      
      switch (cmd.toLowerCase()) {
        case 'validate':
          await this.handleValidate();
          break;
        case 'optimize':
          await this.handleOptimize();
          break;
        case 'edit':
          await this.handleEdit(args.join(' '));
          break;
        case 'save':
          await this.handleSave();
          break;
        case 'reload':
          await this.handleReload();
          break;
        case 'patterns':
          await this.handlePatterns();
          break;
        case 'help':
          this.showCommands();
          break;
        case 'quit':
        case 'exit':
          this.handleQuit();
          break;
        default:
          console.log(`\x1b[31mUnknown command: ${cmd}\x1b[0m`);
          break;
      }
    } else {
      // Treat as TOML content edit
      console.log('\x1b[33mDirect editing not implemented. Use :edit <key>=<value>\x1b[0m');
    }
  }

  private async handleValidate(): Promise<void> {
    console.log('\x1b[36m🔍 Validating TOML...\x1b[0m');
    
    try {
      const { parse } = await import('bun:toml');
      const parsed = parse(this.currentContent);
      const validator = new SecurityValidator();
      
      const secrets = this.extractSecretsFromObject(parsed);
      const result = validator.validateSecrets(secrets);
      
      if (result.valid) {
        console.log(`\x1b[32m✅ Validation passed!\x1b[0m`);
        console.log(`\x1b[32m📊 Security Score: ${result.score}\x1b[0m`);
        console.log(`\x1b[32m🔐 Variables found: ${result.variables.length}\x1b[0m`);
      } else {
        console.log(`\x1b[31m❌ Validation failed:\x1b[0m`);
        result.errors.forEach(error => 
          console.log(`  \x1b[31m• ${error}\x1b[0m`)
        );
      }
      
      if (result.variables.length > 0) {
        console.log(`\n\x1b[33mVariables:\x1b[0m`);
        result.variables.forEach(variable => {
          const icon = variable.isDangerous ? '⚠️' : '✅';
          const classification = variable.classification.toUpperCase();
          console.log(`  ${icon} ${variable.name} (${classification})`);
        });
      }
    } catch (error) {
      console.log(\`\x1b[31m❌ Parse error: \${error.message}\x1b[0m\`);
    }
    
    console.log('');
  }

  private async handleOptimize(): Promise<void> {
    console.log('\x1b[36m⚡ Optimizing TOML...\x1b[0m');
    
    try {
      const { TomlOptimizer } = await import('./toml-editor');
      const optimizer = new TomlOptimizer();
      
      const result = await optimizer.optimize(this.currentContent);
      
      console.log(\`\x1b[32m✅ Optimization complete!\x1b[0m\`);
      console.log(\`\x1b[32m📏 Size reduction: \${result.sizeReduction} bytes\x1b[0m\`);
      console.log(\`\x1b[32m🗜️ Compression ratio: \${(result.compressionRatio * 100).toFixed(1)}%\x1b[0m\`);
      
      console.log(\`\n\x1b[33mTransformations:\x1b[0m\`);
      result.metrics.forEach(metric => {
        const durationMs = metric.durationNs / 1_000_000;
        console.log(\`  • \${metric.rule}: \${durationMs.toFixed(2)}ms, -\${metric.bytesReduced} bytes\`);
      });
      
      // Show preview
      console.log(\`\n\x1b[33mOptimized preview (first 10 lines):\x1b[0m\`);
      const preview = result.optimized.split('\n').slice(0, 10).join('\n');
      console.log(\`\x1b[90m\${preview}\x1b[0m\`);
      
      if (result.optimized.split('\n').length > 10) {
        console.log(\`\x1b[90m... (\${result.optimized.split('\n').length - 10} more lines)\x1b[0m\`);
      }
      
      // Ask if user wants to apply
      const apply = await this.prompt('Apply optimization? (y/N): ');
      if (apply.toLowerCase() === 'y') {
        this.currentContent = result.optimized;
        console.log('\x1b[32m✅ Optimization applied\x1b[0m');
      } else {
        console.log('\x1b[33m⚠️ Optimization cancelled\x1b[0m');
      }
    } catch (error) {
      console.log(\`\x1b[31m❌ Optimization failed: \${error.message}\x1b[0m\`);
    }
    
    console.log('');
  }

  private async handleEdit(editCommand: string): Promise<void> {
    if (!editCommand.includes('=')) {
      console.log('\x1b[31m❌ Invalid edit format. Use: :edit <key>=<value>\x1b[0m');
      return;
    }

    const [key, value] = editCommand.split('=', 2);
    
    console.log(\`\x1b[36m📝 Editing \${key} = \${value}\x1b[0m\`);
    
    try {
      const { parse, stringify } = await import('bun:toml');
      const parsed = parse(this.currentContent);
      
      // Set nested value
      this.setNestedValue(parsed, key, value);
      
      // Update content
      this.currentContent = stringify(parsed);
      
      console.log('\x1b[32m✅ Edit applied\x1b[0m');
      console.log('\x1b[33mUse :save to write to file\x1b[0m');
    } catch (error) {
      console.log(\`\x1b[31m❌ Edit failed: \${error.message}\x1b[0m\`);
    }
    
    console.log('');
  }

  private async handleSave(): Promise<void> {
    console.log('\x1b[36m💾 Saving to file...\x1b[0m');
    
    try {
      await Bun.write(this.filePath, this.currentContent);
      console.log(\`\x1b[32m✅ Saved \${this.currentContent.length} bytes to \${this.filePath}\x1b[0m\`);
    } catch (error) {
      console.log(\`\x1b[31m❌ Save failed: \${error.message}\x1b[0m\`);
    }
    
    console.log('');
  }

  private async handleReload(): Promise<void> {
    console.log('\x1b[36m🔄 Reloading from disk...\x1b[0m');
    
    try {
      this.currentContent = await Bun.file(this.filePath).text();
      console.log(\`\x1b[32m✅ Reloaded \${this.currentContent.length} bytes\x1b[0m\`);
    } catch (error) {
      console.log(\`\x1b[31m❌ Reload failed: \${error.message}\x1b[0m\`);
    }
    
    console.log('');
  }

  private async handlePatterns(): Promise<void> {
    console.log('\x1b[36m🔍 Analyzing URL patterns...\x1b[0m');
    
    try {
      const { URLPatternExtractor } = await import('../integrations/pattern-extractor');
      const extractor = new URLPatternExtractor();
      
      const result = extractor.extractAndAnalyze(this.currentContent, this.filePath);
      
      console.log(\`\x1b[32mFound \${result.patterns.length} URL patterns\x1b[0m\`);
      
      if (result.patterns.length > 0) {
        console.log(\`\n\x1b[33mPatterns:\x1b[0m\`);
        result.patterns.forEach(pattern => {
          const dynamic = pattern.isDynamic ? '\🔄' : '📋';
          console.log(\`  \${dynamic} \${pattern.keyPath}: \${pattern.pattern}\`);
          if (pattern.envVars.length > 0) {
            console.log(\`    Variables: \${pattern.envVars.join(', ')}\`);
          }
        });
      }
      
      if (result.securityIssues.length > 0) {
        console.log(\`\n\x1b[31m⚠️ Security Issues:\x1b[0m\`);
        result.securityIssues.forEach(issue => {
          console.log(\`  • \${issue.description} (\${issue.severity})\`);
        });
      }
      
      if (result.recommendations.length > 0) {
        console.log(\`\n\x1b[33m💡 Recommendations:\x1b[0m\`);
        result.recommendations.forEach(rec => {
          console.log(\`  • \${rec}\`);
        });
      }
    } catch (error) {
      console.log(\`\x1b[31m❌ Pattern analysis failed: \${error.message}\x1b[0m\`);
    }
    
    console.log('');
  }

  private handleQuit(): void {
    console.log('\x1b[36m👋 Goodbye!\x1b[0m');
    this.isActive = false;
  }

  private setNestedValue(obj: any, path: string, value: string): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Try to parse as JSON, fallback to string
    try {
      current[keys[keys.length - 1]] = JSON.parse(value);
    } catch {
      current[keys[keys.length - 1]] = value;
    }
  }

  private extractSecretsFromObject(obj: any, path = ''): string[] {
    const secrets: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? \`\${path}.\${key}\` : key;
      
      if (typeof value === 'string' && value.includes('\${')) {
        secrets.push(value);
      } else if (typeof value === 'object' && value !== null) {
        secrets.push(...this.extractSecretsFromObject(value, currentPath));
      }
    }
    
    return secrets;
  }

  private async prompt(question: string): Promise<string> {
    // Simple prompt implementation
    process.stdout.write(question);
    
    return new Promise((resolve) => {
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let input = '';
      
      const onData = (chunk: string) => {
        if (chunk === '\r' || chunk === '\n') {
          process.stdin.setRawMode?.(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log('');
          resolve(input);
        } else if (chunk === '\u0003') { // Ctrl+C
          process.stdin.setRawMode?.(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log('^C');
          resolve('');
        } else if (chunk === '\u007F') { // Backspace
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        } else if (chunk.length === 1) {
          input += chunk;
          process.stdout.write(chunk);
        }
      };
      
      process.stdin.on('data', onData);
    });
  }
}
