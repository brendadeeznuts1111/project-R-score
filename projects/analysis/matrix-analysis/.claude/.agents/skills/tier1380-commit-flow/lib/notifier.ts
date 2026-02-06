#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Notifier
 * Desktop notifications for commit events
 */

interface NotificationOptions {
	title: string;
	message: string;
	type?: "success" | "warning" | "error";
}

const ICONS = {
	success: "✅",
	warning: "⚠️",
	error: "❌",
};

async function sendNotification(options: NotificationOptions): Promise<void> {
	const icon = ICONS[options.type || "success"];

	// Try macOS notification
	if (process.platform === "darwin") {
		try {
			const { $ } = await import("bun");
			await $`osascript -e ${`display notification "${options.message}" with title "${options.title}"`}`.quiet();
			return;
		} catch {
			// Fall through to console
		}
	}

	// Console fallback
	console.log(`${icon} ${options.title}: ${options.message}`);
}

async function notifyCommitSuccess(hash: string): Promise<void> {
	await sendNotification({
		title: "Commit Successful",
		message: `Created commit ${hash.slice(0, 7)}`,
		type: "success",
	});
}

async function notifyViolation(file: string, line: number): Promise<void> {
	await sendNotification({
		title: "Col-89 Violation",
		message: `${file}:${line} exceeds 89 characters`,
		type: "warning",
	});
}

async function notifyError(message: string): Promise<void> {
	await sendNotification({
		title: "Tier-1380 Error",
		message,
		type: "error",
	});
}

// Main for testing
if (import.meta.main) {
	const type = (Bun.argv[2] as "success" | "warning" | "error") || "success";

	await sendNotification({
		title: "Test Notification",
		message: "This is a test notification from Tier-1380",
		type,
	});
}

export { sendNotification, notifyCommitSuccess, notifyViolation, notifyError };
