#!/usr/bin/env bun
/**
 * Generate dashboard data from API
 * Creates a JSON file that can be loaded into the dashboard
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const OUTPUT_FILE = process.env.DASHBOARD_DATA_FILE || "dashboard/data/latest.json";

interface DashboardData {
	timestamp: string;
	api?: {
		status: string;
		endpoints?: number;
		uptime?: number;
	};
	telegram?: {
		topics?: Array<{
			message_thread_id: number;
			name: string;
			icon_color?: number;
		}>;
		messages?: Array<{
			timestamp: string;
			threadId?: number;
			message: string;
			pinned?: boolean;
			success?: boolean;
		}>;
		status?: {
			connected: boolean;
			messagesProcessed?: number;
		};
	};
}

async function fetchAPIHealth(): Promise<DashboardData["api"]> {
	try {
		const response = await fetch(`${API_BASE}/health`, {
			signal: AbortSignal.timeout(3000),
		});

		if (response.ok) {
			const data = await response.json();
			return {
				status: "online",
				uptime: data.uptime,
			};
		}
	} catch (error) {
		// Ignore
	}

	return { status: "offline" };
}

async function fetchAPIDiscovery(): Promise<number | undefined> {
	try {
		const response = await fetch(`${API_BASE}/discovery`, {
			signal: AbortSignal.timeout(3000),
		});

		if (response.ok) {
			const data = await response.json();
			return data.endpoints?.length;
		}
	} catch (error) {
		// Ignore
	}
}

async function fetchTelegramStatus(): Promise<DashboardData["telegram"]> {
	const result: DashboardData["telegram"] = {};

	// Get bot status
	try {
		const response = await fetch(`${API_BASE}/telegram/bot/status`, {
			signal: AbortSignal.timeout(3000),
		});

		if (response.ok) {
			const data = await response.json();
			if (data.status === "ok" && data.data) {
				result.status = {
					connected: data.data.telegramConnected || false,
					messagesProcessed: data.data.messagesProcessed,
				};
			}
		}
	} catch (error) {
		// Ignore
	}

	// Get topics
	try {
		const response = await fetch(`${API_BASE}/telegram/topics`, {
			signal: AbortSignal.timeout(3000),
		});

		if (response.ok) {
			const data = await response.json();
			if (data.status === "ok" && data.data) {
				result.topics = data.data;
			}
		}
	} catch (error) {
		// Ignore
	}

	return result;
}

async function loadMessageLogs(): Promise<DashboardData["telegram"]["messages"]> {
	try {
		// Try to read from log file
		const logDir = process.env.TELEGRAM_LOG_DIR || "data/telegram-logs";
		const today = new Date().toISOString().split("T")[0];
		const logFile = `${logDir}/telegram-${today}.jsonl`;

		if (await Bun.file(logFile).exists()) {
			const text = await Bun.file(logFile).text();
			const lines = text.trim().split("\n").filter(Boolean);

			return lines
				.slice(-20) // Last 20 messages
				.map((line) => JSON.parse(line))
				.reverse();
		}
	} catch (error) {
		// Ignore
	}

	return [];
}

async function main(): Promise<void> {
	console.log(`📊 Generating dashboard data...\n`);
	console.log(`   API: ${API_BASE}`);
	console.log(`   Output: ${OUTPUT_FILE}\n`);

	const data: DashboardData = {
		timestamp: new Date().toISOString(),
	};

	// Fetch API status
	console.log(`🔍 Fetching API status...`);
	const apiHealth = await fetchAPIHealth();
	const endpointCount = await fetchAPIDiscovery();
	data.api = {
		...apiHealth,
		endpoints: endpointCount,
	};
	console.log(`   Status: ${data.api.status}`);

	// Fetch Telegram data
	console.log(`🔍 Fetching Telegram data...`);
	const telegramData = await fetchTelegramStatus();
	const messages = await loadMessageLogs();
	data.telegram = {
		...telegramData,
		messages: messages.length > 0 ? messages : undefined,
	};
	console.log(`   Topics: ${data.telegram.topics?.length || 0}`);
	console.log(`   Messages: ${data.telegram.messages?.length || 0}`);

	// Write output
	await Bun.write(OUTPUT_FILE, JSON.stringify(data, null, 2));
	console.log(`\n✅ Dashboard data written to: ${OUTPUT_FILE}`);
}

main().catch((error) => {
	console.error("❌ Error:");
	console.error(error);
	process.exit(1);
});
