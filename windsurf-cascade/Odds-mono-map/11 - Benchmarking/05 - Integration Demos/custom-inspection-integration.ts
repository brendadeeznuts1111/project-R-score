#!/usr/bin/env bun

/**
 * Bun.inspect.custom Integration with Advanced Table Formatting
 * Extending custom inspection for vault data structures and table integration
 */

import chalk from 'chalk';

console.log(chalk.bold.magenta('🎯 Bun.inspect.custom Integration with Advanced Tables'));
console.log(chalk.gray('Extending custom inspection for vault data structures'));
console.log(chalk.gray('='.repeat(80)));

// =============================================================================
// OFFICIAL BASIC EXAMPLE (from bun.com/docs/runtime/utils)
// =============================================================================

console.log(chalk.bold.cyan('\n📋 Official Basic Example'));

console.log(chalk.yellow('\n🔸 Basic Custom Inspection:'));
console.log(chalk.white(`
class Foo {
  [Bun.inspect.custom]() {
    return "foo";
  }
}

const foo = new Foo();
console.log(foo); // => "foo"
`));

// Demonstrate the official example
class Foo {
    [Bun.inspect.custom]() {
        return "foo";
    }
}

const foo = new Foo();
console.log(chalk.green('Output:'));
console.log(foo); // => "foo"

// =============================================================================
// ADVANCED VAULT-SPECIFIC CUSTOM INSPECTION
// =============================================================================

console.log(chalk.bold.cyan('\n🏗️  Advanced Vault-Specific Custom Inspection'));

console.log(chalk.yellow('\n🔸 Vault File with Custom Inspection:'));
console.log(chalk.white(`
class VaultFile {
  constructor(data) {
    this.path = data.path;
    this.name = data.name;
    this.size = data.size;
    this.modified = data.modified;
    this.tags = data.tags;
    this.hasFrontmatter = data.hasFrontmatter;
  }
  
  [Bun.inspect.custom]() {
    return chalk.cyan(\`📄 \${this.name}\`) + 
           chalk.gray(\` (\${this.path})\`) + 
           chalk.yellow(\` \${this.size}\`) +
           (this.hasFrontmatter ? chalk.green(' ✅') : chalk.red(' ❌'));
  }
}
`));

// Advanced VaultFile implementation
class VaultFile {
    constructor(data) {
        this.path = data.path;
        this.name = data.name;
        this.size = data.size;
        this.modified = data.modified;
        this.tags = data.tags;
        this.hasFrontmatter = data.hasFrontmatter;
    }

    [Bun.inspect.custom]() {
        return chalk.cyan(`📄 ${this.name}`) +
            chalk.gray(` (${this.path})`) +
            chalk.yellow(` ${this.size}`) +
            (this.hasFrontmatter ? chalk.green(' ✅') : chalk.red(' ❌'));
    }
}

// Create vault files with custom inspection
const vaultFiles = [
    new VaultFile({
        path: '01 - Daily Notes/2025-11-18.md',
        name: '2025-11-18',
        size: '2.4 KB',
        modified: '2025-11-18',
        tags: ['daily', 'journal'],
        hasFrontmatter: true
    }),
    new VaultFile({
        path: '02 - Architecture/OddsTick.md',
        name: 'OddsTick',
        size: '5.0 KB',
        modified: '2025-11-17',
        tags: ['architecture', 'core'],
        hasFrontmatter: true
    }),
    new VaultFile({
        path: '03 - Development/draft.md',
        name: 'draft',
        size: '1.2 KB',
        modified: '2025-11-16',
        tags: ['development'],
        hasFrontmatter: false
    })
];

console.log(chalk.green('\n📋 Custom Inspection Output:'));
vaultFiles.forEach(file => console.log(file));

// =============================================================================
// CUSTOM INSPECTION WITH TABLE INTEGRATION
// =============================================================================

console.log(chalk.bold.cyan('\n🔗 Custom Inspection with Table Integration'));

console.log(chalk.yellow('\n🔸 Validation Issue with Custom Inspection:'));
console.log(chalk.white(`
class ValidationIssue {
  constructor(data) {
    this.type = data.type;
    this.ruleCategory = data.ruleCategory;
    this.file = data.file;
    this.line = data.line;
    this.message = data.message;
    this.suggestion = data.suggestion;
  }
  
  [Bun.inspect.custom]() {
    const typeColor = this.type === 'error' ? chalk.bgRed : 
                     this.type === 'warning' ? chalk.bgYellow : chalk.bgBlue;
    return typeColor(\` \${this.type.toUpperCase()} \`) + 
           chalk.gray(\` \${this.file}:\${this.line}\`) +
           chalk.white(\` - \${this.message}\`);
  }
  
  // For table display - returns formatted object
  toTableFormat() {
    return {
      type: this.type === 'error' ? chalk.bgRed(' ERROR ') :
            this.type === 'warning' ? chalk.bgYellow(' WARNING ') :
            chalk.bgBlue(' INFO '),
      file: chalk.cyan(this.file),
      line: chalk.gray(this.line.toString()),
      message: this.message,
      suggestion: chalk.gray(this.suggestion)
    };
  }
}
`));

