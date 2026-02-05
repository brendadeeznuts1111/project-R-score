#!/usr/bin/env bun

// First navigate to manager-tools to establish session
const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });
if (!cookie) throw "Run auth-plive first";

// Step 1: Visit manager-tools page to establish session
console.log("🌐 Establishing session at manager-tools...");
const pageResponse = await fetch('https://plive.sportswidgets.pro/manager-tools/', {
  headers: {
    'cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/'
  }
});

if (!pageResponse.ok) {
  console.error(`❌ Failed to access manager-tools: ${pageResponse.status}`);
  process.exit(1);
}

console.log("✅ Session established");

// Step 2: Now try reports with same session
console.log("📊 Testing reports with established session...");

const reportResponse = await fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php', {
  method: 'POST',
  headers: {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Cookie': cookie,
    'Origin': 'https://plive.sportswidgets.pro',
    'Pragma': 'no-cache',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"'
  },
  body: 'action=getSummaryReport',
  timeout: 10000
});

console.log(`📊 Report response: ${reportResponse.status} ${reportResponse.statusText}`);

if (reportResponse.ok) {
  const data = await reportResponse.text();
  console.log(`📦 Data: ${data.length} bytes`);
  console.log("Preview:", data.substring(0, 300));
  
  if (data.includes('success') && data.includes('data')) {
    console.log("🎯 SUCCESS! Got report data!");
    await Bun.write('data/report-summary.json', data);
  }
} else {
  console.log("❌ Still blocked");
}
