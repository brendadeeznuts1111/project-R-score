/**
 * Fire22 Real-Time Tools Dashboard Interface
 *
 * Comprehensive dashboard interface for Bet Ticker, Ticketwriter, Sportsbook Lines, and Live Scores
 * With real-time WebSocket updates and interactive components
 */

/**
 * WebSocket Manager for Real-Time Updates
 */
export class ToolingWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private callbacks = new Map<string, Function[]>();

  constructor(private dashboardId: string) {
    this.connect();
  }

  private connect() {
    try {
      const wsUrl = `wss://fire22.workers.dev/tools/${this.dashboardId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.info('🔗 WebSocket connected for tools dashboard');
        this.reconnectAttempts = 0;

        // Resubscribe to all tools
        this.subscriptions.forEach(tool => {
          this.send({ action: 'subscribe', tool });
        });
      };

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          this.handleUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.info('🔌 WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

      setTimeout(() => {
        console.info(
          `🔄 Reconnecting WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connect();
      }, delay);
    }
  }

  subscribe(tool: 'ticker' | 'lines' | 'scores' | 'ticketwriter', callback: Function) {
    this.subscriptions.add(tool);

    if (!this.callbacks.has(tool)) {
      this.callbacks.set(tool, []);
    }
    this.callbacks.get(tool)!.push(callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ action: 'subscribe', tool });
    }
  }

  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleUpdate(data: any) {
    const callbacks = this.callbacks.get(data.tool) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Callback error for ${data.tool}:`, error);
      }
    });
  }

  disconnect() {
    this.ws?.close();
    this.subscriptions.clear();
    this.callbacks.clear();
  }
}

/**
 * Real-Time Tools Dashboard Component
 */
export class RealTimeToolsDashboard {
  private container: HTMLElement;
  private ws: ToolingWebSocket;
  private updateIntervals: Map<string, number> = new Map();

  constructor(containerId: string, dashboardId: string = 'dashboard-001') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }

    this.container = container;
    this.ws = new ToolingWebSocket(dashboardId);

    this.initialize();
  }

  private initialize() {
    this.createToolsLayout();
    this.setupWebSocketSubscriptions();
    this.startPollingFallbacks();
  }

  private createToolsLayout() {
    this.container.innerHTML = `
      <div class="tools-dashboard">
        <!-- Dashboard Header -->
        <div class="tools-header">
          <h2 class="tools-title">🛠️ Fire22 Real-Time Tools</h2>
          <div class="tools-status">
            <div class="status-indicator" id="ws-status">🔴 Disconnected</div>
            <div class="last-update" id="last-update">Last Update: Never</div>
          </div>
        </div>

        <!-- Tools Grid -->
        <div class="tools-grid">
          <!-- Bet Ticker Tool -->
          <div class="tool-panel" id="bet-ticker-panel">
            <div class="tool-header">
              <h3>📊 Bet Ticker</h3>
              <div class="tool-controls">
                <button class="refresh-btn" onclick="refreshBetTicker()">🔄</button>
                <div class="update-indicator" id="ticker-indicator">●</div>
              </div>
            </div>
            <div class="tool-content">
              <div class="kpi-row">
                <div class="kpi-item">
                  <span class="kpi-label">Active Bets</span>
                  <span class="kpi-value" id="active-bets">-</span>
                </div>
                <div class="kpi-item">
                  <span class="kpi-label">Volume Today</span>
                  <span class="kpi-value" id="volume-today">-</span>
                </div>
                <div class="kpi-item">
                  <span class="kpi-label">Avg Bet</span>
                  <span class="kpi-value" id="avg-bet">-</span>
                </div>
              </div>
              <div class="live-feed" id="live-bets-feed">
                <div class="feed-placeholder">Loading live bets...</div>
              </div>
            </div>
          </div>

          <!-- Ticketwriter Tool -->
          <div class="tool-panel" id="ticketwriter-panel">
            <div class="tool-header">
              <h3>🎯 Ticketwriter</h3>
              <div class="tool-controls">
                <button class="action-btn" onclick="showBetSlip()">+ Place Bet</button>
                <div class="update-indicator" id="ticket-indicator">●</div>
              </div>
            </div>
            <div class="tool-content">
              <div class="bet-slip" id="bet-slip" style="display: none;">
                <h4>Quick Bet Placement</h4>
                <form id="quick-bet-form">
                  <div class="form-group">
                    <label>Customer ID:</label>
                    <input type="text" id="customer-id" placeholder="CUST001" required>
                  </div>
                  <div class="form-group">
                    <label>Event:</label>
                    <select id="event-select">
                      <option value="EVT001">Cowboys vs Giants</option>
                      <option value="EVT002">Lakers vs Warriors</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Bet Type:</label>
                    <select id="bet-type">
                      <option value="moneyline">Moneyline</option>
                      <option value="spread">Spread</option>
                      <option value="total">Total</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Amount ($):</label>
                    <input type="number" id="bet-amount" min="10" max="10000" step="0.01" required>
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="place-bet-btn">Place Bet</button>
                    <button type="button" onclick="hideBetSlip()" class="cancel-btn">Cancel</button>
                  </div>
                </form>
              </div>
              <div class="available-lines" id="available-lines">
                <div class="lines-placeholder">Loading available lines...</div>
              </div>
            </div>
          </div>

          <!-- Sportsbook Lines Tool -->
          <div class="tool-panel" id="sportsbook-lines-panel">
            <div class="tool-header">
              <h3>📈 Sportsbook Lines</h3>
              <div class="tool-controls">
                <select id="sport-filter">
                  <option value="all">All Sports</option>
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                </select>
                <div class="update-indicator" id="lines-indicator">●</div>
              </div>
            </div>
            <div class="tool-content">
              <div class="lines-table" id="lines-table">
                <div class="table-placeholder">Loading sportsbook lines...</div>
              </div>
            </div>
          </div>

          <!-- Live Scores Tool -->
          <div class="tool-panel" id="live-scores-panel">
            <div class="tool-header">
              <h3>⚽ Live Scores</h3>
              <div class="tool-controls">
                <button class="view-toggle" onclick="toggleScoreView()">📊 Stats</button>
                <div class="update-indicator" id="scores-indicator">●</div>
              </div>
            </div>
            <div class="tool-content">
              <div class="scores-container" id="scores-container">
                <div class="scores-placeholder">Loading live scores...</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification System -->
      <div class="notification-container" id="notifications">
        <!-- Real-time notifications will appear here -->
      </div>
    `;

    this.applyStyles();
  }

  private applyStyles() {
    const styles = `
      <style>
        .tools-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          min-height: 100vh;
          color: #e2e8f0;
        }

        .tools-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 12px;
          border: 1px solid #475569;
        }

        .tools-title {
          font-size: 1.8rem;
          color: #00acc1;
          margin: 0;
        }

        .tools-status {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 0.9rem;
        }

        .status-indicator {
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.3);
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .tool-panel {
          background: rgba(51, 65, 85, 0.8);
          border: 1px solid #64748b;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .tool-panel:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 172, 193, 0.1);
        }

        .tool-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: rgba(0, 61, 122, 0.6);
          border-bottom: 1px solid #475569;
        }

        .tool-header h3 {
          margin: 0;
          color: #40a9ff;
          font-size: 1.1rem;
        }

        .tool-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .refresh-btn, .action-btn, .view-toggle {
          background: rgba(0, 172, 193, 0.8);
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover, .action-btn:hover, .view-toggle:hover {
          background: #00acc1;
          transform: scale(1.05);
        }

        .update-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 2s infinite;
        }

        .update-indicator.active {
          background: #10b981;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .tool-content {
          padding: 20px;
        }

        .kpi-row {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }

        .kpi-item {
          flex: 1;
          text-align: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .kpi-label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .kpi-value {
          display: block;
          font-size: 1.2rem;
          font-weight: 600;
          color: #00acc1;
        }

        .live-feed {
          max-height: 300px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 10px;
        }

        .bet-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          font-size: 0.9rem;
        }

        .bet-item:last-child {
          border-bottom: none;
        }

        .bet-slip {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-group label {
          display: block;
          font-size: 0.9rem;
          color: #cbd5e1;
          margin-bottom: 4px;
        }

        .form-group input, .form-group select {
          width: 100%;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid #475569;
          border-radius: 4px;
          color: #e2e8f0;
          font-size: 0.9rem;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .place-bet-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          flex: 1;
        }

        .cancel-btn {
          background: #64748b;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          flex: 1;
        }

        .lines-table {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          overflow: hidden;
        }

        .line-item {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 10px;
          padding: 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          font-size: 0.9rem;
        }

        .line-item:last-child {
          border-bottom: none;
        }

        .line-header {
          background: rgba(0, 61, 122, 0.4);
          font-weight: 600;
          color: #40a9ff;
        }

        .scores-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .score-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border-left: 3px solid #00acc1;
        }

        .score-teams {
          flex: 1;
        }

        .score-info {
          text-align: right;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          max-width: 350px;
        }

        .notification {
          background: rgba(30, 41, 59, 0.95);
          border: 1px solid #00acc1;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 10px;
          animation: slideIn 0.3s ease-out;
          cursor: pointer;
        }

        .notification.success {
          border-color: #10b981;
        }

        .notification.warning {
          border-color: #f59e0b;
        }

        .notification.error {
          border-color: #ef4444;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .feed-placeholder, .lines-placeholder, .table-placeholder, .scores-placeholder {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .tools-grid {
            grid-template-columns: 1fr;
          }

          .tools-header {
            flex-direction: column;
            gap: 15px;
          }

          .kpi-row {
            flex-direction: column;
            gap: 8px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  private setupWebSocketSubscriptions() {
    // Subscribe to all tools
    this.ws.subscribe('ticker', this.handleTickerUpdate.bind(this));
    this.ws.subscribe('lines', this.handleLinesUpdate.bind(this));
    this.ws.subscribe('scores', this.handleScoresUpdate.bind(this));
    this.ws.subscribe('ticketwriter', this.handleTicketUpdate.bind(this));

    // Update connection status
    this.updateConnectionStatus(true);
  }

  private handleTickerUpdate(data: any) {
    this.updateIndicator('ticker-indicator');

    if (data.type === 'bet_placed') {
      this.addLiveBet(data.data);
      this.showNotification(`New bet: $${data.data.amount} on ${data.data.event}`, 'success');
    }

    if (data.type === 'metrics_update') {
      this.updateKPIs(data.data);
    }
  }

  private handleLinesUpdate(data: any) {
    this.updateIndicator('lines-indicator');

    if (data.type === 'line_movement') {
      this.updateLine(data.data);
      this.showNotification(`Line moved: ${data.data.event} ${data.data.movement}`, 'warning');
    }
  }

  private handleScoresUpdate(data: any) {
    this.updateIndicator('scores-indicator');

    if (data.type === 'score_update') {
      this.updateScore(data.data);

      if (data.data.status === 'final') {
        this.showNotification(`Game final: ${data.data.game}`, 'success');
      }
    }
  }

  private handleTicketUpdate(data: any) {
    this.updateIndicator('ticket-indicator');

    if (data.type === 'bet_confirmation') {
      this.showNotification(`Bet confirmed: ${data.data.ticketNumber}`, 'success');
    }
  }

  private startPollingFallbacks() {
    // Fallback polling for when WebSocket is unavailable
    this.updateIntervals.set(
      'ticker',
      window.setInterval(() => {
        this.fetchBetTicker();
      }, 2000)
    );

    this.updateIntervals.set(
      'lines',
      window.setInterval(() => {
        this.fetchSportsbookLines();
      }, 5000)
    );

    this.updateIntervals.set(
      'scores',
      window.setInterval(() => {
        this.fetchLiveScores();
      }, 1000)
    );
  }

  private async fetchBetTicker() {
    try {
      const response = await fetch('/api/betting/ticker');
      const data = await response.json();

      if (data.success) {
        this.updateKPIs(data.data.metrics);
        this.updateLiveBetsFeed(data.data.liveBets);
      }
    } catch (error) {
      console.error('Failed to fetch bet ticker:', error);
    }
  }

  private async fetchSportsbookLines() {
    try {
      const sportFilter =
        (document.getElementById('sport-filter') as HTMLSelectElement)?.value || 'all';
      const response = await fetch(`/api/lines/sportsbook?sport=${sportFilter}`);
      const data = await response.json();

      if (data.success) {
        this.updateLinesTable(data.data.events);
      }
    } catch (error) {
      console.error('Failed to fetch sportsbook lines:', error);
    }
  }

  private async fetchLiveScores() {
    try {
      const response = await fetch('/api/scores');
      const data = await response.json();

      if (data.success) {
        this.updateScoresContainer(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch live scores:', error);
    }
  }

  private updateKPIs(metrics: any) {
    const activeBetsEl = document.getElementById('active-bets');
    const volumeTodayEl = document.getElementById('volume-today');
    const avgBetEl = document.getElementById('avg-bet');

    if (activeBetsEl) activeBetsEl.textContent = metrics.activeWagers || '-';
    if (volumeTodayEl)
      volumeTodayEl.textContent = `$${(metrics.totalVolumeToday || 0).toLocaleString()}`;
    if (avgBetEl) avgBetEl.textContent = `$${(metrics.avgBetSize || 0).toFixed(2)}`;
  }

  private updateLiveBetsFeed(bets: any[]) {
    const feedEl = document.getElementById('live-bets-feed');
    if (!feedEl) return;

    feedEl.innerHTML =
      bets
        .map(
          bet => `
      <div class=\"bet-item\">
        <div>
          <strong>${bet.eventName}</strong><br>
          <small>${bet.betType} - $${bet.amount}</small>
        </div>
        <div style=\"text-align: right;\">
          <div style=\"color: #00acc1;\">${bet.odds > 0 ? '+' : ''}${bet.odds}</div>
          <div style=\"font-size: 0.8rem; color: #94a3b8;\">${bet.status}</div>
        </div>
      </div>
    `
        )
        .join('') || '<div class=\"feed-placeholder\">No live bets</div>';
  }

  private updateLinesTable(events: any[]) {
    const tableEl = document.getElementById('lines-table');
    if (!tableEl) return;

    const tableHTML = `
      <div class=\"line-item line-header\">
        <div>Event</div>
        <div>Moneyline</div>
        <div>Spread</div>
        <div>Total</div>
      </div>
      ${events
        .map(
          event => `
        <div class=\"line-item\">
          <div>
            <strong>${event.homeTeam} vs ${event.awayTeam}</strong><br>
            <small style=\"color: #94a3b8;\">${event.league}</small>
          </div>
          <div>
            ${
              event.markets.moneyline
                ? `${event.markets.moneyline.home.current} / ${event.markets.moneyline.away.current}`
                : 'N/A'
            }
          </div>
          <div>
            ${event.markets.spread ? `${event.markets.spread.home.current}` : 'N/A'}
          </div>
          <div>
            ${event.markets.total ? `O/U ${event.markets.total.current}` : 'N/A'}
          </div>
        </div>
      `
        )
        .join('')}
    `;

    tableEl.innerHTML = tableHTML || '<div class=\"table-placeholder\">No lines available</div>';
  }

  private updateScoresContainer(scoresData: any) {
    const containerEl = document.getElementById('scores-container');
    if (!containerEl) return;

    const allGames = [
      ...(scoresData.liveGames || []),
      ...(scoresData.completedGames || []).slice(0, 3), // Show last 3 completed
      ...(scoresData.upcoming || []).slice(0, 2), // Show next 2 upcoming
    ];

    containerEl.innerHTML =
      allGames
        .map(
          game => `
      <div class=\"score-item\">
        <div class=\"score-teams\">
          <strong>${game.homeTeam} vs ${game.awayTeam}</strong><br>
          <small style=\"color: #94a3b8;\">${game.league || ''}</small>
        </div>
        <div class=\"score-info\">
          ${
            game.status === 'in_progress'
              ? `<div style=\"color: #10b981;\">${game.homeScore}-${game.awayScore}</div>
             <div>${game.quarter ? `Q${game.quarter}` : ''} ${game.timeRemaining || ''}</div>`
              : game.status === 'final'
                ? `<div style=\"color: #64748b;\">Final: ${game.finalScore.home}-${game.finalScore.away}</div>`
                : `<div style=\"color: #94a3b8;\">${game.status}</div>`
          }
        </div>
      </div>
    `
        )
        .join('') || '<div class=\"scores-placeholder\">No scores available</div>';
  }

  private addLiveBet(betData: any) {
    // Add new bet to the feed
    const feedEl = document.getElementById('live-bets-feed');
    if (!feedEl) return;

    const betElement = document.createElement('div');
    betElement.className = 'bet-item new-bet';
    betElement.innerHTML = `
      <div>
        <strong>${betData.event}</strong><br>
        <small>${betData.betType || 'bet'} - $${betData.amount}</small>
      </div>
      <div style=\"text-align: right;\">
        <div style=\"color: #10b981;\">+${betData.commission}</div>
        <div style=\"font-size: 0.8rem; color: #94a3b8;\">Commission</div>
      </div>
    `;

    feedEl.insertBefore(betElement, feedEl.firstChild);

    // Highlight new bet
    betElement.style.background = 'rgba(16, 185, 129, 0.2)';
    setTimeout(() => {
      betElement.style.background = '';
    }, 3000);

    // Remove old bets (keep last 10)
    const betItems = feedEl.querySelectorAll('.bet-item');
    if (betItems.length > 10) {
      for (let i = 10; i < betItems.length; i++) {
        betItems[i].remove();
      }
    }
  }

  private updateLine(lineData: any) {
    // Update line in the sportsbook lines table
    // This would update the specific line that moved
    console.info('Line updated:', lineData);
  }

  private updateScore(scoreData: any) {
    // Update specific score in the scores container
    console.info('Score updated:', scoreData);
  }

  private updateIndicator(indicatorId: string) { // brand-ok — DOM element id, not domain identity
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.classList.add('active');
      setTimeout(() => {
        indicator.classList.remove('active');
      }, 1000);
    }
  }

  private updateConnectionStatus(connected: boolean) {
    const statusEl = document.getElementById('ws-status');
    if (statusEl) {
      statusEl.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
    }

    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
      lastUpdateEl.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
    }
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    const notificationsEl = document.getElementById('notifications');
    if (!notificationsEl) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationsEl.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);

    // Click to dismiss
    notification.onclick = () => notification.remove();
  }

  public destroy() {
    this.ws.disconnect();

    // Clear intervals
    this.updateIntervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    this.updateIntervals.clear();

    // Clear container
    this.container.innerHTML = '';
  }
}

// Global functions for button handlers
(window as any).refreshBetTicker = async function () {
  const dashboard = (window as any).toolsDashboard;
  if (dashboard) {
    await dashboard.fetchBetTicker();
  }
};

(window as any).showBetSlip = function () {
  const betSlip = document.getElementById('bet-slip');
  if (betSlip) {
    betSlip.style.display = betSlip.style.display === 'none' ? 'block' : 'none';
  }
};

(window as any).hideBetSlip = function () {
  const betSlip = document.getElementById('bet-slip');
  if (betSlip) {
    betSlip.style.display = 'none';
  }
};

(window as any).toggleScoreView = function () {
  // Toggle between scores and stats view
  console.info('Toggle score view');
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const dashboardContainer = document.getElementById('tools-dashboard-container');
  if (dashboardContainer) {
    (window as any).toolsDashboard = new RealTimeToolsDashboard('tools-dashboard-container');
  }
});
