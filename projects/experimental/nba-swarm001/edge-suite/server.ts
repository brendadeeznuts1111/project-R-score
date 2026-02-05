// edge-suite/server.ts
import { file } from "bun";
import { SharpShiftLedger } from "../packages/swarm-radar/ledger.js";
import { BUILD_METADATA, getBuildInfo } from "../src/core/build-metadata.js";
import { startRotationGridServer } from "../src/ws-grid.js";
import { rotationCache } from "../src/utils/rotation-cache.js";
import { getLogger } from "../src/utils/logger.js";
import { handleError, createErrorContext } from "../src/utils/error-handler.js";

const logger = getLogger();

const STATIC = import.meta.dir + "/public";

const API: Record<string, (req: Request) => Promise<Response> | Response> = {
  "/api/edges": getEdges,
  "/api/build": getBuildMetadata,
};

// In-memory ledger reference (would be injected in production)
let ledger: SharpShiftLedger | null = null;

// Start rotation grid WebSocket server
startRotationGridServer(3003);

Bun.serve({
  port: 3334,
  async fetch(req: Request) {
    const url = new URL(req.url);

    // Handle favicon
    if (url.pathname === "/favicon.ico") {
      return new Response("", { status: 204 });
    }

    // Static file
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = STATIC + path;

    const staticFile = file(filePath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }

    // API route
    if (API[url.pathname]) {
      return API[url.pathname](req);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Edge-Suite Dashboard running at http://localhost:3334`);
console.log(`📦 Build: ${getBuildInfo()}`);

async function getEdges(): Promise<Response> {
  const context = createErrorContext("getEdges");

  try {
    // If ledger is available, read from it
    if (!ledger) {
      ledger = new SharpShiftLedger(24);
    }

    // Get edges from ledger (last 100)
    const edges = ledger.readEdges();
    const last100 = edges.slice(-100).reverse();

    // Format for frontend - return HTML rows for HTMX
    const rows = last100
      .map((edge) => {
        const pairID = `${edge.from.substring(0, 8)}→${edge.to.substring(
          0,
          8
        )}`;
        const weight = parseFloat(edge.weight.toFixed(2));
        const ts = new Date(edge.timestamp).toISOString();
        const similarity = parseFloat(edge.similarity.toFixed(3));

        return `<tr>
        <td><code>${pairID}</code></td>
        <td>
          <span class="weight-bar" style="width: ${Math.min(
            weight * 100,
            100
          )}%;"></span>
          <span class="weight-value">${weight.toFixed(2)}</span>
        </td>
        <td>${similarity.toFixed(3)}</td>
        <td><time datetime="${ts}" title="${ts}">${ts}</time></td>
      </tr>`;
      })
      .join("");

    return new Response(
      rows ||
        "<tr><td colspan='4' class='loading'>No edges yet</td></tr>",
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    // Fallback: return mock data if ledger not available
    handleError(error, context, {
      logLevel: "warn",
      throw: false,
      recover: () => {
        logger.debug("Returning mock data as fallback");
      },
    });

    const mockRows = Array.from({ length: 10 }, (_, i) => {
      const weight = 0.5 + Math.random() * 0.5;
      const ts = new Date(Date.now() - i * 60000).toISOString();

      return `<tr>
        <td><code>game-${i}→game-${i + 1}</code></td>
        <td>
          <span class="weight-bar" style="width: ${Math.min(
            weight * 100,
            100
          )}%;"></span>
          <span class="weight-value">${weight.toFixed(2)}</span>
        </td>
        <td>${(0.6 + Math.random() * 0.3).toFixed(3)}</td>
        <td><time datetime="${ts}" title="${ts}">${ts}</time></td>
      </tr>`;
    }).join("");

    return new Response(mockRows, {
      headers: { "Content-Type": "text/html" },
    });
  }
}

// Build metadata API endpoint
function getBuildMetadata(): Response {
  return new Response(
    JSON.stringify({
      ...BUILD_METADATA,
      buildInfo: getBuildInfo(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Export function to set ledger (for integration with radar)
export function setLedger(newLedger: SharpShiftLedger) {
  ledger = newLedger;
}

