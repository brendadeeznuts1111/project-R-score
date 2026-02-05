/**
 * Fantasy42 Scoreboard Integration
 * Live game tracking, real-time scores, and interactive scoreboard management
 * Targets: Scoreboard modal, close button, and live game data elements
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface ScoreboardConfig {
  scoreboardXPath: string;
  closeButtonXPath: string;
  gameDataXPath: string;
  liveUpdatesEnabled: boolean;
  refreshInterval: number;
  sportsFilter: string[];
  leagueFilter: string[];
  gameStatusFilter: ('scheduled' | 'live' | 'completed')[];
  notificationSettings: {
    scoreUpdates: boolean;
    gameStart: boolean;
    gameEnd: boolean;
    significantPlays: boolean;
  };
}

export interface LiveGame {
  gameId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameStatus: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
  period: string;
  timeRemaining: string;
  startTime: string;
  venue: string;
  odds?: {
    spread: number;
    total: number;
    moneyline: { home: number; away: number };
  };
  significantPlays: Array<{
    timestamp: string;
    description: string;
    points: number;
    team: string;
    player?: string;
  }>;
  lastUpdated: string;
}

export interface ScoreboardEnhancement {
  realTimeUpdates: boolean;
  liveNotifications: boolean;
  gameFilters: boolean;
  oddsIntegration: boolean;
  bettingIntegration: boolean;
  performanceTracking: boolean;
  exportCapabilities: boolean;
  multiScreenSupport: boolean;
}

export class Fantasy42Scoreboard {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private config: ScoreboardConfig;
  private liveGames: Map<string, LiveGame> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  private enhancement: ScoreboardEnhancement = {
    realTimeUpdates: true,
    liveNotifications: true,
    gameFilters: true,
    oddsIntegration: true,
    bettingIntegration: true,
    performanceTracking: true,
    exportCapabilities: true,
    multiScreenSupport: true,
  };

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config: ScoreboardConfig
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;
    this.config = config;
  }

  /**
   * Initialize Fantasy42 scoreboard integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('📊 Initializing Fantasy42 Scoreboard Integration...');

      // Locate scoreboard elements
      const elementsFound = await this.locateScoreboardElements();
      if (!elementsFound) {
        console.warn('⚠️ Scoreboard elements not found');
        return false;
      }

      // Setup event listeners
      await this.setupScoreboardListeners();

      // Initialize live game tracking
      await this.initializeLiveTracking();

      // Setup real-time updates
      if (this.config.liveUpdatesEnabled) {
        await this.startLiveUpdates();
      }

      // Apply enhancements
      await this.applyScoreboardEnhancements();

      // Load initial game data
      await this.loadInitialGames();

      this.isActive = true;
      console.log('✅ Fantasy42 Scoreboard Integration initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize scoreboard:', error);
      return false;
    }
  }

  /**
   * Locate scoreboard elements
   */
  private async locateScoreboardElements(): Promise<boolean> {
    const elements = [
      { name: 'scoreboard', xpath: this.config.scoreboardXPath },
      { name: 'closeButton', xpath: this.config.closeButtonXPath },
      { name: 'gameData', xpath: this.config.gameDataXPath },
    ];

    let allFound = true;

    for (const element of elements) {
      const found = this.xpathHandler.findElementByXPath(element.xpath);
      if (found) {
        console.log(`✅ Found ${element.name} element:`, found.tagName);
      } else {
        console.warn(`⚠️ ${element.name} element not found at: ${element.xpath}`);
        allFound = false;
      }
    }

    return allFound;
  }

  /**
   * Setup scoreboard event listeners
   */
  private async setupScoreboardListeners(): Promise<void> {
    // Close button listener
    const closeButton = this.xpathHandler.findElementByXPath(this.config.closeButtonXPath);
    if (closeButton) {
      closeButton.addEventListener('click', () => this.handleScoreboardClose());
    }

    // Scoreboard container listeners
    const scoreboard = this.xpathHandler.findElementByXPath(this.config.scoreboardXPath);
    if (scoreboard) {
      // Listen for game selection
      scoreboard.addEventListener('click', e => this.handleGameSelection(e));

      // Listen for filter changes
      scoreboard.addEventListener('change', e => this.handleFilterChange(e));
    }

    console.log('✅ Scoreboard event listeners setup');
  }

  /**
   * Initialize live game tracking
   */
  private async initializeLiveTracking(): Promise<void> {
    // Load initial game data
    await this.refreshGameData();

    // Setup game status monitoring
    this.setupGameStatusMonitoring();

    console.log('✅ Live game tracking initialized');
  }

  /**
   * Start live updates
   */
  private async startLiveUpdates(): Promise<void> {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Start new update cycle
    this.updateInterval = setInterval(async () => {
      if (this.isActive) {
        await this.refreshGameData();
        await this.updateScoreboardDisplay();
      }
    }, this.config.refreshInterval);

    console.log(`✅ Live updates started (${this.config.refreshInterval}ms interval)`);
  }

  /**
   * Apply scoreboard enhancements
   */
  private async applyScoreboardEnhancements(): Promise<void> {
    const scoreboard = this.xpathHandler.findElementByXPath(this.config.scoreboardXPath);
    if (!scoreboard) return;

    // Add enhancement classes
    scoreboard.classList.add('fantasy42-scoreboard-enhanced');

    // Add custom styles
    this.addScoreboardStyles();

    // Add filter controls
    if (this.enhancement.gameFilters) {
      await this.addGameFilters(scoreboard);
    }

    // Add notification controls
    if (this.enhancement.liveNotifications) {
      await this.addNotificationControls(scoreboard);
    }

    // Add export capabilities
    if (this.enhancement.exportCapabilities) {
      await this.addExportControls(scoreboard);
    }

    // Add betting integration
    if (this.enhancement.bettingIntegration) {
      await this.addBettingIntegration(scoreboard);
    }

    console.log('✅ Scoreboard enhancements applied');
  }

  /**
   * Add custom scoreboard styles
   */
  private addScoreboardStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
	  .fantasy42-scoreboard-enhanced {
	    position: relative;
	    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
	    border-radius: 12px;
	    overflow: hidden;
	    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	  }

	  .scoreboard-header {
	    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    padding: 15px 20px;
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	  }

	  .scoreboard-controls {
	    display: flex;
	    gap: 10px;
	    margin-bottom: 15px;
	    padding: 0 20px;
	  }

	  .game-card {
	    background: rgba(255, 255, 255, 0.05);
	    border: 1px solid rgba(255, 255, 255, 0.1);
	    border-radius: 8px;
	    margin: 10px;
	    padding: 15px;
	    transition: all 0.3s ease;
	    cursor: pointer;
	  }

	  .game-card:hover {
	    background: rgba(255, 255, 255, 0.08);
	    border-color: rgba(255, 255, 255, 0.2);
	    transform: translateY(-2px);
	  }

	  .game-card.live {
	    border-left: 4px solid #28a745;
	    animation: pulse 2s infinite;
	  }

	  .game-card.completed {
	    border-left: 4px solid #6c757d;
	    opacity: 0.7;
	  }

	  .game-teams {
	    display: flex;
	    justify-content: space-between;
	    align-items: center;
	    margin-bottom: 10px;
	  }

	  .team-info {
	    display: flex;
	    align-items: center;
	    gap: 10px;
	  }

	  .team-score {
	    font-size: 24px;
	    font-weight: bold;
	    color: #fff;
	  }

	  .game-status {
	    text-align: center;
	    margin-top: 10px;
	  }

	  .game-status.live {
	    color: #28a745;
	    font-weight: bold;
	  }

	  .game-filters {
	    display: flex;
	    gap: 15px;
	    margin-bottom: 15px;
	    padding: 0 20px;
	  }

	  .filter-group {
	    display: flex;
	    flex-direction: column;
	    gap: 5px;
	  }

	  .filter-label {
	    font-size: 12px;
	    color: #adb5bd;
	    text-transform: uppercase;
	    letter-spacing: 0.5px;
	  }

	  .filter-select {
	    background: rgba(255, 255, 255, 0.1);
	    border: 1px solid rgba(255, 255, 255, 0.2);
	    color: white;
	    padding: 8px 12px;
	    border-radius: 6px;
	    font-size: 14px;
	  }

	  .notification-indicator {
	    position: absolute;
	    top: 10px;
	    right: 10px;
	    width: 12px;
	    height: 12px;
	    background: #28a745;
	    border-radius: 50%;
	    animation: pulse 2s infinite;
	  }

	  @keyframes pulse {
	    0% { opacity: 1; }
	    50% { opacity: 0.5; }
	    100% { opacity: 1; }
	  }

	  .odds-display {
	    background: rgba(255, 255, 255, 0.05);
	    padding: 8px 12px;
	    border-radius: 6px;
	    margin-top: 10px;
	    font-size: 12px;
	  }

	  .significant-play {
	    background: rgba(255, 215, 0, 0.1);
	    border-left: 3px solid #ffd700;
	    padding: 8px 12px;
	    margin: 5px 0;
	    font-size: 12px;
	  }

	  .export-controls {
	    position: absolute;
	    top: 15px;
	    right: 15px;
	    display: flex;
	    gap: 8px;
	  }

	  .export-btn {
	    background: rgba(255, 255, 255, 0.1);
	    border: 1px solid rgba(255, 255, 255, 0.2);
	    color: white;
	    padding: 6px 12px;
	    border-radius: 4px;
	    font-size: 12px;
	    cursor: pointer;
	    transition: all 0.2s ease;
	  }

	  .export-btn:hover {
	    background: rgba(255, 255, 255, 0.2);
	  }
	`;

    document.head.appendChild(style);
  }

  /**
   * Add game filters
   */
  private async addGameFilters(scoreboard: Element): Promise<void> {
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'game-filters';

    filtersContainer.innerHTML = `
	  <div class="filter-group">
	    <label class="filter-label">Sport</label>
	    <select class="filter-select" id="sport-filter">
	      <option value="">All Sports</option>
	      ${this.config.sportsFilter.map(sport => `<option value="${sport}">${sport}</option>`).join('')}
	    </select>
	  </div>

	  <div class="filter-group">
	    <label class="filter-label">League</label>
	    <select class="filter-select" id="league-filter">
	      <option value="">All Leagues</option>
	      ${this.config.leagueFilter.map(league => `<option value="${league}">${league}</option>`).join('')}
	    </select>
	  </div>

	  <div class="filter-group">
	    <label class="filter-label">Status</label>
	    <select class="filter-select" id="status-filter">
	      <option value="">All Games</option>
	      ${this.config.gameStatusFilter.map(status => `<option value="${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</option>`).join('')}
	    </select>
	  </div>

	  <div class="filter-group">
	    <label class="filter-label">Search</label>
	    <input type="text" class="filter-select" id="game-search" placeholder="Search teams...">
	  </div>
	`;

    scoreboard.insertBefore(filtersContainer, scoreboard.firstChild);

    // Add filter event listeners
    this.setupFilterListeners();

    console.log('✅ Game filters added');
  }

  /**
   * Add notification controls
   */
  private async addNotificationControls(scoreboard: Element): Promise<void> {
    const notificationIndicator = document.createElement('div');
    notificationIndicator.className = 'notification-indicator';
    notificationIndicator.title = 'Live updates active';

    scoreboard.appendChild(notificationIndicator);

    // Add notification settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.innerHTML = `
	  <div class="notification-settings" style="position: absolute; top: 50px; right: 15px; background: rgba(0, 0, 0, 0.8); padding: 15px; border-radius: 8px; display: none; z-index: 1000;">
	    <h6 style="color: white; margin-top: 0; margin-bottom: 10px;">Notifications</h6>
	    <label style="display: block; color: white; font-size: 12px; margin-bottom: 5px;">
	      <input type="checkbox" id="notify-scores" checked> Score Updates
	    </label>
	    <label style="display: block; color: white; font-size: 12px; margin-bottom: 5px;">
	      <input type="checkbox" id="notify-starts"> Game Starts
	    </label>
	    <label style="display: block; color: white; font-size: 12px; margin-bottom: 5px;">
	      <input type="checkbox" id="notify-ends"> Game Ends
	    </label>
	    <label style="display: block; color: white; font-size: 12px;">
	      <input type="checkbox" id="notify-plays"> Significant Plays
	    </label>
	  </div>
	`;

    scoreboard.appendChild(settingsPanel);

    // Toggle settings panel on indicator click
    notificationIndicator.addEventListener('click', () => {
      const panel = settingsPanel.querySelector('.notification-settings') as HTMLElement;
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    console.log('✅ Notification controls added');
  }

  /**
   * Add export controls
   */
  private async addExportControls(scoreboard: Element): Promise<void> {
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-controls';

    exportContainer.innerHTML = `
	  <button class="export-btn" id="export-csv">📊 CSV</button>
	  <button class="export-btn" id="export-json">📋 JSON</button>
	  <button class="export-btn" id="export-pdf">📄 PDF</button>
	`;

    scoreboard.appendChild(exportContainer);

    // Add export event listeners
    document.getElementById('export-csv')?.addEventListener('click', () => this.exportGames('csv'));
    document
      .getElementById('export-json')
      ?.addEventListener('click', () => this.exportGames('json'));
    document.getElementById('export-pdf')?.addEventListener('click', () => this.exportGames('pdf'));

    console.log('✅ Export controls added');
  }

  /**
   * Add betting integration
   */
  private async addBettingIntegration(scoreboard: Element): Promise<void> {
    // Add betting integration controls
    const bettingControls = document.createElement('div');
    bettingControls.innerHTML = `
	  <div class="betting-integration" style="position: absolute; bottom: 15px; right: 15px;">
	    <button class="export-btn" id="quick-bet">⚡ Quick Bet</button>
	    <button class="export-btn" id="view-odds">📊 View Odds</button>
	  </div>
	`;

    scoreboard.appendChild(bettingControls);

    // Add betting event listeners
    document.getElementById('quick-bet')?.addEventListener('click', () => this.handleQuickBet());
    document.getElementById('view-odds')?.addEventListener('click', () => this.toggleOddsDisplay());

    console.log('✅ Betting integration added');
  }

  /**
   * Setup filter listeners
   */
  private setupFilterListeners(): void {
    const sportFilter = document.getElementById('sport-filter') as HTMLSelectElement;
    const leagueFilter = document.getElementById('league-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const searchInput = document.getElementById('game-search') as HTMLInputElement;

    if (sportFilter) {
      sportFilter.addEventListener('change', () => this.applyFilters());
    }

    if (leagueFilter) {
      leagueFilter.addEventListener('change', () => this.applyFilters());
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
  }

  /**
   * Handle scoreboard close
   */
  private async handleScoreboardClose(): Promise<void> {
    console.log('📊 Scoreboard closed');

    // Stop live updates
    this.stopLiveUpdates();

    // Clear game data
    this.liveGames.clear();

    // Hide scoreboard
    const scoreboard = this.xpathHandler.findElementByXPath(this.config.scoreboardXPath);
    if (scoreboard) {
      (scoreboard as HTMLElement).style.display = 'none';
    }
  }

  /**
   * Handle game selection
   */
  private async handleGameSelection(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const gameCard = target.closest('.game-card') as HTMLElement;

    if (gameCard) {
      const gameId = gameCard.getAttribute('data-game-id');
      if (gameId) {
        await this.selectGame(gameId);
      }
    }
  }

  /**
   * Handle filter changes
   */
  private async handleFilterChange(event: Event): Promise<void> {
    await this.applyFilters();
  }

  /**
   * Load initial games
   */
  private async loadInitialGames(): Promise<void> {
    await this.refreshGameData();
    await this.updateScoreboardDisplay();
  }

  /**
   * Refresh game data
   */
  private async refreshGameData(): Promise<void> {
    try {
      const gamesData = await this.fantasyClient.getLiveGames();

      // Update live games map
      this.liveGames.clear();

      for (const game of gamesData) {
        this.liveGames.set(game.gameId, game);
      }

      // Check for significant updates
      await this.checkForSignificantUpdates();
    } catch (error) {
      console.error('❌ Failed to refresh game data:', error);
    }
  }

  /**
   * Update scoreboard display
   */
  private async updateScoreboardDisplay(): Promise<void> {
    const scoreboard = this.xpathHandler.findElementByXPath(this.config.scoreboardXPath);
    if (!scoreboard) return;

    // Clear existing content
    const gameContainer =
      scoreboard.querySelector('.game-container') || this.createGameContainer(scoreboard);

    // Apply filters
    const filteredGames = this.getFilteredGames();

    // Render games
    gameContainer.innerHTML = this.renderGames(filteredGames);

    // Update last refresh time
    this.updateLastRefreshTime();
  }

  /**
   * Create game container
   */
  private createGameContainer(scoreboard: Element): Element {
    const container = document.createElement('div');
    container.className = 'game-container';
    container.style.padding = '20px';
    scoreboard.appendChild(container);
    return container;
  }

  /**
   * Render games
   */
  private renderGames(games: LiveGame[]): string {
    return games.map(game => this.renderGameCard(game)).join('');
  }

  /**
   * Render game card
   */
  private renderGameCard(game: LiveGame): string {
    const statusClass = game.gameStatus.toLowerCase();
    const isLive = game.gameStatus === 'live';

    return `
	  <div class="game-card ${statusClass}" data-game-id="${game.gameId}">
	    <div class="game-teams">
	      <div class="team-info">
	        <span class="team-name">${game.awayTeam}</span>
	        <span class="team-score">${game.awayScore}</span>
	      </div>
	      <div class="game-status ${statusClass}">
	        ${isLive ? 'LIVE' : game.gameStatus.toUpperCase()}
	        ${isLive ? `<br><small>${game.timeRemaining}</small>` : ''}
	      </div>
	      <div class="team-info">
	        <span class="team-name">${game.homeTeam}</span>
	        <span class="team-score">${game.homeScore}</span>
	      </div>
	    </div>

	    ${
        game.odds
          ? `
	      <div class="odds-display">
	        Spread: ${game.odds.spread > 0 ? '+' : ''}${game.odds.spread} |
	        Total: ${game.odds.total} |
	        ML: ${game.odds.moneyline.home}/${game.odds.moneyline.away}
	      </div>
	    `
          : ''
      }

	    ${
        game.significantPlays.length > 0
          ? `
	      <div class="significant-plays">
	        ${game.significantPlays
            .slice(-3)
            .map(
              play => `
	          <div class="significant-play">
	            ${play.timestamp}: ${play.description} (${play.points} pts)
	          </div>
	        `
            )
            .join('')}
	      </div>
	    `
          : ''
      }
	  </div>
	`;
  }

  /**
   * Get filtered games
   */
  private getFilteredGames(): LiveGame[] {
    const sportFilter = (document.getElementById('sport-filter') as HTMLSelectElement)?.value;
    const leagueFilter = (document.getElementById('league-filter') as HTMLSelectElement)?.value;
    const statusFilter = (document.getElementById('status-filter') as HTMLSelectElement)?.value;
    const searchTerm = (
      document.getElementById('game-search') as HTMLInputElement
    )?.value.toLowerCase();

    return Array.from(this.liveGames.values()).filter(game => {
      if (sportFilter && game.sport !== sportFilter) return false;
      if (leagueFilter && game.league !== leagueFilter) return false;
      if (statusFilter && game.gameStatus !== statusFilter) return false;

      if (searchTerm) {
        const searchableText =
          `${game.homeTeam} ${game.awayTeam} ${game.sport} ${game.league}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }

      return true;
    });
  }

  /**
   * Apply filters
   */
  private async applyFilters(): Promise<void> {
    await this.updateScoreboardDisplay();
  }

  /**
   * Select game
   */
  private async selectGame(gameId: string): Promise<void> {
    const game = this.liveGames.get(gameId);
    if (!game) return;

    console.log(`🎯 Selected game: ${game.homeTeam} vs ${game.awayTeam}`);

    // Show detailed game view or trigger betting interface
    await this.showGameDetails(game);
  }

  /**
   * Show game details
   */
  private async showGameDetails(game: LiveGame): Promise<void> {
    // Implementation for showing detailed game view
    console.log('📊 Showing game details:', game);
  }

  /**
   * Check for significant updates
   */
  private async checkForSignificantUpdates(): Promise<void> {
    // Implementation for checking significant updates
  }

  /**
   * Setup game status monitoring
   */
  private setupGameStatusMonitoring(): void {
    // Implementation for monitoring game status changes
  }

  /**
   * Stop live updates
   */
  private stopLiveUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update last refresh time
   */
  private updateLastRefreshTime(): void {
    const refreshIndicator = document.querySelector('.last-refresh');
    if (refreshIndicator) {
      refreshIndicator.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  /**
   * Export games
   */
  private async exportGames(format: 'csv' | 'json' | 'pdf'): Promise<void> {
    const games = Array.from(this.liveGames.values());

    switch (format) {
      case 'csv':
        await this.exportToCSV(games);
        break;
      case 'json':
        await this.exportToJSON(games);
        break;
      case 'pdf':
        await this.exportToPDF(games);
        break;
    }
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(games: LiveGame[]): Promise<void> {
    const csvContent = this.convertGamesToCSV(games);
    this.downloadFile(csvContent, 'scoreboard.csv', 'text/csv');
  }

  /**
   * Export to JSON
   */
  private async exportToJSON(games: LiveGame[]): Promise<void> {
    const jsonContent = JSON.stringify(games, null, 2);
    this.downloadFile(jsonContent, 'scoreboard.json', 'application/json');
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(games: LiveGame[]): Promise<void> {
    // Implementation for PDF export
    console.log('📄 PDF export not yet implemented');
  }

  /**
   * Convert games to CSV
   */
  private convertGamesToCSV(games: LiveGame[]): string {
    const headers = [
      'Game ID',
      'Sport',
      'League',
      'Home Team',
      'Away Team',
      'Home Score',
      'Away Score',
      'Status',
      'Period',
      'Time Remaining',
    ];
    const rows = games.map(game => [
      game.gameId,
      game.sport,
      game.league,
      game.homeTeam,
      game.awayTeam,
      game.homeScore,
      game.awayScore,
      game.gameStatus,
      game.period,
      game.timeRemaining,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Download file
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Handle quick bet
   */
  private async handleQuickBet(): Promise<void> {
    // Implementation for quick bet functionality
    console.log('⚡ Quick bet functionality');
  }

  /**
   * Toggle odds display
   */
  private toggleOddsDisplay(): void {
    const oddsElements = document.querySelectorAll('.odds-display');
    oddsElements.forEach(element => {
      (element as HTMLElement).style.display =
        (element as HTMLElement).style.display === 'none' ? 'block' : 'none';
    });
  }

  /**
   * Get scoreboard status
   */
  getStatus(): {
    isActive: boolean;
    liveGamesCount: number;
    lastRefresh: string;
    refreshInterval: number;
    filters: {
      sport: string;
      league: string;
      status: string;
      search: string;
    };
  } {
    return {
      isActive: this.isActive,
      liveGamesCount: this.liveGames.size,
      lastRefresh: new Date().toISOString(),
      refreshInterval: this.config.refreshInterval,
      filters: {
        sport: (document.getElementById('sport-filter') as HTMLSelectElement)?.value || '',
        league: (document.getElementById('league-filter') as HTMLSelectElement)?.value || '',
        status: (document.getElementById('status-filter') as HTMLSelectElement)?.value || '',
        search: (document.getElementById('game-search') as HTMLInputElement)?.value || '',
      },
    };
  }

  /**
   * Get live games
   */
  getLiveGames(): LiveGame[] {
    return Array.from(this.liveGames.values());
  }

  /**
   * Refresh scoreboard
   */
  async refreshScoreboard(): Promise<void> {
    await this.refreshGameData();
    await this.updateScoreboardDisplay();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopLiveUpdates();
    this.liveGames.clear();

    // Remove added elements
    const enhancedElements = document.querySelectorAll('.fantasy42-scoreboard-enhanced');
    enhancedElements.forEach(element => {
      element.classList.remove('fantasy42-scoreboard-enhanced');
    });

    console.log('🧹 Fantasy42 Scoreboard Integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42Scoreboard = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config: ScoreboardConfig
): Fantasy42Scoreboard => {
  return new Fantasy42Scoreboard(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42Scoreboard = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config: ScoreboardConfig
): Promise<boolean> => {
  const scoreboard = new Fantasy42Scoreboard(fantasyClient, unifiedIntegration, config);
  return await scoreboard.initialize();
};

// Export types
export type { ScoreboardConfig, LiveGame, ScoreboardEnhancement };
