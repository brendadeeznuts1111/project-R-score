#!/usr/bin/env bun

/**
 * Setup Telegram Bot Commands and Mini-App Menu Button
 * For Sports Correlation Team Mini-App
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID || "1234567890";
const MINI_APP_URL =
	process.env.MINI_APP_URL ||
	"https://mini-apps.graph-engine.yourcompany.com/sports-correlation";

// Set up Telegram Bot Commands for Mini-App
const commands = [
	{
		command: "sports_correlation",
		description: "🏀 Open Sports Correlation Mini-App",
	},
	{
		command: "benchmark_layer4",
		description: "🏃 Run @graph/layer4 benchmark",
	},
	{
		command: "rfc_layer4",
		description: "📝 Submit RFC for @graph/layer4",
	},
	{
		command: "metrics",
		description: "📊 View team metrics",
	},
];

async function setupTelegramBot() {
	console.log("🔧 Setting up Telegram Bot Commands...");

	if (!TELEGRAM_BOT_TOKEN) {
		console.error("❌ TELEGRAM_BOT_TOKEN environment variable is required");
		process.exit(1);
	}

	// Set bot commands
	const response = await fetch(
		`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ commands }),
		},
	);

	if (response.ok) {
		console.log("✅ Bot commands configured");
	} else {
		const error = await response.text();
		console.error("❌ Failed to configure bot:", error);
		process.exit(1);
	}

	// Set Mini-App menu button
	const menuResponse = await fetch(
		`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: TELEGRAM_SUPERGROUP_ID,
				menu_button: {
					type: "web_app",
					text: "🏀 Sports App",
					web_app: { url: MINI_APP_URL },
				},
			}),
		},
	);

	if (menuResponse.ok) {
		console.log("✅ Mini-App menu button configured");
	} else {
		const error = await menuResponse.text();
		console.error("❌ Failed to configure menu:", error);
		process.exit(1);
	}

	console.log("\n✅ Telegram Bot setup complete!");
	console.log(`📱 Mini-App URL: ${MINI_APP_URL}`);
	console.log(`💬 Supergroup ID: ${TELEGRAM_SUPERGROUP_ID}`);
}

if (import.meta.main) {
	setupTelegramBot().catch((error) => {
		console.error("❌ Setup failed:", error);
		process.exit(1);
	});
}
