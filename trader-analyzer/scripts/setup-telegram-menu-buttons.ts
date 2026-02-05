#!/usr/bin/env bun
/**
 * @fileoverview Telegram Menu Buttons Setup for All Teams
 * @description Configure menu buttons for all team mini-apps in Telegram supergroup
 */

import { TELEGRAM_SUPERGROUP_ID } from '@graph/telegram/topics';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const MINI_APP_BASE_URL =
	process.env.MINI_APP_BASE_URL || 'https://mini-apps.graph-engine.yourcompany.com';

// Menu buttons for each team mini-app
const menuButtons = [
	{
		chat_id: TELEGRAM_SUPERGROUP_ID,
		menu_button: {
			type: 'web_app',
			text: '🏀 Sports App',
			web_app: {
				url: `${MINI_APP_BASE_URL}/sports-correlation`,
			},
		},
		description: 'Sports Correlation Team Mini-App',
	},
	{
		chat_id: TELEGRAM_SUPERGROUP_ID,
		menu_button: {
			type: 'web_app',
			text: '📊 Markets App',
			web_app: {
				url: `${MINI_APP_BASE_URL}/market-analytics`,
			},
		},
		description: 'Market Analytics Team Mini-App',
	},
	{
		chat_id: TELEGRAM_SUPERGROUP_ID,
		menu_button: {
			type: 'web_app',
			text: '🔧 Platform App',
			web_app: {
				url: `${MINI_APP_BASE_URL}/platform-tools`,
			},
		},
		description: 'Platform & Tools Team Mini-App',
	},
];

async function setupMenuButtons() {
	if (!TELEGRAM_BOT_TOKEN) {
		console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
		process.exit(1);
	}

	console.log('🔧 Setting up Telegram Menu Buttons...');
	console.log(`📱 Mini-App Base URL: ${MINI_APP_BASE_URL}`);
	console.log(`💬 Supergroup ID: ${TELEGRAM_SUPERGROUP_ID}\n`);

	let successCount = 0;
	let failCount = 0;

	for (const config of menuButtons) {
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						chat_id: config.chat_id,
						menu_button: config.menu_button,
					}),
				}
			);

			if (response.ok) {
				console.log(`✅ ${config.description} menu button configured`);
				successCount++;
			} else {
				const error = await response.text();
				console.error(`❌ Failed to configure ${config.description}:`, error);
				failCount++;
			}
		} catch (error) {
			console.error(`❌ Error configuring ${config.description}:`, error);
			failCount++;
		}
	}

	console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);

	if (failCount === 0) {
		console.log('\n✅ All Telegram Menu Buttons setup complete!');
		console.log('\n💡 Note: Only one menu button can be active per chat.');
		console.log('   Consider using commands or inline keyboards for multiple options.');
	} else {
		console.log('\n⚠️  Some menu buttons failed to configure.');
		process.exit(1);
	}
}

if (import.meta.main) {
	setupMenuButtons().catch((error) => {
		console.error('❌ Setup failed:', error);
		process.exit(1);
	});
}
