#!/usr/bin/env bun

// stdin-demo.ts - Advanced Stdin Reading
// Enterprise-grade stdin handling for revolutionary AI system

console.info("🚀 Revolutionary AI System - Advanced Stdin Reading");

// Interactive stdin reading with console
async function interactiveStdinDemo() {
  console.info("\n📊 Interactive Stdin Demo:");
  console.info("Type AI commands, 'status' for system info, or 'quit' to exit");
  
  const prompt = "🤖 AI> ";
  process.stdout.write(prompt);
  
  for await (const line of console) {
    const input = line.trim().toLowerCase();
    
    if (input === 'quit' || input === 'exit') {
      console.info("👋 Goodbye!");
      break;
    }
    
    if (input === 'status') {
      console.info("🧠 AI Model: Enhanced (94.51% accuracy)");
      console.info("🔒 Security: Zero-Trust with 4-factor biometrics");
      console.info("📊 Monitoring: Real-time analytics active");
      console.info("🛍️ Shopping: Enterprise platform ready");
      console.info("⚡ Performance: Optimized for production");
    } else if (input === 'help') {
      console.info("Available commands:");
      console.info("  status  - Show system status");
      console.info("  scan    - Run fraud detection scan");
      console.info("  monitor - Toggle monitoring");
      console.info("  security - Show security status");
      console.info("  quit    - Exit the program");
    } else if (input === 'scan') {
      console.info("🔍 Running fraud detection scan...");
      console.info("📊 Processing 1,247 transactions...");
      console.info("⚠️ Suspicious patterns detected: 3");
      console.info("🛡️ Security alerts sent: 2");
      console.info("✅ Scan completed in 0.82s");
    } else if (input === 'monitor') {
      console.info("📈 Real-time monitoring:");
      console.info("   CPU Usage: 23%");
      console.info("   Memory: 1.2GB / 8GB");
      console.info("   Active Connections: 847");
      console.info("   Fraud Detection Rate: 99.2%");
      console.info("   Response Time: 14ms");
    } else if (input === 'security') {
      console.info("🔒 Security Status:");
      console.info("   Biometric Auth: ✅ 4-factor active");
      console.info("   Zero-Trust: ✅ Enforced");
      console.info("   Threat Detection: ✅ AI-powered");
      console.info("   Encryption: ✅ AES-256");
      console.info("   Security Score: 98.7%");
    } else if (input) {
      console.info(`🤖 AI Processing: "${line}"`);
      console.info(`📊 Sentiment: ${Math.random() > 0.5 ? 'Positive' : 'Neutral'}`);
      console.info(`🔍 Risk Score: ${(Math.random() * 0.3).toFixed(3)}`);
      console.info(`⚡ Processing Time: ${(Math.random() * 20 + 10).toFixed(1)}ms`);
    }
    
    process.stdout.write(prompt);
  }
}

// Chunk-based stdin reading for large inputs
async function chunkStdinDemo() {
  console.info("\n📦 Chunk-based Stdin Demo:");
  console.info("Pipe data into this script to see chunk processing");
  
  let totalChunks = 0;
  let totalBytes = 0;
  
  for await (const chunk of Bun.stdin.stream()) {
    totalChunks++;
    totalBytes += chunk.length;
    
    // Convert chunk to text
    const decoder = new TextDecoder();
    const chunkText = decoder.decode(chunk);
    console.info(`📦 Chunk ${totalChunks}: ${chunk.length} bytes`);
    console.info(`   Content: "${chunkText.trim()}"`);
    
    // Process the chunk as AI data
    if (chunkText.trim()) {
      console.info(`🤖 AI Analysis: ${chunkText.length} characters processed`);
      console.info(`📊 Complexity: ${(Math.random() * 0.5 + 0.5).toFixed(3)}`);
      console.info(`🔍 Entities detected: ${Math.floor(Math.random() * 5)}`);
    }
  }
  
  console.info(`✅ Processed ${totalChunks} chunks, ${totalBytes} total bytes`);
}

// Transaction processing from stdin
async function processTransactionsFromStdin() {
  console.info("\n💳 Transaction Processing Demo:");
  console.info("Format: amount,merchant,category (one per line)");
  console.info("Example: 100.50,Amazon,Electronics");
  console.info("Press Ctrl+D when finished");
  
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
        console.info(`🚨 FLAGGED: $${amount.toFixed(2)} at ${merchant} (${category})`);
        console.info(`   Risk Score: ${riskScore.toFixed(3)}`);
        console.info(`   Reason: Unusual pattern detected`);
      } else {
        console.info(`✅ Approved: $${amount.toFixed(2)} at ${merchant} (${category})`);
        console.info(`   Risk Score: ${riskScore.toFixed(3)}`);
      }
    } else {
      console.info("❌ Invalid format. Use: amount,merchant,category");
    }
    
    process.stdout.write(prompt);
  }
  
  console.info(`\n📊 Transaction Summary:`);
  console.info(`   Total Transactions: ${transactionCount}`);
  console.info(`   Total Amount: $${totalAmount.toFixed(2)}`);
  console.info(`   Suspicious Transactions: ${suspiciousCount}`);
  console.info(`   Fraud Detection Rate: ${((suspiciousCount / transactionCount) * 100).toFixed(1)}%`);
}

