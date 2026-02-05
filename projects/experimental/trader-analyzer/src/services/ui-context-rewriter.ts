#!/usr/bin/env bun
/**
 * @fileoverview 6.1.1.2.2.0.0: Core HTMLRewriter service for Hyper-Bun's frontend injection pipeline.
 * Centralizes dynamic UI context injection, feature-flag pruning, and RBAC enforcement at the edge.
 * This module ensures zero client-side configuration leakage and provides server-authoritative UI control.
 * @module src/services/ui-context-rewriter
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.1.1.2.2.0.0;instance-id=EXAMPLE-UI-CONTEXT-REWRITER-001;version=6.1.1.2.2.0.0}]
 * [PROPERTIES:{example={value:"UIContextRewriter Service";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.1.1.2.2.0.0"}}]
 * [CLASS:UIContextRewriter][#REF:v-6.1.1.2.2.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 *
 * Version: 6.1.1.2.2.0.0
 * Ripgrep Pattern: 6\.1\.1\.2\.2\.0\.0|EXAMPLE-UI-CONTEXT-REWRITER-001|BP-EXAMPLE@6\.1\.1\.2\.2\.0\.0
 *
 * @see 6.1.1.2.2.3.0 for Strategic Advantages
 * @see 6.1.1.2.2.2.5.0 for Graceful Degradation Pattern
 *
 * // Ripgrep: 6.1.1.2.2.0.0
 * // Ripgrep: EXAMPLE-UI-CONTEXT-REWRITER-001
 * // Ripgrep: BP-EXAMPLE@6.1.1.2.2.0.0
 */

// HTMLRewriter availability check
// Bun 1.3.3+: Improved TypeScript definitions for HTMLRewriter
// @see https://bun.com/blog/bun-v1.3.3#typescript-definitions
//
// HTMLRewriter is available globally in Bun 1.4+ or via --compat flag
// Type-safe runtime check
const HTMLRewriterClass: typeof HTMLRewriter | undefined =
	typeof globalThis !== "undefined" && "HTMLRewriter" in globalThis
		? (globalThis as any).HTMLRewriter
		: typeof Bun !== "undefined" && "HTMLRewriter" in Bun
			? (Bun as any).HTMLRewriter
			: undefined;

/**
 * 6.1.1.2.2.1.2.0: Runtime UI context injected into `window.HYPERBUN_UI_CONTEXT`.
 * Provides client-side code with server-derived configuration, eliminating hardcoded values.
 *
 * @see public/registry.html for data-attribute binding targets
 * @see 6.1.1.2.2.2.1.0 for injection mechanism
 *
 * @example 6.1.1.2.2.1.2.0.1: Basic UI Context Creation
 * // Test Formula:
 * // 1. Create HyperBunUIContext object with required properties
 * // 2. Verify all properties are correctly typed
 * // 3. Use context with UIContextRewriter
 * // Expected Result: Context object created successfully with all properties
 * //
 * // Snippet:
 * ```typescript
 * const context: HyperBunUIContext = {
 *   apiBaseUrl: 'http://localhost:3001',
 *   featureFlags: { shadowGraph: true, covertSteamAlerts: false },
 *   userRole: 'admin',
 *   debugMode: true,
 *   currentTimestamp: Date.now()
 * };
 * ```
 */
export interface HyperBunUIContext {
	/**
	 * 6.1.1.2.2.1.2.1: Fully-qualified API base URL derived from request headers.
	 * Supports reverse-proxy deployments (X-Forwarded-Proto/Host).
	 *
	 * @example 'https://api.hyperbun.com'
	 * @see 6.1.1.2.2.2.1.0 for injection mechanism
	 *
	 * @example 6.1.1.2.2.1.2.1.1: API Base URL Detection
	 * // Test Formula:
	 * // 1. Create request with X-Forwarded-Proto and Host headers
	 * // 2. Extract apiBaseUrl using createUIContextFromRequest()
	 * // 3. Verify URL matches expected format
	 * // Expected Result: apiBaseUrl correctly constructed from request headers
	 * //
	 * // Snippet:
	 * ```typescript
	 * const request = new Request('http://localhost:3001/registry.html', {
	 *   headers: {
	 *     'X-Forwarded-Proto': 'https',
	 *     'Host': 'api.hyperbun.com'
	 *   }
	 * });
	 * const context = createUIContextFromRequest(request);
	 * // context.apiBaseUrl === 'https://api.hyperbun.com'
	 * ```
	 */
	apiBaseUrl: string;

	/**
	 * 6.1.1.2.2.1.2.2: Feature toggle state map. Keys match `data-feature` attribute values.
	 * Enables A/B testing and kill-switches without redeployment.
	 *
	 * @example { shadowGraph: true, covertSteamAlerts: false }
	 * @see 6.1.1.2.2.2.2.0 for pruning logic
	 * @see public/registry.html for markup examples
	 *
	 * @example 6.1.1.2.2.1.2.2.1: Feature Flag Verification
	 * // Test Formula:
	 * // 1. Set feature flag to false in context
	 * // 2. Transform HTML with element containing data-feature attribute
	 * // 3. Verify element is removed from DOM
	 * // Expected Result: Element with disabled feature flag is removed
	 * //
	 * // Snippet:
	 * ```typescript
	 * const context: HyperBunUIContext = {
	 *   apiBaseUrl: 'http://localhost:3001',
	 *   featureFlags: { shadowGraph: false },
	 *   debugMode: false,
	 *   currentTimestamp: Date.now()
	 * };
	 * const html = '<div data-feature="shadowGraph">Content</div>';
	 * const rewriter = new UIContextRewriter(context).createRewriter();
	 * const result = rewriter.transform(html);
	 * // Result should not contain the div element
	 * ```
	 */
	featureFlags: Record<string, boolean>;

