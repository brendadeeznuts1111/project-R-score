#!/usr/bin/env bun
/**
 * @fileoverview Centralized Telegram Bot Commands Setup
 * @description Configure all bot commands for all team mini-apps and shared commands
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const MINI_APP_BASE_URL =
	process.env.MINI_APP_BASE_URL || 'https://mini-apps.graph-engine.yourcompany.com';

// All bot commands for all teams and shared commands
const commands = [
	// Team Mini-Apps
	{
		command: 'sports_correlation',
		description: '🏀 Open Sports Correlation Mini-App',
	},
	{
		command: 'market_analytics',
		description: '📊 Open Market Analytics Mini-App',
	},
	{
		command: 'platform_tools',
		description: '🔧 Open Platform Tools Mini-App',
	},
	// Shared Commands
	{
		command: 'publish',
		description: '📤 Quick publish wizard',
	},
	{
		command: 'benchmark',
		description: '🏃 Run benchmark',
	},
	{
		command: 'rfc',
		description: '📝 Submit RFC',
	},
	// Team-specific shortcuts
	{
		command: 'benchmark_layer4',
		description: '🏃 Run @graph/layer4 benchmark',
	},
	{
		command: 'rfc_layer4',
		description: '📝 Submit RFC for @graph/layer4',
	},
	{
		command: 'benchmark_layer2',
		description: '🏃 Run @graph/layer2 benchmark',
	},
	{
		command: 'rfc_layer2',
		description: '📝 Submit RFC for @graph/layer2',
	},
	{
		command: 'benchmark_algorithms',
		description: '🏃 Run @graph/algorithms benchmark',
	},
	{
		command: 'rfc_algorithms',
		description: '📝 Submit RFC for @graph/algorithms',
	},
	{
		command: 'metrics',
		description: '📊 View team metrics',
	},
];

async function setupBotCommands() {
	if (!TELEGRAM_BOT_TOKEN) {
		console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
		process.exit(1);
	}

	console.info('🔧 Setting up Telegram Bot Commands...');
	console.info(`📱 Mini-App Base URL: ${MINI_APP_BASE_URL}\n`);

	// Set bot commands globally
	const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ commands }),
	});

	if (response.ok) {
		console.info('✅ Bot commands configured globally');
		console.info(`   Total commands: ${commands.length}\n`);
	} else {
		const error = await response.text();
		console.error('❌ Failed to configure bot commands:', error);
		process.exit(1);
	}

	// Display configured commands
	console.info('📋 Configured Commands:');
	commands.forEach((cmd, index) => {
		console.info(`   ${index + 1}. /${cmd.command} - ${cmd.description}`);
	});

	console.info('\n✅ Telegram Bot Commands setup complete!');
	console.info('\n💡 Usage:');
	console.info('   - Users can type /help in Telegram to see all commands');
	console.info('   - Commands are available globally for all users');
	console.info('   - Mini-apps can be opened via commands or menu buttons');
}

if (import.meta.main) {
	setupBotCommands().catch((error) => {
		console.error('❌ Setup failed:', error);
		process.exit(1);
	});
}
