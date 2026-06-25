#!/usr/bin/env bun
/**
 * Nebula-Flow™ Dashboard Export Viewer
 * Launches the HTML viewer for dashboard exports
 */

import { serve } from "bun";

const PORT = 3001;

serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === "/" || url.pathname === "/index.html") {
            return new Response(Bun.file("../exports/data/view-dashboard-export.html"), {
                headers: { "Content-Type": "text/html" }
            });
        }

        // Serve any JSON file from exports/data
        const jsonMatch = url.pathname.match(/^\/([^\/]+\.json)$/);
        if (jsonMatch) {
            const jsonFile = `../exports/data/${jsonMatch[1]}`;
            if (await Bun.file(jsonFile).exists()) {
                return new Response(Bun.file(jsonFile), {
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        return new Response("Not Found", { status: 404 });
    }
});

console.info(`🧬 Nebula-Flow™ Dashboard Export Viewer`);
console.info(`🌐 Open your browser to: http://localhost:${PORT}`);
console.info(`📊 Viewing: nebula-dashboard-2026-01-21.json`);
console.info(`\nPress Ctrl+C to stop the viewer`);