	/**
	 * 6.1.1.2.2.1.2.3: Authenticated role for RBAC pruning. `undefined` triggers guest fallback.
	 * Prevents exposure of admin UI elements to unauthorized clients.
	 *
	 * @example 'admin' | 'analyst' | 'guest'
	 * @see 6.1.1.2.2.2.3.0 for access control logic
	 *
	 * @example 6.1.1.2.2.1.2.3.1: Role-Based Access Control Verification
	 * // Test Formula:
	 * // 1. Set userRole to 'guest' in context
	 * // 2. Transform HTML with element containing data-access="admin"
	 * // 3. Verify element is removed from DOM
	 * // Expected Result: Element requiring admin access is removed for guest user
	 * //
	 * // Snippet:
	 * ```typescript
	 * const context: HyperBunUIContext = {
	 *   apiBaseUrl: 'http://localhost:3001',
	 *   featureFlags: {},
	 *   userRole: 'guest',
	 *   debugMode: false,
	 *   currentTimestamp: Date.now()
	 * };
	 * const html = '<div data-access="admin">Admin Content</div>';
	 * const rewriter = new UIContextRewriter(context).createRewriter();
	 * const result = rewriter.transform(html);
	 * // Result should not contain the admin div element
	 * ```
	 */
	userRole?: "analyst" | "admin" | "guest" | "developer";

	/**
	 * 6.1.1.2.2.1.2.4: Enables client-side debug logging and diagnostic panels.
	 * Must be `false` in production to prevent information disclosure.
	 *
	 * @example false
	 * @see public/registry.html for debugPanel conditional rendering
	 *
	 * @example 6.1.1.2.2.1.2.4.1: Debug Mode Verification
	 * // Test Formula:
	 * // 1. Set debugMode to true in context
	 * // 2. Transform HTML with element containing data-debug attribute
	 * // 3. Verify debug element is visible in DOM
	 * // Expected Result: Debug elements are visible when debugMode is true
	 * //
	 * // Snippet:
	 * ```typescript
	 * const context: HyperBunUIContext = {
	 *   apiBaseUrl: 'http://localhost:3001',
	 *   featureFlags: {},
	 *   debugMode: true,
	 *   currentTimestamp: Date.now()
	 * };
	 * const html = '<div data-debug>Debug Info</div>';
	 * const rewriter = new UIContextRewriter(context).createRewriter();
	 * const result = rewriter.transform(html);
	 * // Result should contain the debug div element
	 * ```
	 */
	debugMode: boolean;

	/**
	 * 6.1.1.2.2.1.2.5: Server epoch timestamp for client clock synchronization.
	 * Used to prevent timing attacks and ensure consistent event ordering.
	 *
	 * @example 1704067200450
	 * @see 6.1.1.2.2.2.4.0 for implantation logic
	 *
	 * @example 6.1.1.2.2.1.2.5.1: Timestamp Injection Verification
	 * // Test Formula:
	 * // 1. Set currentTimestamp to known value in context
	 * // 2. Transform HTML with element containing data-server-timestamp attribute
	 * // 3. Verify element content is set to formatted timestamp
	 * // Expected Result: Element content displays formatted server timestamp
	 * //
	 * // Snippet:
	 * ```typescript
	 * const context: HyperBunUIContext = {
	 *   apiBaseUrl: 'http://localhost:3001',
	 *   featureFlags: {},
	 *   debugMode: false,
	 *   currentTimestamp: 1704067200450
	 * };
	 * const html = '<span data-server-timestamp>Loading...</span>';
	 * const rewriter = new UIContextRewriter(context).createRewriter();
	 * const result = rewriter.transform(html);
	 * // Result should contain formatted timestamp in span
	 * ```
	 */
	currentTimestamp: number;

	/**
	 * 6.1.1.2.2.1.2.6: Environment name for environment-specific content rendering.
	 *
	 * @example 'development', 'staging', 'production'
	 */
	environment?: string;

	/**
	 * 6.1.1.2.2.1.2.7: Additional metadata for extensibility.
	 */
	metadata?: Record<string, unknown>;
}

/**
 * 6.1.1.2.2.1.0: HTMLRewriter orchestrator for server-side UI transformations.
 * All mutations are applied during streaming, maintaining constant memory footprint.
 *
 * @remarks Thread-safe: Each request receives an isolated rewriter instance.
 * @see 6.1.1.2.2.2.1.0 for context injection mechanism
 * @see 6.1.1.2.2.2.2.0 for feature flag pruning
 * @see 6.1.1.2.2.2.3.0 for RBAC enforcement
 *
 * @example 6.1.1.2.2.1.0.1: Basic UIContextRewriter Usage
 * // Test Formula:
 * // 1. Create UIContextRewriter instance with context
 * // 2. Create rewriter using createRewriter()
 * // 3. Transform HTML content
 * // 4. Verify transformations applied correctly
 * // Expected Result: HTML transformed with context injection and conditional rendering
 * //
 * // Snippet:
 * ```typescript
 * const context: HyperBunUIContext = {
 *   apiBaseUrl: 'http://localhost:3001',
 *   featureFlags: { shadowGraph: true },
 *   userRole: 'admin',
 *   debugMode: true,
 *   currentTimestamp: Date.now()
 * };
 * const rewriter = new UIContextRewriter(context).createRewriter();
 * const transformed = rewriter.transform(new Response(htmlContent));
 * ```
 */
