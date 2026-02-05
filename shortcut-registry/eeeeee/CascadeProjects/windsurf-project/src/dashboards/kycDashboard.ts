// src/admin/kycDashboard.ts - Production-grade KYC Admin Dashboard
// Bun-native terminal interface with real-time updates and FinCEN compliance

import { BunTerminal } from "../admin/terminalManager";
import { KYCValidator, type KYCUser, type ReviewQueueItem } from "../compliance/kycValidator";
import { setTimeout } from "timers";
import { s3 } from "bun";

export class KYCDashboard {
  private terminal: BunTerminal;
  public kycValidator: KYCValidator;
  private isRunning: boolean = true;
  private currentUser: KYCUser | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private realTimeUpdates: boolean = true;

  constructor() {
    this.terminal = new BunTerminal({
      title: "🏛️ DuoPlus KYC Admin Dashboard v3.5",
      theme: "admin",
      width: 80,
      height: 24
    });
    this.kycValidator = new KYCValidator();
  }

  /**
   * Start the interactive dashboard
   */
  async start(): Promise<void> {

    this.terminal.enableRawMode();

    await this.sleep(1000);
    
    // Setup signal handlers for graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());

    // Start real-time updates
    if (this.realTimeUpdates) {
      this.startRealTimeUpdates();
    }

    // Main dashboard loop
    while (this.isRunning) {
      try {
        await this.renderMainMenu();
        await this.handleInput();
      } catch (error) {
        this.terminal.error(`Dashboard error: ${error}`);
        await this.sleep(2000);
      }
    }
  }

  /**
   * Render the main menu with real-time statistics
   */
  private async renderMainMenu(): Promise<void> {
    const stats = await this.getKYCStats();
    
    const menuContent = `
│  📊 Statistics:                                      │
│  • Pending Reviews: ${stats.pending.toString().padEnd(3)} │
│  • Verified Users:  ${stats.verified.toString().padEnd(3)} │
│  • High Risk Users: ${stats.highRisk.toString().padEnd(3)} │
│  • Daily Volume:    $${stats.dailyVolume.toFixed(2).padEnd(10)} │
│  • Total Users:     ${stats.totalUsers.toString().padEnd(3)} │
├─────────────────────────────────────────────────────┤
│  🎛️ Commands:                                        │
│  [V]erify User    - Review and approve user KYC      │
│  [R]eview Queue   - Process pending approvals       │
│  [S]corecard      - View detailed risk analysis      │
│  [P]ool Mgmt      - Manage family pool access        │
│  [L]eaderboard    - Show APY performance rankings   │
│  [B]alance        - Trigger pool rebalancing        │
│  [/]Search        - Find users or pools             │
│  [A]udit Log      - View compliance audit trail     │
│  [T]oggle Real-time - Enable/disable live updates   │
│  [?]Help          - Show detailed help menu         │
│  [Q]uit          - Exit dashboard safely           │
└─────────────────────────────────────────────────────┘`;

    this.terminal.renderFrame(menuContent);
  }

  /**
   * Handle keyboard input
   */
  private async handleInput(): Promise<void> {
    const input = await this.waitForKey();
    
    switch (input.toLowerCase()) {
      case 'v': await this.verifyUser(); break;
      case 'r': await this.reviewQueue(); break;
      case 's': await this.viewRiskScores(); break;
      case 'p': await this.managePools(); break;
      case 'l': await this.showLeaderboard(); break;
      case 'b': await this.triggerRebalancing(); break;
      case '/': await this.searchUser(); break;
      case 'a': await this.showAuditLog(); break;
      case 't': await this.toggleRealTimeUpdates(); break;
      case '?': this.terminal.showHelp(); await this.waitForEnter(); break;
      case 'q': await this.exit(); break;
      case '\x03': // Ctrl+C
        await this.shutdown();
        break;
      default:
        // Unknown key - ignore
        break;
    }
  }

