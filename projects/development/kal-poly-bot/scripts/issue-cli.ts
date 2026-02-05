// scripts/issue-cli.ts - Surgical Precision Issue CLI
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { IssueManager } from '../surgical-precision-mcp/issue-manager.ts';

// CLI Configuration
const CLI_CONFIG = {
  VERSION: '1.0.0',
  NAME: 'issue-cli',
  DESCRIPTION: 'Surgical Precision Issue Management System',
  DATA_DIR: 'data/issues',
  COMMANDS: {
    CREATE: 'create',
    LIST: 'list',
    SHOW: 'show',
    UPDATE: 'update',
    CLOSE: 'close',
    DELETE: 'delete',
    SEARCH: 'search',
    STATS: 'stats',
    HELP: 'help'
  },
  COLORS: {
    RESET: '\x1b[0m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m'
  }
};

// CLI Output Utilities
class CLILogger {
  static colorize(color: string, text: string): string {
    return `${color}${text}${CLI_CONFIG.COLORS.RESET}`;
  }

  static success(message: string): void {
    console.log(this.colorize(CLI_CONFIG.COLORS.GREEN, `✅ ${message}`));
  }

  static error(message: string): void {
    console.error(this.colorize(CLI_CONFIG.COLORS.RED, `❌ ${message}`));
  }

  static warning(message: string): void {
    console.warn(this.colorize(CLI_CONFIG.COLORS.YELLOW, `⚠️ ${message}`));
  }

  static info(message: string): void {
    console.log(this.colorize(CLI_CONFIG.COLORS.BLUE, `ℹ️ ${message}`));
  }

  static banner(): void {
    console.log(this.colorize(CLI_CONFIG.COLORS.MAGENTA, '╔════════════════════════════════════════════════════════════════════════════════╗'));
    console.log(this.colorize(CLI_CONFIG.COLORS.MAGENTA, '║                    SURGICAL PRECISION ISSUE CLI                           ║'));
    console.log(this.colorize(CLI_CONFIG.COLORS.MAGENTA, '║               Enterprise Issue Management System                          ║'));
    console.log(this.colorize(CLI_CONFIG.COLORS.MAGENTA, '╚════════════════════════════════════════════════════════════════════════════════╝'));
  }
}

// CLI Argument Parser
interface CLIArgs {
  command: string;
  options: Record<string, string | boolean>;
  args: string[];
}

class CLIArgumentParser {
  static parse(args: string[]): CLIArgs {
    const parsed: CLIArgs = {
      command: CLI_CONFIG.COMMANDS.HELP,
      options: {},
      args: []
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Long option - handle both --option=value and --option value
        const optionPart = arg.slice(2);
        const equalsIndex = optionPart.indexOf('=');

        if (equalsIndex !== -1) {
          // --option=value format
          const option = optionPart.slice(0, equalsIndex);
          const value = optionPart.slice(equalsIndex + 1);
          parsed.options[option] = value;
        } else {
          // --option value format
          if (args[i + 1] && !args[i + 1].startsWith('-')) {
            parsed.options[optionPart] = args[i + 1];
            i++; // Skip next arg as it's the value
          } else {
            parsed.options[optionPart] = true;
          }
        }
      } else if (arg.startsWith('-')) {
        // Short option
        const option = arg.slice(1);
        if (args[i + 1] && !args[i + 1].startsWith('-')) {
          parsed.options[option] = args[i + 1];
          i++; // Skip next arg as it's the value
        } else {
          parsed.options[option] = true;
        }
      } else if (!parsed.command || parsed.command === CLI_CONFIG.COMMANDS.HELP) {
        // First non-option argument is the command
        parsed.command = arg;
      } else {
        // Additional arguments
        parsed.args.push(arg);
      }
    }

    return parsed;
  }
}

// Issue CLI Commands
class IssueCLICommands {
  private static manager: IssueManager;

  static async initialize(): Promise<void> {
    if (!this.manager) {
      this.manager = new IssueManager(CLI_CONFIG.DATA_DIR);
      await this.manager.initialize();
    }
  }

