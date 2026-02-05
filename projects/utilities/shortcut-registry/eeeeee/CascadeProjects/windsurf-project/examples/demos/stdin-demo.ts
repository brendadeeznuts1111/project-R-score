#!/usr/bin/env bun

// stdin-demo.ts - Advanced Stdin Reading
// Enterprise-grade stdin handling for revolutionary AI system

console.log("🚀 Revolutionary AI System - Advanced Stdin Reading");

// Interactive stdin reading with console
async function interactiveStdinDemo() {
  console.log("\n📊 Interactive Stdin Demo:");
  console.log("Type AI commands, 'status' for system info, or 'quit' to exit");
  
  const prompt = "🤖 AI> ";
  process.stdout.write(prompt);
  
  for await (const line of console) {
    const input = line.trim().toLowerCase();
    
    if (input === 'quit' || input === 'exit') {
      console.log("👋 Goodbye!");
      break;
    }
    
    if (input === 'status') {
      console.log("🧠 AI Model: Enhanced (94.51% accuracy)");
      console.log("🔒 Security: Zero-Trust with 4-factor biometrics");
      console.log("📊 Monitoring: Real-time analytics active");
      console.log("🛍️ Shopping: Enterprise platform ready");
      console.log("⚡ Performance: Optimized for production");
    } else if (input === 'help') {
      console.log("Available commands:");
      console.log("  status  - Show system status");
      console.log("  scan    - Run fraud detection scan");
      console.log("  monitor - Toggle monitoring");
      console.log("  security - Show security status");
      console.log("  quit    - Exit the program");
    } else if (input === 'scan') {
      console.log("🔍 Running fraud detection scan...");
      console.log("📊 Processing 1,247 transactions...");
      console.log("⚠️ Suspicious patterns detected: 3");
      console.log("🛡️ Security alerts sent: 2");
      console.log("✅ Scan completed in 0.82s");
    } else if (input === 'monitor') {
      console.log("📈 Real-time monitoring:");
      console.log("   CPU Usage: 23%");
      console.log("   Memory: 1.2GB / 8GB");
      console.log("   Active Connections: 847");
      console.log("   Fraud Detection Rate: 99.2%");
      console.log("   Response Time: 14ms");
    } else if (input === 'security') {
      console.log("🔒 Security Status:");
      console.log("   Biometric Auth: ✅ 4-factor active");
      console.log("   Zero-Trust: ✅ Enforced");
      console.log("   Threat Detection: ✅ AI-powered");
      console.log("   Encryption: ✅ AES-256");
      console.log("   Security Score: 98.7%");
    } else if (input) {
      console.log(`🤖 AI Processing: "${line}"`);
      console.log(`📊 Sentiment: ${Math.random() > 0.5 ? 'Positive' : 'Neutral'}`);
      console.log(`🔍 Risk Score: ${(Math.random() * 0.3).toFixed(3)}`);
      console.log(`⚡ Processing Time: ${(Math.random() * 20 + 10).toFixed(1)}ms`);
    }
    
    process.stdout.write(prompt);
  }
}

// Chunk-based stdin reading for large inputs
async function chunkStdinDemo() {
  console.log("\n📦 Chunk-based Stdin Demo:");
  console.log("Pipe data into this script to see chunk processing");
  
  let totalChunks = 0;
  let totalBytes = 0;
  
  for await (const chunk of Bun.stdin.stream()) {
    totalChunks++;
    totalBytes += chunk.length;
    
    // Convert chunk to text
    const decoder = new TextDecoder();
    const chunkText = decoder.decode(chunk);
    console.log(`📦 Chunk ${totalChunks}: ${chunk.length} bytes`);
    console.log(`   Content: "${chunkText.trim()}"`);
    
    // Process the chunk as AI data
    if (chunkText.trim()) {
      console.log(`🤖 AI Analysis: ${chunkText.length} characters processed`);
      console.log(`📊 Complexity: ${(Math.random() * 0.5 + 0.5).toFixed(3)}`);
      console.log(`🔍 Entities detected: ${Math.floor(Math.random() * 5)}`);
    }
  }
  
  console.log(`✅ Processed ${totalChunks} chunks, ${totalBytes} total bytes`);
}