// Type definitions for HTMLRewriter handlers (Bun 1.3.3+ compatible)
// These types are inferred from Bun's HTMLRewriter API
type ElementHandler = {
	element?: (element: {
		getAttribute(name: string): string | null;
		setAttribute(name: string, value: string): void;
		removeAttribute(name: string): void;
		hasAttribute(name: string): boolean;
		setInnerContent(content: string, options?: { html?: boolean }): void;
		prepend(content: string, options?: { html?: boolean }): void;
		append(content: string, options?: { html?: boolean }): void;
		before(content: string, options?: { html?: boolean }): void;
		after(content: string, options?: { html?: boolean }): void;
		remove(): void;
		removeAndKeepContent(): void;
		textContent?: string;
	}) => void;
	text?: (text: {
		text: string;
		lastInTextNode: boolean;
		removed: boolean;
		before(content: string, options?: { html?: boolean }): void;
		after(content: string, options?: { html?: boolean }): void;
		replace(content: string, options?: { html?: boolean }): void;
		remove(): void;
	}) => void;
	comments?: (comment: { text: string; remove(): void }) => void;
};

/**
 * 6.1.1.2.2.5.1: Performance metrics tracking for HTMLRewriter transformations.
 * Tracks transformation time, HTML size reduction, and client-side context consumption.
 *
 * @example 6.1.1.2.2.5.1.1: Performance Metrics Collection
 * // Test Formula:
 * // 1. Create UIContextRewriter instance
 * // 2. Transform HTML content
 * // 3. Access metrics via getMetrics() method
 * // Expected Result: Metrics object contains transformation time, size reduction, etc.
 * //
 * // Snippet:
 * ```typescript
 * const rewriter = new UIContextRewriter(context);
 * const transformed = rewriter.transform(htmlContent);
 * const metrics = rewriter.getMetrics();
 * // metrics.transformationTime > 0
 * // metrics.sizeReduction >= 0
 * ```
 */
export interface TransformationMetrics {
	/**
	 * Time taken for HTMLRewriter transformation in nanoseconds
	 */
	transformationTimeNs: number;

	/**
	 * Original HTML size in bytes
	 */
	originalSizeBytes: number;

	/**
	 * Transformed HTML size in bytes
	 */
	transformedSizeBytes: number;

	/**
	 * Size reduction percentage (0-100)
	 */
	sizeReductionPercent: number;

	/**
	 * Number of elements processed
	 */
	elementsProcessed: number;

	/**
	 * Number of elements removed (feature flags, RBAC)
	 */
	elementsRemoved: number;

	/**
	 * Timestamp when transformation started
	 */
	startTimestamp: number;

	/**
	 * Timestamp when transformation completed
	 */
	endTimestamp: number;
}

/**
 * 6.1.1.2.2.5.2: Security validation result for UI context.
 * Validates context to prevent injection of sensitive data and XSS vulnerabilities.
 *
 * @example 6.1.1.2.2.5.2.1: Security Validation
 * // Test Formula:
 * // 1. Create context with potentially sensitive data
 * // 2. Call validateContextSecurity() method
 * // 3. Verify validation result indicates security issues
 * // Expected Result: Validation fails if sensitive data detected
 * //
 * // Snippet:
 * ```typescript
 * const context = { apiBaseUrl: 'http://localhost', ... };
 * const validation = UIContextRewriter.validateContextSecurity(context);
 * // validation.isValid === true
 * // validation.issues.length === 0
 * ```
 */
export interface SecurityValidationResult {
	/**
	 * Whether the context passed security validation
	 */
	isValid: boolean;

	/**
	 * List of security issues found
	 */
	issues: string[];

	/**
	 * Whether sensitive data was detected
	 */
	hasSensitiveData: boolean;

	/**
	 * Whether XSS vulnerabilities were detected
	 */
	hasXssVulnerabilities: boolean;
}

export class UIContextRewriter {
	private readonly context: HyperBunUIContext;
	private rewriterClass: typeof HTMLRewriter | undefined;
	private policies: any | null = null; // 8.3.1.0.0.0.0: HTMLRewriter policies from UIPolicyManager

	// 6.1.1.2.2.5.1: Performance metrics tracking
	private metrics: TransformationMetrics | null = null;
	private elementsProcessedCount: number = 0;
	private elementsRemovedCount: number = 0;

