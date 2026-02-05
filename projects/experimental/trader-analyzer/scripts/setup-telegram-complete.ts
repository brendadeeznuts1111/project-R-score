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
	console.log(`\n${'='.repeat(60)}`);
	console.log(`Running: ${scriptPath}`);
	console.log('='.repeat(60));

	const proc = Bun.spawn(['bun', 'run', scriptPath], {
		stdout: 'inherit',
		stderr: 'inherit',
	});

	const exitCode = await proc.exited;
	return exitCode === 0;
}

async function setupComplete() {
	console.log('🚀 Starting Complete Telegram Bot Setup...\n');

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

	console.log('\n' + '='.repeat(60));
	if (allSuccess) {
		console.log('✅ Complete Telegram Bot Setup Successful!');
		console.log('\n📋 Summary:');
		console.log('   ✅ Bot commands configured');
		console.log('   ✅ Menu buttons configured');
		console.log('\n💡 Next Steps:');
		console.log('   1. Test commands in Telegram: /sports_correlation');
		console.log('   2. Verify menu buttons appear in supergroup');
		console.log('   3. Test mini-app URLs are accessible');
	} else {
		console.log('❌ Complete Telegram Bot Setup Failed');
		console.log('   Check errors above and fix issues');
		process.exit(1);
	}
	console.log('='.repeat(60));
}

if (import.meta.main) {
	setupComplete().catch((error) => {
		console.error('❌ Setup failed:', error);
		process.exit(1);
	});
}