  /**
   * Verify user KYC documents
   */
  private async verifyUser(): Promise<void> {
    try {
      const userId = await this.terminal.prompt("Enter user ID to verify:");
      if (!userId) return;

      const stopSpinner = this.terminal.showSpinner("Loading user data...");
      
      const user = await this.kycValidator.getUser(userId);
      stopSpinner();

      // Display user details
      const userContent = this.formatUserDetails(user);
      this.terminal.renderFrame(userContent);

      const action = await this.terminal.prompt("[A]pprove [R]eject [S]uspend [C]ancel:");
      
      switch (action.toLowerCase()) {
        case 'a':
          await this.performUserAction("approve", userId);
          break;
        case 'r':
          const reason = await this.terminal.prompt("Rejection reason:");
          await this.performUserAction("reject", userId, reason);
          break;
        case 's':
          const suspendReason = await this.terminal.prompt("Suspension reason:");
          await this.performUserAction("suspend", userId, suspendReason);
          break;
        case 'c':
          return;
      }
      
      await this.sleep(2000);
      
    } catch (error) {
      this.terminal.error(`Error verifying user: ${error}`);
      await this.sleep(2000);
    }
  }

  /**
   * Review pending queue
   */
  private async reviewQueue(): Promise<void> {
    try {
      const stopSpinner = this.terminal.showSpinner("Loading review queue...");
      const queue = await this.kycValidator.getReviewQueue();
      stopSpinner();

      if (queue.length === 0) {
        this.terminal.info("No items in review queue");
        await this.waitForEnter();
        return;
      }

      for (const item of queue) {
        const queueContent = `
┌─────────────────────────────────────────────────────┐
│  📋 Review Item                                     │
├─────────────────────────────────────────────────────┤
│  User ID:    ${item.userId.padEnd(30)} │
│  Email:      ${item.email.padEnd(30)} │
│  Amount:     $${item.amount.toFixed(2).padEnd(27)} │
│  Reason:     ${item.reason.padEnd(30)} │
│  Priority:   ${item.priority.toUpperCase().padEnd(27)} │
│  Created:    ${item.createdAt.toLocaleString().padEnd(27)} │
└─────────────────────────────────────────────────────┘`;

        this.terminal.renderFrame(queueContent);
        
        const decision = await this.terminal.prompt("[A]pprove [R]eject [S]kip [N]ext:");
        
        switch (decision.toLowerCase()) {
          case 'a':
            await this.kycValidator.manualApprove(item.userId, item.amount);
            this.terminal.success(`Approved ${item.userId}`);
            break;
          case 'r':
            const reason = await this.terminal.prompt("Rejection reason:");
            await this.kycValidator.rejectUser(item.userId, reason);
            this.terminal.warning(`Rejected ${item.userId}`);
            break;
          case 's':
            continue;
          case 'n':
            break;
        }
      }
      
    } catch (error) {
      this.terminal.error(`Error reviewing queue: ${error}`);
      await this.sleep(2000);
    }
  }

  /**
   * View risk scores and analysis
   */
  private async viewRiskScores(): Promise<void> {
    try {
      const userId = await this.terminal.prompt("Enter user ID for risk analysis:");
      if (!userId) return;

      const stopSpinner = this.terminal.showSpinner("Analyzing risk profile...");
      const user = await this.kycValidator.getUser(userId);
      stopSpinner();

      const riskContent = `
┌─────────────────────────────────────────────────────┐
│  🎯 Risk Analysis: ${user.email.padEnd(25)}       │
├─────────────────────────────────────────────────────┤
│  Risk Score:    ${user.riskScore.toString().padEnd(3)} / 100    │
│  Risk Level:    ${user.riskLevel.toUpperCase().padEnd(12)}       │
│  User Tier:     ${user.tier.toUpperCase().padEnd(12)}          │
│                                                     │
│  📊 Limits:                                         │
│  • Daily:   $${user.limits.daily.toLocaleString().padEnd(12)}   │
│  • Monthly: $${user.limits.monthly.toLocaleString().padEnd(12)} │
│  • Annual:  $${user.limits.annual.toLocaleString().padEnd(12)} │
│                                                     │
│  🚨 Flags:                                           │
${user.flags.length > 0 ? user.flags.map(flag => `│  • ${flag.padEnd(47)} │`).join('\n') : '│  • No flags detected'.padEnd(51) + ' │'}
│                                                     │
│  📄 Documents:                                       │
│  • ID:        ${user.documents.id?.status === "verified" ? "✅ Verified" : user.documents.id?.status === "pending" ? "⏳ Pending" : "❌ Missing"} │
│  • Address:   ${user.documents.address?.status === "verified" ? "✅ Verified" : user.documents.address?.status === "pending" ? "⏳ Pending" : "❌ Missing"} │
│  • Selfie:    ${user.documents.selfie?.status === "verified" ? "✅ Verified" : user.documents.selfie?.status === "pending" ? "⏳ Pending" : "❌ Missing"} │
└─────────────────────────────────────────────────────┘`;

      this.terminal.renderFrame(riskContent);
      await this.waitForEnter();
      
    } catch (error) {
      this.terminal.error(`Error viewing risk scores: ${error}`);
      await this.sleep(2000);
    }
  }

