// ╭─────────────────────────────────────────────────────────────────╮
// │                    🐚 SHELL PATTERN WEAVER                      │
// │         Integrating Bun Shell & bunx into Patterns             │
// ╰─────────────────────────────────────────────────────────────────╯

import { $ } from "bun";
import { patternWeaver } from './pattern-weaver';

/**
 * Shell Pattern Weaver - Extends the pattern system with 
 * Bun Shell and bunx capabilities for command execution
 */
export class ShellPatternWeaver {
  // ╭─────────────────────────────────────────────────────────────╮
  // │                  Shell Pattern Types                        │
  // ╰─────────────────────────────────────────────────────────────╯
  
  readonly shellPatterns = {
    // 🐚 Shell Command Pattern
    SHELL: {
      name: "shell",
      description: "Execute shell commands with Bun Shell",
      bunFeatures: ["Bun.$", "template literals", "piping"],
      applies: ["commands", "scripts", "automation"]
    },
    
    // 📦 Package Execution Pattern
    BUNX: {
      name: "bunx",
      description: "Execute packages without installation",
      bunFeatures: ["bunx", "--bun flag", "version pinning"],
      applies: ["tools", "cli", "packages"]
    },
    
    // 🔄 Pipeline Pattern
    PIPELINE: {
      name: "pipeline",
      description: "Chain commands together",
      bunFeatures: ["pipe", "stdout/stderr", "streaming"],
      applies: ["data-processing", "transformations"]
    },
    
    // 📝 Script Pattern
    SCRIPT: {
      name: "script",
      description: "Run .sh scripts directly",
      bunFeatures: ["bun run", ".sh loader", "shell scripts"],
      applies: ["*.sh", "automation", "deployment"]
    },
    
    // 🎯 Template Pattern
    TEMPLATE: {
      name: "template",
      description: "Template literal shell commands",
      bunFeatures: ["$`command`", "interpolation", "safety"],
      applies: ["dynamic-commands", "variable-substitution"]
    },
    
    // 🔀 Parallel Pattern
    PARALLEL: {
      name: "parallel",
      description: "Run commands in parallel",
      bunFeatures: ["Promise.all", "concurrent execution"],
      applies: ["multi-task", "performance", "batch-processing"]
    },
    
    // 🎯 Interactive Pattern
    INTERACTIVE: {
      name: "interactive",
      description: "Interactive CLI with console AsyncIterable",
      bunFeatures: ["console AsyncIterable", "stdin reading", "prompts"],
      applies: ["cli", "interactive", "user-input"]
    },
    
    // 🌊 Stream Pattern
    STREAM: {
      name: "stream",
      description: "Stream processing with Bun.stdin",
      bunFeatures: ["Bun.stdin.stream()", "chunk processing", "piping"],
      applies: ["pipes", "streaming", "large-data"]
    },
    
    // 📁 File System Pattern
    FILESYSTEM: {
      name: "filesystem",
      description: "File system operations with Bun.file",
      bunFeatures: ["Bun.file()", "file.exists()", "file validation"],
      applies: ["files", "validation", "existence-check"]
    }
  };
  
  // ╭─────────────────────────────────────────────────────────────╮
  // │                    Shell Execution                          │
  // ╰─────────────────────────────────────────────────────────────╯
  
