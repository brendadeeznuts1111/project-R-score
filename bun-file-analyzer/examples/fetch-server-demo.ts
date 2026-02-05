#!/usr/bin/env bun

/**
 * Fetch Server Demo
 * Demonstrates server-side handling of all fetch features: cookies, auth, file uploads, etc.
 */

import { log } from "../src/utils/logger";

const PORT = parseInt(process.env.API_PORT || "3007");
const HOST = process.env.HOST || "localhost";

// In-memory session store (for demo purposes)
const sessions = new Map<string, { userId: string; createdAt: number }>();
const users = new Map([
  ["demo", { id: "user-123", name: "Demo User", role: "admin" }],
]);

// Cookie utilities
function setSessionCookie(response: Response, sessionId: string) {
  response.headers.set(
    "Set-Cookie",
    `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
  );
}

function getSessionId(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies.session || null;
}

function authenticate(request: Request): { userId: string; sessionId: string } | null {
  const sessionId = getSessionId(request);
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  return { userId: session.userId, sessionId };
}

// URLPattern-based routing
const routes = {
  // Auth routes
  login: new URLPattern({ pathname: "/api/auth/login" }),
  logout: new URLPattern({ pathname: "/api/auth/logout" }),
  profile: new URLPattern({ pathname: "/api/user/profile" }),
  
  // File routes
  upload: new URLPattern({ pathname: "/api/files/upload" }),
  analyze: new URLPattern({ pathname: "/api/files/analyze" }),
  archive: new URLPattern({ pathname: "/api/files/archive" }),
  
  // API routes
  config: new URLPattern({ pathname: "/api/config" }),
  users: new URLPattern({ pathname: "/api/users" }),
  userDetail: new URLPattern({ pathname: "/api/users/:id" }),
  
  // Bundle analysis
  bundleAnalysis: new URLPattern({ pathname: "/api/bundle/analysis" }),
  unstable: new URLPattern({ pathname: "/api/unstable-endpoint" }),
};

// Route handlers
async function handleLogin(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    log.info(`🔐 Login attempt for user: ${username}`, { prefix: "AUTH" });
    
    // Simple authentication (demo only)
    if (username === "demo" && password === "demo123") {
      const user = users.get(username);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      
      // Create session
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessions.set(sessionId, { userId: user.id, createdAt: Date.now() });
      
      const response = Response.json({
        success: true,
        user: { id: user.id, name: user.name, role: user.role },
        sessionId,
      });
      
      setSessionCookie(response, sessionId);
      
      log.success(`✅ User ${username} logged in successfully`, { prefix: "AUTH" });
      return response;
    }
    
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
    
  } catch (error) {
    log.error(`❌ Login error: ${error.message}`, { prefix: "AUTH" });
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function handleProfile(request: Request): Promise<Response> {
  const auth = authenticate(request);
  if (!auth) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const user = Array.from(users.values()).find(u => u.id === auth.userId);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  
  log.info(`👤 Profile accessed for user: ${user.name}`, { prefix: "AUTH" });
  
  return Response.json({
    user,
    sessionId: auth.sessionId,
    permissions: ["read", "write", "admin"],
  });
}

async function handleFileUpload(request: Request): Promise<Response> {
  const auth = authenticate(request);
  if (!auth) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;
    
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    
    log.info(`📁 File upload: ${file.name} (${file.size} bytes)`, { prefix: "UPLOAD" });
    
    // Simulate file processing
    const fileData = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      description,
      uploadedAt: new Date().toISOString(),
      uploadedBy: auth.userId,
    };
    
    log.success(`✅ File uploaded successfully: ${file.name}`, { prefix: "UPLOAD" });
    
    return Response.json({
      success: true,
      file: fileData,
      message: "File uploaded successfully",
    });
    
  } catch (error) {
    log.error(`❌ Upload error: ${error.message}`, { prefix: "UPLOAD" });
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}

async function handleBundleAnalysis(request: Request): Promise<Response> {
  const auth = authenticate(request);
  if (!auth) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const buildId = request.headers.get("X-Build-ID") || "demo-build";
  
  log.info(`📊 Bundle analysis requested for build: ${buildId}`, { prefix: "ANALYSIS" });
  
  // Simulate bundle analysis
  const analysis = {
    buildId,
    timestamp: new Date().toISOString(),
    totalSize: 0.34 * 1024 * 1024, // 340KB
    chunks: [
      { name: "main.js", size: 280000, type: "javascript" },
      { name: "vendor.js", size: 45000, type: "javascript" },
      { name: "styles.css", size: 15000, type: "css" },
    ],
    dependencies: [
      { name: "react", version: "18.2.0", size: 42000 },
      { name: "react-dom", version: "18.2.0", size: 38000 },
      { name: "hono", version: "3.0.0", size: 25000 },
    ],
    recommendations: [
      "Enable code splitting for vendor chunks",
      "Consider tree shaking for unused exports",
      "Optimize image assets",
    ],
    metrics: {
      loadTime: "1.2s",
      firstContentfulPaint: "0.8s",
      largestContentfulPaint: "1.5s",
    },
  };
  
  log.success(`✅ Bundle analysis completed for ${buildId}`, { prefix: "ANALYSIS" });
  
  return Response.json(analysis);
}

async function handleUsers(request: Request): Promise<Response> {
  const auth = authenticate(request);
  if (!auth) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const userList = Array.from(users.entries()).map(([username, user]) => ({
    username,
    ...user,
  }));
  
  log.info(`👥 User list accessed (${userList.length} users)`, { prefix: "USERS" });
  
  return Response.json({
    users: userList,
    total: userList.length,
  });
}

async function handleUserDetail(request: Request, userId: string): Promise<Response> {
  const auth = authenticate(request);
  if (!auth) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const user = Array.from(users.entries()).find(([_, u]) => u.id === userId);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  
  log.info(`👤 User detail accessed: ${user[0]} (${userId})`, { prefix: "USERS" });
  
  return Response.json({
    username: user[0],
    user: user[1],
    sessionCount: sessions.size,
    serverTime: new Date().toISOString(),
  });
}

async function handleUnstableEndpoint(request: Request): Promise<Response> {
  // Simulate an unstable endpoint that might fail
  const random = Math.random();
  
  if (random < 0.3) {
    log.warning("⚠️ Simulating server error", { prefix: "UNSTABLE" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  
  if (random < 0.6) {
    log.warning("⚠️ Simulating timeout", { prefix: "UNSTABLE" });
    // Simulate timeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Response.json({ error: "Request timeout" }, { status: 408 });
  }
  
  log.success("✅ Unstable endpoint succeeded", { prefix: "UNSTABLE" });
  return Response.json({
    message: "Success from unstable endpoint",
    timestamp: new Date().toISOString(),
    random,
  });
}

// Main request handler
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  
  log.info(`${method} ${url.pathname}`, { prefix: "SERVER" });
  
  // Route matching with URLPattern
  try {
    // Auth routes
    if (routes.login.test({ pathname: url.pathname })) {
      if (method === "POST") return handleLogin(request);
    }
    
    if (routes.profile.test({ pathname: url.pathname })) {
      if (method === "GET") return handleProfile(request);
    }
    
    // File routes
    if (routes.upload.test({ pathname: url.pathname })) {
      if (method === "POST") return handleFileUpload(request);
    }
    
    // API routes
    if (routes.config.test({ pathname: url.pathname })) {
      return Response.json({
        apiVersion: "1.3.6",
        features: ["cookies", "auth", "uploads", "analysis"],
        endpoints: Object.keys(routes),
        serverTime: new Date().toISOString(),
      });
    }
    
    if (routes.users.test({ pathname: url.pathname })) {
      if (method === "GET") return handleUsers(request);
    }
    
    if (routes.userDetail.test({ pathname: url.pathname })) {
      const match = routes.userDetail.exec({ pathname: url.pathname })!;
      if (method === "GET") return handleUserDetail(request, match.pathname.groups.id!);
    }
    
    // Bundle analysis
    if (routes.bundleAnalysis.test({ pathname: url.pathname })) {
      if (method === "GET") return handleBundleAnalysis(request);
    }
    
    // Unstable endpoint for retry demo
    if (routes.unstable.test({ pathname: url.pathname })) {
      return handleUnstableEndpoint(request);
    }
    
  } catch (error) {
    log.error(`❌ Route handling error: ${error.message}`, { prefix: "SERVER" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  
  // 404 for unknown routes
  log.warning(`⚠️ Route not found: ${method} ${url.pathname}`, { prefix: "SERVER" });
  return Response.json({ 
    error: "Route not found",
    availableRoutes: Object.keys(routes),
    requestUrl: url.pathname,
  }, { status: 404 });
}

// Start server
const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: handleRequest,
  error(error) {
    log.error(`🔥 Server error: ${error.message}`, { prefix: "SERVER" });
    return new Response("Internal Server Error", { status: 500 });
  },
});

log.success(`🚀 Fetch demo server started`, { prefix: "SERVER" });
log.info(`📍 Server listening on http://${HOST}:${PORT}`, { prefix: "SERVER" });
log.info(`🧪 Ready for fetch demonstrations!`, { prefix: "SERVER" });

// Cleanup on exit
process.on("SIGINT", () => {
  log.info("🛑 Shutting down server...", { prefix: "SERVER" });
  server.stop();
  process.exit(0);
});

export { server, handleRequest };
