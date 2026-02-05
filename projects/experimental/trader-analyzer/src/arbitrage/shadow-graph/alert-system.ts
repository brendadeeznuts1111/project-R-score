/**
 * @fileoverview 1.1.1.1.1.6.0: Shadow-Graph Alert System
 * @description Alert system for hidden steam and arbitrage detection
 * @module arbitrage/shadow-graph/alert-system
 */

import { Database } from "bun:sqlite";
import { YAML } from "bun";
import { readFile } from "fs/promises";
import type { HiddenSteamEvent } from "./types";
import type { ShadowArbitrageOpportunity } from "./shadow-arb-scanner";

/**
 * Alert action types
 */
type AlertAction =
	| { action: "log"; level: string; tags: string[]; format?: string }
	| {
			action: "webhook";
			url: string;
			method: string;
			headers: Record<string, string>;
			payload: Record<string, string>;
	  }
	| {
			action: "pause_market";
			market_id: string;
			duration_ms: number;
			reason: string;
	  }
	| {
			action: "notify_trader";
			priority: string;
			channel?: string;
			message: string;
	  }
	| {
			action: "queue_trade";
			strategy: string;
			max_size: string;
			profit_target: string;
	  };

/**
 * Alert rule definition
 */
interface AlertRule {
	rule_type: string;
	severity: string;
	params: Record<string, unknown>;
	evaluator: string; // Lambda function as string
	actions: AlertAction[];
}

/**
 * Alert system configuration
 */
interface AlertSystemConfig {
	alerts: Record<string, AlertRule>;
}

/**
 * 1.1.1.1.1.6.0: Shadow Graph Alert System
 *
 * Processes hidden steam events and arbitrage opportunities,
 * evaluates alert rules, and executes action chains
 */
export class ShadowGraphAlertSystem {
	private config: AlertSystemConfig;

	constructor(
		private db: Database,
		configPath: string = "./config/shadow-graph-alerts.yaml", // Uses SHADOW_GRAPH_PATHS.ALERT_CONFIG
	) {
		// Load YAML config synchronously (for constructor)
		// Note: In production, consider async loading or lazy initialization
		this.config = this.loadConfigSync(configPath);
	}

	/**
	 * Load alert configuration from YAML (synchronous)
	 */
	private loadConfigSync(path: string): AlertSystemConfig {
		try {
			// Use Bun.file() which supports synchronous text() in some contexts
			// For better compatibility, we'll use readFileSync via require
			const { readFileSync } = require("fs");
			const content = readFileSync(path, "utf-8");
			const parsed = YAML.parse(content) as any;

			// Handle both formats: direct `alerts:` or nested `alert_system.alerts:`
			if (parsed.alerts) {
				return { alerts: parsed.alerts };
			} else if (parsed.alert_system?.alerts) {
				return { alerts: parsed.alert_system.alerts };
			}

			console.warn(`Alert config file ${path} has unexpected structure, using empty config`);
			return { alerts: {} };
		} catch (error) {
			// File doesn't exist or parse error - use empty config
			if ((error as any).code === "ENOENT") {
				console.warn(`Alert config file not found: ${path}, using empty config`);
			} else {
				console.error(`Failed to load alert config from ${path}:`, error);
			}
			return { alerts: {} };
		}
	}

	/**
	 * Process hidden steam event and trigger alerts
	 */
	async processHiddenSteamEvent(event: HiddenSteamEvent): Promise<void> {
		// Find matching alert rules
		const rules = Object.values(this.config.alerts).filter(
			(rule) => rule.rule_type === "hidden_steam",
		);

		for (const rule of rules) {
			// Evaluate rule
			const context = {
				hidden_move_size: event.hiddenMoveSize,
				visible_lag_ms: event.visibleLagMs,
				sharp_money_indicator: event.sharpMoneyIndicator,
				severity: event.severity,
				eventId: event.eventId,
				visibleNodeId: event.visibleNodeId,
				hiddenNodeId: event.hiddenNodeId,
				timestamp: event.detectedAt,
			};

			const shouldTrigger = this.evaluateRule(rule, context);

			if (shouldTrigger) {
				await this.executeActions(rule.actions, context);
			}
		}
	}

	/**
	 * Process arbitrage opportunity and trigger alerts
	 */
	async processArbitrageOpportunity(
		opportunity: ShadowArbitrageOpportunity,
	): Promise<void> {
		const rules = Object.values(this.config.alerts).filter(
			(rule) => rule.rule_type === "shadow_arb",
		);

		for (const rule of rules) {
			const context = {
				profit: opportunity.profit,
				confidence: opportunity.confidence,
				capacity: opportunity.capacity,
				edgeId: opportunity.edgeId,
				detectedAt: opportunity.detectedAt,
			};

			const shouldTrigger = this.evaluateRule(rule, context);

			if (shouldTrigger) {
				await this.executeActions(rule.actions, context);
			}
		}
	}

	/**
	 * Evaluate alert rule using lambda function
	 */
	private evaluateRule(
		rule: AlertRule,
		context: Record<string, unknown>,
	): boolean {
		try {
			// Merge rule params into context for evaluator access
			const fullContext = {
				...context,
				...rule.params,
			};

			// Parse and execute evaluator lambda
			// The evaluator string should be a function body that returns a boolean
			// Example: "(context) => { return context.isRLM && context.confidence >= context.min_confidence; }"
			const evaluatorFn = new Function("context", `return (${rule.evaluator})(context)`);
			const evaluator = evaluatorFn();
			return evaluator(fullContext);
		} catch (error) {
			console.error(`Error evaluating alert rule ${rule.rule_type}:`, error);
			console.error(`Evaluator: ${rule.evaluator}`);
			console.error(`Context:`, context);
			return false;
		}
	}

