#!/usr/bin/env bun

/**
 * Polished UI Components - Family Reunion Mode
 * 
 * ACME's delightful and intuitive UI components for family reunions.
 * Since 1972, we've believed that the finest systems blend utility with delight.
 */

import { readFileSync, writeFileSync } from 'fs';

interface UIComponent {
  id: string;
  type: 'merchant_view' | 'guest_view' | 'payment_modal' | 'quest_progress' | 'family_dashboard';
  title: string;
  description: string;
  rendered: string;
  styles: string;
  interactions: string[];
}

interface ReunionModeConfig {
  familyId: string;
  familyName: string;
  hostId: string;
  hostName: string;
  activeMembers: number;
  totalTab: number;
  perPersonAmount: number;
  questMode: boolean;
  theme: 'light' | 'dark' | 'acme-retro';
}

class PolishedUIComponents {
  private static readonly ACME_ORANGE = '#FF6B35';
  private static readonly ACME_BLUE = '#45B7D1';
  private static readonly ACME_GREEN = '#96CEB4';
  private static readonly ACME_PURPLE = '#9B59B6';
  private static readonly ACME_GRAY = '#95A5A6';

  /**
   * Generate Merchant View for Family Reunion Host
   */
  static generateMerchantView(config: ReunionModeConfig): UIComponent {
    const component: UIComponent = {
      id: 'merchant-reunion-view',
      type: 'merchant_view',
      title: `${config.familyName} Family Reunion`,
      description: 'Host dashboard for managing family reunion payments',
      rendered: this.renderMerchantView(config),
      styles: this.getMerchantViewStyles(),
      interactions: ['bulk_request', 'quest_toggle', 'member_management', 'real_time_updates']
    };

    return component;
  }

  /**
   * Generate Guest View for First-Time Users
   */
  static generateGuestView(config: ReunionModeConfig, guestName: string, inviterName: string): UIComponent {
    const component: UIComponent = {
      id: 'guest-welcome-view',
      type: 'guest_view',
      title: `Welcome to ${config.familyName} Family Pool`,
      description: 'Onboarding experience for guest users',
      rendered: this.renderGuestView(config, guestName, inviterName),
      styles: this.getGuestViewStyles(),
      interactions: ['tutorial_flow', 'qr_scanner', 'payment_limits', 'trust_building']
    };

    return component;
  }

  /**
   * Generate Payment Modal with QR Code
   */
  static generatePaymentModal(config: {
    recipientName: string;
    amount: number;
    description: string;
    paymentMethods: string[];
    qrCode: string;
  }): UIComponent {
    const component: UIComponent = {
      id: 'payment-modal',
      type: 'payment_modal',
      title: 'Send Payment',
      description: 'Modal for sending payments with QR code',
      rendered: this.renderPaymentModal(config),
      styles: this.getPaymentModalStyles(),
      interactions: ['qr_display', 'method_selection', 'amount_input', 'confirmation']
    };

    return component;
  }

  /**
   * Generate Quest Progress Component
   */
  static generateQuestProgress(config: {
    currentQuest: string;
    progress: number;
    total: number;
    nextReward: string;
    activeQuests: Array<{ name: string; progress: number; icon: string }>;
  }): UIComponent {
    const component: UIComponent = {
      id: 'quest-progress',
      type: 'quest_progress',
      title: 'Family Quests',
      description: 'Gamification component for quest tracking',
      rendered: this.renderQuestProgress(config),
      styles: this.getQuestProgressStyles(),
      interactions: ['quest_details', 'progress_animation', 'reward_celebration', 'quest_navigation']
    };

    return component;
  }

  /**
   * Generate Family Dashboard
   */
  static generateFamilyDashboard(config: ReunionModeConfig): UIComponent {
    const component: UIComponent = {
      id: 'family-dashboard',
      type: 'family_dashboard',
      title: `${config.familyName} Family Dashboard`,
      description: 'Comprehensive family pool overview',
      rendered: this.renderFamilyDashboard(config),
      styles: this.getFamilyDashboardStyles(),
      interactions: ['member_list', 'balance_overview', 'activity_feed', 'settings_panel']
    };

    return component;
  }