	/**
	 * 6.1.1.2.2.1.1.0: Constructs rewriter with immutable context snapshot.
	 *
	 * @param context - Deep-frozen UI context to prevent mutation during transformation.
	 * @param options - Optional configuration for enabling/disabling specific transformations.
	 * @param policies - Optional HTMLRewriter policies from UIPolicyManager (8.3.1.0.0.0.0)
	 * @throws {TypeError} If context validation fails (e.g., apiBaseUrl is malformed).
	 *
	 * @example 6.1.1.2.2.1.1.0.1: Context Validation
	 * // Test Formula:
	 * // 1. Attempt to create UIContextRewriter with invalid apiBaseUrl
	 * // 2. Verify TypeError is thrown
	 * // Expected Result: TypeError thrown for invalid apiBaseUrl format
	 * //
	 * // Snippet:
	 * ```typescript
	 * try {
	 *   new UIContextRewriter({ apiBaseUrl: 'invalid-url', ... });
	 * } catch (error) {
	 *   // error instanceof TypeError === true
	 * }
	 * ```
	 *
	 * @example 8.3.1.0.0.0.0: Policy-Driven Rewriter
	 * // Test Formula:
	 * // 1. Load policies from UIPolicyManager
	 * // 2. Create UIContextRewriter with policies
	 * // 3. Verify transformations respect policies
	 * // Expected Result: Rewriter uses policies instead of hardcoded options
	 * //
	 * // Snippet:
	 * ```typescript
	 * const policyManager = UIPolicyManager.getInstance();
	 * const policies = await policyManager.getHTMLRewriterPolicies();
	 * const rewriter = new UIContextRewriter(context, {}, policies);
	 * ```
	 */
	constructor(
		context: HyperBunUIContext,
		private options: {
			injectContext?: boolean;
			enableFeatureFlags?: boolean;
			enableRoleBasedAccess?: boolean;
			enableTimestampUpdates?: boolean;
			customRewriter?: any;
			enableMetrics?: boolean;
			enableSecurityValidation?: boolean;
		} = {},
		policies?: any, // 8.3.1.0.0.0.0: Optional policies from UIPolicyManager
	) {
		// 6.1.1.2.2.2.5.1: Defensive validation for production safety
		if (!/^https?:\/\/.+/.test(context.apiBaseUrl)) {
			throw new TypeError(`Invalid apiBaseUrl: ${context.apiBaseUrl}`);
		}

		// 6.1.1.2.2.5.2: Security validation (if enabled)
		if (options.enableSecurityValidation !== false) {
			const validation = UIContextRewriter.validateContextSecurity(context);
			if (!validation.isValid) {
				throw new Error(
					`Context security validation failed: ${validation.issues.join(", ")}`,
				);
			}
		}

		this.context = Object.freeze({ ...context });
		this.rewriterClass =
			(options.customRewriter as typeof HTMLRewriter) || HTMLRewriterClass;
		this.policies = policies || null; // 8.3.1.0.0.0.0: Store policies for policy-driven transformations
	}

	/**
	 * Check if HTMLRewriter is available
	 *
	 * @returns `true` if HTMLRewriter is available, `false` otherwise
	 *
	 * @remarks Bun 1.3.3+ provides improved TypeScript definitions for HTMLRewriter.
	 * This method checks runtime availability regardless of TypeScript types.
	 */
	isAvailable(): boolean {
		return (
			typeof this.rewriterClass !== "undefined" && this.rewriterClass !== null
		);
	}

