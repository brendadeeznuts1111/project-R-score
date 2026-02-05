// Bun HTTP server benchmarks - native Bun.serve with cookies
import { bench, group, execute } from "./runner";

const PORT = 3456;

// Test server with cookie handling
const server = Bun.serve({
  port: PORT,
  routes: {
    "/": () => new Response("OK"),

    "/json": () => Response.json({ status: "ok", timestamp: Date.now() }),

    "/cookies": (req) => {
      const cookies = req.cookies;
      const visited = cookies.get("visited") || "0";
      cookies.set("visited", String(Number(visited) + 1));
      cookies.set("session", crypto.randomUUID(), { httpOnly: true, secure: true });
      return Response.json({ visited: Number(visited) + 1 });
    },

    "/parse-cookies": (req) => {
      // Parse cookies from header manually (for comparison)
      const cookieHeader = req.headers.get("cookie") || "";
      const cookies = new Bun.CookieMap(cookieHeader);
      return Response.json({ count: cookies.size });
    },

    "/heavy": () => {
      // Simulate some CPU work
      let sum = 0;
      for (let i = 0; i < 10000; i++) sum += i;
      return Response.json({ sum });
    },
  },

  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`✅ Test server running on port ${PORT}`);

const baseUrl = `http://localhost:${PORT}`;

group("Basic requests", () => {
  bench("GET / (plain text)", async () => {
    await fetch(`${baseUrl}/`).then(r => r.text());
  });

  bench("GET /json", async () => {
    await fetch(`${baseUrl}/json`).then(r => r.json());
  });

  bench("GET /heavy (CPU work)", async () => {
    await fetch(`${baseUrl}/heavy`).then(r => r.json());
  });
});

group("Cookie handling", () => {
  bench("GET /cookies (set cookies)", async () => {
    await fetch(`${baseUrl}/cookies`).then(r => r.json());
  });

  bench("GET /cookies with existing cookies", async () => {
    await fetch(`${baseUrl}/cookies`, {
      headers: { Cookie: "visited=5; session=abc123; theme=dark" }
    }).then(r => r.json());
  });

  bench("GET /parse-cookies (CookieMap)", async () => {
    await fetch(`${baseUrl}/parse-cookies`, {
      headers: { Cookie: "a=1; b=2; c=3; d=4; e=5" }
    }).then(r => r.json());
  });
});

group("Parallel requests", () => {
  bench("10 parallel GET /", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => fetch(`${baseUrl}/`).then(r => r.text()))
    );
  });

  bench("10 parallel GET /json", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => fetch(`${baseUrl}/json`).then(r => r.json()))
    );
  });

  bench("10 parallel GET /cookies", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => fetch(`${baseUrl}/cookies`).then(r => r.json()))
    );
  });
});

group("Cookie class operations", () => {
  bench("new Bun.Cookie(name, value)", () => {
    new Bun.Cookie("session", "abc123");
  });

  bench("new Bun.Cookie(name, value, opts)", () => {
    new Bun.Cookie("session", "abc123", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600,
    });
  });

  bench("Bun.Cookie.from(name, value, opts)", () => {
    Bun.Cookie.from("session", "abc123", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600,
    });
  });

  bench("new Bun.Cookie({ opts object })", () => {
    new Bun.Cookie({
      name: "session",
      value: "abc123",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600,
    });
  });

  bench("Bun.Cookie.parse(string)", () => {
    Bun.Cookie.parse("session=abc123; Path=/; Secure; HttpOnly; SameSite=Strict");
  });

  bench("new Bun.Cookie(cookieString)", () => {
    new Bun.Cookie("session=abc123; Path=/; Secure; HttpOnly; SameSite=Strict");
  });

  bench("cookie.serialize()", () => {
    const cookie = new Bun.Cookie("session", "abc123", { httpOnly: true, secure: true });
    cookie.serialize();
  });

  bench("cookie.toString()", () => {
    const cookie = new Bun.Cookie("session", "abc123", { httpOnly: true, secure: true });
    cookie.toString();
  });

  bench("cookie.toJSON()", () => {
    const cookie = new Bun.Cookie("session", "abc123", { httpOnly: true, secure: true });
    cookie.toJSON();
  });

  bench("JSON.stringify(cookie)", () => {
    const cookie = new Bun.Cookie("session", "abc123", { httpOnly: true, secure: true });
    JSON.stringify(cookie);
  });

  bench("cookie.isExpired()", () => {
    const cookie = new Bun.Cookie("session", "abc123", { maxAge: 3600 });
    cookie.isExpired();
  });
});