  /**
   * Render Merchant View HTML
   */
  private static renderMerchantView(config: ReunionModeConfig): string {
    const progressPercent = Math.min((7 / 10) * 100, 100); // 7/10 quests completed
    
    return `
<div class="merchant-reunion-view" data-theme="${config.theme}">
  <header class="reunion-header">
    <div class="header-content">
      <div class="reunion-status">
        <span class="status-badge active">🏡 Family Reunion Mode – ACTIVE</span>
        <span class="member-count">${config.familyName} Pool – ${config.activeMembers} members online</span>
      </div>
      <div class="host-info">
        <span class="host-name">Hosted by ${config.hostName}</span>
      </div>
    </div>
  </header>

  <main class="reunion-main">
    <section class="tab-overview">
      <div class="tab-card">
        <h2>Total Tab</h2>
        <div class="amount-display">
          <span class="currency">$</span>
          <span class="amount">${config.totalTab.toFixed(2)}</span>
        </div>
        <div class="split-info">
          <span>Split: $${config.perPersonAmount.toFixed(2)} per person</span>
        </div>
      </div>
    </section>

    <section class="quick-actions">
      <button class="action-button primary" onclick="requestBulkPayments()">
        <span class="icon">📤</span>
        <span>Bulk Request Payments</span>
      </button>
      <button class="action-button secondary ${config.questMode ? 'active' : ''}" onclick="toggleQuestMode()">
        <span class="icon">🎁</span>
        <span>Enable Quest Mode</span>
      </button>
    </section>

    <section class="member-payments">
      <h3>Quick Actions</h3>
      <div class="payment-list">
        <div class="payment-item owes">
          <div class="member-info">
            <span class="member-avatar">👨</span>
            <span class="member-name">Cousin Bob</span>
          </div>
          <div class="payment-status">
            <span class="status">Owes you $25</span>
            <button class="quick-pay" onclick="requestPayment('bob')">Request</button>
          </div>
        </div>
        
        <div class="payment-item paid">
          <div class="member-info">
            <span class="member-avatar">👩</span>
            <span class="member-name">Guest Sarah</span>
          </div>
          <div class="payment-status">
            <span class="status completed">Paid $30 ✅</span>
          </div>
        </div>
      </div>
    </section>

    <section class="quest-progress-section">
      <h3>🌟 Quest Progress</h3>
      <div class="quest-progress-bar">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <span class="progress-text">7/10</span>
      </div>
      <div class="quest-status">
        <span class="quest-name">Reunion Hero reward!</span>
        <div class="progress-visual">
          <span class="progress-block filled">█</span>
          <span class="progress-block filled">█</span>
          <span class="progress-block filled">█</span>
          <span class="progress-block filled">█</span>
          <span class="progress-block filled">█</span>
          <span class="progress-block filled">█</span>
          <span class="progress-block filled">█</span>
          <span class="progress-block">░</span>
          <span class="progress-block">░</span>
          <span class="progress-block">░</span>
        </div>
      </div>
    </section>
  </main>

  <footer class="reunion-footer">
    <div class="footer-actions">
      <button class="footer-button" onclick="viewAnalytics()">📊 Analytics</button>
      <button class="footer-button" onclick="manageMembers()">👥 Members</button>
      <button class="footer-button" onclick="openSettings()">⚙️ Settings</button>
    </div>
  </footer>
</div>

<script>
function requestBulkPayments() {
  // Implementation for bulk payment requests
  console.log('Requesting bulk payments...');
}

function toggleQuestMode() {
  // Toggle quest mode on/off
  console.log('Toggling quest mode...');
}

function requestPayment(memberId) {
  // Request payment from specific member
  console.log('Requesting payment from', memberId);
}

function viewAnalytics() {
  // Open analytics view
  console.log('Opening analytics...');
}

function manageMembers() {
  // Open member management
  console.log('Managing members...');
}

function openSettings() {
  // Open settings panel
  console.log('Opening settings...');
}
</script>
    `.trim();
  }

