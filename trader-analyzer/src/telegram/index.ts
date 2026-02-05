/**
 * Telegram Module
 * Standardized Telegram integration for NEXUS platform
 *
 * @module src/telegram
 * @version 9.0.0.0.0.0.0
 *
 * @see {@link ../api/telegram-ws.ts|TelegramBotApi} - WebSocket server implementation
 * @see {@link ../docs/BUN-LATEST-BREAKING-CHANGES.md|Bun Latest Breaking Changes} - Bun.serve() TypeScript types
 * @see {@link ../docs/TELEGRAM-INTEGRATION.md|Telegram Integration Guide}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)} - Complete documentation
 * @see {@link ../docs/TELEGRAM-DEV-SETUP.md|Telegram Dev Setup Guide (9.1.1.0.0.0.0)} - Setup instructions
 * @see {@link ../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md|Console Depth Debugging} - Enhanced debugging with console depth
 *
 * **Features**:
 * - Secure bot configuration with `Bun.secrets` (9.1.1.1.1.1.0)
 * - Advanced topic/channel management (9.1.1.2.0.0.0)
 * - Bookmaker-specific routing (9.1.1.10.2.3.0)
 * - Market-specific topic routing (9.1.1.10.2.4.0)
 * - Load balancing & throttling (9.1.1.10.3.0.0)
 * - Message formatting & templating (9.1.1.9.0.0.0)
 * - UI feedback & control (9.1.3.0.0.0.0)
 * - Enhanced debugging with console depth support (7.0.0.0.0.0.0)
 *
 * **Debugging**:
 * - Use `--console-depth=10` for detailed debugging of Telegram operations
 * - Research report sender includes structured debug logging
 * - See {@link ../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md|Console Depth Debugging} for details
 *
 * **Note**: Telegram WebSocket server uses `Bun.serve<WebSocketData>()` with TypeScript generic types.
 * See {@link ../docs/BUN-LATEST-BREAKING-CHANGES.md|Bun Latest Breaking Changes} for migration details.
 */

export { TelegramBotApi } from "../api/telegram-ws.js";
export * from "./bookmaker-router.js";
export * from "./changelog-poster.js";
export * from "./client.js";
export * from "./constants.js";
export * from "./covert-steam-alert.js";
export * from "./covert-steam-sender.js";
export * from "./feed-monitor.js";
export * from "./github-webhook-handler.js";
export * from "./mini-app-context.js";
export * from "./monitor.js";
export * from "./research-report-sender.js";
export * from "./rss-poster.js";
export * from "./topic-mapping.js";