// AI Model training from stdin
async function trainAIModelFromStdin() {
  console.info("\n🧠 AI Model Training Demo:");
  console.info("Provide training data (features,label per line)");
  console.info("Example: 0.95,0.87,0.92,FRAUD");
  console.info("Press Ctrl+D when finished");
  
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
        
        console.info(`✅ Sample ${trainingSamples}: ${sampleFeatures.length} features -> ${label}`);
        
        // Simulate training progress
        if (trainingSamples % 5 === 0) {
          const accuracy = 0.85 + (Math.random() * 0.1);
          console.info(`📊 Model Accuracy: ${(accuracy * 100).toFixed(2)}%`);
        }
      } else {
        console.info("❌ Invalid features. Use numeric values.");
      }
    } else {
      console.info("❌ Invalid format. Use: feature1,feature2,...,label");
    }
    
    process.stdout.write(prompt);
  }
  
  if (trainingSamples > 0) {
    console.info(`\n🎉 Training Complete!`);
    console.info(`   Training Samples: ${trainingSamples}`);
    console.info(`   Features per Sample: ${features[0]?.length || 0}`);
    console.info(`   Unique Labels: ${[...new Set(labels)].length}`);
    console.info(`   Final Accuracy: ${(94.51 + Math.random() * 2).toFixed(2)}%`);
    console.info(`   Model Status: ✅ Ready for Production`);
  } else {
    console.info("❌ No training data provided.");
  }
}

// Real-time system monitoring from stdin
async function systemMonitoringFromStdin() {
  console.info("\n📊 Real-time System Monitoring:");
  console.info("Send monitoring commands (cpu, memory, network, security)");
  console.info("Press Ctrl+D to exit");
  
  const prompt = "📈 Monitor> ";
  process.stdout.write(prompt);
  
  for await (const line of console) {
    const command = line.trim().toLowerCase();
    
    switch (command) {
      case 'cpu':
        console.info("💻 CPU Usage:");
        console.info(`   Usage: ${(Math.random() * 40 + 20).toFixed(1)}%`);
        console.info(`   Cores: 8`);
        console.info(`   Temperature: ${(Math.random() * 20 + 50).toFixed(1)}°C`);
        break;
        
      case 'memory':
        console.info("🧠 Memory Usage:");
        console.info(`   Used: ${(Math.random() * 4 + 2).toFixed(1)}GB / 8GB`);
        console.info(`   Cache: ${(Math.random() * 2 + 1).toFixed(1)}GB`);
        console.info(`   Swap: ${(Math.random() * 0.5).toFixed(1)}GB`);
        break;
        
      case 'network':
        console.info("🌐 Network Status:");
        console.info(`   Upload: ${(Math.random() * 100 + 50).toFixed(1)} Mbps`);
        console.info(`   Download: ${(Math.random() * 200 + 100).toFixed(1)} Mbps`);
        console.info(`   Latency: ${(Math.random() * 20 + 5).toFixed(1)}ms`);
        console.info(`   Connections: ${Math.floor(Math.random() * 500 + 300)}`);
        break;
        
      case 'security':
        console.info("🔒 Security Status:");
        console.info(`   Threats Blocked: ${Math.floor(Math.random() * 100 + 50)}`);
        console.info(`   Security Score: ${(Math.random() * 5 + 95).toFixed(1)}%`);
        console.info(`   Active Alerts: ${Math.floor(Math.random() * 5)}`);
        console.info(`   Last Scan: ${Math.floor(Math.random() * 60)}s ago`);
        break;
        
      default:
        if (command) {
          console.info(`❌ Unknown command: ${command}`);
          console.info("Available: cpu, memory, network, security");
        }
    }
    
    process.stdout.write(prompt);
  }
}

// Main demonstration selector
async function main() {
  console.info("🚀 Revolutionary AI System - Stdin Reading Demonstration");
  console.info("=" .repeat(60));
  
  // Check if data is being piped in
  const stdinData = await Bun.stdin.text();
  const hasPipedData = stdinData.length > 0;
  
  if (hasPipedData) {
    console.info("📦 Piped data detected, using chunk processing...");
    await chunkStdinDemo();
  } else {
    console.info("📊 Choose a demo:");
    console.info("1. Interactive AI Assistant");
    console.info("2. Transaction Processing");
    console.info("3. AI Model Training");
    console.info("4. System Monitoring");
    
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
          console.info("❌ Invalid choice. Please select 1-4.");
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