// Transaction processing from stdin
async function processTransactionsFromStdin() {
  console.log("\n💳 Transaction Processing Demo:");
  console.log("Format: amount,merchant,category (one per line)");
  console.log("Example: 100.50,Amazon,Electronics");
  console.log("Press Ctrl+D when finished");
  
  const prompt = "💳 Transaction> ";
  process.stdout.write(prompt);
  
  let transactionCount = 0;
  let totalAmount = 0;
  let suspiciousCount = 0;
  
  for await (const line of console) {
    const input = line.trim();
    
    if (!input) {
      process.stdout.write(prompt);
      continue;
    }
    
    // Parse transaction
    const parts = input.split(',');
    if (parts.length === 3) {
      const amount = parseFloat(parts[0] || '0');
      const merchant = parts[1] || 'Unknown';
      const category = parts[2] || 'Other';
      
      transactionCount++;
      totalAmount += amount;
      
      // AI fraud detection
      const riskScore = Math.random();
      const isSuspicious = riskScore > 0.7;
      
      if (isSuspicious) {
        suspiciousCount++;
        console.log(`🚨 FLAGGED: $${amount.toFixed(2)} at ${merchant} (${category})`);
        console.log(`   Risk Score: ${riskScore.toFixed(3)}`);
        console.log(`   Reason: Unusual pattern detected`);
      } else {
        console.log(`✅ Approved: $${amount.toFixed(2)} at ${merchant} (${category})`);
        console.log(`   Risk Score: ${riskScore.toFixed(3)}`);
      }
    } else {
      console.log("❌ Invalid format. Use: amount,merchant,category");
    }
    
    process.stdout.write(prompt);
  }
  
  console.log(`\n📊 Transaction Summary:`);
  console.log(`   Total Transactions: ${transactionCount}`);
  console.log(`   Total Amount: $${totalAmount.toFixed(2)}`);
  console.log(`   Suspicious Transactions: ${suspiciousCount}`);
  console.log(`   Fraud Detection Rate: ${((suspiciousCount / transactionCount) * 100).toFixed(1)}%`);
}

// AI Model training from stdin
async function trainAIModelFromStdin() {
  console.log("\n🧠 AI Model Training Demo:");
  console.log("Provide training data (features,label per line)");
  console.log("Example: 0.95,0.87,0.92,FRAUD");
  console.log("Press Ctrl+D when finished");
  
  const prompt = "🧠 Training Data> ";
  process.stdout.write(prompt);
  
  let trainingSamples = 0;
  let features = [];
  let labels = [];
  
  for await (const line of console) {
    const input = line.trim();
    
    if (!input) {
      process.stdout.write(prompt);
      continue;
    }
    
    const parts = input.split(',');
    if (parts.length >= 2) {
      const sampleFeatures = parts.slice(0, -1).map(f => parseFloat(f.trim()));
      const label = parts[parts.length - 1]?.trim() || 'unknown';
      
      if (sampleFeatures.every(f => !isNaN(f))) {
        trainingSamples++;
        features.push(sampleFeatures);
        labels.push(label);
        
        console.log(`✅ Sample ${trainingSamples}: ${sampleFeatures.length} features -> ${label}`);
        
        // Simulate training progress
        if (trainingSamples % 5 === 0) {
          const accuracy = 0.85 + (Math.random() * 0.1);
          console.log(`📊 Model Accuracy: ${(accuracy * 100).toFixed(2)}%`);
        }
      } else {
        console.log("❌ Invalid features. Use numeric values.");
      }
    } else {
      console.log("❌ Invalid format. Use: feature1,feature2,...,label");
    }
    
    process.stdout.write(prompt);
  }
  
  if (trainingSamples > 0) {
    console.log(`\n🎉 Training Complete!`);
    console.log(`   Training Samples: ${trainingSamples}`);
    console.log(`   Features per Sample: ${features[0]?.length || 0}`);
    console.log(`   Unique Labels: ${[...new Set(labels)].length}`);
    console.log(`   Final Accuracy: ${(94.51 + Math.random() * 2).toFixed(2)}%`);
    console.log(`   Model Status: ✅ Ready for Production`);
  } else {
    console.log("❌ No training data provided.");
  }
}

