#!/usr/bin/env bun
// routes/storage.js — Upload + CDN route handlers
// Extracted from api-server.js to reduce god-object complexity.
//
// Dependencies injected via createStorageRouter({ getS3Client, logger })
// Each handler returns Response or null (not-my-route).

/**
 * @param {{ getS3Client: Function, logger: any }} deps
 */
export function createStorageRouter({ getS3Client, logger }) {
	/**
	 * @param {Request} req
	 * @param {URL} url
	 * @param {Map<string, string>} cookies
	 * @param {Record<string, string>} corsHeaders
	 * @returns {Promise<Response> | Response | null}
	 */
	return async function handleStorage(req, url, cookies, corsHeaders) {
		switch (url.pathname) {
			case "/api/upload": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				// Handle file upload
				const formData = await req.formData();
				const file = formData.get("file");

				if (!file) {
					return Response.json(
						{ error: "No file provided" },
						{ status: 400, headers: corsHeaders },
					);
				}

				const client = getS3Client();
				const fileName = file.name;
				const s3File = client.file(fileName);

				await Bun.write(s3File, file, {
					type: file.type,
					customMetadata: {
						uploadedBy: "dashboard",
						uploadedAt: new Date().toISOString(),
					},
				});

				return Response.json(
					{ success: true, fileName, size: file.size },
					{ headers: corsHeaders },
				);
			}

			case "/api/cdn/set-disposition": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const body = await req.json();
					const { fileKey, disposition, filename } = body;

					// Critical: Validate fileKey to prevent path traversal
					if (
						!fileKey ||
						typeof fileKey !== "string" ||
						fileKey.includes("..") ||
						fileKey.startsWith("/") ||
						fileKey.includes("\\")
					) {
						return Response.json(
							{ error: "Invalid file key format" },
							{ status: 400, headers: corsHeaders },
						);
					}

					// Validate disposition format
					if (!disposition || typeof disposition !== "string") {
						return Response.json(
							{ error: "Content disposition is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const validDispositions = ["inline", "attachment", "no-sniff"];
					const dispositionType = disposition.split(";")[0].trim();
					if (
						!validDispositions.includes(dispositionType) &&
						!dispositionType.startsWith("inline") &&
						!dispositionType.startsWith("attachment")
					) {
						return Response.json(
							{ error: "Invalid disposition type" },
							{ status: 400, headers: corsHeaders },
						);
					}

					// Add rate limiting (using in-memory Map for simplicity)
					const clientIP =
						req.headers.get("x-forwarded-for") ||
						req.headers.get("x-real-ip") ||
						"unknown";

					// Simple in-memory rate limiting (in production, use Redis)
					if (!global.rateLimitStore) {
						global.rateLimitStore = new Map();
					}

					const now = Date.now();
					const requests = global.rateLimitStore.get(clientIP) || [];
					const recentRequests = requests.filter((time) => now - time < 60000); // Last minute

					if (recentRequests.length >= 10) {
						return Response.json(
							{ error: "Rate limit exceeded" },
							{ status: 429, headers: corsHeaders },
						);
					}

					recentRequests.push(now);
					global.rateLimitStore.set(clientIP, recentRequests);

					// Update Content-Disposition using S3 copy operation
					const s3Client = getS3Client();
					await s3Client.copy(fileKey, fileKey, {
						contentDisposition: disposition,
						metadataDirective: "REPLACE",
					});

					logger.info(`Updated Content-Disposition for ${fileKey}: ${disposition}`);

					return Response.json(
						{
							success: true,
							fileKey,
							newDisposition: disposition,
							updated: new Date().toISOString(),
						},
						{ headers: corsHeaders },
					);
				} catch (error) {
					logger.error("Content-Disposition update error:", error);
					return Response.json(
						{
							error: "Failed to update content disposition",
							details: error.message,
						},
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			default:
				return null;
		}
	};
}
