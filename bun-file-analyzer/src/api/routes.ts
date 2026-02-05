import { Bun } from "bun";
import { CookieManager } from "./cookie-manager";
import { Palette } from "../utils/colors";

// Cookie-aware URL patterns
const patterns = {
  // Authentication
  login: new URLPattern({ pathname: "/api/auth/login" }),
  logout: new URLPattern({ pathname: "/api/auth/logout" }),
  me: new URLPattern({ pathname: "/api/auth/me" }),
  
  // File operations
  analyze: new URLPattern({ pathname: "/api/files/analyze" }),
  analyzeById: new URLPattern({ pathname: "/api/files/:id/analyze" }),
  batch: new URLPattern({ pathname: "/api/files/batch" }),
  
  // Archive operations
  archive: new URLPattern({ pathname: "/api/files/archive" }),
  extract: new URLPattern({ pathname: "/api/files/:id/extract" }),
  
  // Config & debug
  config: new URLPattern({ pathname: "/api/config/:name.jsonc" }),
  cookies: new URLPattern({ pathname: "/api/debug/cookies" }),
  colors: new URLPattern({ pathname: "/api/debug/colors/:format" }),
  
} as const;

// Type-safe route handler
export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  
  // Log with Bun.color based on method
  const methodColor = {
    GET: Palette.performance.primary,
    POST: Palette.api.primary,
    PUT: Palette.processing.primary,
    DELETE: Palette.security.primary,
  }[method] || Palette.frontend.primary;
  
  console.log(
    `%c[${method}] ${url.pathname}`, 
    `color: ${Bun.color(methodColor, "ansi")}; font-weight: bold` 
  );
  
  // Check cookies first
  const cookieHeader = req.headers.get("cookie");
  const cookies = new CookieManager(cookieHeader ? [cookieHeader] : undefined);
  
  // Verify session for protected routes
  const protectedRoutes = ["analyze", "analyzeById", "batch", "archive"];
  const matchedRoute = Object.entries(patterns).find(([, pattern]) => 
    pattern.exec(req.url)
  );
  
  if (matchedRoute && protectedRoutes.includes(matchedRoute[0])) {
    const session = cookies.getSession();
    if (!session) {
      return Response.json(
        { error: "Unauthorized: No session cookie" },
        { 
          status: 401,
          headers: {
            "WWW-Authenticate": 'Cookie realm="file-analyzer"',
            "X-Error-Color": Bun.color(Palette.security.stroke, "hex")!,
          }
        }
      );
    }
  }
  
  // Route matching
  for (const [routeName, pattern] of Object.entries(patterns)) {
    const match = pattern.exec(req.url);
    
    if (match) {
      const params = match.pathname.groups;
      
      try {
        switch (routeName) {
          case "login":
            return handleLogin(req, cookies);
            
          case "analyzeById":
            return handleAnalyzeById(req, cookies, params.id!);
            
          case "archive":
            return handleArchive(req, cookies);
            
          case "config":
            return handleConfig(req, params.name!);
            
          case "cookies":
            return handleDebugCookies(cookies);
            
          case "colors":
            return handleDebugColors(req, params.format!);
            
          default:
            return new Response("Not Found", { status: 404 });
        }
      } catch (error) {
        return handleError(error, routeName);
      }
    }
  }
  
  return new Response("Not Found", { status: 404 });
}

// Route handlers
async function handleLogin(req: Request, cookies: CookieManager): Promise<Response> {
  const body = await req.json().catch(() => null);
  
  if (!body?.username || !body?.password) {
    return Response.json({ error: "Missing credentials" }, { status: 400 });
  }
  
  // Validate
  if (body.username !== Bun.env.ADMIN_USER || 
      body.password !== Bun.env.ADMIN_PASS) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
  
  // Create session
  const sessionId = Bun.randomUUIDv7();
  cookies.setSession(sessionId);
  
  // Debug log
  cookies.debug("Login cookies");
  
  return Response.json({
    success: true,
    sessionId,
    user: { id: "admin", username: body.username },
  }, {
    headers: {
      "X-Session-Color": Bun.color(Palette.api.stroke, "hex")!,
    },
  });
}

