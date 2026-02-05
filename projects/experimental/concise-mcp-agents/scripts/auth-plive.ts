#!/usr/bin/env bun

// [AUTH][PLIVE][LOGIN][AUTH-PLIVE-001][v1.0][ACTIVE]

const USERNAME = "NOLAROSE";
const PASSWORD = "N@LA2030";

console.log("🔑 Authenticating with plive.sportswidgets.pro...");

// First, get the login page to extract any CSRF tokens or required headers
const loginPage = await fetch('https://plive.sportswidgets.pro/manager-tools/#/login');
const loginHtml = await loginPage.text();

// Extract any form data or tokens if needed
console.log("📄 Got login page, checking for auth requirements...");

// Attempt login
const loginResponse = await fetch('https://plive.sportswidgets.pro/api/v3/manager-tools/signin/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/#/login'
  },
  body: JSON.stringify({
    username: USERNAME,
    password: PASSWORD
  })
});

if (!loginResponse.ok) {
  console.error(`❌ Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
  const errorText = await loginResponse.text();
  console.error("Error details:", errorText);
  process.exit(1);
}

console.log("✅ Login successful!");

// Extract cookies from response
const cookies = loginResponse.headers.get('set-cookie');
if (cookies) {
  console.log("🍪 Session cookies obtained");
  
  // Store in Bun.secrets for the live pipe script
  await Bun.secrets.set({ service: "plive", name: "cookie", value: cookies });
  console.log("🔒 Cookies stored securely in Bun.secrets");
} else {
  console.warn("⚠️  No cookies in response - checking response body...");
}

// Check if we got a successful auth response
const authData = await loginResponse.json();
console.log("📊 Auth response:", JSON.stringify(authData, null, 2));

// Now test the live data endpoint
console.log("🧪 Testing live data endpoint...");
const testResponse = await fetch('https://plive.sportswidgets.pro/live/data?countries=true&leagues=true&sports=true', {
  headers: {
    'cookie': cookies || '',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/'
  }
});

if (testResponse.ok) {
  console.log("✅ Live data endpoint accessible!");
  const data = await testResponse.json();
  console.log(`📊 Got ${Array.isArray(data) ? data.length : 'unknown'} records`);
  
  // Store success indicator
  await Bun.secrets.set({ service: "plive", name: "authenticated", value: "true" });
  console.log("🎯 Ready to run live data pipeline!");
  
} else {
  console.error(`❌ Live data access failed: ${testResponse.status}`);
  console.error("Response:", await testResponse.text());
}

console.log("\n🚀 Run: bun run pipe:live");