	/**
	 * Execute alert actions
	 */
	private async executeActions(
		actions: AlertAction[],
		context: Record<string, unknown>,
	): Promise<void> {
		for (const action of actions) {
			try {
				switch (action.action) {
					case "log":
						await this.executeLogAction(action, context);
						break;
					case "webhook":
						await this.executeWebhookAction(action, context);
						break;
					case "pause_market":
						await this.executePauseMarketAction(action, context);
						break;
					case "notify_trader":
						await this.executeNotifyTraderAction(action, context);
						break;
					case "queue_trade":
						await this.executeQueueTradeAction(action, context);
						break;
				}
			} catch (error) {
				console.error(`Error executing action ${action.action}:`, error);
			}
		}
	}

	/**
	 * Execute log action
	 */
	private async executeLogAction(
		action: Extract<AlertAction, { action: "log" }>,
		context: Record<string, unknown>,
	): Promise<void> {
		const message = JSON.stringify(context, null, 2);
		const logMethod = console[action.level as keyof Console] as ((...args: unknown[]) => void) | undefined;
		if (logMethod && typeof logMethod === "function") {
			logMethod(
				`[${action.tags.join(", ")}]`,
				message,
			);
		} else {
			console.log(`[${action.tags.join(", ")}]`, message);
		}
	}

	/**
	 * Execute webhook action
	 */
	private async executeWebhookAction(
		action: Extract<AlertAction, { action: "webhook" }>,
		context: Record<string, unknown>,
	): Promise<void> {
		// Replace template variables
		const url = this.replaceTemplates(action.url, context);
		const payload = this.replaceTemplatesInObject(action.payload, context);
		const headers = this.replaceTemplatesInObject(action.headers, context);

		await fetch(url, {
			method: action.method,
			headers,
			body: JSON.stringify(payload),
		});
	}

	/**
	 * Execute pause market action
	 */
	private async executePauseMarketAction(
		action: Extract<AlertAction, { action: "pause_market" }>,
		context: Record<string, unknown>,
	): Promise<void> {
		const marketId = this.replaceTemplates(action.market_id, context);
		// In production, implement market pausing logic
		console.log(
			`Pausing market ${marketId} for ${action.duration_ms}ms: ${action.reason}`,
		);
	}

	/**
	 * Execute notify trader action
	 */
	private async executeNotifyTraderAction(
		action: Extract<AlertAction, { action: "notify_trader" }>,
		context: Record<string, unknown>,
	): Promise<void> {
		const message = this.replaceTemplates(action.message, context);
		
		// Send to Telegram if channel is specified
		if (action.channel === "telegram") {
			try {
				const { createResearchReportSender, ResearchReportType, ReportSeverity } = await import("../../telegram/research-report-sender");
				const sender = await createResearchReportSender();
				
				// Determine severity from priority
				const severity = action.priority === "urgent" ? ReportSeverity.CRITICAL :
					action.priority === "high" ? ReportSeverity.HIGH :
					action.priority === "medium" ? ReportSeverity.WARNING :
					ReportSeverity.INFO;

				// Determine report type from context
				const reportType = context.rule_type === "shadow_arb" ? ResearchReportType.ARBITRAGE_OPPORTUNITY :
					context.rule_type === "hidden_steam" ? ResearchReportType.COVERT_STEAM_SCAN :
					ResearchReportType.SYSTEM_ALERT;

				await sender.sendReport({
					type: reportType,
					severity,
					title: `Alert: ${action.priority.toUpperCase()}`,
					summary: message,
					details: context,
					timestamp: Date.now(),
					eventId: context.eventId as string | undefined,
					bookmaker: context.bookmaker as string | undefined,
				});
			} catch (error) {
				console.error(`Failed to send Telegram notification:`, error);
				// Fallback to console log
				console.log(`[${action.priority.toUpperCase()}] ${message}`);
			}
		} else {
			// Fallback to console log for other channels
			console.log(`[${action.priority.toUpperCase()}] ${message}`);
		}
	}

	/**
	 * Execute queue trade action
	 */
	private async executeQueueTradeAction(
		action: Extract<AlertAction, { action: "queue_trade" }>,
		context: Record<string, unknown>,
	): Promise<void> {
		const maxSize = this.replaceTemplates(action.max_size, context);
		const profitTarget = this.replaceTemplates(action.profit_target, context);
		// In production, queue trade in trading system
		console.log(
			`Queueing trade: strategy=${action.strategy}, maxSize=${maxSize}, profitTarget=${profitTarget}`,
		);
	}

	/**
	 * Replace template variables in string
	 * Supports both ${var} and {var} formats
	 */
	private replaceTemplates(
		template: string,
		context: Record<string, unknown>,
	): string {
		// Replace ${var} format
		let result = template.replace(/\$\{(\w+)\}/g, (_, key) => {
			return String(context[key] ?? "");
		});
		// Replace {var} format
		result = result.replace(/\{(\w+)\}/g, (_, key) => {
			return String(context[key] ?? "");
		});
		return result;
	}

	/**
	 * Replace template variables in object
	 */
	private replaceTemplatesInObject(
		obj: Record<string, string>,
		context: Record<string, unknown>,
	): Record<string, string> {
		const result: Record<string, string> = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = this.replaceTemplates(value, context);
		}
		return result;
	}
}
