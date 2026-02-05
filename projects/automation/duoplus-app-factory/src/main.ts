import { LightningService } from "./services/lightningService.ts";
import { handleQuestPaymentRequest, handleSettlementWebhook } from "./routes/paymentRoutes.ts";
import { 
  handleTerminalCreate, 
  handleTerminalList, 
  handleTerminalWrite, 
  handleTerminalResize, 
  handleTerminalClose, 
  handleTerminalStats,
  handleTerminalWebSocket 
} from "./routes/terminalRoutes.ts";
import { NEBULA_VERSION, getVersionString } from "./utils/version.ts";
import { calculateLegRiskScore } from "./nebula/riskEngine.ts";
import { ptyService } from "./services/ptyService.ts";

const PORT = process.env.PORT || 3227;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:3227"];

// CORS middleware
const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  
  return headers;
};

// Authentication middleware
const authenticateRequest = (req: Request): boolean => {
  // Skip auth for health check and public endpoints
  const url = new URL(req.url);
  console.log(`Authenticating request to ${url.pathname}`);
  
  if (url.pathname === "/" || url.pathname === "/health") {
    return true;
  }
  
  // Check for valid JWT token
  const authHeader = req.headers.get("Authorization");
  console.log(`Authorization header: ${authHeader}`);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Missing or invalid Authorization header");
    return false;
  }
  
  const token = authHeader.slice(7);
  // TODO: Implement proper JWT verification
  // For now, accept a simple test token
  const VALID_TOKEN = process.env.API_TOKEN || "test-token-123";
  console.log(`Token: ${token}, Valid token: ${VALID_TOKEN}`);
  
  const isValid = token === VALID_TOKEN;
  console.log(`Token valid: ${isValid}`);
  
  return isValid;
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("Origin");
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }
    
    // Authenticate requests
    if (!authenticateRequest(req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
      });
    }
    
    // Home page
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nebula-Flow™ v${NEBULA_VERSION}</title>
</head>
<body style="font-family: system-ui; padding: 2rem;">
<h1>⚡ Nebula-Flow™ v${NEBULA_VERSION}</h1>
<p>Status: <strong>OK</strong></p>
<div id="version-display"></div>
<hr>
<h2>Available Endpoints:</h2>
<ul>
<li><a href="/health">GET /health</a></li>
<li><a href="/api/node/balance">GET /api/node/balance</a></li>
<li>POST /api/invoice/generate</li>
<li>GET /api/payment/quest?questId=...&userId=...&amount=...</li>
<li>POST /webhook/settlement</li>
<li>GET /api/payment/status?questId=...</li>
<li>POST /api/leg/score</li>
</ul>
<h3>Terminal Management:</h3>
<ul>
<li>POST /api/terminal/create</li>
<li>GET /api/terminal/list</li>
<li>POST /api/terminal/write?sessionId=...</li>
<li>POST /api/terminal/resize?sessionId=...&cols=...&rows=...</li>
<li>DELETE /api/terminal/close?sessionId=...</li>
<li>GET /api/terminal/stats</li>
<li>GET /ws/terminal?sessionId=... (WebSocket)</li>
</ul>
<script>
// Demonstrate parent.getElementsByTagName usage
const versionDisplay = document.getElementById("version-display");
if (versionDisplay) {
  const parent = document.body;
  const headings = parent.getElementsByTagName("h1");
  if (headings.length > 0) {
    const h1Text = headings[0].textContent;
    var p = document.createElement("p");
    p.style.cssText = "color: #666;";
    p.textContent = "Version info extracted via parent.getElementsByTagName: " + h1Text;
    versionDisplay.appendChild(p);
  }
}
</script>
</body>
</html>`, {
        headers: { "Content-Type": "text/html", ...corsHeaders(req.headers.get("Origin")) },
      });
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ 
        status: "ok", 
        version: NEBULA_VERSION,
        versionString: getVersionString(),
        terminal: {
          supported: process.platform !== "win32",
          activeSessions: ptyService.getStats().activeSessions,
        }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
      });
    }
    
    // Payment routes
    if (url.pathname === "/api/payment/quest") {
      return handleQuestPaymentRequest(req);
    }
    
    // Webhook for LND settlement
    if (url.pathname === "/webhook/settlement" && req.method === "POST") {
      return handleSettlementWebhook(req);
    }
    
    // Get payment status
    if (url.pathname === "/api/payment/status") {
      const questId = url.searchParams.get("questId");
      if (!questId) {
        return new Response("Missing questId", { 
          status: 400,
          headers: corsHeaders(req.headers.get("Origin")),
        });
      }
      // Query database for status
      return new Response(JSON.stringify({ questId, status: "pending" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
      });
    }
    
    // Get node balance
    if (url.pathname === "/api/node/balance") {
      try {
        const lightning = LightningService.getInstance();
        const balance = await lightning.getNodeBalance();
        return new Response(JSON.stringify(balance), {
          headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
        });
      }
    }
    
    // Generate invoice
    if (url.pathname === "/api/invoice/generate" && req.method === "POST") {
      try {
        const body = await req.json();
        const lightning = LightningService.getInstance();
        const invoice = await lightning.generateQuestInvoice({
          questId: body.questId,
          userId: body.userId,
          amountSats: body.amountSats,
          description: body.description || "Quest Payment",
        });
        return new Response(JSON.stringify({ invoice }), {
          headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("Origin")) },
        });
      }
    }

    // Terminal management routes
    if (url.pathname === "/api/terminal/create" && req.method === "POST") {
      return handleTerminalCreate(req);
    }
    
    if (url.pathname === "/api/terminal/list" && req.method === "GET") {
      return handleTerminalList(req);
    }
    
    if (url.pathname === "/api/terminal/write" && req.method === "POST") {
      return handleTerminalWrite(req);
    }
    
    if (url.pathname === "/api/terminal/resize" && req.method === "POST") {
      return handleTerminalResize(req);
    }
    
    if (url.pathname === "/api/terminal/close" && req.method === "DELETE") {
      return handleTerminalClose(req);
    }
    
    if (url.pathname === "/api/terminal/stats" && req.method === "GET") {
      return handleTerminalStats(req);
    }

    // WebSocket terminal routes
    if (url.pathname === "/ws/terminal") {
      return handleTerminalWebSocket(req);
    }
    
    // Leg scoring endpoint
    if (url.pathname === "/api/leg/score" && req.method === "POST") {
      try {
        const body = await req.json();
        
        // Map request parameters to LegSignal
        const signal = {
          deviceId: body.deviceId || "unknown",
          ageDays: body.ageDays || 30,
          legAmount: body.amount || 0,
          legVelocity: body.legVelocity || 1,
          ipJump: body.ipJump || 0,
          walletAgeDelta: body.walletAgeDelta || 30,
          ctrProximity: Math.abs(body.amount - 10000) || 0,
          chargebackHistory: body.chargebackHistory || false,
        };

        // Calculate risk score
        const score = calculateLegRiskScore(signal);
        
        // Determine if allowed and code/reason
        let allowed = true;
        let code = "N-00";
        let reason = "";
        let suggested = "";

        if (score > 0.75) {
          allowed = false;
          reason = "STEP_UP_AUTH_REQUIRED";
          suggested = "sms-verify";
        }

        // Check for country jump (high risk indicator)
        if (body.countryJump) {
          allowed = false;
          reason = "STEP_UP_AUTH_REQUIRED";
          suggested = "sms-verify";
        }

        return new Response(JSON.stringify({
          score: parseFloat(score.toFixed(3)),
          allowed,
          code: allowed ? code : undefined,
          reason: !allowed ? reason : undefined,
          suggested: !allowed ? suggested : undefined,
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not Found", { 
      status: 404,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  },
});

console.log(`⚡ DuoPlus Lightning v3.5 running on http://localhost:${PORT}`);
console.log("📋 Available endpoints:");
console.log("  GET  /health");
console.log("  GET  /api/node/balance");
console.log("  POST /api/invoice/generate");
console.log("  GET  /api/payment/quest?questId=...&userId=...&amount=...");
console.log("  POST /webhook/settlement");
console.log("  GET  /api/payment/status?questId=...");
console.log("  POST /api/leg/score");
console.log("  POST /api/terminal/create");
console.log("  GET  /api/terminal/list");
console.log("  POST /api/terminal/write?sessionId=...");
console.log("  POST /api/terminal/resize?sessionId=...&cols=...&rows=...");
console.log("  DELETE /api/terminal/close?sessionId=...");
console.log("  GET  /api/terminal/stats");
console.log("  GET  /ws/terminal?sessionId=... (WebSocket)");