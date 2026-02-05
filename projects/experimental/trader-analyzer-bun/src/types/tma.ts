/**
 * @fileoverview 9.1.1.11.2.0.0.0: Telegram Mini App (TMA) Type Definitions - Trading UI Data Structures
 * @description TypeScript interfaces for Telegram Mini App (TMA) trading functionality, providing
 *              comprehensive type definitions for real-time trading dashboard, bookmaker balances,
 *              alert management, interactive data visualization, direct trading execution, and
 *              action triggers. All types follow the hierarchical versioning system per section
 *              9.1.1.11.0.0.0: Telegram Mini App (TMA) for In-Telegram Operational & Trading Control.
 * @module src/types/tma
 *
 * [[TMA][MODULE][INSTANCE][META:{blueprint=BP-TYPES-TMA@9.1.1.11.2.0.0.0;instance-id=TMA-TYPES-001;version=9.1.1.11.2.0.0.0}]
 * [PROPERTIES:{types={value:"TMATypes";@root:"ROOT-TYPES";@chain:["BP-TYPES","BP-TELEGRAM","BP-TMA"];@version:"9.1.1.11.2.0.0.0"}}]
 * [TYPES:TMATradingDashboardData,TMAOpportunitySummary,TMABalanceOverview,TMABookmakerBalance,TMAAlertSummary,TMAAlertActionRequest,TMAGraphData,TMAGraphSeries,TMAGraphOptions,TMATradeOrderRequest,TMATradeOrderResponse,TMAActionTriggerRequest][#REF:v-9.1.1.11.2.0.0.0.BP.TYPES.TMA.1.0.A.1.1.TYPE.1.1]
 *
 * Version: 9.1.1.11.2.0.0.0
 * Component: Telegram Mini App Type Definitions
 * Ripgrep Pattern: 9\.1\.1\.11\.2\.0\.0\.0|TMA-TYPES-001|BP-TYPES-TMA@9\.1\.1\.11\.2\.0\.0\.0|TMATradingDashboardData|TMAOpportunitySummary|TMABalanceOverview|TMABookmakerBalance|TMAAlertSummary|TMATradeOrderRequest|TMATradeOrderResponse
 *
 * @see 9.1.1.11.0.0.0 for Telegram Mini App (TMA) Overview
 * @see 9.1.1.11.2.1.0 for Real-time Trading Dashboard
 * @see 9.1.1.11.2.2.0 for Bookmaker Balance & Liquidity Overview
 * @see 9.1.1.11.2.3.0 for Dynamic Alert Management & Action
 * @see 9.1.1.11.2.4.0 for Interactive Data Visualization (Graphs)
 * @see 9.1.1.11.2.5.0 for Direct Trading Execution Module
 * @see 9.1.1.11.2.6.0 for Action Triggers
 * @see https://core.telegram.org/bots/webapps Telegram Web Apps Documentation
 *
 * // Ripgrep: 9.1.1.11.2.0.0.0
 * // Ripgrep: TMA-TYPES-001
 * // Ripgrep: BP-TYPES-TMA@9.1.1.11.2.0.0.0
 */

/**
 * 9.1.1.11.2.1.0: TMA Trading Dashboard Data
 *
 * Real-time trading dashboard data structure for TMA display.
 * Provides a concise overview of active trading opportunities and positions.
 * Per section 9.1.1.11.2.1.0: Real-time Trading Dashboard
 *
 * @interface TMATradingDashboardData
 * @version 9.1.1.11.2.1.0.0.0
 * @component TMA Trading Dashboard Data
 */
export interface TMATradingDashboardData {
	/**
	 * 9.1.1.11.2.1.0.1: Current aggregated Profit & Loss across all active positions, in USD.
	 */
	live_pnl_usd: number;
	
	/**
	 * 9.1.1.11.2.1.0.2: Total capital available for trading, in USD.
	 */
	available_capital_usd: number;
	