  /**
   * Render Guest View HTML
   */
  private static renderGuestView(config: ReunionModeConfig, guestName: string, inviterName: string): string {
    return `
<div class="guest-welcome-view" data-theme="${config.theme}">
  <header class="guest-header">
    <div class="welcome-message">
      <h1>🤗 Welcome, ${guestName}!</h1>
      <p>You're a guest of ${inviterName}</p>
    </div>
    <div class="family-badge">
      <span class="badge-icon">🏡</span>
      <span class="badge-text">${config.familyName} Family Pool</span>
    </div>
  </header>

  <main class="guest-main">
    <section class="quick-tips">
      <h2>💡 Quick Tips</h2>
      <div class="tips-list">
        <div class="tip-item">
          <span class="tip-icon">📱</span>
          <span class="tip-text">Tap "Pay" to scan QR</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">💰</span>
          <span class="tip-text">Your limit: $50</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">🤝</span>
          <span class="tip-text">Can't front? Ask ${inviterName} to upgrade</span>
        </div>
      </div>
    </section>

    <section class="action-buttons">
      <button class="action-button primary large" onclick="startPaying()">
        <span class="button-icon">💸</span>
        <span class="button-text">Start Paying</span>
      </button>
      <button class="action-button secondary" onclick="learnMore()">
        <span class="button-icon">📚</span>
        <span class="button-text">Learn More</span>
      </button>
    </section>

    <section class="first-quest">
      <div class="quest-card">
        <div class="quest-header">
          <span class="quest-icon">🌟</span>
          <h3>First Quest: "Newcomer"</h3>
        </div>
        <div class="quest-description">
          <p>Complete 1 payment → Earn trust!</p>
        </div>
        <div class="quest-progress">
          <div class="mini-progress-bar">
            <div class="mini-progress-fill" style="width: 0%"></div>
          </div>
          <span class="progress-text">0/1 completed</span>
        </div>
        <div class="quest-reward">
          <span class="reward-icon">🎁</span>
          <span class="reward-text">+5 Trust Score</span>
        </div>
      </div>
    </section>

    <section class="how-it-works">
      <h3>How It Works</h3>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>Scan QR Code</h4>
            <p>Point your camera at any payment QR</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>Confirm Payment</h4>
            <p>Review amount and tap to pay</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>Build Trust</h4>
            <p>Complete payments to increase your trust score</p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="guest-footer">
    <div class="support-info">
      <p>Need help? Contact ${inviterName} or our support team</p>
      <button class="support-button" onclick="contactSupport">💬 Get Help</button>
    </div>
  </footer>
</div>

<script>
function startPaying() {
  // Open QR scanner or payment flow
  console.log('Starting payment process...');
}

function learnMore() {
  // Show detailed tutorial
  console.log('Showing learn more content...');
}

function contactSupport() {
  // Contact support or inviter
  console.log('Contacting support...');
}
</script>
    `.trim();
  }

  /**
   * Render Payment Modal HTML
   */
  private static renderPaymentModal(config: {
    recipientName: string;
    amount: number;
    description: string;
    paymentMethods: string[];
    qrCode: string;
  }): string {
    return `
<div class="payment-modal-overlay">
  <div class="payment-modal">
    <header class="modal-header">
      <h2>Send Payment</h2>
      <button class="close-button" onclick="closePaymentModal()">✕</button>
    </header>

    <main class="modal-main">
      <section class="recipient-info">
        <div class="recipient-avatar">👤</div>
        <div class="recipient-details">
          <h3>${config.recipientName}</h3>
          <p>${config.description}</p>
        </div>
      </section>

      <section class="amount-section">
        <div class="amount-input-group">
          <span class="currency-symbol">$</span>
          <input type="number" class="amount-input" value="${config.amount}" step="0.01" min="0.01">
        </div>
        <div class="quick-amounts">
          <button class="quick-amount" onclick="setAmount(10)">$10</button>
          <button class="quick-amount" onclick="setAmount(25)">$25</button>
          <button class="quick-amount" onclick="setAmount(50)">$50</button>
          <button class="quick-amount" onclick="setAmount(100)">$100</button>
        </div>
      </section>

      <section class="payment-methods">
        <h4>Payment Method</h4>
        <div class="method-options">
          ${config.paymentMethods.map(method => `
            <label class="method-option">
              <input type="radio" name="payment-method" value="${method}">
              <span class="method-icon">${this.getMethodIcon(method)}</span>
              <span class="method-name">${this.getMethodName(method)}</span>
            </label>
          `).join('')}
        </div>
      </section>

      <section class="qr-section">
        <h4>Or Scan QR Code</h4>
        <div class="qr-container">
          <div class="qr-code">
            ${config.qrCode}
          </div>
          <p class="qr-instruction">Scan with your payment app</p>
        </div>
      </section>
    </main>

    <footer class="modal-footer">
      <button class="cancel-button" onclick="closePaymentModal()">Cancel</button>
      <button class="confirm-button primary" onclick="confirmPayment()">
        Send Payment
      </button>
    </footer>
  </div>
</div>

<script>
function closePaymentModal() {
  // Close the modal
  console.log('Closing payment modal...');
}

function setAmount(amount) {
  // Set amount input value
  document.querySelector('.amount-input').value = amount;
}

function confirmPayment() {
  // Process payment
  console.log('Confirming payment...');
}
</script>
    `.trim();
  }