  /**
   * Security validation for shell commands
   */
  private validateCommand(command: string): { safe: boolean; reason?: string } {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf\s*\//, // rm -rf /
      /sudo\s+rm/, // sudo rm
      />\s*\/dev\/null\s*2>&1\s*&/, // background processes
      /;\s*(rm|del|format|fdisk)/, // command chaining with dangerous commands
      /\|\s*(rm|del|format)/, // piping to dangerous commands
      /--upload-pack=/, // git argument injection
      /--exec=/, // argument injection
      /bash\s+-c\s+"[^"]*[;&|]/, // bash -c with command injection
      /sh\s+-c\s+"[^"]*[;&|]/, // sh -c with command injection
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: `Command blocked due to potentially dangerous pattern: ${pattern.source}`
        };
      }
    }
    
    return { safe: true };
  }

  /**
   * Execute a shell command with timing and output capture (with security validation)
   */
  async executeShell(command: string, options?: ShellOptions): Promise<ShellResult> {
    // Security validation
    const validation = this.validateCommand(command);
    if (!validation.safe) {
      return {
        success: false,
        stdout: '',
        stderr: `Security Error: ${validation.reason}`,
        exitCode: -1,
        duration: '0ms',
        command,
        error: validation.reason
      };
    }
    
    const start = Bun.nanoseconds();
    
    try {
      // Execute with Bun Shell
      const result = await $`${command}`.quiet();
      
      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000;
      
      return {
        success: true,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode,
        duration: `${duration.toFixed(3)}ms`,
        command
      };
    } catch (error: any) {
      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000;
      
      return {
        success: false,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        exitCode: error.exitCode || 1,
        duration: `${duration.toFixed(3)}ms`,
        command,
        error: error.message
      };
    }
  }
  
  /**
   * Sanitize package name and arguments to prevent injection
   */
  private sanitizePackageInput(packageName: string, args: string[] = []): { safe: boolean; reason?: string; sanitized?: { packageName: string; args: string[] } } {
    // Validate package name - should only contain valid npm package characters
    const validPackagePattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
    
    if (!validPackagePattern.test(packageName)) {
      return {
        safe: false,
        reason: `Invalid package name format: ${packageName}`
      };
    }
    
    // Sanitize arguments - remove potentially dangerous flags
    const dangerousArgs = ['--exec', '--upload-pack', '--receive-pack', '--config'];
    const sanitizedArgs = args.filter(arg => {
      return !dangerousArgs.some(dangerous => arg.startsWith(dangerous));
    });
    
    if (sanitizedArgs.length !== args.length) {
      return {
        safe: false,
        reason: 'Dangerous arguments detected and filtered'
      };
    }
    
    return {
      safe: true,
      sanitized: { packageName, args: sanitizedArgs }
    };
  }

  /**
   * Execute a package with bunx (with security validation)
   */
  async executeBunx(
    packageName: string,
    args: string[] = [],
    options?: BunxOptions
  ): Promise<ShellResult> {
    // Sanitize inputs
    const sanitization = this.sanitizePackageInput(packageName, args);
    if (!sanitization.safe) {
      return {
        success: false,
        stdout: '',
        stderr: `Security Error: ${sanitization.reason}`,
        exitCode: -1,
        duration: '0ms',
        command: `bunx ${packageName}`,
        error: sanitization.reason
      };
    }
    
    const { packageName: safePackage, args: safeArgs } = sanitization.sanitized!;
    const version = options?.version ? `@${options.version}` : '';
    const bunFlag = options?.useBun ? '--bun' : '';
    const command = `bunx ${bunFlag} ${safePackage}${version} ${safeArgs.join(' ')}`;
    
    return await this.executeShell(command, options);
  }
  
  // ╭─────────────────────────────────────────────────────────────╮
  // │                  Advanced Shell Patterns                    │
  // ╰─────────────────────────────────────────────────────────────╯
  
  /**
   * Create a command pipeline
   */
  async pipeline(...commands: string[]): Promise<PipelineResult> {
    const results: ShellResult[] = [];
    let input = '';
    
    const start = Bun.nanoseconds();
    
    for (const command of commands) {
      const result = await this.executeShell(
        input ? `echo "${input}" | ${command}` : command
      );
      results.push(result);
      
      if (!result.success) {
        break;
      }
      
      input = result.stdout;
    }
    
    const end = Bun.nanoseconds();
    const totalDuration = (end - start) / 1_000_000;
    
    return {
      results,
      finalOutput: input,
      totalDuration: `${totalDuration.toFixed(3)}ms`,
      success: results.every(r => r.success)
    };
  }
  
  /**
   * Run commands in parallel
   */
  async parallel(...commands: string[]): Promise<ParallelResult> {
    const start = Bun.nanoseconds();
    
    const promises = commands.map(cmd => this.executeShell(cmd));
    const results = await Promise.all(promises);
    
    const end = Bun.nanoseconds();
    const totalDuration = (end - start) / 1_000_000;
    
    return {
      results,
      totalDuration: `${totalDuration.toFixed(3)}ms`,
      success: results.every(r => r.success),
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }
  
  /**
   * Execute a template command with variables
   */
  async template(
    template: string,
    variables: Record<string, string | number>
  ): Promise<ShellResult> {
    // Replace variables in template
    let command = template;
    for (const [key, value] of Object.entries(variables)) {
      command = command.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }
    
    return await this.executeShell(command);
  }
  
  /**
   * File system operations using Bun.file()
   */
  async fileExists(path: string): Promise<boolean> {
    return await Bun.file(path).exists();
  }
  
  async validateFiles(paths: string[]): Promise<FileValidationResult> {
    const start = Bun.nanoseconds();
    const results: FileInfo[] = [];
    
    for (const path of paths) {
      const file = Bun.file(path);
      const exists = await file.exists();
      
      results.push({
        path,
        exists,
        size: exists ? file.size : 0,
        type: exists ? file.type : '',
        readable: exists,
        lastModified: exists ? file.lastModified : 0
      });
    }
    
    const end = Bun.nanoseconds();
    const duration = (end - start) / 1_000_000;
    
    return {
      files: results,
      totalFiles: results.length,
      existingFiles: results.filter(f => f.exists).length,
      missingFiles: results.filter(f => !f.exists).map(f => f.path),
      totalSize: results.reduce((sum, f) => sum + f.size, 0),
      validationTime: `${duration.toFixed(3)}ms`
    };
  }
  
  async getFileInfo(path: string): Promise<FileInfo | null> {
    const file = Bun.file(path);
    const exists = await file.exists();
    
    if (!exists) {
      return null;
    }
    
    return {
      path,
      exists: true,
      size: file.size,
      type: file.type,
      readable: true,
      lastModified: file.lastModified,
      name: file.name || path.split('/').pop() || '',
      extension: path.split('.').pop()?.toLowerCase() || ''
    };
  }
  
  /**
   * Interactive CLI session using console AsyncIterable
   */
  async interactive(options?: InteractiveOptions): Promise<InteractiveResult> {
    const { 
      prompt = "$ ", 
      welcomeMessage, 
      exitCommand = "exit",
      processor,
      validator
    } = options || {};
    
    const start = Bun.nanoseconds();
    const results: any[] = [];
    
    // Display welcome message
    if (welcomeMessage) {
    }
    
    process.stdout.write(prompt);
    
    try {
      for await (const line of console) {
        const input = line.trim();
        
        // Check for exit command
        if (input.toLowerCase() === exitCommand.toLowerCase()) {
          break;
        }
        
        // Skip empty input
        if (!input) {
          process.stdout.write(prompt);
          continue;
        }
        
        // Validate input if validator provided
        if (validator && !validator(input)) {
          process.stdout.write(prompt);
          continue;
        }
        
        const timestamp = Date.now();
        let result;
        
        // Process input
        if (processor) {
          try {
            result = await processor(input);
          } catch (error: any) {
            result = { error: error.message };
          }
        } else {
          // Default: execute as shell command
          result = await this.executeShell(input);
        }
        
        results.push({
          input,
          result,
          timestamp,
          success: !result.error
        });
        
        // Display result
        if (result.error) {
        } else if (result.stdout) {
        } else if (typeof result === 'string') {
        } else if (typeof result === 'object') {
        }
        
        process.stdout.write(prompt);
      }
    } catch (error: any) {
      console.error(`Interactive session error: ${error.message}`);
    }
    
    const end = Bun.nanoseconds();
    const duration = (end - start) / 1_000_000;
    
    return {
      results,
      totalCommands: results.length,
      successCount: results.filter(r => r.success).length,
      duration: `${duration.toFixed(3)}ms`,
      success: true
    };
  }
  
  /**
   * Stream processing with Bun.stdin
   */
  async streamProcess(options?: StreamProcessOptions): Promise<StreamResult> {
    const { 
      processor, 
      encoding = 'utf8', 
      bufferLimit = 50 * 1024 * 1024, // 50MB default
      chunkProcessor 
    } = options || {};
    
    const start = Bun.nanoseconds();
    const chunks: any[] = [];
    let totalSize = 0;
    let processedData: any[] = [];
    
    try {
      
      for await (const chunk of Bun.stdin.stream()) {
        const chunkText = Buffer.from(chunk).toString(encoding);
        totalSize += chunk.length;
        
        // Check buffer limit
        if (totalSize > bufferLimit) {
          console.warn(`⚠️  Buffer limit (${bufferLimit} bytes) exceeded, stopping`);
          break;
        }
        
        const chunkData = {
          index: chunks.length,
          text: chunkText,
          size: chunk.length,
          timestamp: Date.now()
        };
        
        // Process individual chunk if processor provided
        if (chunkProcessor) {
          try {
            chunkData.processed = await chunkProcessor(chunkText, chunk, chunks.length);
          } catch (error: any) {
            chunkData.error = error.message;
          }
        }
        
        chunks.push(chunkData);
        
        // Real-time output for debugging
        if (chunkText.trim()) {
        }
      }
      
      // Final processing of all chunks
      if (processor) {
        const allText = chunks.map(c => c.text).join('');
        processedData = await processor(allText, chunks);
      }
      
      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000;
      
      return {
        chunks,
        processedData,
        totalChunks: chunks.length,
        totalSize,
        averageChunkSize: Math.round(totalSize / (chunks.length || 1)),
        processingTime: `${duration.toFixed(3)}ms`,
        success: true
      };
      
    } catch (error: any) {
      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000;
      
      return {
        chunks,
        processedData,
        totalChunks: chunks.length,
        totalSize,
        averageChunkSize: Math.round(totalSize / (chunks.length || 1)),
        processingTime: `${duration.toFixed(3)}ms`,
        success: false,
        error: error.message
      };
    }
  }
  
  // ╭─────────────────────────────────────────────────────────────╮
  // │                    Pattern Integration                      │
  // ╰─────────────────────────────────────────────────────────────╯
  
  /**
   * Common shell command patterns
   */
  readonly commandPatterns = {
    // Git patterns
    git: {
      status: async () => await this.executeShell('git status --short'),
      branch: async () => await this.executeShell('git branch --show-current'),
      commit: async (message: string) => 
        await this.executeShell(`git commit -m "${message}"`),
      push: async () => await this.executeShell('git push'),
      pull: async () => await this.executeShell('git pull'),
      diff: async () => await this.executeShell('git diff'),
      log: async (limit = 10) => 
        await this.executeShell(`git log --oneline -${limit}`)
    },
    
    // File system patterns
    fs: {
      list: async (path = '.') => await this.executeShell(`ls -la ${path}`),
      find: async (pattern: string) => 
        await this.executeShell(`find . -name "${pattern}"`),
      grep: async (pattern: string, path = '.') =>
        await this.executeShell(`grep -r "${pattern}" ${path}`),
      tree: async (path = '.') => await this.executeShell(`tree ${path}`),
      size: async (path = '.') => await this.executeShell(`du -sh ${path}`),
      
      // Bun.file() based operations
      exists: async (path: string) => await this.fileExists(path),
      info: async (path: string) => await this.getFileInfo(path),
      validate: async (paths: string[]) => await this.validateFiles(paths),
      
      // Batch file operations
      batchExists: async (paths: string[]) => {
        const results = await Promise.all(
          paths.map(async (path) => ({
            path,
            exists: await this.fileExists(path)
          }))
        );
        return {
          results,
          existCount: results.filter(r => r.exists).length,
          missingCount: results.filter(r => !r.exists).length,
          missingFiles: results.filter(r => !r.exists).map(r => r.path)
        };
      }
    },
    
    // Process patterns
    process: {
      list: async () => await this.executeShell('ps aux'),
      kill: async (pid: number) => await this.executeShell(`kill ${pid}`),
      top: async () => await this.executeShell('top -n 1'),
      ports: async () => await this.executeShell('netstat -tuln'),
      env: async () => await this.executeShell('env')
    },
    
    // Network patterns
    network: {
      ping: async (host: string) => await this.executeShell(`ping -c 4 ${host}`),
      curl: async (url: string) => await this.executeShell(`curl -s ${url}`),
      wget: async (url: string) => await this.executeShell(`wget -q -O - ${url}`),
      dns: async (domain: string) => await this.executeShell(`nslookup ${domain}`),
      trace: async (host: string) => await this.executeShell(`traceroute ${host}`)
    }
  };
  
  /**
   * Common bunx package patterns
   */
  readonly packagePatterns = {
    // Development tools
    dev: {
      prettier: async (files: string) =>
        await this.executeBunx('prettier', ['--write', files]),
      
      eslint: async (files: string) =>
        await this.executeBunx('eslint', ['--fix', files]),
      
      typescript: async (version?: string) =>
        await this.executeBunx('typescript', ['--version'], { version }),
      
      nodemon: async (script: string) =>
        await this.executeBunx('nodemon', [script], { useBun: true }),
      
      concurrently: async (commands: string[]) =>
        await this.executeBunx('concurrently', commands.map(c => `"${c}"`))
    },
    
    // Build tools
    build: {
      webpack: async (config?: string) =>
        await this.executeBunx('webpack', config ? ['--config', config] : []),
      
      rollup: async (config?: string) =>
        await this.executeBunx('rollup', config ? ['-c', config] : []),
      
      esbuild: async (entry: string, outfile: string) =>
        await this.executeBunx('esbuild', [entry, '--bundle', `--outfile=${outfile}`]),
      
      vite: async (command = 'build') =>
        await this.executeBunx('vite', [command])
    },
    
    // Testing tools
    test: {
      jest: async (config?: string) =>
        await this.executeBunx('jest', config ? ['--config', config] : []),
      
      vitest: async () =>
        await this.executeBunx('vitest', ['run']),
      
      playwright: async (command = 'test') =>
        await this.executeBunx('@playwright/test', [command]),
      
      cypress: async (command = 'run') =>
        await this.executeBunx('cypress', [command])
    },
    
    // Utility tools
    util: {
      'http-server': async (port = 8080) =>
        await this.executeBunx('http-server', ['-p', String(port)]),
      
      'json-server': async (file: string, port = 3000) =>
        await this.executeBunx('json-server', [file, '--port', String(port)]),
      
      ngrok: async (port: number) =>
        await this.executeBunx('ngrok', ['http', String(port)]),
      
      'npm-check-updates': async () =>
        await this.executeBunx('npm-check-updates', ['-u'])
    }
  };
  
  // ╭─────────────────────────────────────────────────────────────╮
  // │                    Workflow Patterns                        │
  // ╰─────────────────────────────────────────────────────────────╯
  
  /**
   * Pre-defined workflow patterns
   */
  readonly workflows = {
    // Development workflow
    development: async () => {
      
      const steps = [
        { name: "Install dependencies", command: "bun install" },
        { name: "Type check", command: "bunx typescript --noEmit" },
        { name: "Lint", command: "bunx eslint . --fix" },
        { name: "Format", command: "bunx prettier --write ." },
        { name: "Test", command: "bun test" },
        { name: "Start dev server", command: "bun run dev" }
      ];
      
      for (const step of steps) {
        const result = await this.executeShell(step.command);
        
        if (!result.success) {
          console.error(`❌ Failed: ${result.error}`);
          return false;
        }
        
      }
      
      return true;
    },
    
    // Build workflow
    build: async () => {
      const results = await this.parallel(
        "bun run lint",
        "bun run test",
        "bun run type-check"
      );
      
      if (results.success) {
        return await this.executeShell("bun run build");
      }
      
      return results;
    },
    
    // Deployment workflow
    deploy: async (environment: 'staging' | 'production') => {
      const pipeline = await this.pipeline(
        "git pull",
        "bun install",
        "bun run build",
        `bun run deploy:${environment}`,
        "echo 'Deployment complete!'"
      );
      
      return pipeline;
    },
    
    // Release workflow
    release: async (type: 'patch' | 'minor' | 'major') => {
      const commands = [
        "git status",
        "bun test",
        `bun version ${type}`,
        "git add .",
        `git commit -m "Release: ${type} version"`,
        "git push",
        "bun publish"
      ];
      
      const results = [];
      for (const cmd of commands) {
        const result = await this.executeShell(cmd);
        results.push(result);
        
        if (!result.success) break;
      }
      
      return results;
    },
    
    // Interactive CLI workflow
    interactiveCLI: async () => {
      
      const shellWeaver = new ShellPatternWeaver();
      
      return await shellWeaver.interactive({
        welcomeMessage: "🔥 Fire22 Dashboard CLI\nType commands or 'help' for assistance, 'exit' to quit",
        prompt: "fire22$ ",
        processor: async (input: string) => {
          if (input === 'help') {
            return [
              "Available commands:",
              "  status     - Show system status",  
              "  customers  - List customers",
              "  wagers     - Show live wagers",
              "  build      - Build the project", 
              "  deploy     - Deploy to production",
              "  git <cmd>  - Git commands",
              "  bun <cmd>  - Bun commands",
              "  exit       - Exit CLI"
            ].join('\n');
          }
          
          if (input.startsWith('git ')) {
            const gitCmd = input.substring(4);
            return await shellWeaver.commandPatterns.git[gitCmd as keyof typeof shellWeaver.commandPatterns.git]?.();
          }
          
          if (input.startsWith('bun ')) {
            const bunCmd = input.substring(4);
            return await shellWeaver.executeShell(`bun ${bunCmd}`);
          }
          
          // Execute as shell command
          return await shellWeaver.executeShell(input);
        },
        validator: (input: string) => {
          // Enhanced security validation including argument injection
          if (input.includes('--upload-pack=') || input.includes('--exec=')) {
            return false; // Block git argument injection
          }
          if (input.includes('bash -c') || input.includes('sh -c')) {
            return false; // Block shell spawning
          }
          const dangerous = ['rm -rf', 'sudo rm', 'format', 'del'];
          return !dangerous.some(cmd => input.toLowerCase().includes(cmd));
        }
      });
    },
    
    // Stream processing workflow
    streamProcessor: async () => {
      
      const shellWeaver = new ShellPatternWeaver();
      
      return await shellWeaver.streamProcess({
        processor: async (allText: string, chunks: any[]) => {
          // Process the accumulated text
          const lines = allText.split('\n').filter(line => line.trim());
          const processed = [];
          
          for (const line of lines) {
            if (line.startsWith('{') && line.endsWith('}')) {
              try {
                // Parse JSON lines
                const parsed = JSON.parse(line);
                processed.push({ type: 'json', data: parsed });
              } catch {
                processed.push({ type: 'text', data: line });
              }
            } else if (line.includes('ERROR')) {
              processed.push({ type: 'error', data: line, severity: 'high' });
            } else if (line.includes('WARN')) {
              processed.push({ type: 'warning', data: line, severity: 'medium' });
            } else {
              processed.push({ type: 'info', data: line, severity: 'low' });
            }
          }
          
          // Display processed summary
          const summary = {
            totalLines: lines.length,
            jsonLines: processed.filter(p => p.type === 'json').length,
            errors: processed.filter(p => p.type === 'error').length,
            warnings: processed.filter(p => p.type === 'warning').length
          };
          
          
          return processed;
        },
        chunkProcessor: (chunkText: string) => {
          // Real-time chunk processing
          return {
            wordCount: chunkText.split(/\s+/).length,
            hasJSON: chunkText.includes('{') && chunkText.includes('}'),
            hasErrors: chunkText.toLowerCase().includes('error')
          };
        },
        encoding: 'utf8',
        bufferLimit: 10 * 1024 * 1024 // 10MB limit
      });
    },
    
    // File system validation workflow
    validateProject: async () => {
      
      const shellWeaver = new ShellPatternWeaver();
      
      // Define critical project files
      const criticalFiles = [
        'package.json',
        'bunfig.toml',
        'src/index.ts',
        'src/patterns/pattern-weaver.ts',
        'src/patterns/shell-weaver.ts',
        'src/patterns/pattern-connector.ts',
        'src/patterns/index.ts',
        'dashboard.html',
        'schema.sql'
      ];
      
      // Validate all files
      const validation = await shellWeaver.validateFiles(criticalFiles);
      
      // Display results in table format with property filtering
      
      // Full table
        validation.files.map(f => ({
          File: f.path.split('/').pop() || f.path,
          Path: f.path,
          Status: f.exists ? '✅ Exists' : '❌ Missing',
          Size: f.exists ? `${(f.size / 1024).toFixed(1)}KB` : 'N/A',
          Type: f.type || 'Unknown',
          LastModified: f.exists ? new Date(f.lastModified).toISOString().split('T')[0] : 'N/A'
        })),
        ['File', 'Status', 'Size', 'Type'], // Only show essential columns
        { colors: true }
      ));
      
      // Summary table
      const statusSummary = [
        {
          Status: '✅ Existing',
          Count: validation.existingFiles,
          TotalSize: `${(validation.totalSize / 1024).toFixed(1)}KB`
        },
        {
          Status: '❌ Missing',
          Count: validation.missingFiles.length,
          TotalSize: 'N/A'
        }
      ];
      
      // Summary
      
      if (validation.missingFiles.length > 0) {
      }
      
      return validation;
    },
    
    // File system monitoring workflow
    monitorFiles: async (watchPaths: string[] = ['src/', 'docs/', 'package.json']) => {
      
      const shellWeaver = new ShellPatternWeaver();
      
      // Initial baseline
      let lastCheck = await shellWeaver.validateFiles(watchPaths);
      
      // Monitor for changes (simulated - in real implementation would use file watchers)
      const monitorInterval = setInterval(async () => {
        const currentCheck = await shellWeaver.validateFiles(watchPaths);
        
        // Compare with last check
        const changes = [];
        
        for (let i = 0; i < currentCheck.files.length; i++) {
          const current = currentCheck.files[i];
          const previous = lastCheck.files[i];
          
          if (current.exists !== previous.exists) {
            changes.push({
              path: current.path,
              change: current.exists ? 'created' : 'deleted',
              timestamp: new Date().toISOString()
            });
          } else if (current.exists && current.size !== previous.size) {
            changes.push({
              path: current.path,
              change: 'modified',
              sizeDiff: current.size - previous.size,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        if (changes.length > 0) {
            changes,
            ['path', 'change', 'timestamp'], // Show only essential change info
            { colors: true }
          ));
        }
        
        lastCheck = currentCheck;
      }, 5000); // Check every 5 seconds
      
      // Stop monitoring after 60 seconds (demo)
      setTimeout(() => {
        clearInterval(monitorInterval);
      }, 60000);
      
      return { monitoring: true, interval: monitorInterval };
    }
  };
  
  /**
   * Display shell pattern capabilities
   */
  displayCapabilities(): void {
    
    // Shell patterns
    const shellTable = Object.entries(this.shellPatterns).map(([key, pattern]) => ({
      Pattern: key,
      Name: pattern.name,
      Features: pattern.bunFeatures.join(', '),
      AppliesTo: pattern.applies.join(', ')
    }));
      shellTable, 
      ['Pattern', 'Name', 'Features'], // Show only key info
      { colors: true }
    ));
    
    // Command patterns
    const commandCategories = Object.keys(this.commandPatterns);
      commandCategories.map(cat => ({
        Category: cat.toUpperCase(),
        Commands: Object.keys((this.commandPatterns as any)[cat]).join(', '),
        Count: Object.keys((this.commandPatterns as any)[cat]).length
      })),
      ['Category', 'Count', 'Commands'], // Show count first, then commands
      { colors: true }
    ));
    
    // Package patterns
    const packageCategories = Object.keys(this.packagePatterns);
      packageCategories.map(cat => ({
        Category: cat.charAt(0).toUpperCase() + cat.slice(1),
        Count: Object.keys((this.packagePatterns as any)[cat]).length,
        Packages: Object.keys((this.packagePatterns as any)[cat]).join(', ')
      })),
      ['Category', 'Count', 'Packages'], // Consistent with command categories
      { colors: true }
    ));
  }
}