	/**
	 * 9.1.1.11.2.1.0.3: Number of currently active bets/positions.
	 */
	open_positions_count: number;
	
	/**
	 * 9.1.1.11.2.1.0.4: List of current trading opportunities.
	 * @see TMAOpportunitySummary
	 */
	active_opportunities: TMAOpportunitySummary[];
}

/**
 * Referenced Type: TMA Opportunity Summary
 *
 * Summary of a trading opportunity displayed in the dashboard.
 * Referenced by TMATradingDashboardData (9.1.1.11.2.1.0.4).
 *
 * @interface TMAOpportunitySummary
 * @version 9.1.1.11.2.1.1.0.0.0
 * @component TMA Opportunity Summary
 */
export interface TMAOpportunitySummary {
	/**
	 * 9.1.1.11.2.1.1.1: Unique ID for the opportunity.
	 */
	opportunity_id: string;
	
	/**
	 * 9.1.1.11.2.1.1.2: Type of opportunity.
	 * - `arbitrage`: ConcealedArbitrageScanner opportunity
	 * - `covert_steam`: CovertSteamEvent opportunity
	 */
	type: "arbitrage" | "covert_steam";
	
	/**
	 * 9.1.1.11.2.1.1.3: Primary bookmaker involved (e.g., "DraftKings", "FanDuel").
	 */
	bookmaker_name: string;
	
	/**
	 * 9.1.1.11.2.1.1.4: Name of the event (e.g., "NFL-2025-001").
	 */
	event_name: string;
	
	/**
	 * 9.1.1.11.2.1.1.5: Estimated profit if successfully executed, in USD.
	 */
	estimated_profit_usd: number;
	
	/**
	 * 9.1.1.11.2.1.1.6: Current state of the opportunity.
	 * - `new`: Recently detected
	 * - `active`: Currently being tracked
	 * - `expiring`: Opportunity window closing soon
	 */
	status: "new" | "active" | "expiring";
}

/**
 * 9.1.1.11.2.2.0: TMA Balance Overview
 *
 * Interface representing the aggregated balance overview for the TMA.
 * Provides granular insights into Hyper-Bun's funds held across various bookmakers,
 * crucial for managing capital and exploiting ConcealedArbitrageScanner opportunities.
 * Per section 9.1.1.11.2.2.0: Bookmaker Balance & Liquidity Overview
 *
 * @interface TMABalanceOverview
 * @version 9.1.1.11.2.2.0.0.0
 * @component TMA Balance Overview
 */
export interface TMABalanceOverview {
	/**
	 * 9.1.1.11.2.2.0.1: The total aggregated capital available for trading across all bookmakers
	 * and Hyper-Bun's internal reserve, expressed in USD.
	 */
	total_available_usd: number;

	/**
	 * 9.1.1.11.2.2.0.2: An array containing detailed balance information for each integrated bookmaker.
	 * @see TMABookmakerBalance
	 */
	bookmaker_balances: TMABookmakerBalance[];
}

/**
 * 9.1.1.11.2.2.0.3: TMA Bookmaker Balance
 *
 * Interface representing the detailed balance and exposure for a single bookmaker.
 * Provides a granular view of funds, helping to manage liquidity and risk.
 * Per section 9.1.1.11.2.2.1: Per-Bookmaker Account Balances
 *
 * @interface TMABookmakerBalance
 * @version 9.1.1.11.2.2.0.3.0.0.0
 * @component TMA Bookmaker Balance
 */
export interface TMABookmakerBalance {
	/**
	 * 9.1.1.11.2.2.0.3.1: The official name of the bookmaker (e.g., "DraftKings", "FanDuel").
	 */
	bookmaker_name: string;

	/**
	 * 9.1.1.11.2.2.0.3.2: The current cash balance held at this specific bookmaker, in USD.
	 */
	current_balance_usd: number;

