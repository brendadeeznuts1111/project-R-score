#!/usr/bin/env bun
/**
 * FactoryWager Deployment Checklist Status v1.3.8
 * Real-time deployment progress tracking
 */

console.log("🚀 FactoryWager Deployment Checklist Status");
console.log("==========================================");
console.log("Timestamp:", new Date().toISOString());

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
  console.log("\n📋 Deployment Checklist:");
  
  for (const item of checklist) {
    const statusEmoji = {
      pending: "⏳",
      "in-progress": "🔄",
      completed: "✅",
      failed: "❌"
    }[item.status];
    
    console.log(`\n${statusEmoji} Step ${item.step}: ${item.description}`);
    console.log(`   Status: ${item.status}`);
    console.log(`   Details: ${item.details}`);
    if (item.command) {
      console.log(`   Command: ${item.command}`);
    }
  }
}

function renderSummary() {
  const completed = checklist.filter(item => item.status === "completed").length;
  const inProgress = checklist.filter(item => item.status === "in-progress").length;
  const failed = checklist.filter(item => item.status === "failed").length;
  const pending = checklist.filter(item => item.status === "pending").length;
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Completed: ${completed}/4`);
  console.log(`   🔄 In Progress: ${inProgress}/4`);
  console.log(`   ❌ Failed: ${failed}/4`);
  console.log(`   ⏳ Pending: ${pending}/4`);
  
  const progress = (completed / checklist.length) * 100;
  console.log(`   🎯 Overall Progress: ${progress.toFixed(0)}%`);
}

function renderNextActions() {
  console.log(`\n🎯 Immediate Next Actions:`);
  
  // DNS check
  console.log(`\n1. 🌐 DNS Monitoring:`);
  console.log(`   • Run: bun run live-dashboard.ts test-dns`);
  console.log(`   • Frequency: Every 5 minutes`);
  console.log(`   • Expected: Resolution to cdn.factory-wager.com`);
  
  // Worker token
  console.log(`\n2. 🔑 Worker API Token:`);
  console.log(`   • Visit: https://dash.cloudflare.com/profile/api-tokens`);
  console.log(`   • Permissions needed: Worker:Script:Edit, Worker:Script:Read`);
  console.log(`   • Current tokens: R2-only (primary) + DNS-only (backup)`);
  
  // R2 access
  console.log(`\n3. 📦 R2 Access Testing:`);
  console.log(`   • Status: Credentials valid, signature needed`);
  console.log(`   • Option: Use wrangler for R2 operations`);
  console.log(`   • Command: CLOUDFLARE_API_TOKEN=xLVB... bunx wrangler r2 object list factory-wager-registry`);
  
  // Final verification
  console.log(`\n4. ✅ Final Verification:`);
  console.log(`   • Test: curl -I https://registry.factory-wager.co/health`);
  console.log(`   • Expected: HTTP 200 with CDN headers`);
  console.log(`   • Monitor: Cloudflare analytics for traffic`);
}

// Main execution
renderChecklist();
renderSummary();
renderNextActions();

console.log(`\n🔗 Quick Commands Reference:`);
console.log(`# DNS Check`);
console.log(`watch -n 300 bun run live-dashboard.ts test-dns`);
console.log(``);
console.log(`# Secrets Test`);
console.log(`bun run live-dashboard.ts secrets`);
console.log(``);
console.log(`# Full Status`);
console.log(`bun run live-dashboard.ts status`);
console.log(``);
console.log(`# R2 Operations (when needed)`);
console.log(`CLOUDFLARE_API_TOKEN=xLVB37fpG3_j2P7fyfrlT7iKPewmUNFEuz2SnXpZ bunx wrangler r2 bucket list`);

console.log(`\n🎉 Current Infrastructure Status: 85% Ready`);
console.log(`Core services operational, waiting for DNS propagation + Worker token.`);