  static async create(args: CLIArgs): Promise<void> {
    await this.initialize();

    const title = args.args[0];
    if (!title) {
      CLILogger.error('Title is required for issue creation');
      console.log('Usage: issue-cli create "Issue Title" [--type=bug|feature|task] [--priority=low|medium|high]');
      return;
    }

    const type = (args.options.type as string) || 'bug';
    const priority = (args.options.priority as string) || 'medium';
    const description = (args.options.description as string) || '';

    try {
      const issue = await this.manager.createIssue({
        title,
        description,
        type: type as any,
        priority: priority as any
      });

      CLILogger.success(`Issue ${issue.id} created successfully!`);
      console.log(`Title: ${issue.title}`);
      console.log(`Type: ${issue.type} | Priority: ${issue.priority}`);
      console.log(`Status: ${issue.status}`);

    } catch (error) {
      CLILogger.error(`Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async list(args: CLIArgs): Promise<void> {
    await this.initialize();

    const status = (args.options.status as string) || 'all';
    const type = args.options.type as string;
    const assignee = args.options.assignee as string;

    try {
      const issues = await this.manager.listIssues({ status, type, assignee });

      if (issues.length === 0) {
        CLILogger.info(`No issues found${status !== 'all' ? ` with status: ${status}` : ''}`);
        return;
      }

      console.log(`\nFound ${issues.length} issue(s):\n`);

      issues.forEach((issue, index) => {
        const statusColor = this.getStatusColor(issue.status);
        const priorityColor = this.getPriorityColor(issue.priority);

        console.log(`${String(index + 1).padStart(2)}. ${CLILogger.colorize(statusColor, issue.status.padEnd(8))} ${issue.id}`);
        console.log(`    ${CLILogger.colorize(priorityColor, issue.priority.padEnd(6))} ${issue.title}`);
        if (issue.assignee) {
          console.log(`    👤 ${issue.assignee}`);
        }
        console.log('');
      });

    } catch (error) {
      CLILogger.error(`Failed to list issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async show(args: CLIArgs): Promise<void> {
    await this.initialize();

    const issueId = args.args[0];
    if (!issueId) {
      CLILogger.error('Issue ID is required');
      console.log('Usage: issue-cli show SP-2024-001');
      return;
    }

    try {
      const issue = await this.manager.getIssue(issueId);

      console.log(`\n${CLILogger.colorize(CLI_CONFIG.COLORS.CYAN, 'Issue Details')}`);
      console.log('━'.repeat(50));
      console.log(`ID: ${issue.id}`);
      console.log(`Title: ${issue.title}`);
      console.log(`Type: ${issue.type}`);
      console.log(`Status: ${this.getStatusColor(issue.status)}${issue.status}${CLI_CONFIG.COLORS.RESET}`);
      console.log(`Priority: ${this.getPriorityColor(issue.priority)}${issue.priority}${CLI_CONFIG.COLORS.RESET}`);
      if (issue.assignee) console.log(`Assignee: ${issue.assignee}`);
      if (issue.description) console.log(`Description: ${issue.description}`);
      console.log(`Created: ${issue.created.toISOString()}`);
      console.log(`Updated: ${issue.updated.toISOString()}`);
      if (issue.closed) console.log(`Closed: ${issue.closed.toISOString()}`);

    } catch (error) {
      CLILogger.error(`Failed to show issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async update(args: CLIArgs): Promise<void> {
    await this.initialize();

    const issueId = args.args[0];
    if (!issueId) {
      CLILogger.error('Issue ID is required');
      console.log('Usage: issue-cli update SP-2024-001 --status=in-progress --assignee=alice');
      return;
    }

    try {
      const updates: any = {};

      if (args.options.status) updates.status = args.options.status;
      if (args.options.priority) updates.priority = args.options.priority;
      if (args.options.assignee) updates.assignee = args.options.assignee;
      if (args.options.title) updates.title = args.options.title;

      const issue = await this.manager.updateIssue(issueId, updates);

      CLILogger.success(`Issue ${issueId} updated successfully!`);
      console.log(`Status: ${issue.status}`);
      if (issue.assignee) console.log(`Assignee: ${issue.assignee}`);

    } catch (error) {
      CLILogger.error(`Failed to update issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async close(args: CLIArgs): Promise<void> {
    await this.initialize();

    const issueId = args.args[0];
    if (!issueId) {
      CLILogger.error('Issue ID is required');
      console.log('Usage: issue-cli close SP-2024-001 [--reason="Fixed in PR #123"]');
      return;
    }

    try {
      const reason = (args.options.reason as string) || '';
      const issue = await this.manager.closeIssue(issueId, reason);

      CLILogger.success(`Issue ${issueId} closed successfully!`);

    } catch (error) {
      CLILogger.error(`Failed to close issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async search(args: CLIArgs): Promise<void> {
    await this.initialize();

    const query = args.args[0] || args.options.query as string;
    if (!query) {
      CLILogger.error('Search query is required');
      console.log('Usage: issue-cli search "bug fix" [--status=open]');
      return;
    }

    try {
      const issues = await this.manager.searchIssues(query, {
        status: args.options.status as string,
        type: args.options.type as string
      });

      if (issues.length === 0) {
        CLILogger.info(`No issues found matching: "${query}"`);
        return;
      }

      console.log(`\nFound ${issues.length} issue(s) matching "${query}":\n`);

      issues.forEach((issue, index) => {
        console.log(`${String(index + 1).padStart(2)}. ${issue.id} - ${issue.title}`);
      });

    } catch (error) {
      CLILogger.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async stats(args: CLIArgs): Promise<void> {
    await this.initialize();

    try {
      const stats = await this.manager.getStats();

      console.log(`\n${CLILogger.colorize(CLI_CONFIG.COLORS.CYAN, 'Issue Statistics')}`);
      console.log('━'.repeat(30));
      console.log(`Total Issues: ${stats.total}`);
      console.log(`Open Issues: ${stats.open}`);
      console.log(`Closed Issues: ${stats.closed}`);
      console.log(`Average Resolution Time: ${stats.avgResolutionTime}ms`);

      if (stats.byStatus && Object.keys(stats.byStatus).length > 0) {
        console.log('\nBy Status:');
        Object.entries(stats.byStatus).forEach(([status, count]) => {
          console.log(`  ${status}: ${count}`);
        });
      }

      if (stats.byPriority && Object.keys(stats.byPriority).length > 0) {
        console.log('\nBy Priority:');
        Object.entries(stats.byPriority).forEach(([priority, count]) => {
          const color = this.getPriorityColor(priority as any);
          console.log(`  ${CLILogger.colorize(color, priority)}: ${count}`);
        });
      }

    } catch (error) {
      CLILogger.error(`Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static help(): void {
    CLILogger.banner();
    console.log('');
    console.log(CLI_CONFIG.DESCRIPTION);
    console.log('');
    console.log('📋 Commands:');
    console.log('  create <title>              Create a new issue');
    console.log('  list                        List all issues');
    console.log('  show <id>                   Show issue details');
    console.log('  update <id>                 Update issue properties');
    console.log('  close <id>                  Close an issue');
    console.log('  search <query>              Search issues by title/content');
    console.log('  stats                       Show issue statistics');
    console.log('  help                        Show this help message');
    console.log('');
    console.log('🔧 Options:');
    console.log('  --type=bug|feature|task     Issue type');
    console.log('  --status=open|closed        Issue status');
    console.log('  --priority=low|medium|high  Issue priority');
    console.log('  --assignee=<name>           Assign to user');
    console.log('');
    console.log('📖 Examples:');
    console.log('  issue-cli create "Fix memory leak" --type=bug --priority=high');
    console.log('  issue-cli list --status=open --type=bug');
    console.log('  issue-cli update SP-2024-001 --status=in-progress --assignee=alice');
    console.log('  issue-cli search "authentication" --status=open');
    console.log('  issue-cli close SP-2024-001 --reason="Fixed in PR #123"');
  }

  private static getStatusColor(status: string): string {
    switch (status) {
      case 'open': return CLI_CONFIG.COLORS.GREEN;
      case 'in-progress': return CLI_CONFIG.COLORS.YELLOW;
      case 'review': return CLI_CONFIG.COLORS.BLUE;
      case 'closed': return CLI_CONFIG.COLORS.RED;
      default: return CLI_CONFIG.COLORS.RESET;
    }
  }

  private static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low': return CLI_CONFIG.COLORS.BLUE;
      case 'medium': return CLI_CONFIG.COLORS.YELLOW;
      case 'high': return CLI_CONFIG.COLORS.RED;
      case 'critical': return CLI_CONFIG.COLORS.MAGENTA;
      default: return CLI_CONFIG.COLORS.RESET;
    }
  }
}

// Main CLI Entry Point
class IssueCLI {
  static async execute(): Promise<void> {
    const args = CLIArgumentParser.parse(process.argv.slice(2));

    switch (args.command) {
      case CLI_CONFIG.COMMANDS.CREATE:
        await IssueCLICommands.create(args);
        break;

      case CLI_CONFIG.COMMANDS.LIST:
        await IssueCLICommands.list(args);
        break;

      case CLI_CONFIG.COMMANDS.SHOW:
        await IssueCLICommands.show(args);
        break;

      case CLI_CONFIG.COMMANDS.UPDATE:
        await IssueCLICommands.update(args);
        break;

      case CLI_CONFIG.COMMANDS.CLOSE:
        await IssueCLICommands.close(args);
        break;

      case CLI_CONFIG.COMMANDS.SEARCH:
        await IssueCLICommands.search(args);
        break;

      case CLI_CONFIG.COMMANDS.STATS:
        await IssueCLICommands.stats(args);
        break;

      case CLI_CONFIG.COMMANDS.HELP:
      default:
        IssueCLICommands.help();
        break;
    }
  }
}

// Execute CLI if called directly
if (import.meta.main) {
  IssueCLI.execute().catch(error => {
    console.error('Fatal CLI error:', error);
    process.exit(1);
  });
}

export { IssueCLI, IssueCLICommands };