	/**
	 * 9.1.1.11.2.2.0.3.3: The amount of funds currently committed or exposed in open bets
	 * with this bookmaker, in USD.
	 */
	exposure_usd: number;

	/**
	 * 9.1.1.11.2.2.0.3.4: The net amount of USD available for placing new bets with this bookmaker
	 * (calculated as `current_balance_usd - exposure_usd`).
	 */
	available_for_bet_usd: number;
}

/**
 * 9.1.1.11.2.4.0: TMA Graph Data
 *
 * Interactive data visualization graph data structure.
 * Embeds lightweight, interactive graphs to visualize critical market data or system performance trends.
 * Per section 9.1.1.11.2.4.0: Interactive Data Visualization (Graphs)
 *
 * @interface TMAGraphData
 * @version 9.1.1.11.2.4.0.0.0
 * @component TMA Graph Data
 */
export interface TMAGraphData {
	/**
	 * 9.1.1.11.2.4.0.1: Unique ID for the graph instance.
	 */
	graph_id: string;

	/**
	 * 9.1.1.11.2.4.0.2: Type of graph.
	 * - `line_movement`: Line movement tracking (dark vs visible lines)
	 * - `performance_trend`: Performance trend visualization
	 * - `correlation`: Correlation analysis graphs
	 */
	type: "line_movement" | "performance_trend" | "correlation";

	/**
	 * 9.1.1.11.2.4.0.3: Title for the graph.
	 */
	title: string;

	/**
	 * 9.1.1.11.2.4.0.4: Data series for the graph.
	 * @see TMAGraphSeries
	 */
	series: TMAGraphSeries[];

	/**
	 * 9.1.1.11.2.4.0.5: Optional display options (e.g., Y-axis range).
	 * @see TMAGraphOptions
	 */
	options?: TMAGraphOptions;
}

/**
 * 9.1.1.11.2.4.0.6: TMA Graph Series
 *
 * Data series for graph visualization.
 * Referenced by TMAGraphData (9.1.1.11.2.4.0.4).
 * Per section 9.1.1.11.2.4.1-9.1.1.11.2.4.3: Graph types
 *
 * @interface TMAGraphSeries
 * @version 9.1.1.11.2.4.0.6.0.0.0
 * @component TMA Graph Series
 */
export interface TMAGraphSeries {
	/**
	 * 9.1.1.11.2.4.0.6.1: Name of the series (e.g., 'Dark Line', 'Visible Line').
	 */
	name: string;

	/**
	 * 9.1.1.11.2.4.0.6.2: Array of X (timestamp) and Y (value) data points.
	 */
	data: { x: number; y: number }[];

	/**
	 * 9.1.1.11.2.4.0.6.3: Optional color for the series.
	 */
	color?: string;
}

/**
 * 9.1.1.11.2.4.0.7: TMA Graph Options
 *
 * Display options for graph visualization.
 * Referenced by TMAGraphData (9.1.1.11.2.4.0.5).
 *
 * @interface TMAGraphOptions
 * @version 9.1.1.11.2.4.0.7.0.0.0
 * @component TMA Graph Options
 */
export interface TMAGraphOptions {
	/**
	 * 9.1.1.11.2.4.0.7.1: Label for the Y-axis.
	 */
	y_axis_label?: string;

	/**
	 * 9.1.1.11.2.4.0.7.2: Format for the X-axis.
	 * - `time`: Timestamp-based formatting
	 * - `category`: Category-based formatting
	 */
	x_axis_format?: "time" | "category";

	/**
	 * 9.1.1.11.2.4.0.7.3: Minimum Y-axis value.
	 */
	min_y?: number;

	/**
	 * 9.1.1.11.2.4.0.7.4: Maximum Y-axis value.
	 */
	max_y?: number;
}

