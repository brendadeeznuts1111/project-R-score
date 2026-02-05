/**
 * Telegram Mini-App Authentication
 * Validates user access based on team membership
 */

import { Elysia } from "elysia";

interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
}

interface AuthConfig {
	botToken: string;
	allowedUsers: string[];
}

const TEAM_MAINTAINERS = [
	"alex.chen@yourcompany.com",
	"jordan.lee@yourcompany.com",
	"priya.patel@yourcompany.com",
];

export function telegramAuth(config: AuthConfig) {
	return new Elysia()
		.derive(async ({ headers }) => {
			// Extract Telegram Web App init data
			const initData = headers["x-telegram-init-data"];

			if (!initData) {
				return { authenticated: false, user: null };
			}

			// In production, validate Telegram init data signature
			// For now, check if user is in allowed list
			try {
				const params = new URLSearchParams(initData);
				const userStr = params.get("user");

				if (!userStr) {
					return { authenticated: false, user: null };
				}

				const user: TelegramUser = JSON.parse(userStr);

				// Check if user email matches team maintainers
				// In production, map Telegram user ID to email via database
				const userEmail = `${user.username}@yourcompany.com`;

				if (TEAM_MAINTAINERS.includes(userEmail)) {
					return {
						authenticated: true,
						user: {
							id: user.id,
							name: `${user.first_name} ${user.last_name || ""}`.trim(),
							email: userEmail,
						},
					};
				}

				return { authenticated: false, user: null };
			} catch (error) {
				return { authenticated: false, user: null };
			}
		})
		.onBeforeHandle(({ authenticated }) => {
			// Protect routes that require authentication
			if (!authenticated) {
				return new Response("Unauthorized", { status: 401 });
			}
		});
}
