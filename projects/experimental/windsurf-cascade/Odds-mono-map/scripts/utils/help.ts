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
    console.info(chalk.blue.bold('🏛️  Odds Protocol Vault Automation Help'));
    console.info(chalk.gray('='.repeat(55)));

    console.info(chalk.blue.bold('\n📋 Available Commands:'));

    console.info(chalk.white('\n🚀 Setup & Initialization:'));
    console.info(chalk.gray('  bun run vault:setup      - Initialize vault automation system'));
    console.info(chalk.gray('  bun run vault:help       - Show this help message'));

    console.info(chalk.white('\n🔧 Organization & Maintenance:'));
    console.info(chalk.gray('  bun run vault:organize   - Organize files into proper folders'));
    console.info(chalk.gray('  bun run vault:validate   - Check vault compliance with standards'));
    console.info(chalk.gray('  bun run vault:fix        - Auto-fix common validation issues'));
    console.info(chalk.gray('  bun run vault:cleanup    - Deep cleanup and archiving'));

    console.info(chalk.white('\n👁️  Monitoring & Status:'));
    console.info(chalk.gray('  bun run vault:monitor    - Start/stop vault monitoring'));
    console.info(chalk.gray('  bun run vault:status     - Show current vault status'));
    console.info(chalk.gray('  bun run vault:daily      - Run daily validation routine'));

    console.info(chalk.white('\n📏 Standards & Quality:'));
    console.info(chalk.gray('  bun run vault:standards  - Check compliance with standards'));

    console.info(chalk.blue.bold('\n🎯 Common Workflows:'));

    console.info(chalk.white('\n1️⃣  Initial Setup:'));
    console.info(chalk.gray('   bun run vault:setup'));
    console.info(chalk.gray('   bun run vault:organize'));
    console.info(chalk.gray('   bun run vault:validate'));
    console.info(chalk.gray('   bun run vault:fix'));

    console.info(chalk.white('\n2️⃣  Daily Maintenance:'));
    console.info(chalk.gray('   bun run vault:daily'));
    console.info(chalk.gray('   bun run vault:status'));

    console.info(chalk.white('\n3️⃣  Enable Automation:'));
    console.info(chalk.gray('   bun run vault:monitor start'));
    console.info(chalk.gray('   bun run vault:status'));

    console.info(chalk.white('\n4️⃣  Fix Issues:'));
    console.info(chalk.gray('   bun run vault:validate'));
    console.info(chalk.gray('   bun run vault:fix'));
    console.info(chalk.gray('   bun run vault:organize'));

    console.info(chalk.blue.bold('\n📁 Vault Structure:'));
    console.info(chalk.white('  🏠 Home.md                    # Navigation hub'));
    console.info(chalk.white('  ├── 00 - Dashboard.md          # Command center'));
    console.info(chalk.white('  ├── 01 - Daily Notes/          # Chronological logs'));
    console.info(chalk.white('  │   ├── 01 - Reports/           # Daily reports'));
    console.info(chalk.white('  │   ├── 02 - Journals/          # Daily journal entries'));
    console.info(chalk.white('  │   └── 03 - Actions/           # Action items and tasks'));
    console.info(chalk.white('  ├── 02 - Architecture/         # System design'));
    console.info(chalk.white('  │   ├── 01 - Data Models/       # Data models and schemas'));
    console.info(chalk.white('  │   ├── 02 - System Design/     # System design documents'));
    console.info(chalk.white('  │   └── 03 - Patterns/          # Design patterns and best practices'));
    console.info(chalk.white('  ├── 03 - Development/          # Code & testing'));
    console.info(chalk.white('  │   ├── 01 - Code Snippets/     # Code examples and snippets'));
    console.info(chalk.white('  │   ├── 02 - Testing/           # Testing documentation and results'));
    console.info(chalk.white('  │   └── 03 - Tools/             # Development tools and utilities'));
    console.info(chalk.white('  ├── 04 - Documentation/        # Guides & API docs'));
    console.info(chalk.white('  │   ├── 01 - API/               # API documentation'));
    console.info(chalk.white('  │   ├── 02 - Guides/            # User guides and tutorials'));
    console.info(chalk.white('  │   ├── 03 - Reports/           # Analysis and review reports'));
    console.info(chalk.white('  │   └── 04 - Reference/         # Reference materials'));
    console.info(chalk.white('  ├── 05 - Assets/              # Media files'));
    console.info(chalk.white('  │   ├── 01 - Images/            # Image files and graphics'));
    console.info(chalk.white('  │   ├── 02 - Media/             # Audio, video, and other media'));
    console.info(chalk.white('  │   └── 03 - Resources/         # External resources and references'));
    console.info(chalk.white('  ├── 06 - Templates/           # Template system'));
    console.info(chalk.white('  │   ├── 01 - Note Templates/    # Note-taking templates'));
    console.info(chalk.white('  │   ├── 02 - Project Templates/ # Project management templates'));
    console.info(chalk.white('  │   ├── 03 - Dashboard Templates/# Dashboard templates'));
    console.info(chalk.white('  │   ├── 04 - Development Templates/# Development templates'));
    console.info(chalk.white('  │   ├── 05 - Design Templates/   # Design templates'));
    console.info(chalk.white('  │   ├── 06 - Architecture Templates/# Architecture templates'));
    console.info(chalk.white('  │   └── 07 - Configuration Templates/# Configuration file templates'));
    console.info(chalk.white('  ├── 07 - Archive/              # Archived content'));
    console.info(chalk.white('  │   ├── 01 - Old Projects/      # Completed or obsolete projects'));
    console.info(chalk.white('  │   ├── 02 - Deprecated/        # Deprecated features and code'));
    console.info(chalk.white('  │   └── 03 - Backups/           # Backup files and archives'));
    console.info(chalk.white('  ├── 08 - Logs/                 # Logs and monitoring'));
    console.info(chalk.white('  │   ├── 01 - Validation/        # Validation logs and reports'));
    console.info(chalk.white('  │   ├── 02 - Automation/        # Automation activity logs'));
    console.info(chalk.white('  │   ├── 03 - Errors/            # Error logs and debugging info'));
    console.info(chalk.white('  │   └── 04 - Performance/       # Performance monitoring logs'));
    console.info(chalk.white('  ├── 09 - Testing/              # Testing framework'));
    console.info(chalk.white('  │   ├── 01 - Unit/             # Unit tests'));
    console.info(chalk.white('  │   ├── 02 - Integration/      # Integration tests'));
    console.info(chalk.white('  │   ├── 03 - E2E/               # End-to-end tests'));
    console.info(chalk.white('  │   └── 04 - Performance/       # Performance tests'));
    console.info(chalk.white('  └── 10 - Benchmarking/         # Performance analysis'));
    console.info(chalk.white('      ├── 01 - Benchmarks/       # Core benchmarking scripts'));
    console.info(chalk.white('      ├── 02 - Performance/      # Performance analysis data'));
    console.info(chalk.white('      └── 03 - Reports/           # Generated benchmark reports'));

    console.info(chalk.blue.bold('\n🔧 Configuration Templates:'));
    console.info(chalk.white('  📄 .vault-config.json         # Automation settings'));
    console.info(chalk.white('  📄 .vault-status.json         # Current status'));
    console.info(chalk.white('  📄 package.json               # NPM scripts and deps'));
    console.info(chalk.white('  📄 08 - Logs/vault-automation.log  # Activity log'));

    console.info(chalk.blue.bold('\n⚙️  Automation Features:'));
    console.info(chalk.white('  ✅ Automatic file organization'));
    console.info(chalk.white('  ✅ Real-time monitoring'));
    console.info(chalk.white('  ✅ Validation and fixes'));
    console.info(chalk.white('  ✅ Template application'));
    console.info(chalk.white('  ✅ Compliance tracking'));
    console.info(chalk.white('  ✅ Activity logging'));

    console.info(chalk.blue.bold('\n🎪 Bun Utilities Demo:'));
    console.info(chalk.white('  bun run vault:demo     - Show Bun.inspect.table() and Bun.nanoseconds() features'));
    console.info(chalk.gray('     → Table formatting for reports'));
    console.info(chalk.gray('     → High-precision timing utilities'));
    console.info(chalk.gray('     → Performance measurement tools'));

    console.info(chalk.blue.bold('\n📝 Heading Templates:'));
    console.info(chalk.white('  bun run vault:templates - Show type-safe heading templates'));
    console.info(chalk.gray('     → Document type templates'));
    console.info(chalk.gray('     → Variable substitution'));
    console.info(chalk.gray('     → Type-safe validation'));

    console.info(chalk.blue.bold('\n🧪 Type Testing:'));
    console.info(chalk.white('  bun run test:types    - Run comprehensive type tests'));
    console.info(chalk.gray('     → Bun expectTypeOf validation'));
    console.info(chalk.gray('     → Interface structure checks'));
    console.info(chalk.gray('     → Type safety verification'));

    console.info(chalk.blue.bold('\n🏭 Factory Patterns:'));
    console.info(chalk.white('  bun run vault:factory  - Show factory & utility patterns'));
    console.info(chalk.gray('     → Builder pattern examples'));
    console.info(chalk.gray('     → Repository pattern demo'));
    console.info(chalk.gray('     → Service container showcase'));

    console.info(chalk.blue.bold('\n🏠 Dynamic Homepages:'));
    console.info(chalk.white('  bun run vault:homepages - Generate contextual homepages'));
    console.info(chalk.gray('     → Factory-based homepage creation'));
    console.info(chalk.gray('     → Context-aware templates'));
    console.info(chalk.gray('     → Automated workflow generation'));

    console.info(chalk.blue.bold('\n📊 Enhanced Dashboards:'));
    console.info(chalk.white('  bun run vault:dashboards - Create advanced dashboards'));
    console.info(chalk.gray('     → Productivity & analytics templates'));
    console.info(chalk.gray('     → Dynamic widget configuration'));
    console.info(chalk.gray('     → Responsive layout system'));

    console.info(chalk.blue.bold('\n🔧 Template System:'));
    console.info(chalk.white('  bun run vault:templates:validate - Validate template integration'));
    console.info(chalk.gray('     → Complete template system validation'));
    console.info(chalk.gray('     → Type compatibility verification'));
    console.info(chalk.gray('     → Template registry testing'));

    console.info(chalk.blue.bold('\n🎨 Quality Standards:'));
    console.info(chalk.white('  📋 YAML frontmatter requirements'));
    console.info(chalk.white('  📝 Heading hierarchy and formatting'));
    console.info(chalk.white(`  📏 Line length limits (${SIZE_CONSTANTS.MAX_LINE_LENGTH} chars)`));
    console.info(chalk.white('  🏷️  Tag standardization'));
    console.info(chalk.white('  📁 File naming conventions'));
    console.info(chalk.white('  🔗 Link validation'));

    console.info(chalk.blue.bold('\n🚨 Troubleshooting:'));
    console.info(chalk.white('  ❌ Files not organizing?'));
    console.info(chalk.gray('     → Run: bun run vault:organize'));
    console.info(chalk.gray('     → Check: bun run vault:status'));

    console.info(chalk.white('  ❌ Validation errors?'));
    console.info(chalk.gray('     → Run: bun run vault:fix'));
    console.info(chalk.gray('     → Review: bun run vault:validate'));

    console.info(chalk.white('  ❌ Monitor not working?'));
    console.info(chalk.gray('     → Check: bun run vault:monitor status'));
    console.info(chalk.gray('     → Restart: bun run vault:monitor start'));

    console.info(chalk.blue.bold('\n📞 Getting Help:'));
    console.info(chalk.white('  📖 Read STANDARDS.md for formatting guidelines'));
    console.info(chalk.white('  📖 Read README.md for vault overview'));
    console.info(chalk.white('  🔍 Check 08 - Logs/vault-automation.log for activity'));
    console.info(chalk.white('  📊 Run bun run vault:status for current state'));

    console.info(chalk.blue.bold('\n💡 Pro Tips:'));
    console.info(chalk.white('  💾 Run setup after cloning vault to new location'));
    console.info(chalk.white('  ⏰ Enable monitor for hands-free maintenance'));
    console.info(chalk.white('  🧹 Use cleanup monthly to archive old content'));
    console.info(chalk.white('  📈 Check status weekly for vault health'));
    console.info(chalk.white('  🎯 Use templates for consistent formatting'));

    console.info(chalk.gray('\n' + '='.repeat(55)));
    console.info(chalk.blue('🏛️  Odds Protocol Vault Automation System v1.0.0'));
    console.info(chalk.gray('Knowledge management with automated organization'));
}

// Run help
if (import.meta.main) {
    showHelp();
}

export { showHelp };