/**
 * 9.1.1.11.2.6.0: TMA Action Trigger Request
 *
 * Request structure for triggering predefined Hyper-Bun CLI commands or internal API endpoints.
 * Provides buttons to trigger actions like "Pause DraftKings Market Data" or "Rerun Performance Test".
 * Per section 9.1.1.11.2.6.0: Action Triggers
 *
 * @interface TMAActionTriggerRequest
 * @version 9.1.1.11.2.6.0.0.0
 * @component TMA Action Trigger Request
 */
export interface TMAActionTriggerRequest {
	/**
	 * 9.1.1.11.2.6.0.1: Unique ID for the predefined action (e.g., 'PAUSE_DK_FEED', 'RERUN_PERF_TEST').
	 */
	action_id: string;
	
	/**
	 * 9.1.1.11.2.6.0.2: Optional parameters for the action (e.g., { pr_number: "123" }).
	 */
	parameters?: Record<string, any>;
	
	/**
	 * 9.1.1.11.2.6.0.3: Telegram WebApp user ID initiating the action.
	 */
	user_id: string;
	
	/**
	 * 9.1.1.11.2.6.0.4: Optional 2FA code for critical actions.
	 * Required for actions that modify system state or affect trading operations.
	 */
	confirmation_code?: string;
}

/**
 * TMA Action Trigger Response
 */
export interface TMAActionTriggerResponse {
	success: boolean;
	action_id: string;
	result?: any;
	message: string;
	execution_time_ms?: number;
}

/**
 * 9.1.1.11.2.5.0: TMA Trade Order Request
 *
 * Request structure for placing bets directly from the TMA.
 * The most critical feature enabling authorized operators to execute trades directly within Telegram.
 * Per section 9.1.1.11.2.5.0: Direct Trading Execution Module (CORE TRADING UI)
 *
 * @interface TMATradeOrderRequest
 * @version 9.1.1.11.2.5.0.0.0
 * @component TMA Trade Order Request
 */
export interface TMATradeOrderRequest {
	/**
	 * 9.1.1.11.2.5.0.1: Optional ID of the opportunity this trade is based on.
	 * Automatically populated from ConcealedArbitrageScanner results or CovertSteamEventRecords.
	 */
	opportunity_id?: string;
	
	/**
	 * 9.1.1.11.2.5.0.2: Identifier for the specific MarketOfferingNode to bet on.
	 */
	market_node_id: string;
	
	/**
	 * 9.1.1.11.2.5.0.3: Target bookmaker name (e.g., "DraftKings", "FanDuel").
	 */
	bookmaker_name: string;
	
	/**
	 * 9.1.1.11.2.5.0.4: Line value the trade is attempting to take (for spreads/totals).
	 */
	proposed_line_value: number;
	
	/**
	 * 9.1.1.11.2.5.0.5: Odds value the trade is attempting to take (for moneylines).
	 */
	proposed_odds_value: number;
	
	/**
	 * 9.1.1.11.2.5.0.6: Amount of USD to stake.
	 */
	stake_amount_usd: number;
	
	/**
	 * 9.1.1.11.2.5.0.7: Trade type.
	 * - `buy`: Take over (betting on over/positive side)
	 * - `sell`: Take under/against (betting on under/negative side)
	 */
	trade_type: "buy" | "sell";
	
	/**
	 * 9.1.1.11.2.5.0.8: Telegram WebApp user ID initiating the trade.
	 */
	user_id: string;
	
	/**
	 * 9.1.1.11.2.5.0.9: Optional 2FA code for high-stakes bets.
	 * Required for trades exceeding configured threshold (per section 9.1.1.11.2.5.4).
	 */
	confirmation_code?: string;
}

/**
 * 9.1.1.11.2.5.0: TMA Trade Order Response
 *
 * Response structure for trade order requests.
 * Provides status, order IDs, and updated bookmaker balances after trade execution attempt.
 * Per section 9.1.1.11.2.5.0: Direct Trading Execution Module
 *
 * @interface TMATradeOrderResponse
 * @version 9.1.1.11.2.5.0.0.0
 * @component TMA Trade Order Response
 */