	/**
	 * 6.1.1.2.2.1.1.1: Configures HTMLRewriter with Hyper-Bun transformation pipeline.
	 * Handlers are executed in order: body → attributes → timestamps.
	 *
	 * @returns Configured HTMLRewriter instance with bound context.
	 * @throws {Error} If HTMLRewriter API is unavailable (requires Bun 1.4+ or --compat flag).
	 *
	 * @remarks Bun 1.3.3+ provides improved TypeScript definitions for HTMLRewriter.
	 * @see https://bun.com/blog/bun-v1.3.3#typescript-definitions
	 *
	 * @see 6.1.1.2.2.2.1.0 for context injection mechanism
	 * @see 6.1.1.2.2.2.2.0 for feature flag pruning
	 * @see 6.1.1.2.2.2.3.0 for RBAC enforcement
	 * @see 6.1.1.2.2.2.4.0 for timestamp implantation
	 *
	 * @example 6.1.1.2.2.2.1.0: Context Injection Verification
	 * // Test Formula:
	 * // 1. Start API server: `HYPERBUN_DEBUG=true bun run src/api/routes.ts`
	 * // 2. Execute: `curl -s http://localhost:3001/registry.html | rg -o "window\.HYPERBUN_UI_CONTEXT = \{[^}]+\}"`
	 * // 3. Expected Result: JSON string containing `"debugMode":true`
	 * //
	 * // Playwright Conversion:
	 * // await page.goto('http://localhost:3001/registry.html');
	 * // const context = await page.evaluate(() => window.HYPERBUN_UI_CONTEXT);
	 * // expect(context.debugMode).toBe(true);
	 *
	 * @example 6.1.1.2.2.2.2.0: Feature Flag Pruning Verification
	 * // Test Formula:
	 * // 1. Start server: `HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/api/routes.ts`
	 * // 2. Execute: `curl -s http://localhost:3001/registry.html | rg -c 'id="shadow-graph-section"'`
	 * // 3. Expected Result: `0` (element removed from stream)
	 * //
	 * // Playwright Conversion:
	 * // await page.goto('http://localhost:3001/registry.html');
	 * // await expect(page.locator('#shadow-graph-section')).toHaveCount(0);
	 */
	createRewriter(): InstanceType<typeof HTMLRewriter> {
		if (!this.isAvailable() || !this.rewriterClass) {
			throw new Error(
				"HTMLRewriter is not available. Update Bun to 1.4+ or use --compat flag.",
			);
		}

		const rewriter = new this.rewriterClass();

		// 8.3.1.0.0.0.0: Use policies if available, otherwise fall back to options
		// Support both boolean (simple) and object (advanced) formats for inject_context_script
		const injectContextPolicy = this.policies?.inject_context_script;
		const injectContextEnabled =
			typeof injectContextPolicy === "boolean"
				? injectContextPolicy
				: (injectContextPolicy?.enabled ??
					this.options.injectContext !== false);
		const featureFlagsEnabled =
			this.policies?.data_feature_pruning?.enabled ??
			this.options.enableFeatureFlags !== false;
		const rbacEnabled =
			this.policies?.data_access_pruning?.enabled ??
			this.options.enableRoleBasedAccess !== false;
		const timestampEnabled =
			this.policies?.dynamic_content_implantation?.enabled ??
			this.options.enableTimestampUpdates !== false;

		// ═══════════════════════════════════════════════════════════════
		// 6.1.1.2.2.2.1.0: Atomic context injection at body prepend
		// 8.3.1.0.0.0.0: Policy-driven context injection
		// ═══════════════════════════════════════════════════════════════
		// Execution guarantee: Runs before all other body handlers
		if (injectContextEnabled) {
			rewriter.on("body", {
				element: (element) => {
					element.prepend(
						`<script>window.HYPERBUN_UI_CONTEXT = ${JSON.stringify(this.context)};</script>`,
						{ html: true },
					);
				},
			});

			// Also inject in head for immediate availability (fallback)
			rewriter.on("head", {
				element: (element) => {
					element.append(
						`<script>window.HYPERBUN_UI_CONTEXT = ${JSON.stringify(this.context)};</script>`,
						{ html: true },
					);
				},
			});
		}

		// ═══════════════════════════════════════════════════════════════
		// 6.1.1.2.2.2.2.0: Feature-flag pruning via data-feature attribute
		// 8.3.1.0.0.0.0: Policy-driven feature flag pruning
		// ═══════════════════════════════════════════════════════════════
		// @see public/registry.html for markup examples
		if (featureFlagsEnabled) {
			const targetAttr =
				this.policies?.data_feature_pruning?.target_attribute || "data-feature";
			rewriter.on(`[${targetAttr}]`, {
				element: (element) => {
					// 6.1.1.2.2.5.1: Track element processing for metrics
					this.elementsProcessedCount++;

					const featureName = element.getAttribute("data-feature");
					if (!featureName) return;

					const isEnabled = this.context.featureFlags[featureName];
					if (!isEnabled) {
						// 6.1.1.2.2.5.1: Track element removal for metrics
						this.elementsRemovedCount++;
						element.remove(); // Surgical removal from token stream
					} else {
						// Feature is enabled - ensure element is visible
						if (element.hasAttribute("data-feature-hidden")) {
							element.removeAttribute("data-feature-hidden");
							const style = element.getAttribute("style");
							if (style && style.includes("display: none")) {
								element.setAttribute(
									"style",
									style.replace(/display:\s*none[;]?/gi, ""),
								);
							}
						}
					}
				},
			});
		}

		// ═══════════════════════════════════════════════════════════════
		// 6.1.1.2.2.2.3.0: RBAC pruning via data-access attribute
		// 8.3.1.0.0.0.0: Policy-driven RBAC pruning
		// ═══════════════════════════════════════════════════════════════
		// Security: Removes entire element sub-trees to prevent DOM inspection of hidden UI
		if (rbacEnabled) {
			const targetAttr =
				this.policies?.data_access_pruning?.target_attribute || "data-access";
			const allowedRoles = this.policies?.data_access_pruning
				?.allowed_roles || ["admin", "analyst", "viewer"];
			const defaultRole =
				this.policies?.data_access_pruning?.default_role || "guest";

			rewriter.on(`[${targetAttr}]`, {
				element: (element) => {
					// 6.1.1.2.2.5.1: Track element processing for metrics
					this.elementsProcessedCount++;

					const requiredRole = element.getAttribute("data-access");
					if (!requiredRole) return;

					const userRole = this.context.userRole || defaultRole;

					// Supports comma-separated roles: data-access="admin,developer"
					const requiredRoles = requiredRole
						.split(",")
						.map((r: string) => r.trim());
					// Check if user role matches required role OR if required role is in allowed roles
					const hasAccess =
						requiredRoles.includes(userRole) ||
						userRole === "admin" || // Admin always has access
						(allowedRoles.includes(userRole) &&
							requiredRoles.some((r) => allowedRoles.includes(r)));

					if (!hasAccess) {
						// 6.1.1.2.2.5.1: Track element removal for metrics
						this.elementsRemovedCount++;
						element.remove(); // Zero client-side exposure
					}
				},
			});

			// Also handle combined data-feature + data-access attributes
			rewriter.on("[data-feature][data-access]", {
				element: (element) => {
					// 6.1.1.2.2.5.1: Track element processing for metrics
					this.elementsProcessedCount++;

					const featureName = element.getAttribute("data-feature");
					const requiredRole = element.getAttribute("data-access");

					if (!featureName || !requiredRole) return;

					// Check feature flag first
					const isFeatureEnabled = this.context.featureFlags[featureName];
					if (!isFeatureEnabled) {
						// 6.1.1.2.2.5.1: Track element removal for metrics
						this.elementsRemovedCount++;
						element.remove();
						return;
					}

					// Then check role
					const userRole = this.context.userRole || defaultRole;
					const requiredRoles = requiredRole
						.split(",")
						.map((r: string) => r.trim());
					const hasAccess =
						requiredRoles.includes(userRole) ||
						userRole === "admin" ||
						(allowedRoles.includes(userRole) &&
							requiredRoles.some((r) => allowedRoles.includes(r)));

					if (!hasAccess) {
						// 6.1.1.2.2.5.1: Track element removal for metrics
						this.elementsRemovedCount++;
						element.remove();
					}
				},
			});
		}

		// ═══════════════════════════════════════════════════════════════
		// 6.1.1.2.2.2.4.0: Server-timestamp implantation into data-server-timestamp elements
		// 8.3.1.0.0.0.0: Policy-driven timestamp implantation
		// ═══════════════════════════════════════════════════════════════
		// Format: ISO string for consistency
		if (timestampEnabled) {
			const timestampPolicies =
				this.policies?.dynamic_content_implantation?.policies || [];
			const timestampPolicy = timestampPolicies.find(
				(p: any) => p.attribute === "data-server-timestamp",
			);
			const timestampAttr =
				timestampPolicy?.attribute || "data-server-timestamp";
			const fallbackText = timestampPolicy?.fallback || "Loading...";

			rewriter.on(`[${timestampAttr}]`, {
				element: (element) => {
					try {
						const format = element.getAttribute("data-format") || "iso";
						const timestamp = this.context.currentTimestamp;

						let formattedTime: string;
						switch (format) {
							case "iso":
								formattedTime = new Date(timestamp).toISOString();
								break;
							case "locale":
								formattedTime = new Date(timestamp).toLocaleString();
								break;
							case "time":
								formattedTime = new Date(timestamp).toLocaleTimeString();
								break;
							case "date":
								formattedTime = new Date(timestamp).toLocaleDateString();
								break;
							default:
								formattedTime = new Date(timestamp).toISOString();
						}

						element.setInnerContent(formattedTime);
					} catch (error) {
						// Fallback to policy-defined fallback or current time if timestamp is invalid
						element.setInnerContent(fallbackText || new Date().toISOString());
					}
				},
			});
		}

		// Debug mode indicator
		if (this.context.debugMode) {
			rewriter.on("[data-debug]", {
				element: (element) => {
					// Show debug elements when debugMode is true
					const hidden = element.getAttribute("data-debug-hidden");
					if (hidden === "true") {
						element.removeAttribute("data-debug-hidden");
						element.removeAttribute("style");
					}
				},
			});
		} else {
			rewriter.on("[data-debug]", {
				element: (element) => {
					// Hide debug elements when debugMode is false
					const hidden = element.getAttribute("data-debug-hidden");
					if (hidden !== "true") {
						element.setAttribute("data-debug-hidden", "true");
						element.setAttribute("style", "display: none;");
					}
				},
			});
		}

		// Environment-specific content
		if (this.context.environment) {
			rewriter.on(`[data-env="${this.context.environment}"]`, {
				element: (element) => {
					// Keep elements matching current environment
				},
			});

			rewriter.on("[data-env]", {
				element: (element) => {
					const env = element.getAttribute("data-env");
					if (env && env !== this.context.environment) {
						element.remove(); // Remove elements not matching current environment
					}
				},
			});
		}

		return rewriter;
	}

