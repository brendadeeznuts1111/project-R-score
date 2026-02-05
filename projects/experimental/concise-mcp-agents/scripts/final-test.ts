#!/usr/bin/env bun

// Try to replicate exactly what your browser did
const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });
if (!cookie) throw "Run auth-plive first";

console.log("🎯 FINAL ATTEMPT: Exact replication of your working request...");

// From your logs, the successful request had these exact parameters:
// minVolume=0&maxTimeUntilScore=0&from=1761627600&to=1761627600&toTime=86399&dateFilterBy=calcTime&t=1761638467350

// Maybe the data comes from a WebSocket or the frontend makes additional calls
// Let's try the exact AJAX call pattern that worked in your logs

const response = await fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php', {
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
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/#/events/bet-history?minVolume=0&maxTimeUntilScore=0&from=1761627600&to=1761627600&toTime=86399&dateFilterBy=calcTime&t=1761638467350',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"'
  },
  body: 'action=getLastBets&minVolume=0&maxTimeUntilScore=0&from=1761627600&to=1761627600&toTime=86399&dateFilterBy=calcTime',
  timeout: 10000
});

console.log(`📊 Final response: ${response.status} ${response.statusText}`);

if (response.ok) {
  const data = await response.text();
  console.log(`📦 Data: ${data.length} bytes`);
  console.log("Preview:", data.substring(0, 500));
  
  if (data.includes('profit') || data.includes('agent') || data.includes('bet')) {
    console.log("🎯 SUCCESS! Got betting data!");
    await Bun.write('data/final-success.json', data);
    
    // Try to parse and count records
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.success && jsonData.data) {
        const records = Array.isArray(jsonData.data) ? jsonData.data : [jsonData.data];
        console.log(`📊 Found ${records.length} betting records`);
        
        // Show first record as example
        if (records.length > 0) {
          console.log("Sample record:", JSON.stringify(records[0], null, 2));
        }
      }
    } catch (e) {
      console.log("Could not parse JSON:", e.message);
    }
  } else {
    console.log("❌ Got response but no betting data");
    await Bun.write('data/final-response.json', data);
  }
} else {
  console.log("❌ Still blocked");
}
