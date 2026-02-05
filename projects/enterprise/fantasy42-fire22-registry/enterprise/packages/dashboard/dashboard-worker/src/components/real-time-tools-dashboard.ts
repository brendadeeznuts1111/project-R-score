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
        console.log('🔗 WebSocket connected for tools dashboard');
        this.reconnectAttempts = 0;
        
        // Resubscribe to all tools
        this.subscriptions.forEach(tool => {
          this.send({ action: 'subscribe', tool });
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
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
        console.log(`🔄 Reconnecting WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
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

  private applyStyles() {\n    const styles = `\n      <style>\n        .tools-dashboard {\n          max-width: 1400px;\n          margin: 0 auto;\n          padding: 20px;\n          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);\n          min-height: 100vh;\n          color: #e2e8f0;\n        }\n        \n        .tools-header {\n          display: flex;\n          justify-content: space-between;\n          align-items: center;\n          margin-bottom: 30px;\n          padding: 20px;\n          background: rgba(30, 41, 59, 0.8);\n          border-radius: 12px;\n          border: 1px solid #475569;\n        }\n        \n        .tools-title {\n          font-size: 1.8rem;\n          color: #00acc1;\n          margin: 0;\n        }\n        \n        .tools-status {\n          display: flex;\n          align-items: center;\n          gap: 20px;\n          font-size: 0.9rem;\n        }\n        \n        .status-indicator {\n          padding: 4px 12px;\n          border-radius: 20px;\n          background: rgba(0, 0, 0, 0.3);\n        }\n        \n        .tools-grid {\n          display: grid;\n          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));\n          gap: 20px;\n        }\n        \n        .tool-panel {\n          background: rgba(51, 65, 85, 0.8);\n          border: 1px solid #64748b;\n          border-radius: 12px;\n          overflow: hidden;\n          transition: all 0.3s ease;\n        }\n        \n        .tool-panel:hover {\n          transform: translateY(-2px);\n          box-shadow: 0 10px 20px rgba(0, 172, 193, 0.1);\n        }\n        \n        .tool-header {\n          display: flex;\n          justify-content: space-between;\n          align-items: center;\n          padding: 15px 20px;\n          background: rgba(0, 61, 122, 0.6);\n          border-bottom: 1px solid #475569;\n        }\n        \n        .tool-header h3 {\n          margin: 0;\n          color: #40a9ff;\n          font-size: 1.1rem;\n        }\n        \n        .tool-controls {\n          display: flex;\n          align-items: center;\n          gap: 10px;\n        }\n        \n        .refresh-btn, .action-btn, .view-toggle {\n          background: rgba(0, 172, 193, 0.8);\n          border: none;\n          color: white;\n          padding: 6px 12px;\n          border-radius: 6px;\n          cursor: pointer;\n          font-size: 0.85rem;\n          transition: all 0.2s ease;\n        }\n        \n        .refresh-btn:hover, .action-btn:hover, .view-toggle:hover {\n          background: #00acc1;\n          transform: scale(1.05);\n        }\n        \n        .update-indicator {\n          width: 8px;\n          height: 8px;\n          border-radius: 50%;\n          background: #ef4444;\n          animation: pulse 2s infinite;\n        }\n        \n        .update-indicator.active {\n          background: #10b981;\n        }\n        \n        @keyframes pulse {\n          0%, 100% { opacity: 1; }\n          50% { opacity: 0.5; }\n        }\n        \n        .tool-content {\n          padding: 20px;\n        }\n        \n        .kpi-row {\n          display: flex;\n          gap: 15px;\n          margin-bottom: 20px;\n        }\n        \n        .kpi-item {\n          flex: 1;\n          text-align: center;\n          padding: 10px;\n          background: rgba(0, 0, 0, 0.3);\n          border-radius: 8px;\n        }\n        \n        .kpi-label {\n          display: block;\n          font-size: 0.8rem;\n          color: #94a3b8;\n          margin-bottom: 4px;\n        }\n        \n        .kpi-value {\n          display: block;\n          font-size: 1.2rem;\n          font-weight: 600;\n          color: #00acc1;\n        }\n        \n        .live-feed {\n          max-height: 300px;\n          overflow-y: auto;\n          background: rgba(0, 0, 0, 0.2);\n          border-radius: 6px;\n          padding: 10px;\n        }\n        \n        .bet-item {\n          display: flex;\n          justify-content: space-between;\n          padding: 8px 0;\n          border-bottom: 1px solid rgba(148, 163, 184, 0.2);\n          font-size: 0.9rem;\n        }\n        \n        .bet-item:last-child {\n          border-bottom: none;\n        }\n        \n        .bet-slip {\n          background: rgba(0, 0, 0, 0.3);\n          border-radius: 8px;\n          padding: 15px;\n          margin-bottom: 15px;\n        }\n        \n        .form-group {\n          margin-bottom: 12px;\n        }\n        \n        .form-group label {\n          display: block;\n          font-size: 0.9rem;\n          color: #cbd5e1;\n          margin-bottom: 4px;\n        }\n        \n        .form-group input, .form-group select {\n          width: 100%;\n          padding: 8px 12px;\n          background: rgba(0, 0, 0, 0.4);\n          border: 1px solid #475569;\n          border-radius: 4px;\n          color: #e2e8f0;\n          font-size: 0.9rem;\n        }\n        \n        .form-actions {\n          display: flex;\n          gap: 10px;\n          margin-top: 15px;\n        }\n        \n        .place-bet-btn {\n          background: #10b981;\n          color: white;\n          border: none;\n          padding: 10px 20px;\n          border-radius: 6px;\n          cursor: pointer;\n          flex: 1;\n        }\n        \n        .cancel-btn {\n          background: #64748b;\n          color: white;\n          border: none;\n          padding: 10px 20px;\n          border-radius: 6px;\n          cursor: pointer;\n          flex: 1;\n        }\n        \n        .lines-table {\n          background: rgba(0, 0, 0, 0.2);\n          border-radius: 6px;\n          overflow: hidden;\n        }\n        \n        .line-item {\n          display: grid;\n          grid-template-columns: 2fr 1fr 1fr 1fr;\n          gap: 10px;\n          padding: 10px;\n          border-bottom: 1px solid rgba(148, 163, 184, 0.2);\n          font-size: 0.9rem;\n        }\n        \n        .line-item:last-child {\n          border-bottom: none;\n        }\n        \n        .line-header {\n          background: rgba(0, 61, 122, 0.4);\n          font-weight: 600;\n          color: #40a9ff;\n        }\n        \n        .scores-container {\n          display: flex;\n          flex-direction: column;\n          gap: 15px;\n        }\n        \n        .score-item {\n          display: flex;\n          justify-content: space-between;\n          align-items: center;\n          padding: 12px;\n          background: rgba(0, 0, 0, 0.3);\n          border-radius: 8px;\n          border-left: 3px solid #00acc1;\n        }\n        \n        .score-teams {\n          flex: 1;\n        }\n        \n        .score-info {\n          text-align: right;\n          font-size: 0.9rem;\n          color: #94a3b8;\n        }\n        \n        .notification-container {\n          position: fixed;\n          top: 20px;\n          right: 20px;\n          z-index: 1000;\n          max-width: 350px;\n        }\n        \n        .notification {\n          background: rgba(30, 41, 59, 0.95);\n          border: 1px solid #00acc1;\n          border-radius: 8px;\n          padding: 12px 16px;\n          margin-bottom: 10px;\n          animation: slideIn 0.3s ease-out;\n          cursor: pointer;\n        }\n        \n        .notification.success {\n          border-color: #10b981;\n        }\n        \n        .notification.warning {\n          border-color: #f59e0b;\n        }\n        \n        .notification.error {\n          border-color: #ef4444;\n        }\n        \n        @keyframes slideIn {\n          from {\n            transform: translateX(100%);\n            opacity: 0;\n          }\n          to {\n            transform: translateX(0);\n            opacity: 1;\n          }\n        }\n        \n        .feed-placeholder, .lines-placeholder, .table-placeholder, .scores-placeholder {\n          text-align: center;\n          padding: 40px 20px;\n          color: #64748b;\n          font-style: italic;\n        }\n        \n        @media (max-width: 768px) {\n          .tools-grid {\n            grid-template-columns: 1fr;\n          }\n          \n          .tools-header {\n            flex-direction: column;\n            gap: 15px;\n          }\n          \n          .kpi-row {\n            flex-direction: column;\n            gap: 8px;\n          }\n        }\n      </style>\n    `;\n    \n    document.head.insertAdjacentHTML('beforeend', styles);\n  }\n  \n  private setupWebSocketSubscriptions() {\n    // Subscribe to all tools\n    this.ws.subscribe('ticker', this.handleTickerUpdate.bind(this));\n    this.ws.subscribe('lines', this.handleLinesUpdate.bind(this));\n    this.ws.subscribe('scores', this.handleScoresUpdate.bind(this));\n    this.ws.subscribe('ticketwriter', this.handleTicketUpdate.bind(this));\n    \n    // Update connection status\n    this.updateConnectionStatus(true);\n  }\n  \n  private handleTickerUpdate(data: any) {\n    this.updateIndicator('ticker-indicator');\n    \n    if (data.type === 'bet_placed') {\n      this.addLiveBet(data.data);\n      this.showNotification(`New bet: $${data.data.amount} on ${data.data.event}`, 'success');\n    }\n    \n    if (data.type === 'metrics_update') {\n      this.updateKPIs(data.data);\n    }\n  }\n  \n  private handleLinesUpdate(data: any) {\n    this.updateIndicator('lines-indicator');\n    \n    if (data.type === 'line_movement') {\n      this.updateLine(data.data);\n      this.showNotification(`Line moved: ${data.data.event} ${data.data.movement}`, 'warning');\n    }\n  }\n  \n  private handleScoresUpdate(data: any) {\n    this.updateIndicator('scores-indicator');\n    \n    if (data.type === 'score_update') {\n      this.updateScore(data.data);\n      \n      if (data.data.status === 'final') {\n        this.showNotification(`Game final: ${data.data.game}`, 'success');\n      }\n    }\n  }\n  \n  private handleTicketUpdate(data: any) {\n    this.updateIndicator('ticket-indicator');\n    \n    if (data.type === 'bet_confirmation') {\n      this.showNotification(`Bet confirmed: ${data.data.ticketNumber}`, 'success');\n    }\n  }\n  \n  private startPollingFallbacks() {\n    // Fallback polling for when WebSocket is unavailable\n    this.updateIntervals.set('ticker', window.setInterval(() => {\n      this.fetchBetTicker();\n    }, 2000));\n    \n    this.updateIntervals.set('lines', window.setInterval(() => {\n      this.fetchSportsbookLines();\n    }, 5000));\n    \n    this.updateIntervals.set('scores', window.setInterval(() => {\n      this.fetchLiveScores();\n    }, 1000));\n  }\n  \n  private async fetchBetTicker() {\n    try {\n      const response = await fetch('/api/betting/ticker');\n      const data = await response.json();\n      \n      if (data.success) {\n        this.updateKPIs(data.data.metrics);\n        this.updateLiveBetsFeed(data.data.liveBets);\n      }\n    } catch (error) {\n      console.error('Failed to fetch bet ticker:', error);\n    }\n  }\n  \n  private async fetchSportsbookLines() {\n    try {\n      const sportFilter = (document.getElementById('sport-filter') as HTMLSelectElement)?.value || 'all';\n      const response = await fetch(`/api/lines/sportsbook?sport=${sportFilter}`);\n      const data = await response.json();\n      \n      if (data.success) {\n        this.updateLinesTable(data.data.events);\n      }\n    } catch (error) {\n      console.error('Failed to fetch sportsbook lines:', error);\n    }\n  }\n  \n  private async fetchLiveScores() {\n    try {\n      const response = await fetch('/api/scores');\n      const data = await response.json();\n      \n      if (data.success) {\n        this.updateScoresContainer(data.data);\n      }\n    } catch (error) {\n      console.error('Failed to fetch live scores:', error);\n    }\n  }\n  \n  private updateKPIs(metrics: any) {\n    const activeBetsEl = document.getElementById('active-bets');\n    const volumeTodayEl = document.getElementById('volume-today');\n    const avgBetEl = document.getElementById('avg-bet');\n    \n    if (activeBetsEl) activeBetsEl.textContent = metrics.activeWagers || '-';\n    if (volumeTodayEl) volumeTodayEl.textContent = `$${(metrics.totalVolumeToday || 0).toLocaleString()}`;\n    if (avgBetEl) avgBetEl.textContent = `$${(metrics.avgBetSize || 0).toFixed(2)}`;\n  }\n  \n  private updateLiveBetsFeed(bets: any[]) {\n    const feedEl = document.getElementById('live-bets-feed');\n    if (!feedEl) return;\n    \n    feedEl.innerHTML = bets.map(bet => `\n      <div class=\"bet-item\">\n        <div>\n          <strong>${bet.eventName}</strong><br>\n          <small>${bet.betType} - $${bet.amount}</small>\n        </div>\n        <div style=\"text-align: right;\">\n          <div style=\"color: #00acc1;\">${bet.odds > 0 ? '+' : ''}${bet.odds}</div>\n          <div style=\"font-size: 0.8rem; color: #94a3b8;\">${bet.status}</div>\n        </div>\n      </div>\n    `).join('') || '<div class=\"feed-placeholder\">No live bets</div>';\n  }\n  \n  private updateLinesTable(events: any[]) {\n    const tableEl = document.getElementById('lines-table');\n    if (!tableEl) return;\n    \n    const tableHTML = `\n      <div class=\"line-item line-header\">\n        <div>Event</div>\n        <div>Moneyline</div>\n        <div>Spread</div>\n        <div>Total</div>\n      </div>\n      ${events.map(event => `\n        <div class=\"line-item\">\n          <div>\n            <strong>${event.homeTeam} vs ${event.awayTeam}</strong><br>\n            <small style=\"color: #94a3b8;\">${event.league}</small>\n          </div>\n          <div>\n            ${event.markets.moneyline ? \n              `${event.markets.moneyline.home.current} / ${event.markets.moneyline.away.current}` : \n              'N/A'\n            }\n          </div>\n          <div>\n            ${event.markets.spread ? \n              `${event.markets.spread.home.current}` : \n              'N/A'\n            }\n          </div>\n          <div>\n            ${event.markets.total ? \n              `O/U ${event.markets.total.current}` : \n              'N/A'\n            }\n          </div>\n        </div>\n      `).join('')}\n    `;\n    \n    tableEl.innerHTML = tableHTML || '<div class=\"table-placeholder\">No lines available</div>';\n  }\n  \n  private updateScoresContainer(scoresData: any) {\n    const containerEl = document.getElementById('scores-container');\n    if (!containerEl) return;\n    \n    const allGames = [\n      ...(scoresData.liveGames || []),\n      ...(scoresData.completedGames || []).slice(0, 3), // Show last 3 completed\n      ...(scoresData.upcoming || []).slice(0, 2) // Show next 2 upcoming\n    ];\n    \n    containerEl.innerHTML = allGames.map(game => `\n      <div class=\"score-item\">\n        <div class=\"score-teams\">\n          <strong>${game.homeTeam} vs ${game.awayTeam}</strong><br>\n          <small style=\"color: #94a3b8;\">${game.league || ''}</small>\n        </div>\n        <div class=\"score-info\">\n          ${game.status === 'in_progress' ? \n            `<div style=\"color: #10b981;\">${game.homeScore}-${game.awayScore}</div>\n             <div>${game.quarter ? `Q${game.quarter}` : ''} ${game.timeRemaining || ''}</div>` :\n           game.status === 'final' ?\n            `<div style=\"color: #64748b;\">Final: ${game.finalScore.home}-${game.finalScore.away}</div>` :\n            `<div style=\"color: #94a3b8;\">${game.status}</div>`\n          }\n        </div>\n      </div>\n    `).join('') || '<div class=\"scores-placeholder\">No scores available</div>';\n  }\n  \n  private addLiveBet(betData: any) {\n    // Add new bet to the feed\n    const feedEl = document.getElementById('live-bets-feed');\n    if (!feedEl) return;\n    \n    const betElement = document.createElement('div');\n    betElement.className = 'bet-item new-bet';\n    betElement.innerHTML = `\n      <div>\n        <strong>${betData.event}</strong><br>\n        <small>${betData.betType || 'bet'} - $${betData.amount}</small>\n      </div>\n      <div style=\"text-align: right;\">\n        <div style=\"color: #10b981;\">+${betData.commission}</div>\n        <div style=\"font-size: 0.8rem; color: #94a3b8;\">Commission</div>\n      </div>\n    `;\n    \n    feedEl.insertBefore(betElement, feedEl.firstChild);\n    \n    // Highlight new bet\n    betElement.style.background = 'rgba(16, 185, 129, 0.2)';\n    setTimeout(() => {\n      betElement.style.background = '';\n    }, 3000);\n    \n    // Remove old bets (keep last 10)\n    const betItems = feedEl.querySelectorAll('.bet-item');\n    if (betItems.length > 10) {\n      for (let i = 10; i < betItems.length; i++) {\n        betItems[i].remove();\n      }\n    }\n  }\n  \n  private updateLine(lineData: any) {\n    // Update line in the sportsbook lines table\n    // This would update the specific line that moved\n    console.log('Line updated:', lineData);\n  }\n  \n  private updateScore(scoreData: any) {\n    // Update specific score in the scores container\n    console.log('Score updated:', scoreData);\n  }\n  \n  private updateIndicator(indicatorId: string) {\n    const indicator = document.getElementById(indicatorId);\n    if (indicator) {\n      indicator.classList.add('active');\n      setTimeout(() => {\n        indicator.classList.remove('active');\n      }, 1000);\n    }\n  }\n  \n  private updateConnectionStatus(connected: boolean) {\n    const statusEl = document.getElementById('ws-status');\n    if (statusEl) {\n      statusEl.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';\n    }\n    \n    const lastUpdateEl = document.getElementById('last-update');\n    if (lastUpdateEl) {\n      lastUpdateEl.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;\n    }\n  }\n  \n  private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success') {\n    const notificationsEl = document.getElementById('notifications');\n    if (!notificationsEl) return;\n    \n    const notification = document.createElement('div');\n    notification.className = `notification ${type}`;\n    notification.textContent = message;\n    \n    notificationsEl.appendChild(notification);\n    \n    // Auto-remove after 5 seconds\n    setTimeout(() => {\n      notification.remove();\n    }, 5000);\n    \n    // Click to dismiss\n    notification.onclick = () => notification.remove();\n  }\n  \n  public destroy() {\n    this.ws.disconnect();\n    \n    // Clear intervals\n    this.updateIntervals.forEach((interval, key) => {\n      clearInterval(interval);\n    });\n    this.updateIntervals.clear();\n    \n    // Clear container\n    this.container.innerHTML = '';\n  }\n}\n\n// Global functions for button handlers\n(window as any).refreshBetTicker = async function() {\n  const dashboard = (window as any).toolsDashboard;\n  if (dashboard) {\n    await dashboard.fetchBetTicker();\n  }\n};\n\n(window as any).showBetSlip = function() {\n  const betSlip = document.getElementById('bet-slip');\n  if (betSlip) {\n    betSlip.style.display = betSlip.style.display === 'none' ? 'block' : 'none';\n  }\n};\n\n(window as any).hideBetSlip = function() {\n  const betSlip = document.getElementById('bet-slip');\n  if (betSlip) {\n    betSlip.style.display = 'none';\n  }\n};\n\n(window as any).toggleScoreView = function() {\n  // Toggle between scores and stats view\n  console.log('Toggle score view');\n};\n\n// Initialize dashboard when DOM is loaded\ndocument.addEventListener('DOMContentLoaded', () => {\n  const dashboardContainer = document.getElementById('tools-dashboard-container');\n  if (dashboardContainer) {\n    (window as any).toolsDashboard = new RealTimeToolsDashboard('tools-dashboard-container');\n  }\n});", "Finalizing all requested documentation and tooling integration..."