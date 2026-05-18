#!/usr/bin/env bun
/**
 * @fileoverview Complete Telegram Bot Setup
 * @description Run all Telegram bot setup scripts in sequence
 */


const scripts = [
	'scripts/setup-telegram-bot-commands.ts',
	'scripts/setup-telegram-menu-buttons.ts',
];

async function runScript(scriptPath: string): Promise<boolean> {
	console.info(`\n${'='.repeat(60)}`);
	console.info(`Running: ${scriptPath}`);
	console.info('='.repeat(60));

	const proc = Bun.spawn(['bun', 'run', scriptPath], {
		stdout: 'inherit',
		stderr: 'inherit',
	});

	const exitCode = await proc.exited;
	return exitCode === 0;
}

async function setupComplete() {
	console.info('🚀 Starting Complete Telegram Bot Setup...\n');

	if (!process.env.TELEGRAM_BOT_TOKEN) {
		console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
		process.exit(1);
	}

	let allSuccess = true;

	for (const script of scripts) {
		const success = await runScript(script);
		if (!success) {
			console.error(`\n❌ Failed: ${script}`);
			allSuccess = false;
		}
	}

	console.info('\n' + '='.repeat(60));
	if (allSuccess) {
		console.info('✅ Complete Telegram Bot Setup Successful!');
		console.info('\n📋 Summary:');
		console.info('   ✅ Bot commands configured');
		console.info('   ✅ Menu buttons configured');
		console.info('\n💡 Next Steps:');
		console.info('   1. Test commands in Telegram: /sports_correlation');
		console.info('   2. Verify menu buttons appear in supergroup');
		console.info('   3. Test mini-app URLs are accessible');
	} else {
		console.info('❌ Complete Telegram Bot Setup Failed');
		console.info('   Check errors above and fix issues');
		process.exit(1);
	}
	console.info('='.repeat(60));
}

if (import.meta.main) {
	setupComplete().catch((error) => {
		console.error('❌ Setup failed:', error);
		process.exit(1);
	});
}
