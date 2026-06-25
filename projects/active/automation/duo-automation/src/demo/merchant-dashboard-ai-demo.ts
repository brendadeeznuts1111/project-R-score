// src/demo/merchant-dashboard-ai-demo.ts
/**
 * 🏪🤖 Merchant Dashboard + AI Evidence Analysis Demo
 * 
 * Comprehensive demonstration of the merchant dashboard with integrated AI evidence analysis
 */

import { MerchantDashboardManager } from "../merchant/dashboard/merchant-dashboard-manager.ts";
import { AIEvidenceAnalyzer } from "../ai/evidence-analyzer.ts";
import { Dispute, Evidence, DisputeMessage, Transaction } from "../ai/evidence-analyzer.ts";

// ============================================================================
// DEMO CONFIGURATION
// ============================================================================

const DEMO_CONFIG = {
  merchantId: 'merchant-1',
  timeframe: '30d' as const,
  enableRealTimeUpdates: true,
  showAIAnalysis: true,
  generateSampleData: true
};

// ============================================================================
// MAIN DEMO FUNCTION
// ============================================================================

async function runMerchantDashboardAIDemo(): Promise<void> {
  console.info("🏪🤖 MERCHANT DASHBOARD + AI EVIDENCE ANALYSIS DEMO");
  console.info("=" .repeat(60));
  console.info(`📊 Merchant ID: ${DEMO_CONFIG.merchantId}`);
  console.info(`📅 Timeframe: ${DEMO_CONFIG.timeframe}`);
  console.info(`🤖 AI Analysis: ${DEMO_CONFIG.showAIAnalysis ? 'ENABLED' : 'DISABLED'}`);
  console.info("=" .repeat(60));

  try {
    // Initialize systems
    console.info("\n🚀 Initializing systems...");
    const dashboardManager = new MerchantDashboardManager();
    const aiAnalyzer = new AIEvidenceAnalyzer();

    // Load merchant dashboard
    console.info("\n📊 Loading merchant dashboard...");
    const dashboard = await dashboardManager.getMerchantDashboard(
      DEMO_CONFIG.merchantId, 
      DEMO_CONFIG.timeframe
    );

    // Display overview metrics
    displayOverviewMetrics(dashboard.overview);

    // Display disputes summary
    displayDisputesSummary(dashboard.disputes);

    // Display AI insights
    if (DEMO_CONFIG.showAIAnalysis) {
      await displayAIInsights(dashboard.aiInsights, aiAnalyzer);
    }

    // Demonstrate real-time updates
    if (DEMO_CONFIG.enableRealTimeUpdates) {
      await demonstrateRealTimeUpdates(dashboardManager);
    }

    // Show AI evidence analysis in action
    await demonstrateAIEvidenceAnalysis(aiAnalyzer);

    // Display recommendations and alerts
    displayRecommendations(dashboard.recommendations);
    displayAlerts(dashboard.alerts);

    console.info("\n✅ Demo completed successfully!");

  } catch (error) {
    console.error("\n❌ Demo failed:", error);
    throw error;
  }
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

function displayOverviewMetrics(overview: any): void {
  console.info("\n📈 OVERVIEW METRICS");
  console.info("-".repeat(40));
  
  const metrics = [
    { label: "Total Transactions", value: overview.totalTransactions.toLocaleString(), icon: "💰" },
    { label: "Total Volume", value: `$${overview.totalVolume.toLocaleString()}`, icon: "💵" },
    { label: "Average Transaction", value: `$${overview.avgTransaction.toFixed(2)}`, icon: "📊" },
    { label: "Active Disputes", value: overview.activeDisputes.toString(), icon: "⚖️" },
    { label: "Dispute Rate", value: `${overview.disputeRate.toFixed(2)}%`, icon: "📈" },
    { label: "Win Rate", value: `${overview.winRate.toFixed(1)}%`, icon: "🏆" },
    { label: "Avg Resolution Time", value: `${overview.avgResolutionDays.toFixed(1)} days`, icon: "⏱️" },
    { label: "Risk Level", value: overview.riskLevel, icon: "🚨" }
  ];

  metrics.forEach(metric => {
    const riskColor = metric.label === "Risk Level" ? getRiskLevelColor(overview.riskLevel) : "";
    console.info(`  ${metric.icon} ${metric.label.padEnd(20)}: ${riskColor}${metric.value}${riskColor}`);
  });

  // Display trends
  console.info("\n📊 TRENDS (vs previous period)");
  console.info("-".repeat(40));
  console.info(`  📈 Volume: ${getTrendIndicator(overview.trends.volume)} ${Math.abs(overview.trends.volume).toFixed(1)}%`);
  console.info(`  ⚖️ Disputes: ${getTrendIndicator(overview.trends.disputes)} ${Math.abs(overview.trends.disputes).toFixed(1)}%`);
  console.info(`  🏆 Win Rate: ${getTrendIndicator(overview.trends.winRate)} ${Math.abs(overview.trends.winRate).toFixed(1)}%`);
}

function displayDisputesSummary(disputes: any): void {
  console.info("\n⚖️ DISPUTES SUMMARY");
  console.info("-".repeat(40));
  
  console.info(`  📊 Total Disputes: ${disputes.counts.total}`);
  console.info(`  🆕 New: ${disputes.counts.submitted}`);
  console.info(`  🔍 Under Review: ${disputes.counts.under_review}`);
  console.info(`  🚨 Escalated to Venmo: ${disputes.counts.escalated}`);
  console.info(`  ✅ Resolved: ${disputes.counts.resolved}`);
  
  if (disputes.requiringAction.length > 0) {
    console.info(`\n⚠️ REQUIRING ACTION: ${disputes.requiringAction.length} disputes`);
    disputes.requiringAction.slice(0, 3).forEach((dispute: any, index: number) => {
      console.info(`   ${index + 1}. ${dispute.id} - $${dispute.amount} (${dispute.reason})`);
    });
  }

  if (disputes.highRisk.length > 0) {
    console.info(`\n🚨 HIGH RISK: ${disputes.highRisk.length} disputes`);
    disputes.highRisk.slice(0, 3).forEach((dispute: any, index: number) => {
      console.info(`   ${index + 1}. ${dispute.id} - Risk: ${(dispute.riskScore * 100).toFixed(1)}%`);
    });
  }

  if (disputes.reasons.length > 0) {
    console.info("\n📋 TOP DISPUTE REASONS");
    console.info("-".repeat(40));
    disputes.reasons.slice(0, 5).forEach((reason: any, index: number) => {
      const bar = "█".repeat(Math.round(reason.percentage / 5));
      console.info(`   ${index + 1}. ${reason.reason.padEnd(20)} ${bar.padEnd(20)} ${reason.percentage.toFixed(1)}%`);
    });
  }
}

async function displayAIInsights(aiInsights: any, aiAnalyzer: AIEvidenceAnalyzer): Promise<void> {
  console.info("\n🤖 AI INSIGHTS");
  console.info("-".repeat(40));
  
  console.info(`  📊 Total Analyzed: ${aiInsights.summary.totalAnalyzed}`);
  console.info(`  🚨 High Risk: ${aiInsights.summary.highRiskCount}`);
  console.info(`  🎯 Avg Confidence: ${(aiInsights.summary.avgConfidence * 100).toFixed(1)}%`);
  
  if (aiInsights.summary.topRiskFactors.length > 0) {
    console.info("\n⚠️ TOP RISK FACTORS");
    aiInsights.summary.topRiskFactors.forEach((factor: string, index: number) => {
      console.info(`   ${index + 1}. ${factor}`);
    });
  }

  if (aiInsights.analyses.length > 0) {
    console.info("\n📈 RECENT AI ANALYSES");
    console.info("-".repeat(40));
    aiInsights.analyses.slice(0, 3).forEach((analysis: any, index: number) => {
      const riskLevel = getRiskLevel(analysis.riskScore);
      console.info(`   ${index + 1}. ${analysis.disputeId}`);
      console.info(`      Risk: ${riskLevel} (${(analysis.riskScore * 100).toFixed(1)}%)`);
      console.info(`      Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.info(`      Processing Time: ${analysis.metadata.processingTime}ms`);
      
      if (analysis.keyFindings.length > 0) {
        console.info(`      Findings: ${analysis.keyFindings.slice(0, 2).join(", ")}`);
      }
    });
  }

  if (aiInsights.patterns.length > 0) {
    console.info("\n🔍 DETECTED PATTERNS");
    console.info("-".repeat(40));
    aiInsights.patterns.forEach((pattern: any, index: number) => {
      const impactIcon = pattern.impact === 'HIGH' ? '🚨' : pattern.impact === 'MEDIUM' ? '⚠️' : 'ℹ️';
      console.info(`   ${index + 1}. ${impactIcon} ${pattern.description}`);
      console.info(`      Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
    });
  }
}

async function demonstrateRealTimeUpdates(dashboardManager: MerchantDashboardManager): Promise<void> {
  console.info("\n📡 REAL-TIME UPDATES DEMONSTRATION");
  console.info("-".repeat(40));
  
  let updateCount = 0;
  
  await dashboardManager.subscribeToRealTimeUpdates(
    DEMO_CONFIG.merchantId, 
    (update: any) => {
      updateCount++;
      console.info(`  📨 Update ${updateCount}: ${update.type} at ${update.timestamp.toLocaleTimeString()}`);
      
      if (updateCount >= 3) {
        dashboardManager.unsubscribeFromRealTimeUpdates(DEMO_CONFIG.merchantId);
        console.info("  ✅ Real-time updates demo completed");
      }
    }
  );

  // Simulate some updates
  console.info("  🔄 Simulating real-time events...");
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function demonstrateAIEvidenceAnalysis(aiAnalyzer: AIEvidenceAnalyzer): Promise<void> {
  console.info("\n🔍 AI EVIDENCE ANALYSIS DEMONSTRATION");
  console.info("-".repeat(40));
  
  // Create sample dispute
  const sampleDispute: Dispute = {
    id: 'demo-dispute-' + Date.now(),
    merchantId: DEMO_CONFIG.merchantId,
    customerId: 'customer-demo',
    amount: 125.50,
    currency: 'USD',
    reason: 'damaged_goods',
    description: 'Customer reports product arrived damaged',
    status: 'SUBMITTED',
    evidenceUrls: [
      'https://cdn.factory-wager.com/demo-damaged-product.jpg',
      'https://cdn.factory-wager.com/demo-purchase-receipt.pdf'
    ],
    messages: [
      {
        id: 'msg-1',
        disputeId: 'demo-dispute',
        senderId: 'customer-demo',
        senderType: 'CUSTOMER',
        content: 'I received the product and it was completely damaged! This is unacceptable.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'msg-2',
        disputeId: 'demo-dispute',
        senderId: DEMO_CONFIG.merchantId,
        senderType: 'MERCHANT',
        content: 'We apologize for the issue. Can you please provide photos of the damage?',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ],
    transaction: {
      id: 'txn-demo',
      amount: 125.50,
      currency: 'USD',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      merchantId: DEMO_CONFIG.merchantId,
      customerId: 'customer-demo',
      status: 'completed'
    },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
  };

  console.info(`  📋 Analyzing dispute: ${sampleDispute.id}`);
  console.info(`  💰 Amount: $${sampleDispute.amount}`);
  console.info(`  📄 Evidence: ${sampleDispute.evidenceUrls.length} items`);
  console.info(`  💬 Messages: ${sampleDispute.messages.length} exchanged`);
  
  try {
    const analysis = await aiAnalyzer.analyzeDispute(sampleDispute);
    
    console.info("\n  🤖 AI ANALYSIS RESULTS");
    console.info("  " + "-".repeat(35));
    console.info(`  🎯 Risk Score: ${(analysis.riskScore * 100).toFixed(1)}%`);
    console.info(`  📊 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.info(`  ⏱️ Processing Time: ${analysis.metadata.processingTime}ms`);
    console.info(`  📈 Analyzed Items: ${analysis.metadata.analyzedItems}`);
    
    if (analysis.keyFindings.length > 0) {
      console.info("\n  🔍 KEY FINDINGS");
      analysis.keyFindings.forEach((finding: string, index: number) => {
        console.info(`     ${index + 1}. ${finding}`);
      });
    }
    
    if (analysis.recommendations.length > 0) {
      console.info("\n  💡 RECOMMENDATIONS");
      analysis.recommendations.forEach((rec: string, index: number) => {
        console.info(`     ${index + 1}. ${rec.replace(/_/g, ' ').toUpperCase()}`);
      });
    }
    
    if (analysis.fraudIndicators.length > 0) {
      console.info("\n  🚨 FRAUD INDICATORS");
      analysis.fraudIndicators.forEach((indicator: any, index: number) => {
        const severityIcon = getSeverityIcon(indicator.severity);
        console.info(`     ${index + 1}. ${severityIcon} ${indicator.description}`);
        console.info(`        Confidence: ${(indicator.confidence * 100).toFixed(1)}%`);
      });
    }
    
    console.info("\n  🧠 EXPLAINABILITY");
    console.info(`  ${analysis.explainability.reasoning}`);
    
    if (analysis.explainability.riskFactors.length > 0) {
      console.info("\n  📊 RISK FACTORS");
      analysis.explainability.riskFactors.forEach((factor: any, index: number) => {
        const impactIcon = factor.impact === 'NEGATIVE' ? '📉' : '📈';
        console.info(`     ${index + 1}. ${impactIcon} ${factor.factor} (weight: ${(factor.weight * 100).toFixed(1)}%)`);
      });
    }
    
  } catch (error) {
    console.error(`  ❌ AI analysis failed:`, error);
  }
}

function displayRecommendations(recommendations: any[]): void {
  console.info("\n💡 RECOMMENDATIONS");
  console.info("-".repeat(40));
  
  if (recommendations.length === 0) {
    console.info("  ✅ No recommendations at this time");
    return;
  }
  
  recommendations.forEach((rec: any, index: number) => {
    const priorityIcon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
    const dueDate = rec.dueDate ? ` (Due: ${rec.dueDate.toLocaleDateString()})` : '';
    
    console.info(`  ${index + 1}. ${priorityIcon} ${rec.title}${dueDate}`);
    console.info(`     ${rec.description}`);
    console.info(`     Status: ${rec.status}`);
  });
}

function displayAlerts(alerts: any[]): void {
  console.info("\n🚨 ALERTS");
  console.info("-".repeat(40));
  
  if (alerts.length === 0) {
    console.info("  ✅ No alerts at this time");
    return;
  }
  
  alerts.forEach((alert: any, index: number) => {
    const severityIcon = getSeverityIcon(alert.severity);
    console.info(`  ${index + 1}. ${severityIcon} ${alert.title}`);
    console.info(`     ${alert.message}`);
    console.info(`     Time: ${alert.timestamp.toLocaleString()}`);
    console.info(`     Read: ${alert.read ? 'Yes' : 'No'}`);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRiskLevelColor(riskLevel: string): string {
  const colors = {
    'LOW': '\x1b[32m',    // Green
    'MEDIUM': '\x1b[33m',  // Yellow
    'HIGH': '\x1b[31m',    // Red
    'CRITICAL': '\x1b[35m' // Magenta
  };
  return colors[riskLevel as keyof typeof colors] || '';
}

function getRiskLevel(riskScore: number): string {
  if (riskScore < 0.3) return 'LOW';
  if (riskScore < 0.6) return 'MEDIUM';
  if (riskScore < 0.8) return 'HIGH';
  return 'CRITICAL';
}

function getTrendIndicator(trend: number): string {
  return trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
}

function getSeverityIcon(severity: string): string {
  const icons = {
    'INFO': 'ℹ️',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'CRITICAL': '🚨'
  };
  return icons[severity as keyof typeof icons] || 'ℹ️';
}

// ============================================================================
// RUN DEMO
// ============================================================================

if (import.meta.main) {
  runMerchantDashboardAIDemo()
    .then(() => {
      console.info("\n🎉 MERCHANT DASHBOARD + AI DEMO COMPLETED!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 DEMO FAILED:", error);
      process.exit(1);
    });
}

export { runMerchantDashboardAIDemo };
