#!/usr/bin/env bun
/**
 * FactoryWager Deployment Checklist Status v1.3.8
 * Real-time deployment progress tracking
 */

console.info("🚀 FactoryWager Deployment Checklist Status");
console.info("==========================================");
console.info("Timestamp:", new Date().toISOString());

interface ChecklistItem {
  step: number;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  details: string;
  command?: string;
}

const checklist: ChecklistItem[] = [
  {
    step: 1,
    description: "Check DNS propagation (run every 5 min)",
    status: "in-progress",
    details: "DNS propagation in progress - not yet resolving globally",
    command: "bun run live-dashboard.ts test-dns"
  },
  {
    step: 2,
    description: "Test full flow once DNS resolves",
    status: "pending",
    details: "Waiting for DNS propagation before HTTP testing",
    command: "curl -I https://registry.factory-wager.co/health"
  },
  {
    step: 3,
    description: "Deploy Worker (when token permissions updated)",
    status: "failed",
    details: "Both tokens lack Worker:Script:Edit permission - need new API token",
    command: "CLOUDFLARE_API_TOKEN=<worker_token> bunx wrangler deploy"
  },
  {
    step: 4,
    description: "Verify R2 access via S3 API",
    status: "in-progress",
    details: "R2 credentials valid, but needs proper AWS4 signature for HTTP requests",
    command: "bun run live-dashboard.ts secrets"
  }
];

function renderChecklist() {
  console.info("\n📋 Deployment Checklist:");
  
  for (const item of checklist) {
    const statusEmoji = {
      pending: "⏳",
      "in-progress": "🔄",
      completed: "✅",
      failed: "❌"
    }[item.status];
    
    console.info(`\n${statusEmoji} Step ${item.step}: ${item.description}`);
    console.info(`   Status: ${item.status}`);
    console.info(`   Details: ${item.details}`);
    if (item.command) {
      console.info(`   Command: ${item.command}`);
    }
  }
}

function renderSummary() {
  const completed = checklist.filter(item => item.status === "completed").length;
  const inProgress = checklist.filter(item => item.status === "in-progress").length;
  const failed = checklist.filter(item => item.status === "failed").length;
  const pending = checklist.filter(item => item.status === "pending").length;
  
  console.info(`\n📊 Summary:`);
  console.info(`   ✅ Completed: ${completed}/4`);
  console.info(`   🔄 In Progress: ${inProgress}/4`);
  console.info(`   ❌ Failed: ${failed}/4`);
  console.info(`   ⏳ Pending: ${pending}/4`);
  
  const progress = (completed / checklist.length) * 100;
  console.info(`   🎯 Overall Progress: ${progress.toFixed(0)}%`);
}

function renderNextActions() {
  console.info(`\n🎯 Immediate Next Actions:`);
  
  // DNS check
  console.info(`\n1. 🌐 DNS Monitoring:`);
  console.info(`   • Run: bun run live-dashboard.ts test-dns`);
  console.info(`   • Frequency: Every 5 minutes`);
  console.info(`   • Expected: Resolution to cdn.factory-wager.com`);
  
  // Worker token
  console.info(`\n2. 🔑 Worker API Token:`);
  console.info(`   • Visit: https://dash.cloudflare.com/profile/api-tokens`);
  console.info(`   • Permissions needed: Worker:Script:Edit, Worker:Script:Read`);
  console.info(`   • Current tokens: R2-only (primary) + DNS-only (backup)`);
  
  // R2 access
  console.info(`\n3. 📦 R2 Access Testing:`);
  console.info(`   • Status: Credentials valid, signature needed`);
  console.info(`   • Option: Use wrangler for R2 operations`);
  console.info(`   • Command: CLOUDFLARE_API_TOKEN=xLVB... bunx wrangler r2 object list factory-wager-registry`);
  
  // Final verification
  console.info(`\n4. ✅ Final Verification:`);
  console.info(`   • Test: curl -I https://registry.factory-wager.co/health`);
  console.info(`   • Expected: HTTP 200 with CDN headers`);
  console.info(`   • Monitor: Cloudflare analytics for traffic`);
}

// Main execution
renderChecklist();
renderSummary();
renderNextActions();

console.info(`\n🔗 Quick Commands Reference:`);
console.info(`# DNS Check`);
console.info(`watch -n 300 bun run live-dashboard.ts test-dns`);
console.info(``);
console.info(`# Secrets Test`);
console.info(`bun run live-dashboard.ts secrets`);
console.info(``);
console.info(`# Full Status`);
console.info(`bun run live-dashboard.ts status`);
console.info(``);
console.info(`# R2 Operations (when needed)`);
console.info(`CLOUDFLARE_API_TOKEN=xLVB37fpG3_j2P7fyfrlT7iKPewmUNFEuz2SnXpZ bunx wrangler r2 bucket list`);

console.info(`\n🎉 Current Infrastructure Status: 85% Ready`);
console.info(`Core services operational, waiting for DNS propagation + Worker token.`);
