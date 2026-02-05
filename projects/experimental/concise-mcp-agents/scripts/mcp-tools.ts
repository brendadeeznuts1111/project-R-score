#!/usr/bin/env bun

// [MCP][TOOLS][LIST][FULL][MCP-LIST-001][v2.8][ACTIVE]

// [DATAPIPE][CORE][DA-CO-278][v2.8.0][ACTIVE]

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

interface MCPTool {
  name: string;
  cli: string;
  purpose: string;
  version: string;
  file: string;
  category: 'SCRIPT' | 'TOOL' | 'UTILITY' | 'CORE';
  status: 'ACTIVE' | 'STABLE' | 'EXPERIMENTAL';
  dependencies: string[];
}

class MCPToolsRegistry {
  private tools: MCPTool[] = [];

  async scanTools(): Promise<MCPTool[]> {
    // Pre-defined tools from documentation
    this.tools = [
      {
        name: 'obsidian-tools.ts',
        cli: 'bun header DOMAIN TYPE',
        purpose: 'Header gen/search/validate',
        version: 'v2.0',
        file: 'scripts/generate-headers.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: []
      },
      {
        name: 'git-sync.ts',
        cli: 'bun git:watch',
        purpose: 'Auto-commit/push',
        version: 'v2.0',
        file: 'scripts/git-sync.ts',
        category: 'UTILITY',
        status: 'ACTIVE',
        dependencies: ['git']
      },
      {
        name: 'git-branch.ts',
        cli: 'bun branch:create ID',
        purpose: 'Smart branches/PR',
        version: 'v2.0',
        file: 'scripts/git-branch.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: ['git']
      },
      {
        name: 'telegram.ts',
        cli: 'bun telegram:send',
        purpose: 'CRM/broadcast',
        version: 'v2.0',
        file: 'scripts/telegram.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: ['telegram']
      },
      {
        name: 'datapipe.ts',
        cli: 'bun datapipe:full',
        purpose: 'API → Bets → YAML',
        version: 'v2.6',
        file: 'scripts/datapipe.ts',
        category: 'CORE',
        status: 'ACTIVE',
        dependencies: ['bun:sqlite', 'bun:secrets']
      },
      {
        name: 'grep-assistant',
        cli: 'bun grep ADAM',
        purpose: 'Vault search fzf',
        version: 'v3.0',
        file: 'scripts/grep-assistant.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: ['fzf']
      },
      {
        name: 'semver.ts',
        cli: 'bun semver bump patch',
        purpose: 'Auto version/EXE',
        version: 'v1.3',
        file: 'scripts/semver.ts',
        category: 'UTILITY',
        status: 'ACTIVE',
        dependencies: []
      },
      {
        name: 'ws-live-server.ts',
        cli: 'bun ws:start',
        purpose: 'LIVE dashboard',
        version: 'v2.8',
        file: 'scripts/ws-datapipe.ts',
        category: 'CORE',
        status: 'ACTIVE',
        dependencies: []
      },
      {
        name: 'pipe-datapipe.ts',
        cli: 'bun pipe:etl',
        purpose: 'Stream ETL',
        version: 'v1.3',
        file: 'scripts/pipe-etl.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: ['jq']
      },
      // Bun v1.3 utilities
      {
        name: 'log-clean.ts',
        cli: 'bun log:clean',
        purpose: 'stripANSI logs',
        version: 'v1.3',
        file: 'scripts/log-clean.ts',
        category: 'UTILITY',
        status: 'ACTIVE',
        dependencies: []
      },
      {
        name: 'parallel-agents.ts',
        cli: 'bun agents:parallel',
        purpose: '500x postMessage workers',
        version: 'v1.3',
        file: 'scripts/parallel-agents.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: []
      },
      {
        name: 'safe-spawn.ts',
        cli: 'bun spawn:safe',
        purpose: 'timeout/maxBuffer spawns',
        version: 'v1.3',
        file: 'scripts/safe-spawn.ts',
        category: 'UTILITY',
        status: 'ACTIVE',
        dependencies: []
      },
      // Additional tools
      {
        name: 'ai-headers.ts',
        cli: 'bun ai:generate',
        purpose: 'AI header generation',
        version: 'v2.8',
        file: 'scripts/ai-headers.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: ['ai', 'mcp']
      },
      {
        name: 'multi-vault-sync.ts',
        cli: 'bun vault:sync',
        purpose: 'Multi-vault synchronization',
        version: 'v2.8',
        file: 'scripts/multi-vault-sync.ts',
        category: 'CORE',
        status: 'ACTIVE',
        dependencies: ['obsidian']
      },
      {
        name: 'gov-rules.ts',
        cli: 'bun rules:list',
        purpose: 'GOV rules management',
        version: 'v2.8',
        file: 'scripts/gov-rules.ts',
        category: 'TOOL',
        status: 'ACTIVE',
        dependencies: []
      }
    ];

    // Scan for additional tools in scripts directory
    await this.scanScriptsDirectory();

    return this.tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async scanScriptsDirectory(): Promise<void> {
    try {
      const scriptsDir = join(process.cwd(), 'scripts');
      const files = readdirSync(scriptsDir);

      for (const file of files) {
        if (extname(file) === '.ts' && !this.tools.find(t => t.file === `scripts/${file}`)) {
          const tool = await this.analyzeScriptFile(join(scriptsDir, file));
          if (tool) {
            this.tools.push(tool);
          }
        }
      }
    } catch (error) {
      // Skip if directory doesn't exist
    }
  }

  private async analyzeScriptFile(filePath: string): Promise<MCPTool | null> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const filename = basename(filePath);

      // Extract header info
      const headerMatch = content.match(/\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]/);
      if (!headerMatch) return null;

