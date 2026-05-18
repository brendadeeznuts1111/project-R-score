#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-sleep-which-demo
 * 
 * Bun Sleep Which Demo
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

console.info(chalk.blue.bold('⏰ Bun.sleep() & Bun.which() Demo'));
console.info(chalk.gray('Demonstrating timing and executable detection utilities\n'));

// Demonstrate Bun.which() with various options
console.info(chalk.yellow('🔍 Bun.which() Examples:'));

// Basic executable detection
const bunPath = Bun.which('bun');
const nodePath = Bun.which('node');
const npmPath = Bun.which('npm');

console.info(chalk.gray(`   🔍 Bun executable: ${bunPath || 'Not found'}`));
console.info(chalk.gray(`   🔍 Node executable: ${nodePath || 'Not found'}`));
console.info(chalk.gray(`   🔍 NPM executable: ${npmPath || 'Not found'}`));

// With custom PATH
const customNodePath = Bun.which('node', {
    PATH: '/usr/bin:/usr/local/bin:/opt/homebrew/bin'
});
console.info(chalk.gray(`   🔍 Node with custom PATH: ${customNodePath || 'Not found'}`));

// With specific directory
const localScript = Bun.which('demo', {
    cwd: '/tmp',
    PATH: ''
});
console.info(chalk.gray(`   📂 Demo script in /tmp: ${localScript || 'Not found'}`));

// Demonstrate Bun.sleep() - async
console.info(chalk.yellow('\n⏰ Bun.sleep() Examples:'));

console.info(chalk.gray('   Starting async sleep demonstration...'));

const sleepDemo = async () => {
    console.info(chalk.gray('   ⏰ Sleeping for 1 second asynchronously...'));
    const start = Date.now();
    await Bun.sleep(1000);
    const end = Date.now();
    console.info(chalk.green(`   ✅ Slept for ${end - start}ms`));

    console.info(chalk.gray('   📅 Sleeping until 2 seconds from now...'));
    const futureDate = new Date(Date.now() + 2000);
    const start2 = Date.now();
    await Bun.sleep(futureDate);
    const end2 = Date.now();
    console.info(chalk.green(`   ✅ Slept for ${end2 - start2}ms until specific time`));
};

// Demonstrate Bun.sleepSync() - blocking
console.info(chalk.gray('\n💤 Bun.sleepSync() Example (blocking):'));
console.info(chalk.gray('   💤 Blocking sleep for 1 second...'));
const startSync = Date.now();
Bun.sleepSync(1000);
const endSync = Date.now();
console.info(chalk.green(`   ✅ Blocked for ${endSync - startSync}ms`));

// Run the async demo
await sleepDemo();

// Practical examples
console.info(chalk.blue('\n💡 Practical Usage Examples:'));

console.info(chalk.gray('   // Retry mechanism with exponential backoff'));
console.info(chalk.gray('   async function retryWithBackoff(fn, maxRetries = 3) {'));
console.info(chalk.gray('     for (let i = 0; i < maxRetries; i++) {'));
console.info(chalk.gray('       try { return await fn(); } catch (error) {'));
console.info(chalk.gray('         if (i === maxRetries - 1) throw error;'));
console.info(chalk.gray('         await Bun.sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s'));
console.info(chalk.gray('       }'));
console.info(chalk.gray('     }'));
console.info(chalk.gray('   }'));

console.info(chalk.gray('\n   // Rate limiting'));
console.info(chalk.gray('   async function rateLimit() {'));
console.info(chalk.gray('     await Bun.sleep(100); // 100ms between requests'));
console.info(chalk.gray('     // Make API call'));
console.info(chalk.gray('   }'));

console.info(chalk.gray('\n   // Executable detection for tool availability'));
console.info(chalk.gray('   function checkTools() {'));
console.info(chalk.gray('     const hasGit = Bun.which("git");'));
console.info(chalk.gray('     const hasDocker = Bun.which("docker");'));
console.info(chalk.gray('     const hasBrew = Bun.which("brew", { PATH: "/opt/homebrew/bin:/usr/local/bin" });'));
console.info(chalk.gray('     return { hasGit, hasDocker, hasBrew };'));
console.info(chalk.gray('   }'));

console.info(chalk.gray('\n   // Scheduled tasks'));
console.info(chalk.gray('   async function runAtSpecificTime() {'));
console.info(chalk.gray('     const targetTime = new Date("2025-01-01T00:00:00Z");'));
console.info(chalk.gray('     await Bun.sleep(targetTime);'));
console.info(chalk.gray('     // Run New Year task'));
console.info(chalk.gray('   }'));

// Performance comparison note
console.info(chalk.blue('\n📊 Performance Notes:'));
console.info(chalk.gray('   • Bun.sleep() is non-blocking and efficient'));
console.info(chalk.gray('   • Bun.sleepSync() blocks the entire thread'));
console.info(chalk.gray('   • Bun.which() uses system PATH and is very fast'));
console.info(chalk.gray('   • Date-based sleep is precise for scheduling'));

console.info(chalk.green('\n✅ Demo completed!'));
