#!/usr/bin/env bun

/**
 * FactoryWager Docs CLI Tool
 *
 * Interactive documentation search and learning system powered by Bun MCP
 *
 * Usage:
 *   bun fw-docs search "Bun.secrets.get"
 *   bun fw-docs explain "some code snippet"
 *   bun fw-docs validate ./script.ts
 *   bun fw-docs learn --topic "Bun SQLite"
 *   bun fw-docs generate --api "Bun.file" --context "R2 upload"
 */

import { BunMCPClient } from '../lib/mcp/bun-mcp-client.ts';
import { styled, FW_COLORS, log, colorBar, createSpinner } from '../lib/theme/colors.ts';
import { masterTokenManager, DEFAULT_PERMISSIONS } from '../lib/security/master-token.ts';
import { mcpAuthMiddleware } from '../lib/mcp/auth-middleware.ts';
import { SecretManager } from '../lib/security/secrets-v5.ts';

const mcp = new BunMCPClient();

interface CLIOptions {
  version?: string;
  context?: string;
  generateExample?: boolean;
  codeOnly?: boolean;
  apiReferenceOnly?: boolean;
  token?: string;
  verbose?: boolean;
}

class FWDocsCLI {
  private async authenticate(token?: string): Promise<boolean> {
    const authToken = token || process.env.MASTER_TOKEN;

    if (!authToken) {
      console.info(
        styled(
          '🔒 Authentication required. Use --token or set MASTER_TOKEN environment variable.',
          'warning'
        )
      );
      console.info(
        styled('💡 Get a token: bun run lib/security/master-token.ts create cli:user', 'info')
      );
      return false;
    }

    const auth = await mcpAuthMiddleware.cliTools.authenticate(authToken, {
      ip: 'localhost',
      userAgent: 'fw-docs-cli',
    });

    if (!auth.success) {
      console.info(styled(`🔒 Authentication failed: ${auth.error}`, 'error'));
      return false;
    }

    console.info(styled(`✅ Authenticated (${auth.authContext.tokenId})`, 'success'));
    return true;
  }

  async run(): Promise<void> {
    const args = Bun.argv.slice(2);
    const command = args[0];
    const commandArgs = args.slice(1);

    try {
      await mcp.connect();

      switch (command) {
        case 'search':
          const searchOptions = this.parseOptions(commandArgs);
          if (!(await this.authenticate(searchOptions.token))) return;
          await this.handleSearch(commandArgs, searchOptions);
          break;

        case 'explain':
          await this.handleExplain(commandArgs);
          break;

        case 'validate':
          await this.handleValidate(commandArgs);
          break;

        case 'learn':
          await this.handleLearn(commandArgs);
          break;

        case 'generate':
          await this.handleGenerate(commandArgs);
          break;

        case 'diagnose':
          await this.handleDiagnose(commandArgs);
          break;

        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;

        default:
          if (!command) {
            this.showHelp();
          } else {
            console.info(styled(`❌ Unknown command: ${command}`, 'error'));
            console.info(styled('Use "fw-docs help" for available commands', 'muted'));
          }
      }
    } catch (error) {
      console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
      process.exit(1);
    } finally {
      await mcp.disconnect();
    }
  }

