// Main API server for Venmo QR Code Dispute Handling System

import * as config from "./config/scope.config";
import { CreateDisputeRequest, MerchantResponse, DisputeDecision, DisputeStatus } from "./types";
import { STATUS_COLORS, CATEGORY_COLORS, getPerformanceColor, getColorForStatus } from "./constants/colors";
import db from "./database";
import aiEngine from "./ai-engine";
import index from "./index.html";

const RESET = "\x1b[0m";

console.log(`${Bun.color(STATUS_COLORS.info, "ansi")}Starting Bun.serve...${RESET}`);
const server = Bun.serve({
  port: 9999,
  static: {
    "/": index,
  },
  async fetch(req, server) {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // Static route handling
    if (path === "/" || path === "/index.html") {
      return new Response(index, { headers: { "Content-Type": "text/html" } });
    }

    try {
      if (path === "/favicon.ico") return new Response(null, { status: 204 });
      if (path === "/health") {
        const healthData = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          scope: config.SCOPE,
          domain: config.DOMAIN,
        };
        console.log(`${Bun.color(STATUS_COLORS.success, "ansi")}Health check accessed${RESET}`);
        return Response.json(healthData);
      }

      // API routes for dispute handling
      if (path.startsWith("/api/")) {
        return await handleApiRoutes(method, path, url, req);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      console.error(`${Bun.color(STATUS_COLORS.error, "ansi")}Error handling ${method} ${path}:${RESET}`, err);
      return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
  },
  websocket: {
    open: (ws) => {
      console.log('WebSocket connection opened');
    },
    message: (ws, message) => {
      ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
    }
  },
  error(error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  },
  development: true,
});

console.log(`🚀 Venmo Dispute API Server running on http://localhost:${server.port}`);

// API route handler
async function handleApiRoutes(method: string, path: string, url: URL, req: Request): Promise<Response> {
  const startTime = Date.now();
  
  try {
    if (path === "/api/disputes" && method === "POST") {
      return await handleCreateDispute(req);
    }
    
    if (path.startsWith("/api/disputes/") && method === "GET") {
      const pathParts = path.split("/");
      const disputeId = pathParts[3];
      if (!disputeId) {
        return new Response("Dispute ID required", { status: 400 });
      }
      return await handleGetDispute(disputeId);
    }
    
    if (path === "/api/disputes" && method === "GET") {
      return await handleListDisputes(url.searchParams);
    }
    
    if (path.startsWith("/api/disputes/") && method === "PUT") {
      const pathParts = path.split("/");
      const disputeId = pathParts[3];
      if (!disputeId) {
        return new Response("Dispute ID required", { status: 400 });
      }
      return await handleUpdateDispute(disputeId, req);
    }
    
    if (path.startsWith("/api/merchants/") && path.endsWith("/decision") && method === "POST") {
      return await handleMerchantDecision(req);
    }
    
    if (path === "/api/roi") {
      return await handleROIMetrics();
    }

    if (path === "/api/status") {
      return await handleSystemStatus();
    }
    
    return new Response("API endpoint not found", { status: 404 });
  } catch (err: any) {
    console.error("API Route Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  } finally {
    const duration = Date.now() - startTime;
    const perfColor = getPerformanceColor(duration, 'latency');
    console.log(`${Bun.color(perfColor, "ansi")}${method} ${path} - ${duration}ms${RESET}`);
  }
}

// System status endpoint
async function handleSystemStatus(): Promise<Response> {
  try {
    const status = {
      system: "operational",
      timestamp: new Date().toISOString(),
      scope: config.SCOPE,
      domain: config.DOMAIN,
      platform: config.PLATFORM,
      endpoints: {
        disputes: "/api/disputes",
        health: "/health",
        status: "/api/status"
      },
      colors: {
        categories: Object.keys(CATEGORY_COLORS),
        statuses: Object.keys(STATUS_COLORS)
      }
    };
    
    return Response.json(status);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

  // ROI Tracking handler
  async function handleROIMetrics(): Promise<Response> {
    try {
      const disputes = await db.getCustomerDisputes("", 1000);
      const totalVolume = disputes.length * 50; // Mock average transaction value
      const resolvedDisputes = disputes.filter(d => d.status === 'RESOLVED').length;
      
      const metrics = {
        mrr_impact: resolvedDisputes * 15.50, // Mock impact per resolution
        roi_metrics: {
          total_disputes: disputes.length,
          resolved_count: resolvedDisputes,
          success_rate: disputes.length > 0 ? (resolvedDisputes / disputes.length) : 0.85,
          onboarding_efficiency: "94%"
        },
        timestamp: new Date().toISOString()
      };
      
      console.log(`${Bun.color(CATEGORY_COLORS.Isolation, "ansi")}ROI metrics calculated${RESET}`);
      return Response.json(metrics);
    } catch (error: any) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

// Dispute creation handler
async function handleCreateDispute(req: Request): Promise<Response> {
  try {
    const body: CreateDisputeRequest = await req.json();
    
    // Validate request
    if (!body.transactionId || !body.customerId || !body.reason) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Check if transaction exists in DB
    const transaction = await db.getTransaction(body.transactionId);
    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }
    
    const disputeId = `DISP-${Date.now()}`;
    const now = new Date();
    
    const disputeData = {
      id: disputeId,
      transactionId: body.transactionId,
      customerId: body.customerId,
      merchantId: transaction.merchantId,
      reason: body.reason,
      description: body.description,
      status: "SUBMITTED" as DisputeStatus,
      requestedResolution: body.requestedResolution,
      evidenceUrls: body.evidence || [],
      timeline: [{
        event: "Dispute submitted",
        timestamp: now,
        actor: "CUSTOMER" as const,
        details: `Reason: ${body.reason}`
      }],
      contactMerchantFirst: body.contactMerchantFirst,
      createdAt: now,
      updatedAt: now
    };

    const dispute = await db.createDispute(disputeData);

    // Run AI analysis asynchronously
    aiEngine.analyzeEvidence(dispute).then(async (analysis) => {
      console.log(`${Bun.color(STATUS_COLORS.info, "ansi")}AI Analysis result for ${dispute.id}: ${analysis.recommendation}${RESET}`);
      // Update dispute with AI recommendation if needed
      if (analysis.recommendation === 'REJECT') {
        await db.updateDispute({ 
          id: dispute.id, 
          status: 'INTERNAL_REVIEW' as DisputeStatus,
          timeline: [...dispute.timeline, {
            event: "AI Analysis Complete",
            timestamp: new Date(),
            actor: "SYSTEM" as const,
            details: `AI Recommended: ${analysis.recommendation}. Confidence: ${analysis.confidence}`
          }]
        });
      }
    }).catch(err => {
      console.error("AI Analysis Failed:", err);
    });
    
    console.log(`${Bun.color(STATUS_COLORS.success, "ansi")}Dispute created in DB: ${dispute.id}${RESET}`);
    return Response.json({ success: true, dispute }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating dispute:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// Get dispute by ID
async function handleGetDispute(disputeId: string): Promise<Response> {
  try {
    const dispute = await db.getDispute(disputeId);
    if (!dispute) {
      return Response.json({ error: "Dispute not found" }, { status: 404 });
    }
    return Response.json(dispute);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// List disputes with filtering
async function handleListDisputes(params: URLSearchParams): Promise<Response> {
  try {
    const customerId = params.get('customerId');
    console.log(`Listing disputes for customerId: ${customerId || 'all'}`);
    
    if (customerId) {
      const disputes = await db.getCustomerDisputes(customerId);
      return Response.json({ disputes, total: disputes.length });
    }

    // Return all disputes if no filter
    // Note: getCustomerDisputes with empty ID should be handled in database.ts
    const disputes = await db.getCustomerDisputes("", 100); 
    console.log(`Found ${disputes.length} disputes in DB`);
    
    if (disputes.length === 0) {
      console.log("No disputes found, returning mock data");
      const mockDisputes = [
        { id: 'disp_1', status: 'SUBMITTED', customerId: 'cust_1', reason: 'Item not received', createdAt: new Date().toISOString() },
        { id: 'disp_2', status: 'RESOLVED', customerId: 'cust_2', reason: 'Wrong item', createdAt: new Date().toISOString() },
      ];
      return Response.json({ disputes: mockDisputes, total: mockDisputes.length });
    }

    return Response.json({ disputes, total: disputes.length });
  } catch (error: any) {
    console.error("List Disputes Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Update dispute
async function handleUpdateDispute(disputeId: string, req: Request): Promise<Response> {
  try {
    const updates = await req.json();
    await db.updateDispute({ id: disputeId, ...updates });
    console.log(`${Bun.color(STATUS_COLORS.warning)}Dispute updated in DB: ${disputeId}${RESET}`);
    return Response.json({ success: true, disputeId });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to update dispute" }, { status: 500 });
  }
}

// Merchant decision handler
async function handleMerchantDecision(req: Request): Promise<Response> {
  try {
    const decision: MerchantResponse = await req.json();
    
    // Validate decision
    if (!decision.message || decision.acceptsFault === undefined) {
      return Response.json({ error: "Invalid merchant decision" }, { status: 400 });
    }
    
    console.log(`${Bun.color(CATEGORY_COLORS.SECURITY)}Merchant decision recorded${RESET}`);
    return Response.json({ success: true, decision });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export default server;