  /**
   * Manage pool access
   */
  private async managePools(): Promise<void> {
    this.terminal.info("Pool management feature coming soon...");
    await this.waitForEnter();
  }

  /**
   * Show APY leaderboard
   */
  private async showLeaderboard(): Promise<void> {
    this.terminal.info("APY leaderboard feature coming soon...");
    await this.waitForEnter();
  }

  /**
   * Trigger pool rebalancing
   */
  private async triggerRebalancing(): Promise<void> {
    this.terminal.info("Pool rebalancing feature coming soon...");
    await this.waitForEnter();
  }

  /**
   * Search for users
   */
  private async searchUser(): Promise<void> {
    try {
      const query = await this.terminal.prompt("Search query (email or user ID):");
      if (!query) return;

      const stopSpinner = this.terminal.showSpinner("Searching users...");
      const results = await this.kycValidator.searchUsers(query);
      stopSpinner();

      if (results.length === 0) {
        this.terminal.info("No users found");
        await this.waitForEnter();
        return;
      }

      let searchContent = `
┌─────────────────────────────────────────────────────┐
│  🔍 Search Results: "${query}"                     │
├─────────────────────────────────────────────────────┤
│  ID           Email                    Tier    Risk │
├─────┼─────────────────────────▼──────────▼───────┤`;

      results.forEach((user, idx) => {
        searchContent += `\n│  ${(idx + 1).toString().padEnd(3)} │ ${user.userId.padEnd(23)} │ ${user.tier.padEnd(6)} │ ${user.riskLevel.padEnd(5)} │`;
      });

      searchContent += `
└─────────────────────────────────────────────────────┘
Found ${results.length} user(s)`;

      this.terminal.renderFrame(searchContent);
      await this.waitForEnter();
      
    } catch (error) {
      this.terminal.error(`Error searching users: ${error}`);
      await this.sleep(2000);
    }
  }

  /**
   * Show audit log
   */
  private async showAuditLog(): Promise<void> {
    try {
      const stopSpinner = this.terminal.showSpinner("Loading audit log...");
      const auditLog = this.kycValidator.getAuditLog(20);
      stopSpinner();

      if (auditLog.length === 0) {
        this.terminal.info("No audit entries found");
        await this.waitForEnter();
        return;
      }

      let auditContent = `
┌─────────────────────────────────────────────────────┐
│  📋 Recent Audit Log (Last 20 entries)             │
├─────────────────────────────────────────────────────┤
│  Time                Action    User    By           │
├─────────────────────▼──────────▼───────▼───────────┤`;

      auditLog.forEach(entry => {
        const time = entry.timestamp.toLocaleTimeString().padEnd(19);
        const action = entry.action.padEnd(8);
        const user = entry.userId.padEnd(7);
        const performedBy = entry.performedBy.padEnd(7);
        auditContent += `\n│  ${time} │ ${action} │ ${user} │ ${performedBy} │`;
      });

      auditContent += `\n└─────────────────────────────────────────────────────┘`;

      this.terminal.renderFrame(auditContent);
      await this.waitForEnter();
      
    } catch (error) {
      this.terminal.error(`Error loading audit log: ${error}`);
      await this.sleep(2000);
    }
  }