// Advanced ValidationIssue implementation
class ValidationIssue {
    constructor(data) {
        this.type = data.type;
        this.ruleCategory = data.ruleCategory;
        this.file = data.file;
        this.line = data.line;
        this.message = data.message;
        this.suggestion = data.suggestion;
    }

    [Bun.inspect.custom]() {
        const typeColor = this.type === 'error' ? chalk.bgRed :
            this.type === 'warning' ? chalk.bgYellow : chalk.bgBlue;
        return typeColor(` ${this.type.toUpperCase()} `) +
            chalk.gray(` ${this.file}:${this.line}`) +
            chalk.white(` - ${this.message}`);
    }

    // For table display - returns formatted object
    toTableFormat() {
        return {
            type: this.type === 'error' ? chalk.bgRed(' ERROR ') :
                this.type === 'warning' ? chalk.bgYellow(' WARNING ') :
                    chalk.bgBlue(' INFO '),
            file: chalk.cyan(this.file),
            line: chalk.gray(this.line.toString()),
            message: this.message,
            suggestion: chalk.gray(this.suggestion)
        };
    }
}

// Create validation issues
const validationIssues = [
    new ValidationIssue({
        type: 'error',
        ruleCategory: 'formatting',
        file: 'document.md',
        line: 1,
        message: 'Missing H1 heading',
        suggestion: 'Add # heading at top'
    }),
    new ValidationIssue({
        type: 'warning',
        ruleCategory: 'structure',
        file: 'notes.md',
        line: 42,
        message: 'Line too long',
        suggestion: 'Break line at 80 chars'
    }),
    new ValidationIssue({
        type: 'info',
        ruleCategory: 'metadata',
        file: 'draft.md',
        line: 5,
        message: 'No tags found',
        suggestion: 'Add relevant tags'
    })
];

console.log(chalk.green('\n📋 Custom Inspection Output:'));
validationIssues.forEach(issue => console.log(issue));

console.log(chalk.yellow('\n📊 Table Integration (toTableFormat method):'));
Bun.inspect.table(
    validationIssues.map(issue => issue.toTableFormat()),
    ['type', 'file', 'line', 'message', 'suggestion'],
    { maxEntryWidth: 40, compact: true }
);

// =============================================================================
// ADVANCED TASK STATUS WITH CUSTOM INSPECTION
// =============================================================================

console.log(chalk.bold.cyan('\n🚀 Advanced Task Status with Custom Inspection'));

console.log(chalk.yellow('\n🔸 Task Status with Custom Inspection:'));
console.log(chalk.white(`
class TaskStatus {
  constructor(data) {
    this.symbol = data.symbol;
    this.name = data.name;
    this.nextStatusSymbol = data.nextStatusSymbol;
    this.type = data.type;
    this.progress = data.progress;
  }
  
  [Bun.inspect.custom]() {
    const typeColor = this.type === 'completed' ? chalk.green :
                     this.type === 'active' ? chalk.blue :
                     this.type === 'cancelled' ? chalk.red : chalk.gray;
    return chalk.bold(this.symbol) + 
           chalk.white(\` \${this.name}\`) +
           chalk.gray(\` \${this.nextStatusSymbol}\`) +
           typeColor(\` [\${this.type}]\`) +
           chalk.yellow(\` \${this.progress}%\`);
  }
  
  // For table display
  toTableFormat() {
    const typeColor = this.type === 'completed' ? chalk.green :
                     this.type === 'active' ? chalk.blue :
                     this.type === 'cancelled' ? chalk.red : chalk.gray;
    return {
      symbol: chalk.bold(this.symbol),
      name: chalk.white(this.name),
      nextStatusSymbol: chalk.gray(this.nextStatusSymbol),
      type: typeColor(this.type),
      progress: chalk.yellow(\`\${this.progress}%\`)
    };
  }
}
`));

// Advanced TaskStatus implementation
class TaskStatus {
    constructor(data) {
        this.symbol = data.symbol;
        this.name = data.name;
        this.nextStatusSymbol = data.nextStatusSymbol;
        this.type = data.type;
        this.progress = data.progress;
    }

    [Bun.inspect.custom]() {
        const typeColor = this.type === 'completed' ? chalk.green :
            this.type === 'active' ? chalk.blue :
                this.type === 'cancelled' ? chalk.red : chalk.gray;
        return chalk.bold(this.symbol) +
            chalk.white(` ${this.name}`) +
            chalk.gray(` ${this.nextStatusSymbol}`) +
            typeColor(` [${this.type}]`) +
            chalk.yellow(` ${this.progress}%`);
    }

    // For table display
    toTableFormat() {
        const typeColor = this.type === 'completed' ? chalk.green :
            this.type === 'active' ? chalk.blue :
                this.type === 'cancelled' ? chalk.red : chalk.gray;
        return {
            symbol: chalk.bold(this.symbol),
            name: chalk.white(this.name),
            nextStatusSymbol: chalk.gray(this.nextStatusSymbol),
            type: typeColor(this.type),
            progress: chalk.yellow(`${this.progress}%`)
        };
    }
}

