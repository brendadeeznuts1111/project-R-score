#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]help
 * 
 * Help
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils
 */

#!/usr/bin/env bun

/**
 * Help System for Odds Protocol Vault
 * Provides comprehensive command documentation and usage examples
 * 
 * @fileoverview Complete help system with command documentation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import chalk from 'chalk';
import { SIZE_CONSTANTS } from '../../src/constants/vault-constants.js';

function showHelp(): void {
    console.log(chalk.blue.bold('🏛️  Odds Protocol Vault Automation Help'));
    console.log(chalk.gray('='.repeat(55)));

    console.log(chalk.blue.bold('\n📋 Available Commands:'));

    console.log(chalk.white('\n🚀 Setup & Initialization:'));
    console.log(chalk.gray('  bun run vault:setup      - Initialize vault automation system'));
    console.log(chalk.gray('  bun run vault:help       - Show this help message'));

    console.log(chalk.white('\n🔧 Organization & Maintenance:'));
    console.log(chalk.gray('  bun run vault:organize   - Organize files into proper folders'));
    console.log(chalk.gray('  bun run vault:validate   - Check vault compliance with standards'));
    console.log(chalk.gray('  bun run vault:fix        - Auto-fix common validation issues'));
    console.log(chalk.gray('  bun run vault:cleanup    - Deep cleanup and archiving'));

    console.log(chalk.white('\n👁️  Monitoring & Status:'));
    console.log(chalk.gray('  bun run vault:monitor    - Start/stop vault monitoring'));
    console.log(chalk.gray('  bun run vault:status     - Show current vault status'));
    console.log(chalk.gray('  bun run vault:daily      - Run daily validation routine'));

    console.log(chalk.white('\n📏 Standards & Quality:'));
    console.log(chalk.gray('  bun run vault:standards  - Check compliance with standards'));

    console.log(chalk.blue.bold('\n🎯 Common Workflows:'));

    console.log(chalk.white('\n1️⃣  Initial Setup:'));
    console.log(chalk.gray('   bun run vault:setup'));
    console.log(chalk.gray('   bun run vault:organize'));
    console.log(chalk.gray('   bun run vault:validate'));
    console.log(chalk.gray('   bun run vault:fix'));

    console.log(chalk.white('\n2️⃣  Daily Maintenance:'));
    console.log(chalk.gray('   bun run vault:daily'));
    console.log(chalk.gray('   bun run vault:status'));

    console.log(chalk.white('\n3️⃣  Enable Automation:'));
    console.log(chalk.gray('   bun run vault:monitor start'));
    console.log(chalk.gray('   bun run vault:status'));

    console.log(chalk.white('\n4️⃣  Fix Issues:'));
    console.log(chalk.gray('   bun run vault:validate'));
    console.log(chalk.gray('   bun run vault:fix'));
    console.log(chalk.gray('   bun run vault:organize'));

    console.log(chalk.blue.bold('\n📁 Vault Structure:'));
    console.log(chalk.white('  🏠 Home.md                    # Navigation hub'));
    console.log(chalk.white('  ├── 00 - Dashboard.md          # Command center'));
    console.log(chalk.white('  ├── 01 - Daily Notes/          # Chronological logs'));
    console.log(chalk.white('  │   ├── 01 - Reports/           # Daily reports'));
    console.log(chalk.white('  │   ├── 02 - Journals/          # Daily journal entries'));
    console.log(chalk.white('  │   └── 03 - Actions/           # Action items and tasks'));
    console.log(chalk.white('  ├── 02 - Architecture/         # System design'));
    console.log(chalk.white('  │   ├── 01 - Data Models/       # Data models and schemas'));
    console.log(chalk.white('  │   ├── 02 - System Design/     # System design documents'));
    console.log(chalk.white('  │   └── 03 - Patterns/          # Design patterns and best practices'));
    console.log(chalk.white('  ├── 03 - Development/          # Code & testing'));
    console.log(chalk.white('  │   ├── 01 - Code Snippets/     # Code examples and snippets'));
    console.log(chalk.white('  │   ├── 02 - Testing/           # Testing documentation and results'));
    console.log(chalk.white('  │   └── 03 - Tools/             # Development tools and utilities'));
    console.log(chalk.white('  ├── 04 - Documentation/        # Guides & API docs'));
    console.log(chalk.white('  │   ├── 01 - API/               # API documentation'));
    console.log(chalk.white('  │   ├── 02 - Guides/            # User guides and tutorials'));
    console.log(chalk.white('  │   ├── 03 - Reports/           # Analysis and review reports'));
    console.log(chalk.white('  │   └── 04 - Reference/         # Reference materials'));
    console.log(chalk.white('  ├── 05 - Assets/              # Media files'));
    console.log(chalk.white('  │   ├── 01 - Images/            # Image files and graphics'));
    console.log(chalk.white('  │   ├── 02 - Media/             # Audio, video, and other media'));
    console.log(chalk.white('  │   └── 03 - Resources/         # External resources and references'));
    console.log(chalk.white('  ├── 06 - Templates/           # Template system'));
    console.log(chalk.white('  │   ├── 01 - Note Templates/    # Note-taking templates'));
    console.log(chalk.white('  │   ├── 02 - Project Templates/ # Project management templates'));
    console.log(chalk.white('  │   ├── 03 - Dashboard Templates/# Dashboard templates'));
    console.log(chalk.white('  │   ├── 04 - Development Templates/# Development templates'));
    console.log(chalk.white('  │   ├── 05 - Design Templates/   # Design templates'));
    console.log(chalk.white('  │   ├── 06 - Architecture Templates/# Architecture templates'));
    console.log(chalk.white('  │   └── 07 - Configuration Templates/# Configuration file templates'));
    console.log(chalk.white('  ├── 07 - Archive/              # Archived content'));
    console.log(chalk.white('  │   ├── 01 - Old Projects/      # Completed or obsolete projects'));
    console.log(chalk.white('  │   ├── 02 - Deprecated/        # Deprecated features and code'));
    console.log(chalk.white('  │   └── 03 - Backups/           # Backup files and archives'));
    console.log(chalk.white('  ├── 08 - Logs/                 # Logs and monitoring'));
    console.log(chalk.white('  │   ├── 01 - Validation/        # Validation logs and reports'));
    console.log(chalk.white('  │   ├── 02 - Automation/        # Automation activity logs'));
    console.log(chalk.white('  │   ├── 03 - Errors/            # Error logs and debugging info'));
    console.log(chalk.white('  │   └── 04 - Performance/       # Performance monitoring logs'));
    console.log(chalk.white('  ├── 09 - Testing/              # Testing framework'));
    console.log(chalk.white('  │   ├── 01 - Unit/             # Unit tests'));
    console.log(chalk.white('  │   ├── 02 - Integration/      # Integration tests'));
    console.log(chalk.white('  │   ├── 03 - E2E/               # End-to-end tests'));
    console.log(chalk.white('  │   └── 04 - Performance/       # Performance tests'));
    console.log(chalk.white('  └── 10 - Benchmarking/         # Performance analysis'));
    console.log(chalk.white('      ├── 01 - Benchmarks/       # Core benchmarking scripts'));
    console.log(chalk.white('      ├── 02 - Performance/      # Performance analysis data'));
    console.log(chalk.white('      └── 03 - Reports/           # Generated benchmark reports'));

    console.log(chalk.blue.bold('\n🔧 Configuration Templates:'));
    console.log(chalk.white('  📄 .vault-config.json         # Automation settings'));
    console.log(chalk.white('  📄 .vault-status.json         # Current status'));
    console.log(chalk.white('  📄 package.json               # NPM scripts and deps'));
    console.log(chalk.white('  📄 08 - Logs/vault-automation.log  # Activity log'));

    console.log(chalk.blue.bold('\n⚙️  Automation Features:'));
    console.log(chalk.white('  ✅ Automatic file organization'));
    console.log(chalk.white('  ✅ Real-time monitoring'));
    console.log(chalk.white('  ✅ Validation and fixes'));
    console.log(chalk.white('  ✅ Template application'));
    console.log(chalk.white('  ✅ Compliance tracking'));
    console.log(chalk.white('  ✅ Activity logging'));

    console.log(chalk.blue.bold('\n🎪 Bun Utilities Demo:'));
    console.log(chalk.white('  bun run vault:demo     - Show Bun.inspect.table() and Bun.nanoseconds() features'));
    console.log(chalk.gray('     → Table formatting for reports'));
    console.log(chalk.gray('     → High-precision timing utilities'));
    console.log(chalk.gray('     → Performance measurement tools'));

    console.log(chalk.blue.bold('\n📝 Heading Templates:'));
    console.log(chalk.white('  bun run vault:templates - Show type-safe heading templates'));
    console.log(chalk.gray('     → Document type templates'));
    console.log(chalk.gray('     → Variable substitution'));
    console.log(chalk.gray('     → Type-safe validation'));

    console.log(chalk.blue.bold('\n🧪 Type Testing:'));
    console.log(chalk.white('  bun run test:types    - Run comprehensive type tests'));
    console.log(chalk.gray('     → Bun expectTypeOf validation'));
    console.log(chalk.gray('     → Interface structure checks'));
    console.log(chalk.gray('     → Type safety verification'));

    console.log(chalk.blue.bold('\n🏭 Factory Patterns:'));
    console.log(chalk.white('  bun run vault:factory  - Show factory & utility patterns'));
    console.log(chalk.gray('     → Builder pattern examples'));
    console.log(chalk.gray('     → Repository pattern demo'));
    console.log(chalk.gray('     → Service container showcase'));

    console.log(chalk.blue.bold('\n🏠 Dynamic Homepages:'));
    console.log(chalk.white('  bun run vault:homepages - Generate contextual homepages'));
    console.log(chalk.gray('     → Factory-based homepage creation'));
    console.log(chalk.gray('     → Context-aware templates'));
    console.log(chalk.gray('     → Automated workflow generation'));

    console.log(chalk.blue.bold('\n📊 Enhanced Dashboards:'));
    console.log(chalk.white('  bun run vault:dashboards - Create advanced dashboards'));
    console.log(chalk.gray('     → Productivity & analytics templates'));
    console.log(chalk.gray('     → Dynamic widget configuration'));
    console.log(chalk.gray('     → Responsive layout system'));

    console.log(chalk.blue.bold('\n🔧 Template System:'));
    console.log(chalk.white('  bun run vault:templates:validate - Validate template integration'));
    console.log(chalk.gray('     → Complete template system validation'));
    console.log(chalk.gray('     → Type compatibility verification'));
    console.log(chalk.gray('     → Template registry testing'));

    console.log(chalk.blue.bold('\n🎨 Quality Standards:'));
    console.log(chalk.white('  📋 YAML frontmatter requirements'));
    console.log(chalk.white('  📝 Heading hierarchy and formatting'));
    console.log(chalk.white(`  📏 Line length limits (${SIZE_CONSTANTS.MAX_LINE_LENGTH} chars)`));
    console.log(chalk.white('  🏷️  Tag standardization'));
    console.log(chalk.white('  📁 File naming conventions'));
    console.log(chalk.white('  🔗 Link validation'));

    console.log(chalk.blue.bold('\n🚨 Troubleshooting:'));
    console.log(chalk.white('  ❌ Files not organizing?'));
    console.log(chalk.gray('     → Run: bun run vault:organize'));
    console.log(chalk.gray('     → Check: bun run vault:status'));

    console.log(chalk.white('  ❌ Validation errors?'));
    console.log(chalk.gray('     → Run: bun run vault:fix'));
    console.log(chalk.gray('     → Review: bun run vault:validate'));

    console.log(chalk.white('  ❌ Monitor not working?'));
    console.log(chalk.gray('     → Check: bun run vault:monitor status'));
    console.log(chalk.gray('     → Restart: bun run vault:monitor start'));

    console.log(chalk.blue.bold('\n📞 Getting Help:'));
    console.log(chalk.white('  📖 Read STANDARDS.md for formatting guidelines'));
    console.log(chalk.white('  📖 Read README.md for vault overview'));
    console.log(chalk.white('  🔍 Check 08 - Logs/vault-automation.log for activity'));
    console.log(chalk.white('  📊 Run bun run vault:status for current state'));

    console.log(chalk.blue.bold('\n💡 Pro Tips:'));
    console.log(chalk.white('  💾 Run setup after cloning vault to new location'));
    console.log(chalk.white('  ⏰ Enable monitor for hands-free maintenance'));
    console.log(chalk.white('  🧹 Use cleanup monthly to archive old content'));
    console.log(chalk.white('  📈 Check status weekly for vault health'));
    console.log(chalk.white('  🎯 Use templates for consistent formatting'));

    console.log(chalk.gray('\n' + '='.repeat(55)));
    console.log(chalk.blue('🏛️  Odds Protocol Vault Automation System v1.0.0'));
    console.log(chalk.gray('Knowledge management with automated organization'));
}

// Run help
if (import.meta.main) {
    showHelp();
}

export { showHelp };
