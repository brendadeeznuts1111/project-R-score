#!/usr/bin/env bun
/**
 * Editor Integration Script - Demonstrates Bun.openInEditor() functionality
 * Enhanced dependency management with editor integration
 */

import { parseArgs } from 'util';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
} as const;

function colorLog(color: keyof typeof colors, message: string) {
  console.info(`${colors[color]}${message}${colors.reset}`);
}

interface EditorOptions {
  editor?: string;
  line?: number;
  column?: number;
}

// Parse command line arguments
const { values: args, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    file: { type: 'string', short: 'f' },
    line: { type: 'string', short: 'l' },
    column: { type: 'string', short: 'c' },
    editor: { type: 'string', short: 'e' },
    help: { type: 'boolean', short: 'h' },
    list: { type: 'boolean' },
    errors: { type: 'boolean' },
    workspace: { type: 'string', short: 'w' },
  },
  allowPositionals: true,
});

function showHelp() {
  colorLog('blue', '📝 Fire22 Editor Integration Tool');
  console.info('!==!==!==!==!==!=====');
  console.info('');
  console.info('Usage: bun run editor [command] [options]');
  console.info('');
  console.info('Commands:');
  console.info('  open <file>           Open file in editor');
  console.info('  errors                Open files with TypeScript errors');
  console.info('  workspace <name>      Open workspace files');
  console.info('  config                Open configuration files');
  console.info('  scripts               Open script files');
  console.info('  list                  List common project files');
  console.info('');
  console.info('Options:');
  console.info('  -f, --file <path>     File to open');
  console.info('  -l, --line <number>   Line number to jump to');
  console.info('  -c, --column <number> Column number to jump to');
  console.info('  -e, --editor <editor> Editor to use (code, vscode, subl, vim)');
  console.info('  -w, --workspace <name> Workspace name');
  console.info('  --errors              Open files with TypeScript errors');
  console.info('  --list                List files');
  console.info('  -h, --help            Show this help');
  console.info('');
  console.info('Examples:');
  console.info('  bun run editor open package.json');
  console.info('  bun run editor open src/index.ts --line 10 --column 5');
  console.info('  bun run editor errors                    # Open files with TS errors');
  console.info('  bun run editor workspace api-client      # Open workspace files');
  console.info('  bun run editor config                    # Open config files');
  console.info('  bun run editor scripts                   # Open script directory');
}

async function openInEditor(filePath: string, options: EditorOptions = {}) {
  try {
    colorLog('green', `📂 Opening: ${filePath}`);

    if (options.line || options.column) {
      colorLog('cyan', `   Position: Line ${options.line || 1}, Column ${options.column || 1}`);
    }

    if (options.editor) {
      colorLog('blue', `   Editor: ${options.editor}`);
    }

    // Check if file exists
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      colorLog('red', `❌ File not found: ${filePath}`);
      return false;
    }

    // Open in editor with optional line/column
    Bun.openInEditor(filePath, {
      editor: options.editor,
      line: options.line,
      column: options.column,
    });

    colorLog('green', '✅ File opened in editor');
    return true;
  } catch (error) {
    colorLog('red', `❌ Error opening file: ${error}`);
    return false;
  }
}

async function listProjectFiles() {
  colorLog('blue', '📋 Common Project Files');
  console.info('!==!==!==!====');
  console.info('');

  const commonFiles = [
    // Configuration files
    { path: 'package.json', description: 'Package configuration' },
    { path: 'bunfig.toml', description: 'Bun configuration' },
    { path: 'tsconfig.json', description: 'TypeScript configuration' },
    { path: '.env', description: 'Environment variables' },
    { path: '.env.example', description: 'Environment template' },

    // Main source files
    { path: 'src/index.ts', description: 'Main entry point' },
    { path: 'src/config.ts', description: 'Application configuration' },
    { path: 'src/env.ts', description: 'Environment configuration' },

    // Documentation
    { path: 'README.md', description: 'Project documentation' },
    { path: 'DEPENDENCY-MANAGEMENT-ENHANCED.md', description: 'Dependency management guide' },
    { path: 'WORKSPACE-DEVELOPMENT-GUIDE.md', description: 'Workspace development guide' },

    // Scripts
    { path: 'scripts/analyze-deps.sh', description: 'Dependency analysis script' },
    { path: 'scripts/manage-package.sh', description: 'Package management script' },
    { path: 'scripts/editor-integration.ts', description: 'This editor integration script' },
  ];

  for (const file of commonFiles) {
    const exists = await Bun.file(file.path).exists();
    console.info(`  ${exists ? '✅' : '❓'} ${file.path.padEnd(40)} - ${file.description}`);
  }
}

async function openConfigFiles() {
  colorLog('blue', '⚙️ Opening Configuration Files');
  console.info('!==!==!==!==!==!==');
  console.info('');

  const configFiles = [
    'package.json',
    'bunfig.toml',
    'tsconfig.json',
    '.env.example',
    'lefthook.yml',
  ];

  for (const file of configFiles) {
    if (await Bun.file(file).exists()) {
      await openInEditor(file);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between opens
    }
  }
}

