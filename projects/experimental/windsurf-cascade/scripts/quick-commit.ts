#!/usr/bin/env bun
/**
 * Quick Commit Script
 * 
 * Simple script to commit all current changes with organized messages
 */

import { execSync } from 'child_process';

const categories = [
    {
        name: 'Core Package Updates',
        patterns: ['packages/odds-core/', 'packages/odds-websocket/', 'packages/testing/'],
        message: 'feat: update core packages and utilities'
    },
    {
        name: 'Configuration Files',
        patterns: ['.github/', '*.yml', '*.yaml', '*.toml'],
        message: 'config: update CI configuration and workflows'
    },
    {
        name: 'Documentation',
        patterns: ['*.md', 'docs/'],
        message: 'docs: update project documentation and guides'
    },
    {
        name: 'Scripts',
        patterns: ['scripts/'],
        message: 'feat: add file sorting and organization scripts'
    },
    {
        name: 'Source Code',
        patterns: ['src/'],
        message: 'feat: implement source code modules and utilities'
    }
];

console.log('🚀 Quick Commit - Organizing changes by category...');

try {
    for (const category of categories) {
        console.log(`\n📝 Processing ${category.name}...`);

        // Try to add files for this category
        for (const pattern of category.patterns) {
            try {
                if (pattern.includes('/')) {
                    execSync(`git add ${pattern}`, { stdio: 'pipe' });
                } else {
                    execSync(`git add ${pattern}`, { stdio: 'pipe' });
                }
            } catch (error) {
                // Ignore if no files match pattern
            }
        }

        // Check if we have anything to commit
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        const stagedFiles = status.split('\n').filter(line =>
            line.trim() && (line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D '))
        );

        if (stagedFiles.length > 0) {
            execSync(`git commit -m "${category.message}"`, { stdio: 'inherit' });
            console.log(`✅ Committed ${stagedFiles.length} files: ${category.message}`);
        }
    }

    // Add any remaining files
    console.log('\n📝 Processing remaining files...');
    execSync('git add .', { stdio: 'pipe' });

    const finalStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    const finalStaged = finalStatus.split('\n').filter(line =>
        line.trim() && (line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D '))
    );

    if (finalStaged.length > 0) {
        execSync('git commit -m "chore: add remaining files and configuration"', { stdio: 'inherit' });
        console.log(`✅ Committed ${finalStaged.length} remaining files`);
    }

    console.log('\n🎉 All changes committed successfully!');
    console.log('\n📋 Recent commits:');
    execSync('git log --oneline -5', { stdio: 'inherit' });

} catch (error) {
    console.error('❌ Error during commit:', error);
    process.exit(1);
}
