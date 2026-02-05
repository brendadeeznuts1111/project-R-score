/**
 * Add Worker route for blog.factory-wager.com
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Read token from wrangler config
const configPath = join(homedir(), ".wrangler/config/default.toml");
const config = readFileSync(configPath, "utf-8");
const tokenMatch = config.match(/oauth_token = "([^"]+)"/);
const token = tokenMatch?.[1];

if (!token) {
  console.error("No OAuth token found in wrangler config");
  process.exit(1);
}

const zoneId = "a3b7ba4bb62cb1b177b04b8675250674"; // factory-wager.com

async function main() {
  // Check existing routes
  const checkRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const checkData = await checkRes.json() as any;

  if (!checkData.success) {
    console.log("Check failed:", checkData.errors);
    return;
  }

  const existingRoute = checkData.result?.find((r: any) => r.pattern.includes("blog.factory-wager.com"));
  if (existingRoute) {
    console.log("Route already exists:", existingRoute.pattern, "->", existingRoute.script);
    return;
  }

  console.log("Adding route...");
  const addRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pattern: "blog.factory-wager.com/*",
        script: "mcp-blog-gateway-ord01",
      }),
    }
  );
  const addData = await addRes.json() as any;

  if (addData.success) {
    console.log("✅ Route added:", addData.result.pattern, "->", addData.result.script);
  } else {
    console.log("Error:", addData.errors);
  }
}

main();
