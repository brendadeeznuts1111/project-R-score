#!/usr/bin/env bun

/**
 * Registry Dashboard
 * Enhanced team dashboard with market filtering and pattern integration
 */

import { Elysia } from "elysia";
import dashboardRoutes from "./pages/dashboard";
import teamRoutes from "./pages/team/sports-correlation";

const app = new Elysia()
	.use(dashboardRoutes)
	.use(teamRoutes)
	.get("/", () => {
		return Response.redirect("/dashboard", 302);
	})
	.listen(4000);

// Note: /api/test/run endpoint is defined in dashboard.ts

console.log("📊 Registry Dashboard running at http://localhost:4000");
console.log("   Dashboard: http://localhost:4000/dashboard");

export default app;