	/**
	 * 6.1.1.2.2.5.1: Get performance metrics from last transformation.
	 * Returns metrics object if metrics tracking was enabled, null otherwise.
	 *
	 * @returns Transformation metrics or null if metrics not enabled
	 *
	 * @example 6.1.1.2.2.5.1.2: Access Performance Metrics
	 * // Test Formula:
	 * // 1. Transform HTML with metrics enabled
	 * // 2. Call getMetrics() method
	 * // 3. Verify metrics contain expected data
	 * // Expected Result: Metrics object with transformation time and size data
	 * //
	 * // Snippet:
	 * ```typescript
	 * const rewriter = new UIContextRewriter(context, { enableMetrics: true });
	 * rewriter.transform(htmlContent);
	 * const metrics = rewriter.getMetrics();
	 * console.log(`Transformation took ${metrics.transformationTimeNs / 1_000_000}ms`);
	 * ```
	 */
	getMetrics(): TransformationMetrics | null {
		return this.metrics;
	}

	/**
	 * 6.1.1.2.2.5.2: Validate UI context for security issues.
	 * Checks for sensitive data, XSS vulnerabilities, and other security concerns.
	 *
	 * @param context - UI context to validate
	 * @returns Security validation result
	 *
	 * @example 6.1.1.2.2.5.2.2: Security Validation Check
	 * // Test Formula:
	 * // 1. Create context with API key in metadata
	 * // 2. Call validateContextSecurity() static method
	 * // 3. Verify validation detects sensitive data
	 * // Expected Result: Validation fails with hasSensitiveData === true
	 * //
	 * // Snippet:
	 * ```typescript
	 * const context = {
	 *   apiBaseUrl: 'http://localhost',
	 *   metadata: { apiKey: 'secret-key' }
	 * };
	 * const validation = UIContextRewriter.validateContextSecurity(context);
	 * // validation.hasSensitiveData === true
	 * ```
	 */
	static validateContextSecurity(
		context: HyperBunUIContext,
	): SecurityValidationResult {
		const issues: string[] = [];
		let hasSensitiveData = false;
		let hasXssVulnerabilities = false;

		// Check for sensitive data patterns
		const sensitivePatterns = [
			/api[_-]?key/i,
			/secret/i,
			/password/i,
			/token/i,
			/auth[_-]?token/i,
			/private[_-]?key/i,
		];

		const contextString = JSON.stringify(context);
		for (const pattern of sensitivePatterns) {
			if (pattern.test(contextString)) {
				issues.push(`Potential sensitive data detected: ${pattern.source}`);
				hasSensitiveData = true;
			}
		}

		// Check for XSS vulnerabilities in string values
		const xssPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];