// ╭─────────────────────────────────────────────────────────────────╮
// │                      Type Definitions                          │
// ╰─────────────────────────────────────────────────────────────────╯

interface ShellOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  quiet?: boolean;
}

interface BunxOptions extends ShellOptions {
  version?: string;
  useBun?: boolean;
}

interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: string;
  command: string;
  error?: string;
}

interface PipelineResult {
  results: ShellResult[];
  finalOutput: string;
  totalDuration: string;
  success: boolean;
}

interface ParallelResult {
  results: ShellResult[];
  totalDuration: string;
  success: boolean;
  successCount: number;
  failureCount: number;
}

interface InteractiveOptions {
  prompt?: string;
  welcomeMessage?: string;
  exitCommand?: string;
  processor?: (input: string) => any | Promise<any>;
  validator?: (input: string) => boolean;
}

interface InteractiveResult {
  results: any[];
  totalCommands: number;
  successCount: number;
  duration: string;
  success: boolean;
}

interface StreamProcessOptions {
  processor?: (allText: string, chunks: any[]) => any | Promise<any>;
  chunkProcessor?: (chunkText: string, chunk: Uint8Array, index: number) => any | Promise<any>;
  encoding?: BufferEncoding;
  bufferLimit?: number;
}

interface StreamResult {
  chunks: any[];
  processedData?: any[];
  totalChunks: number;
  totalSize: number;
  averageChunkSize: number;
  processingTime: string;
  success: boolean;
  error?: string;
}

interface FileInfo {
  path: string;
  exists: boolean;
  size: number;
  type: string;
  readable: boolean;
  lastModified: number;
  name?: string;
  extension?: string;
}

interface FileValidationResult {
  files: FileInfo[];
  totalFiles: number;
  existingFiles: number;
  missingFiles: string[];
  totalSize: number;
  validationTime: string;
}

// ╭─────────────────────────────────────────────────────────────────╮
// │                        Exports                                │
// ╰─────────────────────────────────────────────────────────────────╯

export const shellWeaver = new ShellPatternWeaver();
export default shellWeaver;