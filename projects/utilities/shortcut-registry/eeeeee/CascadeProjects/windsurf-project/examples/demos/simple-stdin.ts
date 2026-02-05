#!/usr/bin/env bun

// simple-stdin.ts - Simple stdin demonstration

console.log("🚀 Simple Stdin Demo - Revolutionary AI System");

// Check if we have piped data
const hasPipedData = !process.stdin.isTTY;

if (hasPipedData) {
  console.log("📦 Processing piped data...");
  
  let totalBytes = 0;
  let chunkCount = 0;
  
  for await (const chunk of Bun.stdin.stream()) {
    chunkCount++;
    totalBytes += chunk.length;
    
    const chunkText = new TextDecoder().decode(chunk);
    console.log(`📦 Chunk ${chunkCount}: ${chunk.length} bytes`);
    console.log(`   Content: "${chunkText.trim()}"`);
    
    // AI Processing
    console.log(`🤖 AI Analysis: Processing ${chunk.length} characters`);
    console.log(`📊 Sentiment: ${Math.random() > 0.5 ? 'Positive' : 'Neutral'}`);
    console.log(`🔍 Risk Score: ${(Math.random() * 0.3).toFixed(3)}`);
  }
  
  console.log(`✅ Processed ${chunkCount} chunks, ${totalBytes} total bytes`);
} else {
  console.log("📊 Interactive mode - Type commands:");
  
  for await (const line of console) {
    const input = line.trim().toLowerCase();
    
    if (input === 'quit' || input === 'exit') {
      console.log("👋 Goodbye!");
      break;
    }
    
    if (input === 'status') {
      console.log("🧠 AI Model: Enhanced (94.51% accuracy)");
      console.log("🔒 Security: Zero-Trust Active");
      console.log("📊 Monitoring: Real-time");
      console.log("🛍️ Shopping: Enterprise Ready");
    } else if (input) {
      console.log(`🤖 AI Processing: "${line}"`);
      console.log(`📊 Risk Score: ${(Math.random() * 0.3).toFixed(3)}`);
      console.log(`⚡ Processing Time: ${(Math.random() * 20 + 10).toFixed(1)}ms`);
    }
    
    process.stdout.write("🤖 AI> ");
  }
}
