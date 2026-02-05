#!/usr/bin/env bun

/**
 * Enhanced CLI with Bun 1.1+ Features
 * 
 * Faster startup with --compile, better logging with %j, and improved error handling.
 */

import { Command } from "commander";
import { EnhancedRouter } from "../routing/enhanced-router.js";
import { getDatabase } from "../database/enhanced-sqlite.js";
import { createInspectionContext } from "../inspection/index.js";
import { UnifiedPaymentService } from "../proxy/enterprise-proxy-client.js";

const program = new Command();

// Enhanced logging with %j for better JSON output
function logInfo(message: string, data?: any): void {
  if (data) {
    console.log(`ℹ️  ${message}: %j`, data);
  } else {
    console.log(`ℹ️  ${message}`);
  }
}

function logSuccess(message: string, data?: any): void {
  if (data) {
    console.log(`✅ ${message}: %j`, data);
  } else {
    console.log(`✅ ${message}`);
  }
}

function logError(message: string, error?: any): void {
  if (error) {
    console.error(`❌ ${message}: %j`, error);
  } else {
    console.error(`❌ ${message}`);
  }
}

function logWarning(message: string, data?: any): void {
  if (data) {
    console.warn(`⚠️  ${message}: %j`, data);
  } else {
    console.warn(`⚠️  ${message}`);
  }
}

// Database commands
program
  .name("factory-wager")
  .description("FactoryWager CLI with Bun 1.1+ enhancements")
  .version("1.1.0");

program
  .command("db:stats")
  .description("Show database statistics")
  .option("-f, --format <format>", "Output format (json|table)", "table")
  .action(async (options) => {
    try {
      const db = getDatabase();
      const metrics = db.getPerformanceMetrics();
      
      if (options.format === "json") {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log("📊 Database Statistics");
        console.log("========================");
        console.log(`Total Payments: ${metrics.totalPayments}`);
        console.log(`Total Members: ${metrics.totalMembers}`);
        console.log(`Total Quests: ${metrics.totalQuests}`);
        console.log(`Total Invitations: ${metrics.totalInvitations}`);
        console.log(`Database Size: ${(metrics.databaseSize / 1024 / 1024).toFixed(2)} MB`);
        console.log("\n📈 Index Usage:");
        metrics.indexUsage.forEach(index => {
          console.log(`  ${index.name}: ${index.entries} entries`);
        });
      }
    } catch (error) {
      logError("Failed to get database stats", error);
      process.exit(1);
    }
  });

program
  .command("db:optimize")
  .description("Optimize database (VACUUM and ANALYZE)")
  .action(async () => {
    try {
      logInfo("Optimizing database...");
      const db = getDatabase();
      db.optimize();
      logSuccess("Database optimized successfully");
    } catch (error) {
      logError("Failed to optimize database", error);
      process.exit(1);
    }
  });

