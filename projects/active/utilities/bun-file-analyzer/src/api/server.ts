import { Bun } from "bun";
import { CookieManager } from "./cookie-manager";

// Environment variables
const API_PORT = process.env.API_PORT || "3007";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "test123";

// Simple in-memory session store
const sessions = new Map<string, { user: string; created: number }>();

// Create server with Bun.serve
export function createServer() {
  return Bun.serve({
    port: parseInt(API_PORT),
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;
      
      // CORS headers
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
      };

      // Handle CORS preflight
      if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // Extract cookies from request
      const cookieHeader = req.headers.get("cookie") || "";
      const cookieManager = new CookieManager(cookieHeader);

      // Authentication middleware
      const isAuthenticated = () => {
        const sessionId = cookieManager.getSession();
        if (!sessionId) return false;
        return sessions.has(sessionId);
      };

      // Routes
      try {
        // Health check
        if (url.pathname === "/health") {
          return Response.json({
            status: "healthy",
            timestamp: Date.now(),
            version: "1.3.6+",
            port: API_PORT,
          }, { headers: corsHeaders });
        }

        // Authentication routes
        if (url.pathname === "/api/auth/login" && method === "POST") {
          const body = await req.json();
          const { username, password } = body;

          if (username === ADMIN_USER && password === ADMIN_PASS) {
            const sessionId = crypto.randomUUID();
            sessions.set(sessionId, { user: username, created: Date.now() });

            const responseCookie = new CookieManager();
            responseCookie.setSession(sessionId);

            return Response.json({
              success: true,
              user: { username },
              sessionId,
            }, {
              headers: {
                ...corsHeaders,
                "Set-Cookie": responseCookie.getSetCookieHeaders()[0],
              },
            });
          }

          return Response.json({
            error: "Invalid credentials",
          }, { 
            status: 401,
            headers: corsHeaders,
          });
        }

        if (url.pathname === "/api/auth/logout" && method === "POST") {
          const sessionId = cookieManager.getSession();
          if (sessionId) {
            sessions.delete(sessionId);
          }

          const clearCookie = new CookieManager();
          clearCookie.setSession(""); // Clear session

          return Response.json({
            success: true,
            message: "Logged out",
          }, {
            headers: {
              ...corsHeaders,
              "Set-Cookie": `sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
            },
          });
        }

        // Protected routes (require authentication)
        if (!isAuthenticated()) {
          return Response.json({
            error: "Unauthorized - Please login first",
          }, { 
            status: 401,
            headers: corsHeaders,
          });
        }

        // File analysis routes
        if (url.pathname === "/api/files/analyze" && method === "POST") {
          const body = await req.json();
          const { fileIds = [] } = body;

          const results = fileIds.map((id: string) => ({
            id,
            status: "analyzed",
            timestamp: Date.now(),
          }));

          return Response.json({
            success: true,
            results,
            analyzed: fileIds.length,
          }, { headers: corsHeaders });
        }

        // Dynamic file routes with URLPattern
        const filePattern = new URLPattern("/api/files/:id/analyze");
        const fileMatch = filePattern.exec(url);

        if (fileMatch && method === "POST") {
          const fileId = fileMatch.pathname.groups.id;
          
          // Check if file exists
          const filePath = `./uploads/${fileId}`;
          const file = Bun.file(filePath);

          if (!await file.exists()) {
            return Response.json({
              error: "File not found",
            }, { 
              status: 404,
              headers: corsHeaders,
            });
          }

          const buffer = await file.arrayBuffer();
          const size = buffer.byteLength;
          
          // Simple format detection
          let format = "Unknown";
          const uint8 = new Uint8Array(buffer.slice(0, 4));
          const hex = Array.from(uint8).map(b => b.toString(16).padStart(2, "0")).join("");
          
          if (hex.startsWith("89504e47")) format = "PNG";
          else if (hex.startsWith("ffd8ff")) format = "JPEG";
          else if (hex.startsWith("47494638")) format = "GIF";
          else if (hex.startsWith("504b0304")) format = "ZIP";

          return Response.json({
            id: fileId,
            size,
            format,
            timestamp: Date.now(),
          }, { headers: corsHeaders });
        }

        // Archive creation
        if (url.pathname === "/api/files/archive" && method === "POST") {
          const body = await req.json();
          const { fileIds = [] } = body;

          const archive = new Bun.Archive();
          
          for (const fileId of fileIds) {
            const filePath = `./uploads/${fileId}`;
            const file = Bun.file(filePath);
            
            if (await file.exists()) {
              const contents = await file.bytes();
              archive.add(`${fileId}.bin`, contents);
              archive.add(`${fileId}.json`, JSON.stringify({
                id: fileId,
                size: contents.length,
                timestamp: Date.now(),
              }));
            }
          }

          const archiveBytes = archive.bytes();
          const archiveId = `archive-${Date.now()}`;
          const archivePath = `./archives/${archiveId}.tar.gz`;

          // Ensure archives directory exists
          await Bun.$`mkdir -p ./archives`.quiet();
          await Bun.write(archivePath, archiveBytes);

          return Response.json({
            success: true,
            archiveId,
            size: archiveBytes.length,
            fileCount: fileIds.length,
          }, { headers: corsHeaders });
        }

        // Configuration parsing
        if (url.pathname.startsWith("/api/config/") && method === "GET") {
          const configName = url.pathname.replace("/api/config/", "");
          const configPath = `./config/${configName}`;

          try {
            const configContent = await Bun.file(configPath).text();
            const parsed = Bun.JSONC.parse(configContent);
            
            return Response.json(parsed, { headers: corsHeaders });
          } catch (error) {
            return Response.json({
              error: "Configuration not found or invalid",
              details: error.message,
            }, { 
              status: 404,
              headers: corsHeaders,
            });
          }
        }

        // Debug routes for testing
        if (url.pathname.startsWith("/api/debug/")) {
          const debugPath = url.pathname.replace("/api/debug/", "");
          
          if (debugPath.startsWith("colors/")) {
            const format = debugPath.replace("colors/", "");
            const input = "hsl(210, 90%, 55%)";
            
            let result;
            try {
              result = Bun.color(input, format as any);
            } catch (error) {
              result = `Error: ${error.message}`;
            }

            return Response.json({
              input,
              format,
              result,
            }, {
              headers: {
                ...corsHeaders,
                "X-Response-Color": typeof result === "string" ? result : "error",
              },
            });
          }
        }

        // 404 for unknown routes
        return Response.json({
          error: "Route not found",
          availableRoutes: [
            "/health",
            "/api/auth/login",
            "/api/auth/logout", 
            "/api/files/analyze",
            "/api/files/:id/analyze",
            "/api/files/archive",
            "/api/config/:name",
            "/api/debug/colors/:format",
          ],
        }, { 
          status: 404,
          headers: corsHeaders,
        });

      } catch (error) {
        return Response.json({
          error: "Internal server error",
          details: error.message,
        }, { 
          status: 500,
          headers: corsHeaders,
        });
      }
    },
  });
}
