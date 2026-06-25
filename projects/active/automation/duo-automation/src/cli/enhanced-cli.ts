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
    console.info(`ℹ️  ${message}: %j`, data);
  } else {
    console.info(`ℹ️  ${message}`);
  }
}

function logSuccess(message: string, data?: any): void {
  if (data) {
    console.info(`✅ ${message}: %j`, data);
  } else {
    console.info(`✅ ${message}`);
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
        console.info(JSON.stringify(metrics, null, 2));
      } else {
        console.info("📊 Database Statistics");
        console.info("========================");
        console.info(`Total Payments: ${metrics.totalPayments}`);
        console.info(`Total Members: ${metrics.totalMembers}`);
        console.info(`Total Quests: ${metrics.totalQuests}`);
        console.info(`Total Invitations: ${metrics.totalInvitations}`);
        console.info(`Database Size: ${(metrics.databaseSize / 1024 / 1024).toFixed(2)} MB`);
        console.info("\n📈 Index Usage:");
        metrics.indexUsage.forEach(index => {
          console.info(`  ${index.name}: ${index.entries} entries`);
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
        console.info(JSON.stringify(members, null, 2));
      } else {
        console.info(`👥 Family Members: ${familyId}`);
        console.info("===============================");
        members.forEach(member => {
          console.info(`${member.userId} (${member.role})`);
          console.info(`  Trust Score: ${member.trustScore}`);
          console.info(`  Tier: ${member.tier}`);
          console.info(`  Onboarding: ${member.onboardingStatus || 'N/A'}`);
          console.info(`  MRR Impact: $${(member.mrrContribution || 0).toFixed(2)}`);
          console.info(`  Enterprise Ready: ${member.enterpriseReady ? '✅' : '❌'}`);
          console.info(`  Payments: ${member.paymentCount} ($${member.totalPaid.toFixed(2)})`);
          if (member.lastPaymentAt) {
            console.info(`  Last Payment: ${new Date(member.lastPaymentAt).toLocaleDateString()}`);
          }
          console.info("");
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
      
      console.info(`📊 Family Statistics: ${familyId}`);
      console.info("===============================");
      console.info(`Total Payments: ${stats.totalPayments}`);
      console.info(`Total Amount: $${stats.totalAmount.toFixed(2)}`);
      console.info(`Pending Payments: ${stats.pendingPayments}`);
      console.info(`Completed Payments: ${stats.completedPayments}`);
      console.info(`Average Amount: $${stats.averageAmount.toFixed(2)}`);
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
        console.info(JSON.stringify(quests, null, 2));
      } else {
        console.info(`🎮 Quests for ${userId}`);
        console.info("=====================");
        quests.forEach(quest => {
          console.info(`${quest.questId} (${quest.status})`);
          console.info(`  Progress: ${quest.progress}%`);
          console.info(`  Started: ${new Date(quest.startedAt).toLocaleDateString()}`);
          if (quest.completedAt) {
            console.info(`  Completed: ${new Date(quest.completedAt).toLocaleDateString()}`);
          }
          if (quest.rewards) {
            console.info(`  Rewards: ${quest.rewards}`);
          }
          console.info("");
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
        console.info(JSON.stringify(ctx, null, 2));
      } else {
        console.info("🧩 Inspection Tree");
        console.info("===================");
        console.info(Bun.inspect(ctx, {
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
      
      console.info("\n🌐 Available endpoints:");
      console.info(`  Health: http://${host}:${port}/api/health`);
      console.info(`  Metrics: http://${host}:${port}/api/metrics`);
      console.info(`  Inspection: http://${host}:${port}/api/inspection/tree`);
      console.info(`  QR Generate: http://${host}:${port}/api/qr/generate`);
      
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
      
      console.info("🔗 Connectivity Test Results:");
      console.info("=============================");
      console.info(`Proxy Connected: ${connectivity.proxy.connected}`);
      if (connectivity.proxy.latency) {
        console.info(`Proxy Latency: ${connectivity.proxy.latency}ms`);
      }
      console.info(`Venmo API: ${connectivity.venmo ? "✅" : "❌"}`);
      console.info(`Cash App API: ${connectivity.cashapp ? "✅" : "❌"}`);
      
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
      
      console.info("\n🚀 Development environment ready!");
      console.info("Run 'bun run cli.ts serve' to start the server");
      
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