// Real-time system monitoring from stdin
async function systemMonitoringFromStdin() {
  console.log("\n📊 Real-time System Monitoring:");
  console.log("Send monitoring commands (cpu, memory, network, security)");
  console.log("Press Ctrl+D to exit");
  
  const prompt = "📈 Monitor> ";
  process.stdout.write(prompt);
  
  for await (const line of console) {
    const command = line.trim().toLowerCase();
    
    switch (command) {
      case 'cpu':
        console.log("💻 CPU Usage:");
        console.log(`   Usage: ${(Math.random() * 40 + 20).toFixed(1)}%`);
        console.log(`   Cores: 8`);
        console.log(`   Temperature: ${(Math.random() * 20 + 50).toFixed(1)}°C`);
        break;
        
      case 'memory':
        console.log("🧠 Memory Usage:");
        console.log(`   Used: ${(Math.random() * 4 + 2).toFixed(1)}GB / 8GB`);
        console.log(`   Cache: ${(Math.random() * 2 + 1).toFixed(1)}GB`);
        console.log(`   Swap: ${(Math.random() * 0.5).toFixed(1)}GB`);
        break;
        
      case 'network':
        console.log("🌐 Network Status:");
        console.log(`   Upload: ${(Math.random() * 100 + 50).toFixed(1)} Mbps`);
        console.log(`   Download: ${(Math.random() * 200 + 100).toFixed(1)} Mbps`);
        console.log(`   Latency: ${(Math.random() * 20 + 5).toFixed(1)}ms`);
        console.log(`   Connections: ${Math.floor(Math.random() * 500 + 300)}`);
        break;
        
      case 'security':
        console.log("🔒 Security Status:");
        console.log(`   Threats Blocked: ${Math.floor(Math.random() * 100 + 50)}`);
        console.log(`   Security Score: ${(Math.random() * 5 + 95).toFixed(1)}%`);
        console.log(`   Active Alerts: ${Math.floor(Math.random() * 5)}`);
        console.log(`   Last Scan: ${Math.floor(Math.random() * 60)}s ago`);
        break;
        
      default:
        if (command) {
          console.log(`❌ Unknown command: ${command}`);
          console.log("Available: cpu, memory, network, security");
        }
    }
    
    process.stdout.write(prompt);
  }
}

// Main demonstration selector
async function main() {
  console.log("🚀 Revolutionary AI System - Stdin Reading Demonstration");
  console.log("=" .repeat(60));
  
  // Check if data is being piped in
  const stdinData = await Bun.stdin.text();
  const hasPipedData = stdinData.length > 0;
  
  if (hasPipedData) {
    console.log("📦 Piped data detected, using chunk processing...");
    await chunkStdinDemo();
  } else {
    console.log("📊 Choose a demo:");
    console.log("1. Interactive AI Assistant");
    console.log("2. Transaction Processing");
    console.log("3. AI Model Training");
    console.log("4. System Monitoring");
    
    process.stdout.write("\nSelect demo (1-4): ");
    
    for await (const line of console) {
      const choice = line.trim();
      
      switch (choice) {
        case '1':
          await interactiveStdinDemo();
          break;
        case '2':
          await processTransactionsFromStdin();
          break;
        case '3':
          await trainAIModelFromStdin();
          break;
        case '4':
          await systemMonitoringFromStdin();
          break;
        default:
          console.log("❌ Invalid choice. Please select 1-4.");
          process.stdout.write("Select demo (1-4): ");
          continue;
      }
      
      break;
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { 
  interactiveStdinDemo, 
  chunkStdinDemo, 
  processTransactionsFromStdin,
  trainAIModelFromStdin,
  systemMonitoringFromStdin
};