		const checkForXss = (value: unknown): void => {
			if (typeof value === "string") {
				for (const pattern of xssPatterns) {
					if (pattern.test(value)) {
						issues.push(
							`Potential XSS vulnerability detected: ${pattern.source}`,
						);
						hasXssVulnerabilities = true;
					}
				}
			} else if (typeof value === "object" && value !== null) {
				for (const v of Object.values(value)) {
					checkForXss(v);
				}
			}
		};

		checkForXss(context);

		// Validate apiBaseUrl format
		if (!/^https?:\/\/.+/.test(context.apiBaseUrl)) {
			issues.push("Invalid apiBaseUrl format");
		}

		return {
			isValid: issues.length === 0,
			issues,
			hasSensitiveData,
			hasXssVulnerabilities,
		};
	}

	/**
	 * 6.1.1.2.2.5.3: Development helper to inspect context and transformation state.
	 * Provides detailed debugging information when debugMode is enabled.
	 *
	 * @returns Debug information object
	 *
	 * @example 6.1.1.2.2.5.3.1: Development Debug Helper
	 * // Test Formula:
	 * // 1. Create UIContextRewriter with debugMode enabled
	 * // 2. Call getDebugInfo() method
	 * // 3. Verify debug info contains context and metrics
	 * // Expected Result: Debug info object with context, metrics, and state
	 * //
	 * // Snippet:
	 * ```typescript
	 * const rewriter = new UIContextRewriter(context, { enableMetrics: true });
	 * rewriter.transform(htmlContent);
	 * const debugInfo = rewriter.getDebugInfo();
	 * console.log(debugInfo);
	 * ```
	 */
	getDebugInfo(): {
		context: HyperBunUIContext;
		metrics: TransformationMetrics | null;
		htmlRewriterAvailable: boolean;
		options: typeof this.options;
		elementsProcessed: number;
		elementsRemoved: number;
	} {
		return {
			context: this.context,
			metrics: this.metrics,
			htmlRewriterAvailable: this.isAvailable(),
			options: this.options,
			elementsProcessed: this.elementsProcessedCount,
			elementsRemoved: this.elementsRemovedCount,
		};
	}

	/**
	 * Transform HTML content using the configured rewriter
	 *
	 * @param input - HTML content (string, Response, ArrayBuffer, Blob, or File)
	 * @returns Transformed content (type depends on input type)
	 * @throws Error if transformation fails
	 *
	 * @see 6.1.1.2.2.2.5.0 for graceful degradation pattern
	 * @see 6.1.1.2.2.5.1 for performance metrics tracking
	 */
	transform(
		input: string | Response | ArrayBuffer | Blob | File,
	): string | Response | ArrayBuffer {
		if (!this.isAvailable()) {
			// Fallback: string replacement for older Bun versions
			return this.fallbackTransform(input);
		}

		// 6.1.1.2.2.5.1: Initialize performance metrics tracking
		const enableMetrics = this.options.enableMetrics !== false;
		let startTime: number | null = null;
		let originalSize: number | null = null;

		if (enableMetrics) {
			startTime =
				typeof Bun !== "undefined" && Bun.nanoseconds
					? Bun.nanoseconds()
					: Date.now() * 1_000_000;

			// Calculate original size
			if (typeof input === "string") {
				originalSize = new TextEncoder().encode(input).length;
			} else if (input instanceof ArrayBuffer) {
				originalSize = input.byteLength;
			} else if (input instanceof Blob) {
				originalSize = input.size;
			} else if (input instanceof Response) {
				// For Response, we'll calculate after getting text
				originalSize = null;
			}

			// Reset counters
			this.elementsProcessedCount = 0;
			this.elementsRemovedCount = 0;
		}

		try {
			const rewriter = this.createRewriter();

			// Handle different input types according to Bun HTMLRewriter API
			let result: string | Response | ArrayBuffer;

			if (typeof input === "string") {
				// String input - transform directly (Bun enhancement)
				result = rewriter.transform(input);
			} else if (input instanceof Response) {
				// Response input - preserves headers and streaming
				result = rewriter.transform(input);
				// For metrics, we need to get the size after transformation
				if (enableMetrics && originalSize === null) {
					const clonedResponse =
						result instanceof Response ? result.clone() : null;
					if (clonedResponse) {
						clonedResponse
							.text()
							.then((text) => {
								originalSize = new TextEncoder().encode(text).length;
							})
							.catch(() => {
								// Ignore errors in metrics collection
							});
					}
				}
			} else if (input instanceof ArrayBuffer) {
				// ArrayBuffer input - wrap in Response
				result = rewriter.transform(new Response(input));
			} else if (input instanceof Blob) {
				// Blob input - wrap in Response
				result = rewriter.transform(new Response(input));
			} else {
				// Handle File and Bun.File inputs
				// Type guard for File (works around TypeScript instanceof limitation)
				const isFile = (obj: unknown): obj is File => {
					return (
						obj !== null &&
						typeof obj === "object" &&
						"constructor" in obj &&
						(obj.constructor === File ||
							(obj as any).constructor?.name === "File")
					);
				};

				if (isFile(input)) {
					// Standard File or Bun.File input - transform directly
					result = rewriter.transform(input as any);
				} else {
					// Try to transform as-is (might be a stream or other compatible type)
					result = rewriter.transform(input as any);
				}
			}

			// 6.1.1.2.2.5.1: Calculate and store performance metrics
			if (enableMetrics && startTime !== null) {
				const endTime =
					typeof Bun !== "undefined" && Bun.nanoseconds
						? Bun.nanoseconds()
						: Date.now() * 1_000_000;

				let transformedSize: number;
				if (typeof result === "string") {
					transformedSize = new TextEncoder().encode(result).length;
				} else if (result instanceof ArrayBuffer) {
					transformedSize = result.byteLength;
				} else if (result instanceof Response) {
					// For Response, estimate size (actual size would require async operation)
					transformedSize = originalSize || 0;
				} else {
					transformedSize = originalSize || 0;
				}

				const sizeReduction =
					originalSize && originalSize > 0
						? ((originalSize - transformedSize) / originalSize) * 100
						: 0;

				this.metrics = {
					transformationTimeNs: endTime - startTime,
					originalSizeBytes: originalSize || 0,
					transformedSizeBytes: transformedSize,
					sizeReductionPercent: Math.max(0, sizeReduction),
					elementsProcessed: this.elementsProcessedCount,
					elementsRemoved: this.elementsRemovedCount,
					startTimestamp: startTime,
					endTimestamp: endTime,
				};
			}

			return result;
		} catch (error) {
			// Enhanced error handling per Bun HTMLRewriter docs
			if (error instanceof Error) {
				if (error.message.includes("selector")) {
					throw new Error(
						`Invalid CSS selector in HTMLRewriter: ${error.message}`,
					);
				} else if (error.message.includes("body already used")) {
					throw new Error(
						"Response body already consumed. Create a new Response for transformation.",
					);
				} else if (error.message.includes("memory")) {
					throw new Error(
						"HTMLRewriter memory allocation failed. HTML may be too large.",
					);
				}
			}
			throw error;
		}
	}

	/**
	 * Fallback transformation using string replacement
	 * Used when HTMLRewriter is not available
	 *
	 * @see 6.1.1.2.2.2.5.0 for graceful degradation pattern
	 */
	private fallbackTransform(
		input: string | Response | ArrayBuffer | Blob,
	): string {
		if (typeof input === "string") {
			let content = input;

			// Remove old API_BASE declarations
			content = content.replace(/(const|let|var)\s+API_BASE\s*=\s*[^;]+;/g, "");

			// Inject UI context in head or before first script
			const contextScript = `<script>window.HYPERBUN_UI_CONTEXT = ${JSON.stringify(this.context)};</script>`;

			// Try to inject before closing head tag, otherwise before first script
			if (content.includes("</head>")) {
				content = content.replace("</head>", `${contextScript}\n</head>`);
			} else {
				const scriptMatch = content.match(/<script[^>]*>/);
				if (scriptMatch) {
					content = content.replace(/(<script[^>]*>)/, `${contextScript}\n$1`);
				}
			}

			return content;
		}

		// For non-string inputs, return as-is (caller should handle)
		throw new Error(
			"Fallback transform only supports string input. HTMLRewriter required for other types.",
		);
	}
}

