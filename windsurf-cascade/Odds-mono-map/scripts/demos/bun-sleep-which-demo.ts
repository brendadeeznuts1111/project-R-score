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

console.log(chalk.blue.bold('⏰ Bun.sleep() & Bun.which() Demo'));
console.log(chalk.gray('Demonstrating timing and executable detection utilities\n'));

// Demonstrate Bun.which() with various options
console.log(chalk.yellow('🔍 Bun.which() Examples:'));

// Basic executable detection
const bunPath = Bun.which('bun');
const nodePath = Bun.which('node');
const npmPath = Bun.which('npm');

console.log(chalk.gray(`   🔍 Bun executable: ${bunPath || 'Not found'}`));
console.log(chalk.gray(`   🔍 Node executable: ${nodePath || 'Not found'}`));
console.log(chalk.gray(`   🔍 NPM executable: ${npmPath || 'Not found'}`));

// With custom PATH
const customNodePath = Bun.which('node', {
    PATH: '/usr/bin:/usr/local/bin:/opt/homebrew/bin'
});
console.log(chalk.gray(`   🔍 Node with custom PATH: ${customNodePath || 'Not found'}`));

// With specific directory
const localScript = Bun.which('demo', {
    cwd: '/tmp',
    PATH: ''
});
console.log(chalk.gray(`   📂 Demo script in /tmp: ${localScript || 'Not found'}`));

// Demonstrate Bun.sleep() - async
console.log(chalk.yellow('\n⏰ Bun.sleep() Examples:'));

console.log(chalk.gray('   Starting async sleep demonstration...'));

const sleepDemo = async () => {
    console.log(chalk.gray('   ⏰ Sleeping for 1 second asynchronously...'));
    const start = Date.now();
    await Bun.sleep(1000);
    const end = Date.now();
    console.log(chalk.green(`   ✅ Slept for ${end - start}ms`));

    console.log(chalk.gray('   📅 Sleeping until 2 seconds from now...'));
    const futureDate = new Date(Date.now() + 2000);
    const start2 = Date.now();
    await Bun.sleep(futureDate);
    const end2 = Date.now();
    console.log(chalk.green(`   ✅ Slept for ${end2 - start2}ms until specific time`));
};

// Demonstrate Bun.sleepSync() - blocking
console.log(chalk.gray('\n💤 Bun.sleepSync() Example (blocking):'));
console.log(chalk.gray('   💤 Blocking sleep for 1 second...'));
const startSync = Date.now();
Bun.sleepSync(1000);
const endSync = Date.now();
console.log(chalk.green(`   ✅ Blocked for ${endSync - startSync}ms`));

// Run the async demo
await sleepDemo();

// Practical examples
console.log(chalk.blue('\n💡 Practical Usage Examples:'));

console.log(chalk.gray('   // Retry mechanism with exponential backoff'));
console.log(chalk.gray('   async function retryWithBackoff(fn, maxRetries = 3) {'));
console.log(chalk.gray('     for (let i = 0; i < maxRetries; i++) {'));
console.log(chalk.gray('       try { return await fn(); } catch (error) {'));
console.log(chalk.gray('         if (i === maxRetries - 1) throw error;'));
console.log(chalk.gray('         await Bun.sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s'));
console.log(chalk.gray('       }'));
console.log(chalk.gray('     }'));
console.log(chalk.gray('   }'));

console.log(chalk.gray('\n   // Rate limiting'));
console.log(chalk.gray('   async function rateLimit() {'));
console.log(chalk.gray('     await Bun.sleep(100); // 100ms between requests'));
console.log(chalk.gray('     // Make API call'));
console.log(chalk.gray('   }'));

console.log(chalk.gray('\n   // Executable detection for tool availability'));
console.log(chalk.gray('   function checkTools() {'));
console.log(chalk.gray('     const hasGit = Bun.which("git");'));
console.log(chalk.gray('     const hasDocker = Bun.which("docker");'));
console.log(chalk.gray('     const hasBrew = Bun.which("brew", { PATH: "/opt/homebrew/bin:/usr/local/bin" });'));
console.log(chalk.gray('     return { hasGit, hasDocker, hasBrew };'));
console.log(chalk.gray('   }'));

console.log(chalk.gray('\n   // Scheduled tasks'));
console.log(chalk.gray('   async function runAtSpecificTime() {'));
console.log(chalk.gray('     const targetTime = new Date("2025-01-01T00:00:00Z");'));
console.log(chalk.gray('     await Bun.sleep(targetTime);'));
console.log(chalk.gray('     // Run New Year task'));
console.log(chalk.gray('   }'));

// Performance comparison note
console.log(chalk.blue('\n📊 Performance Notes:'));
console.log(chalk.gray('   • Bun.sleep() is non-blocking and efficient'));
console.log(chalk.gray('   • Bun.sleepSync() blocks the entire thread'));
console.log(chalk.gray('   • Bun.which() uses system PATH and is very fast'));
console.log(chalk.gray('   • Date-based sleep is precise for scheduling'));

console.log(chalk.green('\n✅ Demo completed!'));