export interface TMATradeOrderResponse {
	/**
	 * 9.1.1.11.2.5.0.10: True if trade was accepted, false otherwise.
	 */
	success: boolean;
	
	/**
	 * 9.1.1.11.2.5.0.11: Hyper-Bun's internal order ID (if trade was accepted).
	 */
	order_id?: string;
	
	/**
	 * 9.1.1.11.2.5.0.12: Bookmaker's order ID (if trade was successfully placed).
	 */
	bookmaker_order_id?: string;
	
	/**
	 * 9.1.1.11.2.5.0.13: Human-readable status message (e.g., "Trade placed", "Insufficient funds").
	 */
	status_message: string;
	
	/**
	 * 9.1.1.11.2.5.0.14: Actual amount staked (can differ from requested amount).
	 */
	executed_amount_usd?: number;
	
	/**
	 * 9.1.1.11.2.5.0.15: Specific error code on failure (e.g., "INSUFFICIENT_FUNDS", "MARKET_CLOSED").
	 */
	error_code?: string;
	
	/**
	 * 9.1.1.11.2.5.0.16: Updated bookmaker balances after trade attempt.
	 * @see TMABookmakerBalance
	 */
	bookmaker_balances_updated: TMABookmakerBalance[];
}

/**
 * TMA Trade Execution Request (Legacy)
 *
 * Legacy trade execution request format (kept for backward compatibility).
 * New code should use TMATradeOrderRequest (9.1.1.11.2.5.0).
 *
 * @interface TMATradeExecutionRequest
 * @deprecated Use TMATradeOrderRequest instead
 */
export interface TMATradeExecutionRequest {
	/** MarketOfferingNode ID (pre-filled from alert/opportunity) */
	market_node_id: string;
	/** Target bookmaker name */
	bookmaker_name: string;
	/** Stake in USD */
	stake_amount_usd: number;
	/** Line value (for spreads/totals) */
	line_value?: number;
	/** Odds value (for moneylines) */
	odds_value?: number;
	/** Bet side */
	side: "over" | "under" | "home" | "away";
	/** Trade source */
	source: "covert-steam" | "arbitrage" | "manual";
	/** Associated alert ID (if from CovertSteamEvent) */
	alert_id?: string;
	/** Associated opportunity ID (if from ConcealedArbitrageScanner) */
	opportunity_id?: string;
	/** 2FA code for high-stakes bets (required if stakeAmount >= threshold) */
	two_factor_code?: string;
	/** Telegram WebApp user ID */
	user_id: string;
}

/**
 * 9.1.1.11.2.5.3: TMA Risk Assessment
 *
 * Risk assessment data displayed before trade confirmation
 * Per section 9.1.1.11.2.5.3: Confirmation & Risk Assessment
 */
export interface TMARiskAssessment {
	/** Risk level */
	risk_level: "low" | "medium" | "high";
	/** Maximum potential loss */
	max_loss: number;
	/** Expected value/profit */
	expected_value: number;
	/** Confidence score (0-1) */
	confidence: number;
	/** Estimated arbitrage profit percentage (from ShadowArbitrageScanner) */
	estimated_arb_profit_percentage?: number;
	/** Whether two-factor confirmation is required */
	requires_two_factor: boolean;
}

/**
 * TMA Trade Execution Response (Legacy)
 *
 * Legacy trade execution response format (kept for backward compatibility).
 * New code should use TMATradeOrderResponse (9.1.1.11.2.5.0).
 *
 * @interface TMATradeExecutionResponse
 * @deprecated Use TMATradeOrderResponse instead
 */
export interface TMATradeExecutionResponse {
	success: boolean;
	trade_id: string;
	status: "pending" | "confirmed" | "rejected";
	message: string;
	estimated_pnl?: number;
	risk_assessment?: TMARiskAssessment;
	bookmaker_response?: {
		bet_id: string;
		status: string;
		placed_at: number;
	};
}