// Create task statuses
const taskStatuses = [
    new TaskStatus({
        symbol: '📝',
        name: 'In Progress',
        nextStatusSymbol: '→ ✅',
        type: 'active',
        progress: 65
    }),
    new TaskStatus({
        symbol: '✅',
        name: 'Completed',
        nextStatusSymbol: '→ 📝',
        type: 'completed',
        progress: 100
    }),
    new TaskStatus({
        symbol: '⏸️',
        name: 'On Hold',
        nextStatusSymbol: '→ 📝',
        type: 'inactive',
        progress: 30
    }),
    new TaskStatus({
        symbol: '❌',
        name: 'Cancelled',
        nextStatusSymbol: '→ 📝',
        type: 'cancelled',
        progress: 15
    })
];

console.log(chalk.green('\n📋 Custom Inspection Output:'));
taskStatuses.forEach(status => console.log(status));

console.log(chalk.yellow('\n📊 Table Integration (toTableFormat method):'));
Bun.inspect.table(
    taskStatuses.map(status => status.toTableFormat()),
    ['symbol', 'name', 'nextStatusSymbol', 'type', 'progress']
);

// =============================================================================
// MIXING CUSTOM INSPECTION WITH BUN.INSPECT.TABLE
// =============================================================================

console.log(chalk.bold.cyan('\n🔀 Mixing Custom Inspection with Bun.inspect.table'));

console.log(chalk.yellow('\n🔸 Hybrid Approach - Custom for Console, Table for Reports:'));

// Create a hybrid vault item class
class VaultItem {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.status = data.status;
        this.lastModified = data.lastModified;
        this.metadata = data.metadata;
    }

    [Bun.inspect.custom]() {
        const statusColor = this.status === 'active' ? chalk.green :
            this.status === 'archived' ? chalk.gray : chalk.yellow;
        const typeSymbol = this.type === 'file' ? '📄' :
            this.type === 'folder' ? '📁' : '🔗';

        return `${typeSymbol} ${chalk.cyan(this.name)} ` +
            chalk.gray(`(${this.type})`) +
            ` ${statusColor(`[${this.status}]`)} ` +
            chalk.gray(`• ${this.lastModified}`);
    }

    // Convert to table-friendly format
    toTableFormat() {
        return {
            id: chalk.gray(this.id),
            name: chalk.cyan(this.name),
            type: this.type,
            status: this.status === 'active' ? chalk.green(this.status) :
                this.status === 'archived' ? chalk.gray(this.status) :
                    chalk.yellow(this.status),
            lastModified: this.lastModified,
            size: this.metadata.size || chalk.gray('N/A')
        };
    }
}

// Create vault items
const vaultItems = [
    new VaultItem({
        id: '001',
        name: 'Daily Note',
        type: 'file',
        status: 'active',
        lastModified: '2025-11-18',
        metadata: { size: '2.4 KB' }
    }),
    new VaultItem({
        id: '002',
        name: 'Architecture',
        type: 'folder',
        status: 'active',
        lastModified: '2025-11-17',
        metadata: {}
    }),
    new VaultItem({
        id: '003',
        name: 'Old Draft',
        type: 'file',
        status: 'archived',
        lastModified: '2025-11-10',
        metadata: { size: '1.2 KB' }
    })
];

console.log(chalk.green('\n📋 Custom Inspection (for console/debug):'));
vaultItems.forEach(item => console.log(item));

console.log(chalk.yellow('\n📊 Table Format (for reports):'));
Bun.inspect.table(
    vaultItems.map(item => item.toTableFormat()),
    ['id', 'name', 'type', 'status', 'lastModified', 'size'],
    { compact: true }
);

// =============================================================================
// BEST PRACTICES AND USE CASES
// =============================================================================

console.log(chalk.bold.cyan('\n✅ Best Practices and Use Cases'));

console.log(chalk.yellow('\n🎯 When to Use Custom Inspection:'));
console.log(chalk.gray('• Debug output with rich formatting'));
console.log(chalk.gray('• Console logging with visual indicators'));
console.log(chalk.gray('• Development tooling'));
console.log(chalk.gray('• Quick data inspection'));

console.log(chalk.yellow('\n📊 When to Use Table Format:'));
console.log(chalk.gray('• Structured reports'));
console.log(chalk.gray('• Production output'));
console.log(chalk.gray('• Data analysis'));
console.log(chalk.gray('• User interfaces'));

console.log(chalk.yellow('\n🔀 Hybrid Approach Benefits:'));
console.log(chalk.green('• Custom inspection: Human-readable console output'));
console.log(chalk.green('• Table format: Machine-readable structured data'));
console.log(chalk.green('• Flexibility: Different views for different contexts'));
console.log(chalk.green('• Maintainability: Single source of truth'));

console.log(chalk.bold.magenta('\n🎉 Custom Inspection Integration Complete!'));
console.log(chalk.gray('You now have both beautiful console output AND structured table data!'));
