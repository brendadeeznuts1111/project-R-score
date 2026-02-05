/**
 * @fileoverview Feature Flag Management API Routes
 * @description REST API endpoints for feature flag management
 * @module api/features
 */

import { Hono } from "hono";
import { FeatureFlagManager } from "../features/flags";
import { requireAuth, getAuthenticatedUser } from "../auth/middleware";
import type { FeatureFlagConfig } from "../features/config";

const featuresApi = new Hono();

/**
 * Global feature flag manager instance
 */
let featureFlagManager: FeatureFlagManager | null = null;

function getFeatureFlagManager(): FeatureFlagManager {
	if (!featureFlagManager) {
		featureFlagManager = new FeatureFlagManager();
	}
	return featureFlagManager;
}

// ============ Feature Flag Management Routes ============

/**
 * GET /api/features
 * Get all feature flags
 */
featuresApi.get("/features", requireAuth, async (c) => {
	try {
		const manager = getFeatureFlagManager();
		const flags = manager.getAllFlags();

		return c.json({ flags });
	} catch (error) {
		return c.json({ error: "Failed to fetch feature flags" }, 500);
	}
});

/**
 * POST /api/features
 * Create a new feature flag (admin only)
 */
featuresApi.post("/features", requireAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		if (currentUser?.role !== "admin") {
			return c.json({ error: "Admin access required" }, 403);
		}

		const body = await c.req.json();
		const { id, name, enabled, rollout, conditions } = body;

		if (!id || !name) {
			return c.json({ error: "id and name are required" }, 400);
		}

		const manager = getFeatureFlagManager();
		const config: FeatureFlagConfig = {
			id,
			name,
			enabled: enabled || false,
			rollout: rollout || 0,
			conditions: conditions || {},
		};

		manager.registerFlag(config);

		return c.json({
			success: true,
			message: "Feature flag created",
			flag: config,
		});
	} catch (error) {
		return c.json({ error: "Failed to create feature flag" }, 500);
	}
});

/**
 * PUT /api/features/:id
 * Update an existing feature flag (admin only)
 */
featuresApi.put("/features/:id", requireAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		if (currentUser?.role !== "admin") {
			return c.json({ error: "Admin access required" }, 403);
		}

		const id = c.req.param("id");
		const body = await c.req.json();
		const { name, enabled, rollout, conditions } = body;

		const manager = getFeatureFlagManager();

		// Get existing flag
		const existingFlags = manager.getAllFlags();
		const existingFlag = existingFlags.find((f) => f.id === id);

		if (!existingFlag) {
			return c.json({ error: "Feature flag not found" }, 404);
		}

		// Update flag
		const updatedConfig: FeatureFlagConfig = {
			id,
			name: name !== undefined ? name : existingFlag.name,
			enabled: enabled !== undefined ? enabled : existingFlag.enabled,
			rollout: rollout !== undefined ? rollout : existingFlag.rollout,
			conditions:
				conditions !== undefined ? conditions : existingFlag.conditions,
		};

		manager.registerFlag(updatedConfig);

		return c.json({
			success: true,
			message: "Feature flag updated",
			flag: updatedConfig,
		});
	} catch (error) {
		return c.json({ error: "Failed to update feature flag" }, 500);
	}
});

/**
 * DELETE /api/features/:id
 * Delete a feature flag (admin only)
 */
featuresApi.delete("/features/:id", requireAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		if (currentUser?.role !== "admin") {
			return c.json({ error: "Admin access required" }, 403);
		}

		const id = c.req.param("id");
		const manager = getFeatureFlagManager();

		// Check if flag exists
		const existingFlags = manager.getAllFlags();
		const existingFlag = existingFlags.find((f) => f.id === id);

		if (!existingFlag) {
			return c.json({ error: "Feature flag not found" }, 404);
		}

		// Note: FeatureFlagManager doesn't have a delete method yet
		// For now, we'll disable the flag
		const disabledConfig: FeatureFlagConfig = {
			...existingFlag,
			enabled: false,
		};

		manager.registerFlag(disabledConfig);

		return c.json({
			success: true,
			message: "Feature flag disabled (delete not fully implemented yet)",
		});
	} catch (error) {
		return c.json({ error: "Failed to delete feature flag" }, 500);
	}
});

/**
 * GET /api/features/:id/check
 * Check if a feature flag is enabled for the current user
 */
featuresApi.get("/features/:id/check", requireAuth, async (c) => {
	try {
		const id = c.req.param("id");
		const currentUser = getAuthenticatedUser(c);

		if (!currentUser) {
			return c.json({ error: "User not authenticated" }, 401);
		}

		const manager = getFeatureFlagManager();
		const isEnabled = manager.isEnabled(id, currentUser);

		return c.json({
			flagId: id,
			enabled: isEnabled,
			userId: currentUser.id,
		});
	} catch (error) {
		return c.json({ error: "Failed to check feature flag" }, 500);
	}
});

export { featuresApi };
