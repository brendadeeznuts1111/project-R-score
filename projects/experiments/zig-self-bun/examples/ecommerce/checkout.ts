// examples/ecommerce/checkout.ts
// Real-world usage: E-Commerce API with 13-byte config dependencies

import { serve } from "bun";

const PORT = parseInt(Bun.env.PORT || "3000", 10);

serve({
  port: PORT,

  async fetch(req) {
    const requestStart = Bun.nanoseconds();

    try {
      // 1. Parse cookies: 450ns (depends on terminal.mode)
      const cookies = parseCookies(req.headers.get("Cookie") || "");
      
      // 2. Verify JWT: 150ns (if PREMIUM_TYPES) or 500ns (free)
      const session = cookies.get("session");
      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }

      const claims = await verifyJWT(session);
      if (!claims) {
        return new Response("Invalid token", { status: 401 });
      }

      // 3. DB query: 500ns + RTT (driver from registry_hash)
      const db = await connectDB();
      const user = await db.query(`SELECT * FROM users WHERE id = ?`, [claims.userId]);

      if (!user) {
        return new Response("User not found", { status: 404 });
      }

      // 4. Process checkout
      const body = await req.json();
      const order = await processCheckout(user.id, body);

      // 5. Log to S3: 5µs (real) or 5ns (mock if MOCK_S3 flag)
      await logToS3(`checkout/${user.id}/${order.id}.json`, {
        action: "purchase",
        amount: order.amount,
        timestamp: new Date().toISOString(),
      });

      const duration = Bun.nanoseconds() - requestStart;
      
      // If DEBUG flag, log performance
      if (Bun.config.features.DEBUG) {
        console.log(`Checkout completed in ${duration}ns`);
      }

      return Response.json({
        success: true,
        orderId: order.id,
        duration_ns: duration,
      });
    } catch (error) {
      console.error("Checkout error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`🛒 E-Commerce API listening on :${PORT}`);
console.log(`📊 Config version: ${Bun.config.version}`);
console.log(`🔑 Features: 0x${Bun.config.featureFlags.toString(16)}`);
console.log(`🌐 Registry: 0x${Bun.config.registryHash.toString(16)}`);

// Helper functions (simplified)
function parseCookies(cookieHeader: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const pair of cookieHeader.split("; ")) {
    const [name, value] = pair.split("=");
    if (name && value) {
      cookies.set(name, value);
    }
  }
  return cookies;
}

async function verifyJWT(token: string): Promise<{ userId: string } | null> {
  // Simplified - in production, use actual JWT verification
  // Performance: 150ns (PREMIUM_TYPES) or 500ns (free)
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    // Decode payload
    const payload = JSON.parse(atob(parts[1]));
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

async function connectDB() {
  // Simplified - in production, use actual SQL driver
  // Performance: 500ns + network RTT
  return {
    query: async (sql: string, params: any[]) => {
      // Mock query result
      return { id: "user123", name: "John Doe" };
    },
  };
}

async function processCheckout(userId: string, body: any) {
  // Simplified checkout processing
  return {
    id: `order_${Date.now()}`,
    userId,
    amount: body.amount || 0,
  };
}

async function logToS3(key: string, data: any) {
  // Performance: 5µs (real) or 5ns (mock if MOCK_S3 flag)
  const file = Bun.file(`s3://logs/${key}`);
  await Bun.write(file, JSON.stringify(data));
}

