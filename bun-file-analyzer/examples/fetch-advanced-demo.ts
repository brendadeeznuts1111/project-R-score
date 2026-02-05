#!/usr/bin/env bun

/**
 * Advanced Bun Fetch Demo
 * Demonstrates critical fetch features: credentials, cookies, error handling, and session management
 */

import { createCookieClient } from "../src/api/authenticated-client";
import { log } from "../src/utils/logger";

// Environment-aware API configuration
const API_BASE = process.env.API_URL || "http://localhost:3007";
const API_PORT = process.env.API_PORT || "3007";

console.log(`🌐 API Configuration: ${API_BASE}:${API_PORT}`);

/**
 * 1. Basic Fetch with Manual Error Handling
 * Unlike axios, fetch doesn't throw on HTTP errors
 */
async function basicFetchWithErrorHandling() {
  log.info("=== Basic Fetch with Error Handling ===");
  
  try {
    const response = await fetch(`${API_BASE}/api/config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Bun-Enhanced-File-Analyzer/1.3.6",
      },
    });

    // Manual error checking - CRITICAL for fetch
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    log.success("✅ Basic fetch successful", { prefix: "FETCH" });
    console.log("Config data:", data);
    
  } catch (error) {
    log.error(`❌ Fetch failed: ${error.message}`, { prefix: "FETCH" });
  }
}

/**
 * 2. Cookie-Enabled Fetch with Session Persistence
 * Demonstrates credentials: "include" and getSetCookie()
 */
async function cookieEnabledFetch() {
  log.info("=== Cookie-Enabled Fetch with Session ===");
  
  try {
    // Create cookie-aware client
    const cookieClient = createCookieClient();
    
    // Login request with credentials
    const loginResponse = await cookieClient.fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "demo",
        password: "demo123",
      }),
      credentials: "include", // CRITICAL for session cookies
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    log.success("✅ Login successful", { prefix: "AUTH" });
    
    // Check received cookies
    const setCookies = loginResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      log.info(`🍪 Received ${setCookies.length} cookies`, { prefix: "AUTH" });
      setCookies.forEach(cookie => console.log("  Set-Cookie:", cookie));
    }

    // Subsequent request with automatic cookie injection
    const protectedResponse = await cookieClient.fetch(`${API_BASE}/api/user/profile`, {
      method: "GET",
      credentials: "include", // CRITICAL for sending stored cookies
    });

    if (protectedResponse.ok) {
      const profileData = await protectedResponse.json();
      log.success("✅ Protected resource accessed", { prefix: "AUTH" });
      console.log("Profile data:", profileData);
    } else {
      log.warning("⚠️ Protected resource denied", { prefix: "AUTH" });
    }

    // Show current cookie state
    const currentCookies = cookieClient.getCookies();
    log.info(`🍪 Current session: ${Object.keys(currentCookies).length} cookies`, { 
      prefix: "AUTH" 
    });

  } catch (error) {
    log.error(`❌ Auth flow failed: ${error.message}`, { prefix: "AUTH" });
  }
}

/**
 * 3. File Upload with FormData and Progress
 */
async function fileUploadDemo() {
  log.info("=== File Upload with FormData ===");
  
  try {
    // Create a test file
    const testFile = new Blob(["Hello, Bun!"], { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", testFile, "test.txt");
    formData.append("description", "Demo upload via fetch");

    const uploadResponse = await fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      body: formData, // FormData automatically sets Content-Type
      credentials: "include",
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    log.success("✅ File uploaded successfully", { prefix: "UPLOAD" });
    console.log("Upload result:", uploadResult);

  } catch (error) {
    log.error(`❌ Upload failed: ${error.message}`, { prefix: "UPLOAD" });
  }
}

/**
 * 4. Bundle Analysis API Integration
 */
async function bundleAnalysisDemo() {
  log.info("=== Bundle Analysis API ===");
  
  try {
    const analysisResponse = await fetch(`${API_BASE}/api/bundle/analysis`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Build-ID": process.env.BUILD_ID || "demo-build",
      },
      credentials: "include",
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    log.success("✅ Bundle analysis retrieved", { prefix: "ANALYSIS" });
    
    // Display key metrics
    console.log("📊 Bundle Metrics:");
    console.log(`  Total Size: ${(analysisData.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Chunks: ${analysisData.chunks?.length || 0}`);
    console.log(`  Dependencies: ${analysisData.dependencies?.length || 0}`);

  } catch (error) {
    log.error(`❌ Analysis failed: ${error.message}`, { prefix: "ANALYSIS" });
  }
}

/**
 * 5. URLPattern-Based Fetch with Dynamic Routing
 */
async function urlPatternFetchDemo() {
  log.info("=== URLPattern-Based Fetch ===");
  
  try {
    // Define URL patterns for different endpoints
    const patterns = {
      userList: new URLPattern({ pathname: "/api/users" }),
      userDetail: new URLPattern({ pathname: "/api/users/:id" }),
      fileAction: new URLPattern({ pathname: "/api/files/:action" }),
    };

    const endpoints = [
      "/api/users",
      "/api/users/123",
      "/api/files/analyze",
      "/api/files/archive",
    ];

    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing endpoint: ${endpoint}`);
      
      // Match against patterns
      if (patterns.userDetail.test(endpoint)) {
        const match = patterns.userDetail.exec(endpoint)!;
        console.log(`  Matched user detail pattern, ID: ${match.pathname.groups.id}`);
      } else if (patterns.fileAction.test(endpoint)) {
        const match = patterns.fileAction.exec(endpoint)!;
        console.log(`  Matched file action pattern, Action: ${match.pathname.groups.action}`);
      } else if (patterns.userList.test(endpoint)) {
        console.log(`  Matched user list pattern`);
      }

      // Make actual request
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        credentials: "include",
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  OK: ${response.ok}`);
    }

    log.success("✅ URLPattern routing demo completed", { prefix: "ROUTING" });

  } catch (error) {
    log.error(`❌ URLPattern demo failed: ${error.message}`, { prefix: "ROUTING" });
  }
}

/**
 * 6. Advanced Error Handling and Retry Logic
 */
async function advancedErrorHandling() {
  log.info("=== Advanced Error Handling ===");
  
  async function fetchWithRetry(
    url: string, 
    options: RequestInit = {}, 
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Handle different HTTP status codes
        if (response.status === 401) {
          throw new Error("Authentication required");
        } else if (response.status === 403) {
          throw new Error("Access forbidden");
        } else if (response.status === 404) {
          throw new Error("Resource not found");
        } else if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        } else if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        log.warning(`⚠️ Attempt ${attempt} failed: ${lastError.message}`, { 
          prefix: "RETRY" 
        });
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`  Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  try {
    // Test with a potentially failing endpoint
    const response = await fetchWithRetry(`${API_BASE}/api/unstable-endpoint`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    log.success("✅ Retry mechanism succeeded", { prefix: "RETRY" });
    console.log("Data:", data);

  } catch (error) {
    log.error(`❌ All retries failed: ${error.message}`, { prefix: "RETRY" });
  }
}

/**
 * Main demo runner
 */
async function runFetchDemo() {
  console.log("🚀 Starting Advanced Bun Fetch Demo");
  console.log("=" .repeat(60));
  
  await basicFetchWithErrorHandling();
  console.log("\n" + "-".repeat(40));
  
  await cookieEnabledFetch();
  console.log("\n" + "-".repeat(40));
  
  await fileUploadDemo();
  console.log("\n" + "-".repeat(40));
  
  await bundleAnalysisDemo();
  console.log("\n" + "-".repeat(40));
  
  await urlPatternFetchDemo();
  console.log("\n" + "-".repeat(40));
  
  await advancedErrorHandling();
  
  console.log("\n" + "=" .repeat(60));
  log.success("🎉 Fetch demo completed successfully!", { prefix: "DEMO" });
}

// Run demo if executed directly
if (import.meta.main) {
  runFetchDemo().catch(console.error);
}

export {
  basicFetchWithErrorHandling,
  cookieEnabledFetch,
  fileUploadDemo,
  bundleAnalysisDemo,
  urlPatternFetchDemo,
  advancedErrorHandling,
};