/**
 * Helper function to create UI context from request headers and environment
 *
 * @param request - The incoming HTTP request
 * @param options - Optional overrides for feature flags, user role, debug mode, etc.
 * @returns A complete HyperBunUIContext object
 *
 * @see 6.1.1.2.2.2.6.0 for context creation pattern
 *
 * @example 6.1.1.2.2.2.6.0: Context Creation from Request
 * // Test Formula:
 * // 1. Create request with headers (X-Forwarded-Proto, Host, X-User-Role)
 * // 2. Call createUIContextFromRequest() with request
 * // 3. Verify context properties match request headers and environment
 * // Expected Result: Context correctly derived from request and environment
 * //
 * // Snippet:
 * ```typescript
 * const request = new Request('http://localhost:3001/registry.html', {
 *   headers: {
 *     'X-Forwarded-Proto': 'https',
 *     'Host': 'api.hyperbun.com',
 *     'X-User-Role': 'admin'
 *   }
 * });
 * const context = createUIContextFromRequest(request, {
 *   featureFlags: { shadowGraph: true },
 *   debugMode: true
 * });
 * // context.apiBaseUrl === 'https://api.hyperbun.com'
 * // context.userRole === 'admin'
 * ```
 */
export function createUIContextFromRequest(
	request: Request,
	options: {
		featureFlags?: Record<string, boolean>;
		userRole?: HyperBunUIContext["userRole"];
		debugMode?: boolean;
		environment?: string;
		metadata?: Record<string, unknown>;
	} = {},
): HyperBunUIContext {
	const protocol =
		request.headers.get("x-forwarded-proto") ||
		(request.url.startsWith("https") ? "https" : "http");
	const host =
		request.headers.get("host") ||
		request.headers.get("x-forwarded-host") ||
		"localhost:3001";
	const apiBaseUrl = `${protocol}://${host}`;

	const userRole =
		options.userRole ||
		(request.headers.get("x-user-role") as HyperBunUIContext["userRole"]) ||
		"guest";

	const debugMode =
		options.debugMode ??
		((typeof Bun !== "undefined" && Bun.env.HYPERBUN_DEBUG === "true") ||
			false);

	const environment =
		options.environment ||
		(typeof Bun !== "undefined" && Bun.env.NODE_ENV) ||
		"development";

	return {
		apiBaseUrl,
		featureFlags: options.featureFlags || {},
		userRole,
		debugMode,
		currentTimestamp: Date.now(),
		environment,
		metadata: options.metadata || {},
	};
}
