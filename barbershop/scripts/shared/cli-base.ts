// scripts/cli-base.ts - Enhanced CLI Base Class
import { docRefs } from '../lib/utils/docs/references';
import { integratedSecretManager } from '../lib/secrets/core/integrated-secret-manager';

export abstract class CLIBase {
  protected styled(
    text: string,
    type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'
  ): string {
    const colors = {
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      info: '\x1b[36m',
      primary: '\x1b[34m',
      accent: '\x1b[35m',
      muted: '\x1b[90m',
    };
    const reset = '\x1b[0m';
    return `${colors[type]}${text}${reset}`;
  }

  protected showHelp(
    title: string,
    usage: string,
    options: Array<{ flag: string; description: string }>
  ): void {
    console.info(this.styled(title, 'primary'));
    console.info(this.styled('='.repeat(title.length), 'muted'));
    console.info();
    console.info(this.styled('Usage:', 'info'));
    console.info(`  ${usage}`);
    console.info();
    console.info(this.styled('Options:', 'info'));
    options.forEach(option => {
      console.info(`  ${option.flag.padEnd(20)} ${option.description}`);
    });
    console.info();
    this.showDocumentation();
  }

  protected showDocumentation(): void {
    console.info(this.styled('📚 Documentation:', 'accent'));
    console.info('  🔐 Bun Secrets: https://bun.sh/docs/runtime/secrets');
    console.info('  🏰 FactoryWager: https://docs.factory-wager.com/secrets');
    console.info();
  }

  protected async handleError(error: Error, context: string): Promise<void> {
    console.error(this.styled(`❌ ${context} failed: ${error.message}`, 'error'));

    // Show relevant documentation
    const secretsRef = { url: 'https://bun.sh/docs/runtime/secrets' }; // Simplified for now
    if (secretsRef && context.toLowerCase().includes('secret')) {
      console.info(this.styled(`📖 See: ${secretsRef.url}`, 'info'));
    }

    // Log error without circular dependency
    console.warn(`Error in ${context}: ${error.message}`);
  }

  protected async logOperation(
    operation: string,
    key: string,
    user: string = 'cli',
    metadata?: any
  ): Promise<void> {
    try {
      await integratedSecretManager.setSecret('system', 'operation-log', operation, user, {
        key,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
    } catch (error) {
      console.warn(this.styled(`⚠️  Failed to log operation: ${error.message}`, 'warning'));
    }
  }

  protected abstract run(args: string[]): Promise<void>;

  async execute(args: string[]): Promise<void> {
    try {
      await this.run(args);
    } catch (error) {
      await this.handleError(error as Error, this.constructor.name);
      process.exit(1);
    }
  }
}
