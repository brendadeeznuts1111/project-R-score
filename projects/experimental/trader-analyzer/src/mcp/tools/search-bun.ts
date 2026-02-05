import { BUN_DOCS_URLS } from "../../utils/rss-constants";

/**
 * @fileoverview SearchBun MCP Tool
 * @description Search across the Bun knowledge base to find relevant information, code examples, API references, and guides
 * @module mcp/tools/search-bun
 */

/**
 * SearchBun MCP tool for searching Bun documentation
 */
export function createSearchBunTool(): Array<{
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, any>;
		required?: string[];
	};
	execute: (args: Record<string, any>) => Promise<{
		content: Array<{ type?: string; text?: string; data?: any }>;
		isError?: boolean;
	}>;
}> {
	return [
		{
			name: "SearchBun",
			description:
				"Search across the Bun knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about Bun, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages.",
			inputSchema: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "A query to search the content with.",
					},
				},
				required: ["query"],
			},
			execute: async (args: Record<string, any>) => {
				try {
					const query = (args.query as string) || "";

					if (!query.trim()) {
						return {
							content: [
								{
									text: "Error: Query is required. Please provide a search query.",
								},
							],
							isError: true,
						};
					}

					// Search Bun documentation via web search
					// Note: This is a wrapper that searches Bun's official documentation
					const { BUN_DOCS_URLS } = await import("../../utils/rss-constants");
					const searchUrl = `${BUN_DOCS_URLS.DOCS}?q=${encodeURIComponent(query)}`;
					const referenceUrl = `${BUN_DOCS_URLS.API_REFERENCE}?q=${encodeURIComponent(query)}`;

					// Try to fetch from Bun's documentation
					try {
						// Search Bun docs website
						const response = await fetch(
							`https://bun.com/api/search?q=${encodeURIComponent(query)}`,
							{
								headers: {
									Accept: "application/json",
								},
							},
						);

						if (response.ok) {
							const data = await response.json();
							return {
								content: [
									{
										text:
											`Bun Documentation Search Results for: "${query}"\n\n` +
											`Results:\n${JSON.stringify(data, null, 2)}\n\n` +
											`Documentation: ${searchUrl}\n` +
											`Reference: ${referenceUrl}`,
									},
								],
							};
						}
					} catch {
						// API not available, provide manual search links
					}

					// Fallback: Provide search links and common Bun API references
					const { BUN_DOCS_URLS } = await import("../../utils/rss-constants");
					const bunApis: Record<string, string> = {
						"Bun.serve": BUN_DOCS_URLS.RUNTIME_APIS,
						"Bun.file": BUN_DOCS_URLS.RUNTIME_APIS,
						"Bun.CryptoHasher": BUN_DOCS_URLS.RUNTIME_APIS,
						"Bun.test": BUN_DOCS_URLS.TEST_RUNNER,
						"Bun.spawn": BUN_DOCS_URLS.RUNTIME_APIS,
						"bun:sqlite": BUN_DOCS_URLS.API_REFERENCE,
						"Bun.websocket": BUN_DOCS_URLS.RUNTIME_APIS,
						"Bun.shell": BUN_DOCS_URLS.RUNTIME_APIS,
					};

					// Check if query matches any known API
					const matchedApi = Object.keys(bunApis).find((api) =>
						query.toLowerCase().includes(api.toLowerCase()),
					);

					return {
						content: [
							{
								text:
									`Bun Documentation Search: "${query}"\n\n` +
									(matchedApi
										? `Found API: ${matchedApi}\nDocumentation: ${bunApis[matchedApi]}\n\n`
										: "") +
									`Search Links:\n` +
									`  Documentation: ${searchUrl}\n` +
									`  Reference: ${referenceUrl}\n` +
									`  Full Reference: ${BUN_DOCS_URLS.API_REFERENCE}\n\n` +
									`Common Bun APIs:\n` +
									Object.entries(bunApis)
										.map(([api, url]) => `  ${api}: ${url}`)
										.join("\n") +
									`\n\nTip: Use the Bun documentation website for comprehensive search results.`,
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error searching Bun documentation: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