  /**
   * Render Quest Progress HTML
   */
  private static renderQuestProgress(config: {
    currentQuest: string;
    progress: number;
    total: number;
    nextReward: string;
    activeQuests: Array<{ name: string; progress: number; icon: string }>;
  }): string {
    const progressPercent = (config.progress / config.total) * 100;
    
    return `
<div class="quest-progress-component">
  <header class="quest-header">
    <h2>🎮 Family Quests</h2>
    <div class="overall-progress">
      <span class="progress-text">${config.progress}/${config.total} Quests</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
    </div>
  </header>

  <main class="quest-main">
    <section class="current-quest">
      <h3>Current Quest</h3>
      <div class="quest-card current">
        <div class="quest-info">
          <span class="quest-icon">🎯</span>
          <div class="quest-details">
            <h4>${config.currentQuest}</h4>
            <p>Next Reward: ${config.nextReward}</p>
          </div>
        </div>
        <div class="quest-progress-bar">
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="progress-percent">${Math.round(progressPercent)}%</span>
        </div>
      </div>
    </section>

    <section class="active-quests">
      <h3>Active Quests</h3>
      <div class="quest-list">
        ${config.activeQuests.map(quest => `
          <div class="quest-item">
            <div class="quest-icon">${quest.icon}</div>
            <div class="quest-name">${quest.name}</div>
            <div class="quest-progress">
              <div class="mini-progress-bar">
                <div class="mini-progress-fill" style="width: ${quest.progress}%"></div>
              </div>
              <span class="progress-text">${quest.progress}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="quest-rewards">
      <h3>🏆 Upcoming Rewards</h3>
      <div class="rewards-grid">
        <div class="reward-card">
          <span class="reward-icon">🎁</span>
          <span class="reward-name">Pool Credits</span>
          <span class="reward-value">$5</span>
        </div>
        <div class="reward-card">
          <span class="reward-icon">🏅</span>
          <span class="reward-name">Trust Badge</span>
          <span class="reward-value">+10</span>
        </div>
        <div class="reward-card">
          <span class="reward-icon">🎉</span>
          <span class="reward-name">Custom Emoji</span>
          <span class="reward-value">🌟</span>
        </div>
      </div>
    </section>
  </main>
</div>

<script>
// Quest progress animations and interactions
</script>
    `.trim();
  }

  /**
   * Render Family Dashboard HTML
   */
  private static renderFamilyDashboard(config: ReunionModeConfig): string {
    return `
<div class="family-dashboard" data-theme="${config.theme}">
  <header class="dashboard-header">
    <h1>${config.familyName} Family Dashboard</h1>
    <div class="header-stats">
      <span class="stat-item">
        <span class="stat-value">${config.activeMembers}</span>
        <span class="stat-label">Members</span>
      </span>
      <span class="stat-item">
        <span class="stat-value">$${config.totalTab.toFixed(2)}</span>
        <span class="stat-label">Total Pool</span>
      </span>
    </div>
  </header>

  <main class="dashboard-main">
    <section class="balance-overview">
      <h2>💰 Balance Overview</h2>
      <div class="balance-cards">
        <div class="balance-card positive">
          <span class="balance-icon">📈</span>
          <div class="balance-info">
            <span class="balance-amount">+$245.50</span>
            <span class="balance-label">Your Balance</span>
          </div>
        </div>
        <div class="balance-card neutral">
          <span class="balance-icon">👥</span>
          <div class="balance-info">
            <span class="balance-amount">$${config.perPersonAmount.toFixed(2)}</span>
            <span class="balance-label">Per Person</span>
          </div>
        </div>
      </div>
    </section>

    <section class="member-list">
      <h2>👥 Family Members</h2>
      <div class="members-grid">
        <div class="member-card">
          <div class="member-avatar">👨</div>
          <div class="member-info">
            <h4>Dad</h4>
            <span class="member-role">Admin</span>
            <span class="member-status online">🟢 Online</span>
          </div>
          <div class="member-balance positive">+$125.00</div>
        </div>
        
        <div class="member-card">
          <div class="member-avatar">👩</div>
          <div class="member-info">
            <h4>Mom</h4>
            <span class="member-role">Admin</span>
            <span class="member-status online">🟢 Online</span>
          </div>
          <div class="member-balance positive">+$85.50</div>
        </div>
        
        <div class="member-card">
          <div class="member-avatar">👦</div>
          <div class="member-info">
            <h4>Brother</h4>
            <span class="member-role">Member</span>
            <span class="member-status offline">⚫ Offline</span>
          </div>
          <div class="member-balance negative">-$25.00</div>
        </div>
      </div>
    </section>

    <section class="activity-feed">
      <h2>📊 Recent Activity</h2>
      <div class="activity-list">
        <div class="activity-item">
          <span class="activity-icon">💸</span>
          <div class="activity-details">
            <span class="activity-text">Dad paid $25 for groceries</span>
            <span class="activity-time">2 minutes ago</span>
          </div>
        </div>
        
        <div class="activity-item">
          <span class="activity-icon">🎯</span>
          <div class="activity-details">
            <span class="activity-text">Brother completed "Trust Builder" quest</span>
            <span class="activity-time">1 hour ago</span>
          </div>
        </div>
        
        <div class="activity-item">
          <span class="activity-icon">👥</span>
          <div class="activity-details">
            <span class="activity-text">Sarah joined as guest</span>
            <span class="activity-time">3 hours ago</span>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="dashboard-footer">
    <div class="footer-actions">
      <button class="footer-button" onclick="addMember()">➕ Add Member</button>
      <button class="footer-button" onclick="viewReports()">📈 Reports</button>
      <button class="footer-button" onclick="openSettings()">⚙️ Settings</button>
    </div>
  </footer>
</div>

<script>
function addMember() {
  console.log('Adding new member...');
}

function viewReports() {
  console.log('Viewing reports...');
}

function openSettings() {
  console.log('Opening settings...');
}
</script>
    `.trim();
  }

  /**
   * Get method icon
   */
  private static getMethodIcon(method: string): string {
    const icons = {
      'factory-wager': '💳',
      'cashapp': '💵',
      'venmo': '💚',
      'crypto': '₿'
    };
    return icons[method] || '💳';
  }

  /**
   * Get method name
   */
  private static getMethodName(method: string): string {
    const names = {
      'factory-wager': 'FactoryWager',
      'cashapp': 'Cash App',
      'venmo': 'Venmo',
      'crypto': 'Crypto'
    };
    return names[method] || method;
  }

  /**
   * Get CSS styles for components
   */
  private static getMerchantViewStyles(): string {
    return `
.merchant-reunion-view {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.reunion-header {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.reunion-main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.tab-overview .tab-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.amount-display {
  font-size: 3rem;
  font-weight: bold;
  margin: 1rem 0;
}

.currency {
  font-size: 2rem;
  opacity: 0.8;
}

.action-button {
  background: ${this.ACME_ORANGE};
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.quest-progress-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-visual {
  font-family: monospace;
  font-size: 1.2rem;
  letter-spacing: 2px;
}

.progress-block.filled {
  color: #FFD700;
}

.progress-block {
  color: rgba(255, 255, 255, 0.3);
}
    `.trim();
  }

  private static getGuestViewStyles(): string {
    return `
.guest-welcome-view {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.guest-header {
  text-align: center;
  padding: 2rem 1rem;
}

.welcome-message h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.family-badge {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  padding: 0.5rem 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.quick-tips {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  margin: 1rem;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tip-icon {
  font-size: 1.5rem;
}

.quest-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.mini-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 2px;
}

.steps {
  display: flex;
  justify-content: space-around;
  margin: 2rem 0;
}

.step {
  text-align: center;
  flex: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${this.ACME_ORANGE};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 0 auto 1rem;
}
    `.trim();
  }

  private static getPaymentModalStyles(): string {
    return `
.payment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.payment-modal {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.recipient-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.recipient-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${this.ACME_BLUE};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.amount-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  font-size: 2rem;
}

.currency-symbol {
  font-weight: bold;
  color: #666;
}

.amount-input {
  border: none;
  font-size: 2rem;
  font-weight: bold;
  outline: none;
  flex: 1;
}

.quick-amounts {
  display: flex;
  gap: 0.5rem;
  padding: 0 1.5rem 1rem;
}

.quick-amount {
  background: #3b82f6;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.quick-amount:hover {
  background: ${this.ACME_ORANGE};
  color: white;
}

.method-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.method-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.method-option:hover {
  border-color: ${this.ACME_ORANGE};
}

.qr-container {
  text-align: center;
  padding: 1rem;
}

.qr-code {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  display: inline-block;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
  border-top: 1px solid #eee;
}

.confirm-button {
  background: ${this.ACME_ORANGE};
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-button {
  background: #3b82f6;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}
    `.trim();
  }

  private static getQuestProgressStyles(): string {
    return `
.quest-progress-component {
  background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
  border-radius: 20px;
  padding: 2rem;
  color: white;
}

.quest-header {
  text-align: center;
  margin-bottom: 2rem;
}

.overall-progress {
  margin-top: 1rem;
}

.progress-bar {
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.current-quest {
  margin-bottom: 2rem;
}

.quest-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.quest-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.quest-icon {
  font-size: 2rem;
}

.active-quests {
  margin-bottom: 2rem;
}

.quest-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.reward-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}
    `.trim();
  }

  private static getFamilyDashboardStyles(): string {
    return `
.family-dashboard {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #3b82f6;
  min-height: 100vh;
}

.dashboard-header {
  background: white;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-stats {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: ${this.ACME_BLUE};
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
}

.dashboard-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.balance-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.balance-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.balance-card.positive {
  border-left: 4px solid #3b82f6;
}

.balance-card.negative {
  border-left: 4px solid #3b82f6;
}

.balance-icon {
  font-size: 2rem;
}

.balance-amount {
  font-size: 1.25rem;
  font-weight: bold;
  display: block;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.member-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${this.ACME_BLUE};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.member-info {
  flex: 1;
}

.member-role {
  font-size: 0.875rem;
  color: #666;
}

.member-status {
  font-size: 0.75rem;
}

.member-balance {
  font-weight: bold;
}

.member-balance.positive {
  color: #3b82f6;
}

.member-balance.negative {
  color: #3b82f6;
}

.activity-list {
  margin-top: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.activity-icon {
  font-size: 1.5rem;
}

.activity-details {
  flex: 1;
}

.activity-time {
  font-size: 0.875rem;
  color: #666;
}
    `.trim();
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const componentType = process.argv[3];

  switch (command) {
    case 'generate':
      if (componentType === 'merchant') {
        const config: ReunionModeConfig = {
          familyId: 'FAM123',
          familyName: 'Johnson',
          hostId: 'alice',
          hostName: 'Alice',
          activeMembers: 12,
          totalTab: 347.50,
          perPersonAmount: 28.96,
          questMode: true,
          theme: 'light'
        };

        const component = PolishedUIComponents.generateMerchantView(config);
        console.log('🎨 Generated Merchant View Component');
        console.log(`ID: ${component.id}`);
        console.log(`Interactions: ${component.interactions.join(', ')}`);
        console.log('\n📄 HTML:');
        console.log(component.rendered);
      } else if (componentType === 'guest') {
        const config: ReunionModeConfig = {
          familyId: 'FAM123',
          familyName: 'Johnson',
          hostId: 'alice',
          hostName: 'Alice',
          activeMembers: 12,
          totalTab: 347.50,
          perPersonAmount: 28.96,
          questMode: true,
          theme: 'light'
        };

        const component = PolishedUIComponents.generateGuestView(config, 'Sarah', 'Alice');
        console.log('🎨 Generated Guest View Component');
        console.log(`ID: ${component.id}`);
        console.log(`Interactions: ${component.interactions.join(', ')}`);
        console.log('\n📄 HTML:');
        console.log(component.rendered);
      }
      break;

    case 'list':
      console.log('🎨 Available UI Components:');
      console.log('  merchant_view - Family reunion host dashboard');
      console.log('  guest_view - First-time guest onboarding');
      console.log('  payment_modal - Payment modal with QR code');
      console.log('  quest_progress - Gamification progress tracking');
      console.log('  family_dashboard - Comprehensive family overview');
      break;

    default:
      console.log(`
🎨 Polished UI Components - ACME's Delightful Design System

Usage:
  polished-ui generate <type>  - Generate specific UI component
  polished-ui list              - List available components

Component Types:
  merchant    - Family reunion host dashboard
  guest       - First-time guest onboarding experience
  payment     - Payment modal with QR code integration
  quest       - Gamification progress component
  dashboard   - Comprehensive family overview

Features:
✅ Delightful and intuitive design
✅ Responsive and accessible
✅ ACME's signature orange accent (#FF6B35)
✅ Dark mode and retro theme support
✅ Smooth animations and transitions
✅ Mobile-optimized layouts

"Blending utility with delight since 1972" - ACME 🎩
      `);
  }
}

export default PolishedUIComponents;
export { UIComponent, ReunionModeConfig };