  private async handleSearch(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const query = args.find(arg => !arg.startsWith('--')) || '';

    if (!query) {
      console.info(styled('❌ Search query is required', 'error'));
      console.info(
        styled('Usage: fw-docs search "your query" [--version=v1.4] [--code-only]', 'muted')
      );
      return;
    }

    log.section('🔍 Searching Bun Documentation', 'primary');
    console.info(styled(`Query: ${query}`, 'accent'));

    if (options.verbose) {
      console.info(styled(`Options: ${JSON.stringify(options)}`, 'muted'));
    }

    const spinner = this.createSpinner();
    spinner.start();

    try {
      const results = await mcp.searchBunDocs(query, {
        version: options.version,
        codeOnly: options.codeOnly,
        apiReferenceOnly: options.apiReferenceOnly,
        context: options.context,
        generateExample: options.generateExample,
      });

      spinner.stop();

      if (results.length === 0) {
        console.info(styled('📭 No results found', 'warning'));
        console.info(styled('Try a different query or check your spelling', 'muted'));
        return;
      }

      console.info(styled(`\n📚 Found ${results.length} results:\n`, 'success'));

      results.forEach((result, index) => {
        const color = index === 0 ? 'accent' : 'primary';
        console.info(colorBar(color, 20));
        console.info(styled(`📖 ${result.title}`, color));

        if (result.relevance > 0.8) {
          console.info(
            styled(`   ⭐ High relevance (${Math.round(result.relevance * 100)}%)`, 'success')
          );
        }

        // Show content preview
        const preview = result.content.slice(0, 200).replace(/\n/g, ' ');
        console.info(styled(`   ${preview}...`, 'muted'));

        // Show links if available
        if (result.links.length > 0) {
          console.info(styled(`   🔗 ${result.links[0]}`, 'info'));
        }

        if (result.confidence) {
          console.info(
            styled(`   🎯 Confidence: ${Math.round(result.confidence * 100)}%`, 'muted')
          );
        }

        console.info('');
      });
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private async handleExplain(args: string[]): Promise<void> {
    const codeSnippet = args.find(arg => !arg.startsWith('--')) || '';
    const options = this.parseOptions(args);

    if (!codeSnippet) {
      console.info(styled('❌ Code snippet is required', 'error'));
      console.info(styled('Usage: fw-docs explain "your code" [--context=scanner]', 'muted'));
      return;
    }

    log.section('📚 Explaining Code', 'accent');
    console.info(styled('Code:', 'muted'));
    console.info(styled(codeSnippet, 'background', 'primary'));
    console.info('');

    const spinner = this.createSpinner();
    spinner.start();

    try {
      const explanations = await mcp.explainCode(codeSnippet, options.context);
      spinner.stop();

      if (explanations.length === 0) {
        console.info(styled('📭 No explanations found', 'warning'));
        return;
      }

      explanations.forEach((explanation, index) => {
        console.info(styled(`\n🔍 Explanation ${index + 1}:`, 'primary'));
        console.info(styled(explanation.content, 'muted'));

        if (explanation.links.length > 0) {
          console.info(styled('\n📚 Related Documentation:', 'info'));
          explanation.links.forEach(link => {
            console.info(styled(`   • ${link}`, 'info'));
          });
        }
      });
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private async handleValidate(args: string[]): Promise<void> {
    const filePath = args.find(arg => !arg.startsWith('--')) || '';

    if (!filePath) {
      console.info(styled('❌ File path is required', 'error'));
      console.info(styled('Usage: fw-docs validate ./script.ts', 'muted'));
      return;
    }

    try {
      const code = await Bun.file(filePath).text();

      log.section('🔍 Validating Code', 'warning');
      console.info(styled(`File: ${filePath}`, 'muted'));

      const spinner = this.createSpinner();
      spinner.start();

      const validation = await mcp.validateCode(code);
      spinner.stop();

      if (validation.valid) {
        console.info(styled('✅ Code validation passed', 'success'));
        if (validation.suggestions) {
          console.info(styled('\n💡 Suggestions:', 'info'));
          validation.suggestions.forEach((suggestion: string) => {
            console.info(styled(`   • ${suggestion}`, 'info'));
          });
        }
      } else {
        console.info(styled('❌ Code validation failed', 'error'));
        if (validation.errors) {
          console.info(styled('\n🚨 Errors:', 'error'));
          validation.errors.forEach((error: string) => {
            console.info(styled(`   • ${error}`, 'error'));
          });
        }
      }
    } catch (error) {
      if (error.message.includes('No such file')) {
        console.info(styled(`❌ File not found: ${filePath}`, 'error'));
      } else {
        throw error;
      }
    }
  }

  private async handleLearn(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const topic = options.topic || args.find(arg => !arg.startsWith('--'));

    if (!topic) {
      console.info(styled('❌ Topic is required', 'error'));
      console.info(
        styled('Usage: fw-docs learn --topic "Bun SQLite" [--generate-examples]', 'muted')
      );
      return;
    }

    log.section('🎓 Interactive Learning', 'success');
    console.info(styled(`Topic: ${topic}`, 'accent'));

    // Search for comprehensive documentation
    const spinner = this.createSpinner();
    spinner.start();

    try {
      const docsResults = await mcp.searchBunDocs(topic, {
        generateExample: true,
        context: 'learning',
      });

      const examples = await mcp.generateFactoryWagerExample(topic, 'learning');

      spinner.stop();

      // Display documentation
      console.info(styled('\n📚 Official Documentation:', 'primary'));
      docsResults.slice(0, 3).forEach((doc, index) => {
        console.info(styled(`\n${index + 1}. ${doc.title}`, 'accent'));
        console.info(styled(doc.content.slice(0, 300) + '...', 'muted'));
      });

      // Display FactoryWager example
      console.info(styled('\n🔧 FactoryWager Example:', 'success'));
      console.info(styled(examples, 'background', 'primary'));

      // Learning tips
      console.info(styled('\n💡 Learning Tips:', 'info'));
      console.info(styled('   • Try the examples in your own code', 'muted'));
      console.info(styled('   • Experiment with different options', 'muted'));
      console.info(styled('   • Check the official docs for complete reference', 'muted'));
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private async handleGenerate(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const api = options.api || args.find(arg => !arg.startsWith('--'));

    if (!api) {
      console.info(styled('❌ API name is required', 'error'));
      console.info(styled('Usage: fw-docs generate --api "Bun.file" [--context=R2]', 'muted'));
      return;
    }

    log.section('🔧 Generating FactoryWager Example', 'success');
    console.info(styled(`API: ${api}`, 'accent'));
    if (options.context) {
      console.info(styled(`Context: ${options.context}`, 'muted'));
    }

    const spinner = this.createSpinner();
    spinner.start();

    try {
      const example = await mcp.generateFactoryWagerExample(api, options.context);
      spinner.stop();

      console.info(styled('\n🎯 Generated Code:', 'success'));
      console.info(styled(example, 'background', 'primary'));

      console.info(styled('\n📚 Usage Notes:', 'info'));
      console.info(styled('   • This code follows FactoryWager patterns', 'muted'));
      console.info(styled('   • Includes security best practices', 'muted'));
      console.info(styled('   • Optimized for performance', 'muted'));
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private async handleDiagnose(args: string[]): Promise<void> {
    const filePath = args.find(arg => !arg.startsWith('--'));

    if (!filePath) {
      console.info(styled('❌ File path is required', 'error'));
      console.info(styled('Usage: fw-docs diagnose ./problematic-script.ts', 'muted'));
      return;
    }

    log.section('🔍 Error Diagnosis', 'warning');
    console.info(styled(`Analyzing: ${filePath}`, 'muted'));

    try {
      const code = await Bun.file(filePath).text();

      // This would integrate with the interactive docs workflow
      console.info(styled('🔧 Diagnosis feature coming soon!', 'accent'));
      console.info(styled('This will analyze errors and suggest fixes based on Bun docs', 'muted'));
    } catch (error) {
      if (error.message.includes('No such file')) {
        console.info(styled(`❌ File not found: ${filePath}`, 'error'));
      } else {
        throw error;
      }
    }
  }

  private parseOptions(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    args.forEach(arg => {
      if (arg.startsWith('--version=')) {
        options.version = arg.split('=')[1];
      } else if (arg.startsWith('--context=')) {
        options.context = arg.split('=')[1];
      } else if (arg.startsWith('--api=')) {
        options.api = arg.split('=')[1];
      } else if (arg.startsWith('--topic=')) {
        options.topic = arg.split('=')[1];
      } else if (arg === '--generate-example') {
        options.generateExample = true;
      } else if (arg === '--code-only') {
        options.codeOnly = true;
      } else if (arg === '--api-reference-only') {
        options.apiReferenceOnly = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      }
    });

    return options;
  }

  private createSpinner() {
    let interval: NodeJS.Timeout;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    return {
      start: () => {
        interval = setInterval(() => {
          process.stdout.write(`\r${styled(frames[i], 'info')} Searching...`);
          i = (i + 1) % frames.length;
        }, 100);
      },
      stop: () => {
        if (interval) {
          clearInterval(interval);
          process.stdout.write('\r' + ' '.repeat(30) + '\r');
        }
      },
    };
  }

  private showHelp(): void {
    console.info(styled('\n🚀 FactoryWager Docs CLI v5.0', 'accent'));
    console.info(colorBar('primary', 40));

    console.info(styled('\n📚 Commands:', 'primary'));
    console.info(
      styled('  search <query>      ', 'muted') + styled('Search Bun documentation', 'text')
    );
    console.info(
      styled('  explain <code>      ', 'muted') + styled('Explain code snippets', 'text')
    );
    console.info(
      styled('  validate <file>      ', 'muted') +
        styled('Validate code against best practices', 'text')
    );
    console.info(
      styled('  learn --topic=<topic>', 'muted') + styled('Interactive learning mode', 'text')
    );
    console.info(
      styled('  generate --api=<api> ', 'muted') + styled('Generate FactoryWager examples', 'text')
    );
    console.info(
      styled('  diagnose <file>      ', 'muted') + styled('Diagnose errors in files', 'text')
    );

    console.info(styled('\n⚙️  Options:', 'accent'));
    console.info(
      styled('  --version=<ver>      ', 'muted') + styled('Specify Bun version', 'text')
    );
    console.info(
      styled('  --context=<ctx>      ', 'muted') + styled('Set context (scanner, r2, etc.)', 'text')
    );
    console.info(
      styled('  --generate-example   ', 'muted') + styled('Include code examples', 'text')
    );
    console.info(
      styled('  --code-only          ', 'muted') + styled('Search code examples only', 'text')
    );
    console.info(styled('  --verbose, -v        ', 'muted') + styled('Verbose output', 'text'));

    console.info(styled('\n💡 Examples:', 'success'));
    console.info(styled('  fw-docs search "Bun.secrets.get"', 'info'));
    console.info(styled('  fw-docs explain "await Bun.file(\'test.txt\')"', 'info'));
    console.info(styled('  fw-docs learn --topic "Bun SQLite"', 'info'));
    console.info(styled('  fw-docs generate --api "Bun.serve" --context=scanner', 'info'));

    console.info(styled('\n🔗 Powered by Bun MCP integration', 'muted'));
  }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
  const cli = new FWDocsCLI();
  await cli.run();
}