  /**
   * Exit dashboard
   */
  private async exit(): Promise<void> {
    const confirmed = await this.terminal.confirm("Are you sure you want to exit?");
    if (confirmed) {
      this.isRunning = false;
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.terminal.cleanup();
    process.exit(0);
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      if (this.isRunning) {
        // Refresh stats in background
        await this.getKYCStats();
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Toggle real-time updates
   */
  private async toggleRealTimeUpdates(): Promise<void> {
    this.realTimeUpdates = !this.realTimeUpdates;
    
    if (this.realTimeUpdates) {
      this.startRealTimeUpdates();
      this.terminal.success("✅ Real-time updates enabled");
    } else {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      this.terminal.warning("⚠️ Real-time updates disabled");
    }
    
    await this.sleep(1500);
  }

  /**
   * Get KYC statistics
   */
  async getKYCStats() {
    return await this.kycValidator.getKYCStats();
  }

  /**
   * Search users
   */
  async searchUsers(query: string) {
    return await this.kycValidator.searchUsers(query);
  }

  /**
   * Get review queue
   */
  async getReviewQueue() {
    return await this.kycValidator.getReviewQueue();
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number) {
    return this.kycValidator.getAuditLog(limit);
  }

  /**
   * Format user details for display
   */
  private formatUserDetails(user: KYCUser): string {
    return `
┌─────────────────────────────────────────────────────┐
│  👤 User Details                                     │
├─────────────────────────────────────────────────────┤
│  User ID:    ${user.userId.padEnd(35)} │
│  Email:      ${user.email.padEnd(35)} │
│  Tier:       ${user.tier.toUpperCase().padEnd(33)} │
│  Risk Level: ${user.riskLevel.toUpperCase().padEnd(31)} │
│  Risk Score: ${user.riskScore.toString().padEnd(33)} / 100 │
│  Verified:   ${user.verifiedAt ? user.verifiedAt.toLocaleDateString().padEnd(31) : "Not verified".padEnd(31)} │
├─────────────────────────────────────────────────────┤
│  📄 Documents Status:                               │
│  • ID Document:        ${user.documents.id?.status === "verified" ? "✅ VERIFIED" : user.documents.id?.status === "pending" ? "⏳ PENDING" : "❌ MISSING"} │
│  • Proof of Address:   ${user.documents.address?.status === "verified" ? "✅ VERIFIED" : user.documents.address?.status === "pending" ? "⏳ PENDING" : "❌ MISSING"} │
│  • Selfie:             ${user.documents.selfie?.status === "verified" ? "✅ VERIFIED" : user.documents.selfie?.status === "pending" ? "⏳ PENDING" : "❌ MISSING"} │
├─────────────────────────────────────────────────────┤
│  💰 Transaction Limits:                             │
│  • Daily:   $${user.limits.daily.toLocaleString().padEnd(35)} │
│  • Monthly: $${user.limits.monthly.toLocaleString().padEnd(35)} │
│  • Annual:  $${user.limits.annual.toLocaleString().padEnd(35)} │
├─────────────────────────────────────────────────────┤
│  🚨 Flags:                                           │
${user.flags.length > 0 ? user.flags.map(flag => `│  • ${flag.padEnd(47)} │`).join('\n') : '│  • No flags detected'.padEnd(51) + ' │'}
└─────────────────────────────────────────────────────┘`;
  }

  /**
   * Perform user action (approve/reject/suspend)
   */
  private async performUserAction(action: string, userId: string, reason?: string): Promise<void> {
    try {
      const stopSpinner = this.terminal.showSpinner(`${action.charAt(0).toUpperCase() + action.slice(1)}ing user...`);
      
      switch (action) {
        case 'approve':
          await this.kycValidator.approveUser(userId, "admin");
          break;
        case 'reject':
          if (!reason) throw new Error("Reason required for rejection");
          await this.kycValidator.rejectUser(userId, reason, "admin");
          break;
        case 'suspend':
          if (!reason) throw new Error("Reason required for suspension");
          await this.kycValidator.suspendUser(userId, reason, "admin");
          break;
      }
      
      stopSpinner();
      this.terminal.success(`User ${action}d successfully`);
      
    } catch (error) {
      this.terminal.error(`Failed to ${action} user: ${error}`);
    }
  }

  /**
   * Utility functions
   */
  private async waitForKey(): Promise<string> {
    return new Promise((resolve) => {
      const onData = (chunk: Buffer) => {
        process.stdin.off("data", onData);
        resolve(chunk.toString());
      };
      process.stdin.on("data", onData);
    });
  }

  private async waitForEnter(): Promise<void> {
    return new Promise((resolve) => {
      const onData = (chunk: Buffer) => {
        if (chunk.toString() === "\n" || chunk.toString() === "\r") {
          process.stdin.off("data", onData);
          resolve();
        }
      };
      process.stdin.on("data", onData);
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