async function openScriptDirectory() {
  colorLog('blue', '📜 Opening Script Files');
  console.info('!==!==!==!====');
  console.info('');

  const scriptFiles = [
    'scripts/analyze-deps.sh',
    'scripts/manage-package.sh',
    'scripts/editor-integration.ts',
  ];

  for (const file of scriptFiles) {
    if (await Bun.file(file).exists()) {
      await openInEditor(file);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

async function openWorkspaceFiles(workspaceName: string) {
  colorLog('blue', `🏢 Opening Workspace: ${workspaceName}`);
  console.info('!==!==!==!==!==!==');
  console.info('');

  const workspacePath = `workspaces/@fire22-${workspaceName}`;
  const packageJsonPath = `${workspacePath}/package.json`;

  if (await Bun.file(packageJsonPath).exists()) {
    await openInEditor(packageJsonPath);

    // Try to open main source file
    const srcFiles = [
      `${workspacePath}/src/index.ts`,
      `${workspacePath}/src/main.ts`,
      `${workspacePath}/index.ts`,
    ];

    for (const srcFile of srcFiles) {
      if (await Bun.file(srcFile).exists()) {
        await openInEditor(srcFile);
        break;
      }
    }

    // Open README if exists
    const readmePath = `${workspacePath}/README.md`;
    if (await Bun.file(readmePath).exists()) {
      await openInEditor(readmePath);
    }
  } else {
    colorLog('red', `❌ Workspace not found: ${workspaceName}`);
    colorLog('yellow', '💡 Available workspaces:');

    // List available workspaces
    const workspaceDir = 'workspaces';
    try {
      const glob = new Bun.Glob('@fire22-*');
      const workspaces = Array.from(glob.scanSync({ cwd: workspaceDir }));

      workspaces.sort().forEach(ws => {
        console.info(`     → ${ws.replace('@fire22-', '')}`);
      });
    } catch (error) {
      colorLog('yellow', '   No workspaces found');
    }
  }
}

async function openFilesWithTypeScriptErrors() {
  colorLog('blue', '🔍 Finding TypeScript Errors...');
  console.info('!==!==!==!==!==!===');
  console.info('');

  try {
    // Run TypeScript compiler to get errors
    const proc = Bun.spawn(['bunx', '--package', 'typescript', 'tsc', '--noEmit'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stderr).text();

    if (!output.trim()) {
      colorLog('green', '✅ No TypeScript errors found!');
      return;
    }

    // Parse TypeScript errors to extract file paths and line numbers
    const errorLines = output.split('\n').filter(line => line.includes(': error TS'));
    const fileErrors: Map<string, { line: number; column: number }[]> = new Map();

    for (const errorLine of errorLines) {
      const match = errorLine.match(/^(.+?)\((\d+),(\d+)\): error TS\d+:/);
      if (match) {
        const [, filePath, lineStr, columnStr] = match;
        const line = parseInt(lineStr);
        const column = parseInt(columnStr);

        if (!fileErrors.has(filePath)) {
          fileErrors.set(filePath, []);
        }
        fileErrors.get(filePath)!.push({ line, column });
      }
    }

    if (fileErrors.size === 0) {
      colorLog('yellow', '⚠️ Found errors but could not parse file locations');
      console.info(output);
      return;
    }

    colorLog('red', `❌ Found TypeScript errors in ${fileErrors.size} files:`);
    console.info('');

    // Open each file with errors at the first error location
    for (const [filePath, errors] of fileErrors) {
      const firstError = errors[0];
      colorLog('cyan', `📂 ${filePath} (${errors.length} error${errors.length > 1 ? 's' : ''})`);

      await openInEditor(filePath, {
        line: firstError.line,
        column: firstError.column,
      });

      // Small delay between file opens
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    colorLog('red', `❌ Error running TypeScript check: ${error}`);
  }
}

async function main() {
  if (args.help) {
    showHelp();
    return;
  }

  const command = positionals[0];

  switch (command) {
    case 'open': {
      const filePath = args.file || positionals[1];
      if (!filePath) {
        colorLog('red', '❌ File path required');
        console.info(
          'Usage: bun run editor open <file> [--line <n>] [--column <n>] [--editor <editor>]'
        );
        process.exit(1);
      }

      const options: EditorOptions = {};
      if (args.line) options.line = parseInt(args.line);
      if (args.column) options.column = parseInt(args.column);
      if (args.editor) options.editor = args.editor;

      await openInEditor(filePath, options);
      break;
    }

    case 'list':
      await listProjectFiles();
      break;

    case 'config':
      await openConfigFiles();
      break;

    case 'scripts':
      await openScriptDirectory();
      break;

    case 'workspace': {
      const workspaceName = args.workspace || positionals[1];
      if (!workspaceName) {
        colorLog('red', '❌ Workspace name required');
        console.info('Usage: bun run editor workspace <workspace-name>');
        process.exit(1);
      }
      await openWorkspaceFiles(workspaceName);
      break;
    }

    case 'errors':
      await openFilesWithTypeScriptErrors();
      break;

    default:
      if (args.errors) {
        await openFilesWithTypeScriptErrors();
      } else if (args.list) {
        await listProjectFiles();
      } else {
        showHelp();
      }
      break;
  }
}

// Run the main function
main().catch(error => {
  colorLog('red', `❌ Unexpected error: ${error}`);
  process.exit(1);
});
