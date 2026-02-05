/**
 * Add DNS record for blog.factory-wager.com
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
  // Check existing DNS
  const checkRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=blog.factory-wager.com`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const checkData = await checkRes.json() as any;

  if (!checkData.success) {
    console.log("Check failed:", checkData.errors);
    return;
  }

  if (checkData.result.length > 0) {
    console.log("DNS record already exists:");
    console.log(`  ${checkData.result[0].type} ${checkData.result[0].name} -> ${checkData.result[0].content}`);
    return;
  }

  console.log("Creating DNS record...");
  const addRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "AAAA",
        name: "blog",
        content: "100::",
        proxied: true,
      }),
    }
  );
  const addData = await addRes.json() as any;

  if (addData.success) {
    console.log("✅ Created DNS record:");
    console.log(`  ${addData.result.type} ${addData.result.name} -> ${addData.result.content}`);
  } else {
    console.log("Error:", addData.errors);
  }
}

main();