// Family management commands
program
  .command("family:members <familyId>")
  .description("List family members with activity")
  .option("-f, --format <format>", "Output format (json|table)", "table")
  .action(async (familyId, options) => {
    try {
      const db = getDatabase();
      const members = db.getFamilyMembersWithActivity(familyId);
      
      if (options.format === "json") {
        console.log(JSON.stringify(members, null, 2));
      } else {
        console.log(`👥 Family Members: ${familyId}`);
        console.log("===============================");
        members.forEach(member => {
          console.log(`${member.userId} (${member.role})`);
          console.log(`  Trust Score: ${member.trustScore}`);
          console.log(`  Tier: ${member.tier}`);
          console.log(`  Onboarding: ${member.onboardingStatus || 'N/A'}`);
          console.log(`  MRR Impact: $${(member.mrrContribution || 0).toFixed(2)}`);
          console.log(`  Enterprise Ready: ${member.enterpriseReady ? '✅' : '❌'}`);
          console.log(`  Payments: ${member.paymentCount} ($${member.totalPaid.toFixed(2)})`);
          if (member.lastPaymentAt) {
            console.log(`  Last Payment: ${new Date(member.lastPaymentAt).toLocaleDateString()}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logError("Failed to get family members", error);
      process.exit(1);
    }
  });

program
  .command("family:stats <familyId>")
  .description("Show family payment statistics")
  .action(async (familyId) => {
    try {
      const db = getDatabase();
      const stats = db.getFamilyPaymentStats(familyId);
      
      console.log(`📊 Family Statistics: ${familyId}`);
      console.log("===============================");
      console.log(`Total Payments: ${stats.totalPayments}`);
      console.log(`Total Amount: $${stats.totalAmount.toFixed(2)}`);
      console.log(`Pending Payments: ${stats.pendingPayments}`);
      console.log(`Completed Payments: ${stats.completedPayments}`);
      console.log(`Average Amount: $${stats.averageAmount.toFixed(2)}`);
    } catch (error) {
      logError("Failed to get family stats", error);
      process.exit(1);
    }
  });

// Quest commands
program
  .command("quests:list <userId>")
  .description("List user quests")
  .option("-s, --status <status>", "Filter by status")
  .option("-f, --format <format>", "Output format (json|table)", "table")
  .action(async (userId, options) => {
    try {
      const db = getDatabase();
      const quests = db.getUserQuests(userId, options.status as any);
      
      if (options.format === "json") {
        console.log(JSON.stringify(quests, null, 2));
      } else {
        console.log(`🎮 Quests for ${userId}`);
        console.log("=====================");
        quests.forEach(quest => {
          console.log(`${quest.questId} (${quest.status})`);
          console.log(`  Progress: ${quest.progress}%`);
          console.log(`  Started: ${new Date(quest.startedAt).toLocaleDateString()}`);
          if (quest.completedAt) {
            console.log(`  Completed: ${new Date(quest.completedAt).toLocaleDateString()}`);
          }
          if (quest.rewards) {
            console.log(`  Rewards: ${quest.rewards}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logError("Failed to get user quests", error);
      process.exit(1);
    }
  });

// Inspection commands
program
  .command("inspect:tree")
  .description("Show inspection tree")
  .option("-d, --depth <depth>", "Inspection depth", "6")
  .option("-f, --format <format>", "Output format (json|table)", "table")
  .action(async (options) => {
    try {
      const ctx = createInspectionContext("localhost");
      
      if (options.format === "json") {
        console.log(JSON.stringify(ctx, null, 2));
      } else {
        console.log("🧩 Inspection Tree");
        console.log("===================");
        console.log(Bun.inspect(ctx, {
          depth: parseInt(options.depth),
          colors: true,
          maxArrayLength: 10
        }));
      }
    } catch (error) {
      logError("Failed to get inspection tree", error);
      process.exit(1);
    }
  });

// Payment commands
program
  .command("payment:create")
  .description("Create a payment")
  .requiredOption("-a, --amount <amount>", "Payment amount")
  .requiredOption("-r, --recipient <recipient>", "Recipient ID")
  .requiredOption("-p, --provider <provider>", "Payment provider (venmo|cashapp)")
  .option("-d, --description <description>", "Payment description")
  .option("--dry-run", "Dry run (don't actually create payment)")
  .action(async (options) => {
    try {
      const paymentData = {
        amount: parseFloat(options.amount),
        recipient: options.recipient,
        description: options.description || "FactoryWager Payment"
      };
      
      logInfo("Creating payment", paymentData);
      
      if (options.dryRun) {
        logWarning("Dry run - payment not created");
        return;
      }
      
      const paymentService = new UnifiedPaymentService();
      const payment = await paymentService.createPayment(
        options.provider as "venmo" | "cashapp",
        paymentData
      );
      
      logSuccess("Payment created", payment);
    } catch (error) {
      logError("Failed to create payment", error);
      process.exit(1);
    }
  });

// Server commands
program
  .command("serve")
  .description("Start FactoryWager server")
  .option("-p, --port <port>", "Port to listen on", "8765")
  .option("--host <host>", "Host to bind to", "localhost")
  .action(async (options) => {
    try {
      const router = createEnhancedServer();
      const port = parseInt(options.port);
      const host = options.host;
      
      const server = Bun.serve({
        port,
        hostname: host,
        async fetch(req) {
          return router.route(req);
        }
      });
      
      logSuccess(`Server started`, {
        url: `http://${host}:${port}`,
        port,
        host
      });
      
      console.log("\n🌐 Available endpoints:");
      console.log(`  Health: http://${host}:${port}/api/health`);
      console.log(`  Metrics: http://${host}:${port}/api/metrics`);
      console.log(`  Inspection: http://${host}:${port}/api/inspection/tree`);
      console.log(`  QR Generate: http://${host}:${port}/api/qr/generate`);
      
      // Handle graceful shutdown
      process.on("SIGINT", () => {
        logInfo("Shutting down server...");
        server.stop();
        process.exit(0);
      });
      
      process.on("SIGTERM", () => {
        logInfo("Shutting down server...");
        server.stop();
        process.exit(0);
      });
      
    } catch (error) {
      logError("Failed to start server", error);
      process.exit(1);
    }
  });

// Test commands
program
  .command("test:connectivity")
  .description("Test payment service connectivity")
  .action(async () => {
    try {
      logInfo("Testing connectivity...");
      
      const paymentService = new UnifiedPaymentService();
      const connectivity = await paymentService.testConnectivity();
      
      console.log("🔗 Connectivity Test Results:");
      console.log("=============================");
      console.log(`Proxy Connected: ${connectivity.proxy.connected}`);
      if (connectivity.proxy.latency) {
        console.log(`Proxy Latency: ${connectivity.proxy.latency}ms`);
      }
      console.log(`Venmo API: ${connectivity.venmo ? "✅" : "❌"}`);
      console.log(`Cash App API: ${connectivity.cashapp ? "✅" : "❌"}`);
      
      if (!connectivity.proxy.connected) {
        logWarning("Proxy not connected", connectivity.proxy.error);
      }
      
    } catch (error) {
      logError("Connectivity test failed", error);
      process.exit(1);
    }
  });

// Development commands
program
  .command("dev:setup")
  .description("Set up development environment")
  .action(async () => {
    try {
      logInfo("Setting up development environment...");
      
      // Create data directory
      await Bun.mkdir("./data", { recursive: true });
      logSuccess("Created data directory");
      
      // Initialize database
      const db = getDatabase();
      logSuccess("Database initialized");
      
      // Create sample data
      const sampleFamilyId = "FAM123";
      const sampleMembers = [
        { userId: "alice", role: "admin" as const, trustScore: 100, tier: "IMMEDIATE" as const, onboardingStatus: "completed" as const, mrrContribution: 250, enterpriseReady: true },
        { userId: "bob", role: "member" as const, trustScore: 70, tier: "COUSIN" as const, onboardingStatus: "completed" as const, mrrContribution: 100, enterpriseReady: false },
        { userId: "sarah", role: "guest" as const, trustScore: 30, tier: "GUEST" as const, onboardingStatus: "pending" as const, mrrContribution: 0, enterpriseReady: false }
      ];
      
      for (const member of sampleMembers) {
        db.addFamilyMember({
          familyId: sampleFamilyId,
          userId: member.userId,
          role: member.role,
          trustScore: member.trustScore,
          tier: member.tier,
          joinedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          onboardingStatus: member.onboardingStatus,
          mrrContribution: member.mrrContribution,
          enterpriseReady: member.enterpriseReady
        });
      }
      
      logSuccess("Sample data created", { familyId: sampleFamilyId, members: sampleMembers.length });
      
      console.log("\n🚀 Development environment ready!");
      console.log("Run 'bun run cli.ts serve' to start the server");
      
    } catch (error) {
      logError("Development setup failed", error);
      process.exit(1);
    }
  });

// Error handling
process.on("uncaughtException", (error) => {
  logError("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logError("Unhandled rejection", { reason, promise });
  process.exit(1);
});

// Parse command line arguments
program.parse();

export default program;