async function handleAnalyzeById(
  req: Request, 
  cookies: CookieManager, 
  id: string
): Promise<Response> {
  // Verify file exists
  const file = Bun.file(`./uploads/${id}`);
  if (!(await file.exists())) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
  
  // Increment analytics
  cookies.setAnalytics(cookies.getAnalytics() + 1);
  
  // Analyze
  const bytes = await file.bytes();
  const analysis = {
    id,
    size: file.size,
    sha256: Bun.hash.sha256(bytes).toString(),
    format: detectFormat(bytes),
    views: cookies.getAnalytics(),
  };
  
  return Response.json(analysis, {
    headers: {
      "X-Analysis-Color": Bun.color(Palette.processing.stroke, "hex")!,
      "Set-Cookie": cookies.toHeaderString(),
    },
  });
}

async function handleArchive(req: Request, cookies: CookieManager): Promise<Response> {
  const body = await req.json().catch(() => null);
  const fileIds = body?.fileIds || [];
  
  if (fileIds.length === 0) {
    return Response.json({ error: "No files specified" }, { status: 400 });
  }
  
  // Create archive
  const files: Record<string, Uint8Array> = {};
  for (const id of fileIds) {
    const file = Bun.file(`./uploads/${id}`);
    if (await file.exists()) {
      files[`${id}.bin`] = await file.bytes();
    }
  }
  
  const archive = new Bun.Archive(files, { compress: "gzip", level: 6 });
  const archiveId = `archive-${Date.now()}`;
  
  // Save
  await Bun.write(`./archives/${archiveId}.tar.gz`, archive);
  
  // Set cookie for download tracking
  cookies.set("lastDownload", archiveId, {
    maxAge: 60 * 60,
    path: "/",
  });
  
  return Response.json({
    archiveId,
    size: (await archive.bytes()).length,
    downloadUrl: `/archives/${archiveId}.tar.gz`,
  }, {
    headers: {
      "X-Archive-Color": Bun.color(Palette.storage.stroke, "hex")!,
    },
  });
}

async function handleConfig(req: Request, name: string): Promise<Response> {
  const configPath = `./config/${name}.jsonc`;
  
  if (!(await Bun.file(configPath).exists())) {
    return Response.json({ error: "Config not found" }, { status: 404 });
  }
  
  // ✅ Parse JSONC with Bun.JSONC
  const content = await Bun.file(configPath).text();
  const config = Bun.JSONC.parse(content);
  
  return Response.json(config, {
    headers: {
      "X-Config-Color": Bun.color(Palette.performance.stroke, "hex")!,
      "Content-Type": "application/json",
    },
  });
}

async function handleDebugCookies(cookies: CookieManager): Promise<Response> {
  // Use all CookieMap methods
  const entries = Array.from(cookies.entries());
  const keys = Array.from(cookies.keys());
  const values = Array.from(cookies.values());
  
  return Response.json({
    size: cookies.size,
    entries: Object.fromEntries(entries),
    keys,
    values,
    headerString: cookies.toHeaderString(),
  }, {
    headers: {
      "X-Debug-Color": Bun.color(Palette.frontend.stroke, "hex")!,
    },
  });
}

async function handleDebugColors(
  req: Request, 
  format: string
): Promise<Response> {
  const colorInput = "hsl(210, 90%, 55%)";
  const result = Bun.color(colorInput, format as any);
  
  return Response.json({
    input: colorInput,
    format,
    result,
    allFormats: {
      hex: Bun.color(colorInput, "hex"),
      rgba: Bun.color(colorInput, "{rgba}"),
      rgb: Bun.color(colorInput, "rgb"),
      ansi: Bun.color(colorInput, "ansi"),
      hsl: Bun.color(colorInput, "hsl"),
    },
  });
}

function handleError(error: unknown, route: string): Response {
  console.error(
    `%c❌ Error in ${route}: ${error}`, 
    `color: ${Bun.color(Palette.security.primary, "ansi")}` 
  );
  
  return Response.json(
    { error: "Internal server error" },
    { 
      status: 500,
      headers: {
        "X-Error-Color": Bun.color(Palette.security.stroke, "hex")!,
      }
    }
  );
}

function detectFormat(bytes: Uint8Array): string {
  // SIMD-optimized detection (Bun v1.3.6+)
  const buffer = Buffer.from(bytes);
  
  if (buffer.includes(Buffer.from([0x89, 0x50, 0x4E, 0x47]))) return "PNG";
  if (buffer.includes(Buffer.from([0xFF, 0xD8, 0xFF]))) return "JPEG";
  if (buffer.includes(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) return "ZIP";
  
  return "Unknown";
}