      const [, domain, type, category, id, version, status] = headerMatch;

      // Extract CLI usage from comments
      const cliMatch = content.match(/bun\s+[\w:]+/);
      const cli = cliMatch ? cliMatch[0] : `bun run scripts/${filename}`;

      // Extract purpose from comments
      const purposeMatch = content.match(/\*\s*(.+?)\s*\*/);
      const purpose = purposeMatch ? purposeMatch[1] : 'Utility script';

      return {
        name: filename,
        cli,
        purpose,
        version,
        file: `scripts/${filename}`,
        category: (category as any) || 'UTILITY',
        status: (status as any) || 'ACTIVE',
        dependencies: this.extractDependencies(content)
      };
    } catch (error) {
      return null;
    }
  }

  private extractDependencies(content: string): string[] {
    const deps: string[] = [];

    // Check for imports
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    for (const match of importMatches) {
      const dep = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
      if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
        deps.push(dep);
      }
    }

    return [...new Set(deps)];
  }

  formatTable(tools: MCPTool[]): string {
    const header = '| Tool | CLI | Purpose | v |\n|----------|---------|-------------|-------|';

    const rows = tools.map(tool =>
      `| **${tool.name}** | \`${tool.cli}\` | ${tool.purpose} | ${tool.version} |`
    );

    return `${header}\n${rows.join('\n')}`;
  }

  async getToolsByCategory(category?: string): Promise<MCPTool[]> {
    const tools = await this.scanTools();

    if (category) {
      return tools.filter(tool =>
        tool.category.toLowerCase() === category.toLowerCase()
      );
    }

    return tools;
  }

  async validateTools(): Promise<{ available: number; executable: number; issues: string[] }> {
    const tools = await this.scanTools();
    let available = 0;
    let executable = 0;
    const issues: string[] = [];

    for (const tool of tools) {
      try {
        // Check if file exists
        const filePath = join(process.cwd(), tool.file);
        if (statSync(filePath)) {
          available++;

          // Try to check if it's executable (basic syntax check)
          const content = readFileSync(filePath, 'utf-8');
          if (content.includes('#!/usr/bin/env bun') && content.includes('export')) {
            executable++;
          }
        }
      } catch (error) {
        issues.push(`❌ ${tool.name}: ${error.message}`);
      }
    }

    return { available, executable, issues };
  }
}

// CLI Interface
async function main() {
  const registry = new MCPToolsRegistry();
  const command = process.argv[2];

  switch (command) {
    case 'list':
      const category = process.argv[3];
      const tools = await registry.getToolsByCategory(category);
      console.log(`\n🚀 MCP TOOLS – BUN-POWERED *Scripts/CLI. Zero npm. EXE portable.*\n`);
      console.log(registry.formatTable(tools));
      console.log(`\n📊 Total: ${tools.length} tools`);
      break;

    case 'validate':
      const validation = await registry.validateTools();
      console.log(`📊 MCP Tools Validation:`);
      console.log(`   📁 Available: ${validation.available}`);
      console.log(`   ⚙️  Executable: ${validation.executable}`);

      if (validation.issues.length > 0) {
        console.log('\n❌ Issues:');
        validation.issues.forEach(issue => console.log(`   ${issue}`));
      } else {
        console.log('✅ All tools valid!');
      }
      break;

    case 'grep':
      const pattern = process.argv[3] || 'MCP';
      const allTools = await registry.scanTools();
      const matches = allTools.filter(tool =>
        tool.name.toLowerCase().includes(pattern.toLowerCase()) ||
        tool.purpose.toLowerCase().includes(pattern.toLowerCase()) ||
        tool.cli.toLowerCase().includes(pattern.toLowerCase())
      );

      console.log(`🔍 MCP Tools matching "${pattern}":`);
      matches.forEach(tool => {
        console.log(`   ${tool.name}: ${tool.cli} - ${tool.purpose}`);
      });
      break;

    default:
      console.log(`🚀 MCP Tools Registry

USAGE:
  bun mcp:list [category]    # List all tools (filter by category)
  bun mcp:validate           # Validate tool availability
  bun mcp:grep <pattern>     # Search tools by pattern

CATEGORIES:
  CORE, TOOL, UTILITY, SCRIPT

EXAMPLES:
  bun mcp:list CORE          # Show core tools only
  bun mcp:grep datapipe      # Find datapipe-related tools
  bun mcp:validate           # Check tool health
`);
  }
}

// Export for use in other scripts
export { MCPToolsRegistry, type MCPTool };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
