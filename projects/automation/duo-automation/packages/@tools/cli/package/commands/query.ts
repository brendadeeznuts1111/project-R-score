import { Command } from 'commander';
import { spawn } from 'child_process';
import { join } from 'path';

export const queryCommand = new Command('query')
  .description('R2 Pattern Query Operations')
  .option('-p, --prefix <prefix>', 'Filter by prefix', 'apple-ids/')
  .option('-l, --limit <limit>', 'Limit number of results', '1000')
  .option('-f, --format <format>', 'Output format (table, csv, json)', 'table')
  .option('-b, --bucket <bucket>', 'R2 bucket name')
  .option('-s, --since <since>', 'Filter by modification date (since)')
  .option('-u, --until <until>', 'Filter by modification date (until)')
  .option('--min-size <size>', 'Minimum file size in bytes')
  .option('--max-size <size>', 'Maximum file size in bytes')
  .option('--pattern <index>', 'Filter by pattern index', '-1')
  .argument('[filters...]', 'Additional filters (key=value)')
  .action((filters, options) => {
    const scriptPath = join(process.cwd(), 'scripts/query/query-r2-pattern.ts');
    const args = [scriptPath];

    if (options.prefix) args.push(`--prefix=${options.prefix}`);
    if (options.limit) args.push(`--limit=${options.limit}`);
    if (options.format) args.push(`--format=${options.format}`);
    if (options.bucket) args.push(`--bucket=${options.bucket}`);
    if (options.since) args.push(`--since=${options.since}`);
    if (options.until) args.push(`--until=${options.until}`);
    if (options.minSize) args.push(`--min-size=${options.minSize}`);
    if (options.maxSize) args.push(`--max-size=${options.maxSize}`);
    if (options.pattern) args.push(`--pattern=${options.pattern}`);
    
    if (filters && filters.length > 0) {
      args.push(...filters);
    }

    const proc = spawn('bun', args, { stdio: 'inherit' });
    proc.on('exit', (code) => process.exit(code || 0));
  });