// Pre-create cookie for property access benchmarks
const testCookie = new Bun.Cookie("session", "abc123", {
  domain: "example.com",
  path: "/admin",
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 3600,
  partitioned: true,
});

group("Cookie property access", () => {
  bench("read all properties", () => {
    testCookie.name;
    testCookie.value;
    testCookie.domain;
    testCookie.path;
    testCookie.expires;
    testCookie.secure;
    testCookie.sameSite;
    testCookie.partitioned;
    testCookie.maxAge;
    testCookie.httpOnly;
  });

  bench("read name + value only", () => {
    testCookie.name;
    testCookie.value;
  });

  bench("check security props", () => {
    testCookie.httpOnly;
    testCookie.secure;
    testCookie.sameSite;
  });
});

// Pre-create CookieMap for property/method benchmarks
const testCookieMap = new Bun.CookieMap("a=1; b=2; c=3; d=4; e=5; f=6; g=7; h=8");

group("CookieMap constructors", () => {
  bench("new Bun.CookieMap() empty", () => {
    new Bun.CookieMap();
  });

  bench("new Bun.CookieMap(string)", () => {
    new Bun.CookieMap("a=1; b=2; c=3; d=4; e=5");
  });

  bench("new Bun.CookieMap(object)", () => {
    new Bun.CookieMap({ a: "1", b: "2", c: "3", d: "4", e: "5" });
  });

  bench("new Bun.CookieMap([[name, value]])", () => {
    new Bun.CookieMap([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
      ["d", "4"],
      ["e", "5"],
    ]);
  });
});

group("CookieMap operations", () => {

  bench("cookieMap.size", () => {
    testCookieMap.size;
  });

  bench("cookieMap.has()", () => {
    testCookieMap.has("a");
    testCookieMap.has("z");
  });

  bench("cookieMap.get() x5", () => {
    testCookieMap.get("a");
    testCookieMap.get("b");
    testCookieMap.get("c");
    testCookieMap.get("d");
    testCookieMap.get("e");
  });

  bench("cookieMap.set(name, value)", () => {
    const map = new Bun.CookieMap();
    map.set("session", "abc123");
  });

  bench("cookieMap.set({ options })", () => {
    const map = new Bun.CookieMap();
    map.set({
      name: "session",
      value: "abc123",
      maxAge: 3600,
      secure: true,
    });
  });

  bench("cookieMap.set(Cookie instance)", () => {
    const map = new Bun.CookieMap();
    const cookie = new Bun.Cookie("session", "abc123");
    map.set(cookie);
  });

  bench("cookieMap.delete(name)", () => {
    const map = new Bun.CookieMap("a=1; b=2; c=3");
    map.delete("b");
  });

  bench("cookieMap.delete({ opts })", () => {
    const map = new Bun.CookieMap("a=1; b=2; c=3");
    map.delete({
      name: "b",
      domain: "example.com",
      path: "/admin",
    });
  });

  bench("cookieMap.toJSON()", () => {
    testCookieMap.toJSON();
  });

  bench("cookieMap.toSetCookieHeaders()", () => {
    const map = new Bun.CookieMap();
    map.set("session", "abc123");
    map.set("theme", "dark");
    map.delete("old");
    map.toSetCookieHeaders();
  });
});

group("CookieMap iteration", () => {
  bench("for...of (default iterator)", () => {
    for (const [name, value] of testCookieMap) {
      // iterate
    }
  });

  bench("cookieMap.entries()", () => {
    for (const [name, value] of testCookieMap.entries()) {
      // iterate
    }
  });

  bench("cookieMap.keys()", () => {
    for (const key of testCookieMap.keys()) {
      // iterate
    }
  });

  bench("cookieMap.values()", () => {
    for (const value of testCookieMap.values()) {
      // iterate
    }
  });

  bench("cookieMap.forEach()", () => {
    testCookieMap.forEach((value, name) => {
      // iterate
    });
  });
});

await execute();

server.stop();
console.log("✅ Server stopped");