/**
 * 9.1.1.11.2.3.0: TMA Alert Summary
 *
 * Alert summary data structure for TMA display.
 * Provides a list of recent alerts with filtering and acknowledgment capabilities.
 * Per section 9.1.1.11.2.3.0: Dynamic Alert Management & Action
 *
 * @interface TMAAlertSummary
 * @version 9.1.1.11.2.3.0.0.0
 * @component TMA Alert Summary
 */
export interface TMAAlertSummary {
	/**
	 * 9.1.1.11.2.3.0.1: Unique ID of the alert instance.
	 */
	alert_id: string;
	
	/**
	 * 9.1.1.11.2.3.0.2: Type of alert.
	 * - `covert_steam`: CovertSteamEvent detected
	 * - `perf_regression`: Performance regression detected
	 * - `url_anomaly`: URL anomaly pattern detected
	 */
	alert_type: "covert_steam" | "perf_regression" | "url_anomaly";
	
	/**
	 * 9.1.1.11.2.3.0.3: Severity score (0-10), where 10 is most critical.
	 */
	severity: number;
	
	/**
	 * 9.1.1.11.2.3.0.4: Timestamp when the alert was detected, in milliseconds since epoch.
	 */
	timestamp_ms: number;
	
	/**
	 * 9.1.1.11.2.3.0.5: Concise summary of the alert.
	 */
	short_description: string;
	
	/**
	 * 9.1.1.11.2.3.0.6: Current status of the alert.
	 * - `new`: Alert not yet acknowledged
	 * - `acknowledged`: Alert acknowledged by operator
	 * - `resolved`: Alert resolved or dismissed
	 */
	status: "new" | "acknowledged" | "resolved";
	
	/**
	 * 9.1.1.11.2.3.0.7: Deep-link URL to full details in main dashboard.
	 * Cross-reference: 9.1.1.9.1.0.0 (Deep-Linked Message RFC)
	 */
	deeplink_url: string;
}

/**
 * 9.1.1.11.2.3.3: TMA Alert Action Request
 *
 * Request structure for acknowledging, dismissing, or escalating alerts.
 * Per section 9.1.1.11.2.3.3: Acknowledge/Dismiss
 *
 * @interface TMAAlertActionRequest
 * @version 9.1.1.11.2.3.3.0.0.0
 * @component TMA Alert Action Request
 */
export interface TMAAlertActionRequest {
	/**
	 * 9.1.1.11.2.3.3.1: ID of the alert to act upon.
	 */
	alert_id: string;
	
	/**
	 * 9.1.1.11.2.3.3.2: Action to perform on the alert.
	 * - `acknowledge`: Mark alert as acknowledged
	 * - `dismiss`: Dismiss the alert
	 * - `escalate`: Escalate to higher priority
	 */
	action: "acknowledge" | "dismiss" | "escalate";
	
	/**
	 * 9.1.1.11.2.3.3.3: Telegram WebApp user ID performing the action.
	 */
	user_id: string;
}

/**
 * TMA Alert List Response
 *
 * Response structure for alert list queries (legacy format, kept for backward compatibility).
 *
 * @interface TMAAlertListResponse
 * @version 9.1.1.11.2.3.0.0.0
 * @component TMA Alert List Response
 */
export interface TMAAlertListResponse {
	alerts: Array<{
		id: string;
		type: "covert-steam" | "perf-regression" | "arbitrage" | "security";
		severity: number;
		title: string;
		description: string;
		bookmaker?: string;
		event_identifier?: string;
		market_node_id?: string;
		timestamp: number;
		acknowledged: boolean;
		deep_link: string;
	}>;
	total: number;
	filters: {
		severity?: number;
		bookmaker?: string;
		type?: string;
	};
}
