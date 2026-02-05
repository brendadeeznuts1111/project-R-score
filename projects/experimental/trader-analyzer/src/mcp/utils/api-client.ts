/**
 * @fileoverview API Client Helper
 * @description Centralized API client for calling endpoints with error handling
 * @module mcp/utils/api-client
 */

/**
 * API Client configuration
 */
interface APIClientConfig {
	baseURL?: string;
	timeout?: number;
	retries?: number;
	retryDelay?: number;
}

/**
 * API Response wrapper
 */
export interface APIResponse<T = any> {
	status: "ok" | "error";
	data?: T;
	error?: string;
	message?: string;
}

/**
 * API Client for making requests to the main API server
 */
export class APIClient {
	private baseURL: string;
	private timeout: number;
	private retries: number;
	private retryDelay: number;

	constructor(config: APIClientConfig = {}) {
		this.baseURL =
			config.baseURL || process.env.API_URL || process.env.PORT
				? `http://localhost:${process.env.PORT}`
				: "http://localhost:3000";
		this.timeout = config.timeout || 10000; // 10s default
		this.retries = config.retries || 2;
		this.retryDelay = config.retryDelay || 1000;
	}

	/**
	 * Make a GET request
	 */
	async get<T = any>(
		path: string,
		options?: { params?: Record<string, string> },
	): Promise<APIResponse<T>> {
		return this.request<T>("GET", path, undefined, options);
	}

	/**
	 * Make a POST request
	 */
	async post<T = any>(
		path: string,
		body?: any,
		options?: { params?: Record<string, string> },
	): Promise<APIResponse<T>> {
		return this.request<T>("POST", path, body, options);
	}

	/**
	 * Make a PATCH request
	 */
	async patch<T = any>(
		path: string,
		body?: any,
		options?: { params?: Record<string, string> },
	): Promise<APIResponse<T>> {
		return this.request<T>("PATCH", path, body, options);
	}

	/**
	 * Make a DELETE request
	 */
	async delete<T = any>(
		path: string,
		options?: { params?: Record<string, string> },
	): Promise<APIResponse<T>> {
		return this.request<T>("DELETE", path, undefined, options);
	}

	/**
	 * Make a request with retry logic
	 */
	private async request<T = any>(
		method: string,
		path: string,
		body?: any,
		options?: { params?: Record<string, string> },
	): Promise<APIResponse<T>> {
		const url = this.buildURL(path, options?.params);

		for (let attempt = 0; attempt <= this.retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.timeout);

				const fetchOptions: RequestInit = {
					method,
					signal: controller.signal,
					headers: {
						"Content-Type": "application/json",
					},
				};

				if (body && (method === "POST" || method === "PATCH")) {
					fetchOptions.body = JSON.stringify(body);
				}

				const response = await fetch(url, fetchOptions);
				clearTimeout(timeoutId);

				const data = await response.json().catch(() => ({}));

				if (!response.ok) {
					return {
						status: "error",
						error:
							data.error ||
							data.message ||
							`HTTP ${response.status}: ${response.statusText}`,
					};
				}

				return {
					status: "ok",
					data: data.data || data,
					message: data.message,
				};
			} catch (error: any) {
				if (attempt === this.retries) {
					return {
						status: "error",
						error:
							error.name === "AbortError"
								? `Request timeout after ${this.timeout}ms`
								: error.message || "Unknown error",
					};
				}

				// Wait before retry
				await new Promise((resolve) =>
					setTimeout(resolve, this.retryDelay * (attempt + 1)),
				);
			}
		}

		return {
			status: "error",
			error: "Request failed after retries",
		};
	}

	/**
	 * Build URL with query parameters
	 */
	private buildURL(path: string, params?: Record<string, string>): string {
		const url = new URL(path, this.baseURL);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				url.searchParams.append(key, value);
			}
		}
		return url.toString();
	}

	/**
	 * Check if API server is reachable
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.get("/health");
			return response.status === "ok";
		} catch {
			return false;
		}
	}
}

// Default instance
export const apiClient = new APIClient();
