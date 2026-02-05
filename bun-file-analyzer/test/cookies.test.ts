import { describe, it, expect, beforeEach } from "bun:test";

describe("Bun Native Cookie Integration", () => {
  // Skip all tests if Bun.serve is not available
  const isBunServeAvailable = typeof Bun !== 'undefined' && typeof Bun.serve === 'function';

  if (!isBunServeAvailable) {
    it("Bun.serve not available, skipping cookie integration tests", () => {
      console.log("Bun.serve not available, skipping cookie integration tests");
    });
  } else {
    let server: any;

    beforeEach(() => {
      server = Bun.serve({
        routes: {
          "/set-cookie": (req: any) => { req.cookies.set("test", "value", { httpOnly: true }); return new Response("Cookie set"); },
          "/get-cookie": (req: any) => { const value = req.cookies.get("test"); return Response.json({ value }); },
        },
        port: 0,
      });
    });

    it("sets and retrieves cookies with bun.serve", async () => {
      // Give the server a moment to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const setResponse = await fetch(`${server.url}/set-cookie`);
      expect(setResponse.status).toBe(200);

      const setCookies = setResponse.headers.getSetCookie?.() || [];
      expect(setCookies.length).toBeGreaterThan(0);

      const jar = new Bun.CookieMap(
        setCookies.map((cookie: string) => {
          const [name, ...valueParts] = cookie.split("=");
          return [name, valueParts.join("=")];
        })
      );
      expect(jar.get("test")).toBe("value");

      const cookieHeader = Array.from(jar.entries()).map(([n, v]: [string, any]) => `${n}=${v}`).join("; ");
      const getResponse = await fetch(`${server.url}/get-cookie`, { headers: { Cookie: cookieHeader } });
      const data = await getResponse.json();
      expect(data.value).toBe("value");
    });
  }
});
