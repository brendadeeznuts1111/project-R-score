#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-main-demo
 * 
 * Bun Main Demo
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,bun,runtime,performance
 */

#!/usr/bin/env bun

import chalk from 'chalk';

console.log(chalk.blue.bold('🎯 Bun.main & Execution Detection Demo'));
console.log(chalk.gray(`🏠 Bun.main: ${Bun.main}`));
console.log(chalk.gray(`📁 import.meta.path: ${import.meta.path}`));
console.log(chalk.gray(`⚡ Direct execution: ${import.meta.path === Bun.main}`));

if (import.meta.path === Bun.main) {
    console.log(chalk.green('✅ This script is being run directly with bun run'));
    console.log(chalk.gray('   You can see this because import.meta.path === Bun.main'));
} else {
    console.log(chalk.yellow('⚠️  This script is being imported from another script'));
    console.log(chalk.gray('   You can see this because import.meta.path !== Bun.main'));
}

// Export a function to test import behavior
export function demonstrateImport() {
    console.log(chalk.cyan('\n🔗 This function was called from an import'));
    console.log(chalk.gray(`   🏠 Bun.main is still: ${Bun.main}`));
    console.log(chalk.gray(`   📁 import.meta.path is now: ${import.meta.path}`));
    console.log(chalk.gray(`   ⚡ Direct execution: ${import.meta.path === Bun.main}`));
}

// Example of how to use this in practice
export function runIfDirect(callback: () => void) {
    if (import.meta.path === Bun.main) {
        console.log(chalk.green('\n🚀 Running because script is executed directly'));
        callback();
    } else {
        console.log(chalk.yellow('\n⏸️  Skipping because script is imported'));
    }
}

console.log(chalk.blue('\n💡 Usage Examples:'));
console.log(chalk.gray('   // Check if script is run directly'));
console.log(chalk.gray('   if (import.meta.path === Bun.main) {'));
console.log(chalk.gray('     Your direct execution code here'));
console.log(chalk.gray('   }'));
console.log(chalk.gray(''));
console.log(chalk.gray('   // Get the main entry point'));
console.log(chalk.gray('   const mainFile = Bun.main;'));
console.log(chalk.gray(''));
console.log(chalk.gray('   // Get current file path'));
console.log(chalk.gray('   const currentFile = import.meta.path;'));
