import { Bun } from "bun";
import { Palette } from "../src/utils/colors";

const sessions = new Map<string, { userId: string; created: number }>();

const server = Bun.serve({
  port: process.env.PORT || 3000,
  routes: {
    "/health": () => Response.json({ status: "healthy", timestamp: Date.now(), sessions: sessions.size }),
    "/api/auth/login": async (req: Request) => {
      const body = await req.json().catch(() => null);
      if (!body?.username || !body?.password) return new Response("Missing credentials", { status: 400 });
      if (body.username !== "admin" || body.password !== Bun.env.ADMIN_PASS) return new Response("Invalid credentials", { status: 401 });

      const sessionId = Bun.randomUUIDv7();
      sessions.set(sessionId, { userId: "admin", created: Date.now() });

      req.cookies.set("sessionId", sessionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60 * 24, path: "/" });

      return Response.json({ success: true, sessionId });
    },
    "/api/files/analyze": async (req: Request) => {
      const sessionId = req.cookies.get("sessionId");
      if (!sessionId) return new Response("Unauthorized: No session", { status: 401 });

      const session = sessions.get(sessionId);
      if (!session) return new Response("Unauthorized: Invalid session", { status: 401 });

      const age = Date.now() - session.created;
      if (age > 60 * 60 * 1000) { sessions.delete(sessionId); req.cookies.delete("sessionId"); return new Response("Session expired", { status: 401 }); }

      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) return new Response("No file provided", { status: 400 });

      const views = parseInt(req.cookies.get("fileViews") || "0") + 1;
      req.cookies.set("fileViews", views.toString(), { maxAge: 60 * 60 * 24 * 30, path: "/" });

      return Response.json({ success: true, data: { name: file.name, size: file.size }, views });
    },
    "/api/auth/logout": (req: Request) => {
      const sessionId = req.cookies.get("sessionId");
      if (sessionId) sessions.delete(sessionId);
      req.cookies.delete("sessionId");
      return Response.json({ success: true, message: "Logged out" });
    },
    "/api/debug/cookies": (req: Request) => {
      const cookieObj: Record<string, string> = {};
      for (const [name, value] of req.cookies.entries()) cookieObj[name] = value;
      return Response.json({ count: req.cookies.size, cookies: cookieObj, raw: req.headers.get("cookie") });
    },
  },
  error(error: Error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`🚀 Server running at ${server.url}`);

export default server;
