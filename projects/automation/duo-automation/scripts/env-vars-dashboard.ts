#!/usr/bin/env bun
/**
 * Environment Variables Management Dashboard
 * Interactive dashboard for adding and archiving environment variables
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Type declarations for Node.js globals
declare const process: {
  stdout: {
    write(data: string): void;
  };
  stdin: {
    setEncoding(encoding: string): void;
    on(event: 'data', callback: (data: Buffer) => void): void;
  };
  argv: string[];
};

const PROJECT_ROOT = join(import.meta.dir, '..');

interface EnvVariable {
  name: string;
  value: string;
  description?: string;
  category: string;
  required: boolean;
  source: string;
  archived?: boolean;
}

class EnvVarsDashboard {
  private envFile: string;
  private variables: Map<string, EnvVariable> = new Map();

  constructor() {
    this.envFile = join(PROJECT_ROOT, 'config/environment/.env.example');
    this.loadVariables();
  }

  private async loadVariables(): Promise<void> {
    const envFile = Bun.file(this.envFile);
    if (!(await envFile.exists())) {
      console.error('❌ .env.example file not found');
      return;
    }

    const content = await envFile.text();
    const lines = content.split('\n');
    let currentCategory = 'General';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        if (trimmed.startsWith('#') && !trimmed.startsWith('# ')) {
          currentCategory = trimmed.replace('#', '').trim();
        }
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const name = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();

      if (/^[A-Z_][A-Z0-9_]*$/.test(name)) {
        this.variables.set(name, {
          name,
          value,
          category: currentCategory,
          required: value.includes('your-') || value.includes('change-in-production'),
          source: '.env.example'
        });
      }
    }
  }

  private async saveVariables(): Promise<void> {
    const categories = new Map<string, EnvVariable[]>();
    
    // Group by category
    for (const variable of this.variables.values()) {
      if (!categories.has(variable.category)) {
        categories.set(variable.category, []);
      }
      if (!variable.archived) {
        categories.get(variable.category)!.push(variable);
      }
    }

    let content = '';
    
    // Write categories in order
    const categoryOrder = [
      'Required API Keys',
      'Optional (for enhanced features)', 
      'Bun S3 Storage (Cloudflare R2)',
      'Cloudflare Integration',
      'API Configuration',
      'Server Ports Configuration',
      'Email Service Ports',
      'External Service Ports',
      'Database & Cache URLs',
      'External Service URLs',
      'Security & Authentication',
      'Performance & Monitoring',
      'Phone Intelligence Specific',
      'Production Configuration',
      'Timezone Configuration',
      'Database Host Configuration',
      'Dashboard Feature Flags'
    ];

    for (const category of categoryOrder) {
      if (categories.has(category)) {
        content += `#${category}\n`;
        const vars = categories.get(category)!;
        for (const variable of vars) {
          if (variable.description) {
            content += `# ${variable.description}\n`;
          }
          content += `${variable.name}=${variable.value}\n`;
        }
        content += '\n';
      }
    }

    await Bun.write(this.envFile, content);
    console.info('✅ Environment variables saved successfully');
  }

  public showDashboard(): void {
    console.clear();
    console.info('🔧 Environment Variables Management Dashboard');
    console.info('='.repeat(50));
    console.info();

    const categories = new Map<string, EnvVariable[]>();
    let archivedCount = 0;

    for (const variable of this.variables.values()) {
      if (variable.archived) {
        archivedCount++;
        continue;
      }
      
      if (!categories.has(variable.category)) {
        categories.set(variable.category, []);
      }
      categories.get(variable.category)!.push(variable);
    }

    console.info(`📊 Total Variables: ${this.variables.size} | Active: ${this.variables.size - archivedCount} | Archived: ${archivedCount}\n`);

    for (const [category, vars] of categories) {
      console.info(`\n📁 ${category}`);
      console.info('-'.repeat(30));
      
      for (const variable of vars) {
        const status = variable.required ? '🔴' : '🟢';
        const displayValue = variable.value.length > 30 
          ? variable.value.substring(0, 27) + '...' 
          : variable.value;
        
        console.info(`  ${status} ${variable.name} = ${displayValue}`);
      }
    }

    if (archivedCount > 0) {
      console.info(`\n📦 Archived Variables: ${archivedCount}`);
    }

    console.info('\n' + '='.repeat(50));
    console.info('🎛️  Actions:');
    console.info('  1. Add new variable');
    console.info('  2. Archive variable');
    console.info('  3. Restore archived variable');
    console.info('  4. Edit variable');
    console.info('  5. List archived variables');
    console.info('  6. Save and exit');
    console.info('  7. Exit without saving');
    console.info();
  }

  public async addVariable(): Promise<void> {
    console.info('\n➕ Add New Environment Variable');
    console.info('-'.repeat(30));

    const name = await this.prompt('Variable name (e.g., NEW_API_KEY): ');
    if (!name || !/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      console.info('❌ Invalid variable name. Use uppercase letters, numbers, and underscores only.');
      return;
    }

    if (this.variables.has(name)) {
      console.info('❌ Variable already exists. Use edit option instead.');
      return;
    }

    const value = await this.prompt('Variable value: ');
    const description = await this.prompt('Description (optional): ', true);
    const category = await this.prompt('Category: ', true) || 'General';
    const requiredInput = await this.prompt('Required? (y/n): ', true);
    const required = requiredInput?.toLowerCase() === 'y';

    this.variables.set(name, {
      name,
      value,
      description,
      category,
      required,
      source: '.env.example'
    });

    console.info(`✅ Added ${name} to ${category}`);
  }

  public async archiveVariable(): Promise<void> {
    console.info('\n📦 Archive Environment Variable');
    console.info('-'.repeat(30));

    const name = await this.prompt('Variable name to archive: ');
    if (!name) return;

    const variable = this.variables.get(name);
    if (!variable) {
      console.info('❌ Variable not found');
      return;
    }

    if (variable.archived) {
      console.info('❌ Variable already archived');
      return;
    }

    variable.archived = true;
    console.info(`✅ Archived ${name}`);
  }

  public async restoreVariable(): Promise<void> {
    console.info('\n♻️  Restore Archived Variable');
    console.info('-'.repeat(30));

    const archivedVars = Array.from(this.variables.values())
      .filter(v => v.archived);

    if (archivedVars.length === 0) {
      console.info('❌ No archived variables found');
      return;
    }

    console.info('Archived variables:');
    archivedVars.forEach((v, i) => {
      console.info(`  ${i + 1}. ${v.name} (${v.category})`);
    });

    const choice = await this.prompt('Enter number to restore: ');
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < archivedVars.length) {
      const variable = archivedVars[index];
      variable.archived = false;
      console.info(`✅ Restored ${variable.name}`);
    } else {
      console.info('❌ Invalid selection');
    }
  }

  public async editVariable(): Promise<void> {
    console.info('\n✏️  Edit Environment Variable');
    console.info('-'.repeat(30));

    const name = await this.prompt('Variable name to edit: ');
    if (!name) return;

    const variable = this.variables.get(name);
    if (!variable) {
      console.info('❌ Variable not found');
      return;
    }

    if (variable.archived) {
      console.info('❌ Cannot edit archived variable. Restore it first.');
      return;
    }

    console.info(`Current value: ${variable.value}`);
    const newValue = await this.prompt('New value (leave empty to keep current): ', true);
    
    if (newValue) {
      variable.value = newValue;
      console.info(`✅ Updated ${name}`);
    }
  }

  public listArchived(): void {
    console.info('\n📦 Archived Variables');
    console.info('-'.repeat(30));

    const archivedVars = Array.from(this.variables.values())
      .filter(v => v.archived);

    if (archivedVars.length === 0) {
      console.info('No archived variables');
      return;
    }

    archivedVars.forEach(variable => {
      console.info(`  🗑️  ${variable.name} = ${variable.value} (${variable.category})`);
    });
  }

  private async prompt(question: string, allowEmpty = false): Promise<string> {
    process.stdout.write(question);
    
    // Simple prompt implementation
    return new Promise((resolve) => {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (data: Buffer) => {
        const input = data.toString().trim();
        if (allowEmpty || input) {
          resolve(input);
        } else {
          resolve('');
        }
      });
    });
  }

  public async run(): Promise<void> {
    while (true) {
      this.showDashboard();
      
      const choice = await this.prompt('Choose an option (1-7): ');
      
      switch (choice) {
        case '1':
          await this.addVariable();
          break;
        case '2':
          await this.archiveVariable();
          break;
        case '3':
          await this.restoreVariable();
          break;
        case '4':
          await this.editVariable();
          break;
        case '5':
          this.listArchived();
          break;
        case '6':
          await this.saveVariables();
          console.info('👋 Goodbye!');
          return;
        case '7':
          console.info('👋 Exiting without saving...');
          return;
        default:
          console.info('❌ Invalid option. Please choose 1-7.');
      }

      if (choice !== '7') {
        await this.prompt('\nPress Enter to continue...');
      }
    }
  }
}

// CLI execution
async function main() {
  const dashboard = new EnvVarsDashboard();
  await dashboard.run();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EnvVarsDashboard };
