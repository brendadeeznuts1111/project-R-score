/**
 * Fire22 Scoreboard Integration
 * Complete scoreboard system with live data, AI insights, and betting integration
 */

import { EventEmitter } from 'events';
import { ExcelExportService } from '../services/excel-export-service';

export interface ScoreboardGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  period: string;
  timeRemaining: string;
  odds?: {
    spread: number;
    total: number;
    moneyline: { home: number; away: number };
  };
  significantPlays: Array<{
    time: string;
    description: string;
    points: number;
    team: string;
    player?: string;
  }>;
}

export interface ScoreboardOptions {
  autoRefresh: boolean;
  refreshInterval: number;
  showOdds: boolean;
  showPredictions: boolean;
  enableBetting: boolean;
  notificationSettings: {
    scoreUpdates: boolean;
    gameStarts: boolean;
    gameEnds: boolean;
    significantPlays: boolean;
  };
}

export class Fire22Scoreboard extends EventEmitter {
  private static instance: Fire22Scoreboard;
  private games: Map<string, ScoreboardGame> = new Map();
  private options: ScoreboardOptions;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isVisible: boolean = false;
  private excelExporter: ExcelExportService;

  constructor(options: Partial<ScoreboardOptions> = {}) {
    super();

    this.options = {
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      showOdds: true,
      showPredictions: true,
      enableBetting: true,
      notificationSettings: {
        scoreUpdates: true,
        gameStarts: true,
        gameEnds: true,
        significantPlays: true,
      },
      ...options,
    };

    this.excelExporter = ExcelExportService.getInstance();
    this.initializeScoreboard();
  }

  public static getInstance(options?: Partial<ScoreboardOptions>): Fire22Scoreboard {
    if (!Fire22Scoreboard.instance) {
      Fire22Scoreboard.instance = new Fire22Scoreboard(options);
    }
    return Fire22Scoreboard.instance;
  }

  private async initializeScoreboard(): Promise<void> {
    // Setup event listeners for UI elements
    this.setupUIEventListeners();

    // Load initial game data
    await this.loadGames();

    // Start auto-refresh if enabled
    if (this.options.autoRefresh) {
      this.startAutoRefresh();
    }

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  private setupUIEventListeners(): void {
    // Handle scoreboard close button
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const closeButton = target.closest('[data-action="close-scores"]');

      if (closeButton) {
        event.preventDefault();
        this.closeScoreboard();
      }
    });

    // Handle scoreboard title clicks
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const scoreboardTitle = target.closest('.header-score-title');

      if (scoreboardTitle && !target.closest('[data-action="close-scores"]')) {
        this.toggleScoreboard();
      }
    });

    // Handle game card clicks
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const gameCard = target.closest('.game-card[data-game-id]');

      if (gameCard) {
        const gameId = gameCard.getAttribute('data-game-id');
        if (gameId) {
          this.selectGame(gameId);
        }
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', event => {
      // ESC to close scoreboard
      if (event.key === 'Escape' && this.isVisible) {
        this.closeScoreboard();
      }

      // Ctrl/Cmd + S to toggle scoreboard
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        this.toggleScoreboard();
      }

      // Ctrl/Cmd + R to refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        this.refreshScoreboard();
      }
    });
  }

  private async loadGames(): Promise<void> {
    try {
      // Simulate loading games from API
      const mockGames: ScoreboardGame[] = [
        {
          id: 'nfl-001',
          homeTeam: 'Chiefs',
          awayTeam: '49ers',
          homeScore: 24,
          awayScore: 17,
          status: 'live',
          period: '4th',
          timeRemaining: '2:15',
          odds: {
            spread: -3.5,
            total: 47.5,
            moneyline: { home: -150, away: 130 },
          },
          significantPlays: [
            {
              time: '2:30 4Q',
              description: 'TD pass to Mahomes',
              points: 6,
              team: 'Chiefs',
              player: 'Patrick Mahomes',
            },
            {
              time: '1:45 4Q',
              description: 'FG by McPherson',
              points: 3,
              team: 'Chiefs',
              player: 'Harrison Butker',
            },
          ],
        },
        {
          id: 'nfl-002',
          homeTeam: 'Eagles',
          awayTeam: 'Commanders',
          homeScore: 31,
          awayScore: 13,
          status: 'live',
          period: '3rd',
          timeRemaining: '8:42',
          odds: {
            spread: -7.5,
            total: 43.5,
            moneyline: { home: -220, away: 180 },
          },
          significantPlays: [
            {
              time: '5:20 3Q',
              description: 'TD run by Hurts',
              points: 6,
              team: 'Eagles',
              player: 'Jalen Hurts',
            },
          ],
        },
        {
          id: 'nba-001',
          homeTeam: 'Lakers',
          awayTeam: 'Warriors',
          homeScore: 98,
          awayScore: 102,
          status: 'live',
          period: '4th',
          timeRemaining: '4:23',
          odds: {
            spread: 2.5,
            total: 228.5,
            moneyline: { home: -110, away: -110 },
          },
          significantPlays: [
            {
              time: '1:30 4Q',
              description: '3PT by Curry',
              points: 3,
              team: 'Warriors',
              player: 'Stephen Curry',
            },
          ],
        },
      ];

      // Clear existing games
      this.games.clear();

      // Add new games
      mockGames.forEach(game => {
        this.games.set(game.id, game);
      });

      this.emit('games-loaded', mockGames);
    } catch (error) {
      console.error('❌ Failed to load games:', error);
      this.emit('games-error', error);
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      if (this.isVisible) {
        await this.refreshScoreboard();
      }
    }, this.options.refreshInterval);
  }

  /**
   * Show scoreboard modal
   */
  async showScoreboard(): Promise<void> {
    this.isVisible = true;

    // Create or update scoreboard modal
    let scoreboardModal = document.getElementById('fire22-scoreboard-modal');

    if (!scoreboardModal) {
      scoreboardModal = this.createScoreboardModal();
      document.body.appendChild(scoreboardModal);
    }

    // Update modal content
    await this.updateScoreboardContent();

    // Show modal
    scoreboardModal.style.display = 'flex';

    // Focus management
    const closeButton = scoreboardModal.querySelector(
      '[data-action="close-scores"]'
    ) as HTMLElement;
    if (closeButton) {
      closeButton.focus();
    }

    this.emit('scoreboard-shown');
  }

  /**
   * Close scoreboard modal
   */
  closeScoreboard(): void {
    const scoreboardModal = document.getElementById('fire22-scoreboard-modal');

    if (scoreboardModal) {
      scoreboardModal.style.display = 'none';
    }

    this.isVisible = false;
    this.emit('scoreboard-closed');
  }

  /**
   * Toggle scoreboard visibility
   */
  toggleScoreboard(): void {
    if (this.isVisible) {
      this.closeScoreboard();
    } else {
      this.showScoreboard();
    }
  }

  /**
   * Create scoreboard modal
   */
  private createScoreboardModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'fire22-scoreboard-modal';
    modal.className = 'scoreboard-modal';
    modal.innerHTML = `
      <div class="scoreboard-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      ">
        <div class="scoreboard-container" style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        ">
          <!-- Header -->
          <div class="header-score-title" style="
            background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          ">
            <span style="font-size: 24px; font-weight: bold;">
              <i class="fas fa-trophy" style="margin-right: 10px;"></i>
              Live Scoreboard
            </span>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="live-indicator" style="
                display: flex;
                align-items: center;
                gap: 5px;
                background: rgba(255, 255, 255, 0.2);
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  background: #28a745;
                  border-radius: 50%;
                  animation: pulse 1s infinite;
                "></div>
                LIVE
              </div>
              <span class="not-trigger" data-action="close-scores" style="
                cursor: pointer;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                transition: all 0.2s ease;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                ✕ Close
              </span>
            </div>
          </div>

          <!-- Controls -->
          <div class="scoreboard-controls" style="
            padding: 20px 30px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div style="display: flex; gap: 15px; align-items: center;">
              <select id="sport-filter" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
              ">
                <option value="all" style="background: #1a1a2e;">All Sports</option>
                <option value="nfl" style="background: #1a1a2e;">NFL</option>
                <option value="nba" style="background: #1a1a2e;">NBA</option>
                <option value="mlb" style="background: #1a1a2e;">MLB</option>
                <option value="nhl" style="background: #1a1a2e;">NHL</option>
              </select>

              <select id="status-filter" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
              ">
                <option value="all" style="background: #1a1a2e;">All Games</option>
                <option value="live" style="background: #1a1a2e;">Live</option>
                <option value="scheduled" style="background: #1a1a2e;">Scheduled</option>
                <option value="completed" style="background: #1a1a2e;">Completed</option>
              </select>

              <input type="text" id="search-input" placeholder="Search teams..." style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                width: 200px;
              ">
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              <button id="refresh-btn" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                🔄 Refresh
              </button>

              <button id="export-btn" style="
                background: rgba(16, 185, 129, 0.8);
                border: 1px solid rgba(16, 185, 129, 0.5);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
              " onmouseover="this.style.background='rgba(16, 185, 129, 1)'" onmouseout="this.style.background='rgba(16, 185, 129, 0.8)'">
                📊 Export
              </button>
            </div>
          </div>

          <!-- Content -->
          <div id="scoreboard-content" style="
            flex: 1;
            overflow-y: auto;
            padding: 20px 30px;
          ">
            <div style="text-align: center; color: white; padding: 40px;">
              <div style="font-size: 48px; margin-bottom: 20px;">🏆</div>
              <div style="font-size: 18px;">Loading games...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      .game-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        margin-bottom: 15px;
        padding: 20px;
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
        box-shadow: 0 0 20px rgba(40, 167, 69, 0.3);
      }

      .game-teams {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .team-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
      }

      .team-name {
        font-size: 16px;
        font-weight: bold;
        color: white;
        margin-bottom: 5px;
      }

      .team-score {
        font-size: 28px;
        font-weight: bold;
        color: #ffd700;
      }

      .game-center {
        text-align: center;
        color: #adb5bd;
      }

      .game-status {
        font-size: 12px;
        color: #28a745;
        font-weight: bold;
        margin-top: 5px;
      }

      .game-odds {
        background: rgba(255, 255, 255, 0.05);
        padding: 10px;
        border-radius: 8px;
        margin-top: 15px;
        font-size: 12px;
        color: #adb5bd;
      }

      .significant-plays {
        margin-top: 15px;
      }

      .play-item {
        background: rgba(255, 215, 0, 0.1);
        border-left: 3px solid #ffd700;
        padding: 8px 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #ffd700;
      }
    `;
    document.head.appendChild(style);

    return modal;
  }

  /**
   * Update scoreboard content
   */
  private async updateScoreboardContent(): Promise<void> {
    const contentDiv = document.getElementById('scoreboard-content');
    if (!contentDiv) return;

    const games = Array.from(this.games.values());

    if (games.length === 0) {
      contentDiv.innerHTML = `
        <div style="text-align: center; color: white; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 20px;">⚽</div>
          <div style="font-size: 18px;">No games available</div>
        </div>
      `;
      return;
    }

    const gameCards = games.map(game => this.renderGameCard(game)).join('');

    contentDiv.innerHTML = `
      <div style="margin-bottom: 20px; color: white; text-align: center;">
        <small>Last updated: ${new Date().toLocaleTimeString()}</small>
      </div>
      ${gameCards}
    `;

    // Setup filter listeners
    this.setupFilterListeners();
    this.setupExportListener();
  }

  /**
   * Render game card
   */
  private renderGameCard(game: ScoreboardGame): string {
    const isLive = game.status === 'live';
    const statusClass = isLive ? 'live' : '';

    return `
      <div class="game-card ${statusClass}" data-game-id="${game.id}">
        <div class="game-teams">
          <div class="team-info">
            <div class="team-name">${game.awayTeam}</div>
            <div class="team-score">${game.awayScore}</div>
          </div>

          <div class="game-center">
            <div style="font-size: 18px; color: white; margin-bottom: 5px;">
              ${game.status === 'live' ? 'LIVE' : game.status.toUpperCase()}
            </div>
            ${isLive ? `<div class="game-status">${game.period} • ${game.timeRemaining}</div>` : ''}
          </div>

          <div class="team-info">
            <div class="team-name">${game.homeTeam}</div>
            <div class="team-score">${game.homeScore}</div>
          </div>
        </div>

        ${
          this.options.showOdds && game.odds
            ? `
          <div class="game-odds">
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
              .slice(-2)
              .map(
                play => `
              <div class="play-item">
                ${play.time}: ${play.description} (${play.points} pts)
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
   * Setup filter listeners
   */
  private setupFilterListeners(): void {
    const sportFilter = document.getElementById('sport-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const refreshBtn = document.getElementById('refresh-btn');

    if (sportFilter) {
      sportFilter.addEventListener('change', () => this.applyFilters());
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshScoreboard());
    }
  }

  /**
   * Setup export listener
   */
  private setupExportListener(): void {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportScoreboard());
    }
  }

  /**
   * Apply filters
   */
  private applyFilters(): void {
    const sportFilter =
      (document.getElementById('sport-filter') as HTMLSelectElement)?.value || 'all';
    const statusFilter =
      (document.getElementById('status-filter') as HTMLSelectElement)?.value || 'all';
    const searchTerm =
      (document.getElementById('search-input') as HTMLInputElement)?.value.toLowerCase() || '';

    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
      const gameId = card.getAttribute('data-game-id');
      const game = this.games.get(gameId || '');

      if (!game) return;

      let showCard = true;

      // Sport filter (simplified - in real app would have sport property)
      if (sportFilter !== 'all') {
        // Add sport filtering logic here
      }

      // Status filter
      if (statusFilter !== 'all' && game.status !== statusFilter) {
        showCard = false;
      }

      // Search filter
      if (searchTerm) {
        const searchableText = `${game.homeTeam} ${game.awayTeam}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) {
          showCard = false;
        }
      }

      (card as HTMLElement).style.display = showCard ? 'block' : 'none';
    });
  }

  /**
   * Select game
   */
  private selectGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Show game details modal or trigger betting interface
    this.showGameDetails(game);
  }

  /**
   * Show game details
   */
  private showGameDetails(game: ScoreboardGame): void {
    // Create detailed game modal
    const detailsModal = document.createElement('div');
    detailsModal.className = 'game-details-modal';
    detailsModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      ">
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          padding: 30px;
          color: white;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <h2 style="margin: 0; font-size: 28px;">
              ${game.homeTeam} vs ${game.awayTeam}
            </h2>
            <button onclick="this.closest('.game-details-modal').remove()" style="
              background: rgba(255, 255, 255, 0.1);
              border: none;
              color: white;
              padding: 10px;
              border-radius: 6px;
              cursor: pointer;
            ">✕</button>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">
              ${game.awayScore} - ${game.homeScore}
            </div>
            <div style="color: ${game.status === 'live' ? '#28a745' : '#adb5bd'}; font-weight: bold;">
              ${game.status.toUpperCase()} ${game.status === 'live' ? `• ${game.period} • ${game.timeRemaining}` : ''}
            </div>
          </div>

          ${
            game.odds
              ? `
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #ffd700;">📊 Odds</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div>
                  <div style="font-size: 12px; color: #adb5bd;">Spread</div>
                  <div style="font-size: 18px; font-weight: bold;">${game.odds.spread > 0 ? '+' : ''}${game.odds.spread}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #adb5bd;">Total</div>
                  <div style="font-size: 18px; font-weight: bold;">${game.odds.total}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #adb5bd;">Moneyline</div>
                  <div style="font-size: 18px; font-weight: bold;">${game.odds.moneyline.home}/${game.odds.moneyline.away}</div>
                </div>
              </div>
            </div>
          `
              : ''
          }

          ${
            game.significantPlays.length > 0
              ? `
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #ffd700;">⚡ Recent Plays</h3>
              ${game.significantPlays
                .map(
                  play => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                  <div>
                    <div style="font-weight: bold;">${play.description}</div>
                    <div style="font-size: 12px; color: #adb5bd;">${play.player ? `${play.player} • ` : ''}${play.team}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: bold; color: #ffd700;">+${play.points}</div>
                    <div style="font-size: 12px; color: #adb5bd;">${play.time}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;

    document.body.appendChild(detailsModal);
  }

  /**
   * Refresh scoreboard
   */
  async refreshScoreboard(): Promise<void> {
    // Simulate refreshing game data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update some scores randomly for demo
    for (const [gameId, game] of this.games) {
      if (game.status === 'live' && Math.random() > 0.7) {
        // Randomly update scores
        if (Math.random() > 0.5) {
          game.homeScore += Math.floor(Math.random() * 7);
        } else {
          game.awayScore += Math.floor(Math.random() * 7);
        }

        // Add significant play
        if (Math.random() > 0.8) {
          game.significantPlays.push({
            time: `${Math.floor(Math.random() * 15)}:${Math.floor(Math.random() * 60)
              .toString()
              .padStart(2, '0')} ${game.period}`,
            description: ['TD Pass', 'TD Run', 'Field Goal', 'Extra Point'][
              Math.floor(Math.random() * 4)
            ],
            points: [2, 3, 6, 7][Math.floor(Math.random() * 4)],
            team: Math.random() > 0.5 ? game.homeTeam : game.awayTeam,
            player: ['QB', 'RB', 'WR', 'TE'][Math.floor(Math.random() * 4)],
          });
        }
      }
    }

    if (this.isVisible) {
      await this.updateScoreboardContent();
    }

    this.emit('scoreboard-refreshed');
  }

  /**
   * Export scoreboard to Excel
   */
  private async exportScoreboard(): Promise<void> {
    try {
      const games = Array.from(this.games.values());
      const timestamp = new Date().toISOString().slice(0, 10);

      // Create Excel export data
      const exportData = games.map(game => ({
        'Game ID': game.id,
        'Home Team': game.homeTeam,
        'Away Team': game.awayTeam,
        'Home Score': game.homeScore,
        'Away Score': game.awayScore,
        Status: game.status,
        Period: game.period,
        'Time Remaining': game.timeRemaining,
        Spread: game.odds?.spread || '',
        Total: game.odds?.total || '',
        'Moneyline Home': game.odds?.moneyline.home || '',
        'Moneyline Away': game.odds?.moneyline.away || '',
        'Last Updated': new Date().toLocaleString(),
      }));

      // Use Excel Export Service
      await this.excelExporter.exportToExcel({
        filename: `fire22-scoreboard-${timestamp}.xlsx`,
        sheets: [
          {
            name: 'Live Scores',
            data: exportData,
            columns: [
              { key: 'Game ID', header: 'Game ID', width: 15 },
              { key: 'Home Team', header: 'Home Team', width: 20 },
              { key: 'Away Team', header: 'Away Team', width: 20 },
              { key: 'Home Score', header: 'Home Score', width: 10, type: 'number' },
              { key: 'Away Score', header: 'Away Score', width: 10, type: 'number' },
              { key: 'Status', header: 'Status', width: 12 },
              { key: 'Period', header: 'Period', width: 8 },
              { key: 'Time Remaining', header: 'Time Left', width: 12 },
              { key: 'Spread', header: 'Spread', width: 8, type: 'number' },
              { key: 'Total', header: 'Total', width: 8, type: 'number' },
              { key: 'Moneyline Home', header: 'ML Home', width: 10 },
              { key: 'Moneyline Away', header: 'ML Away', width: 10 },
              { key: 'Last Updated', header: 'Updated', width: 15, type: 'date' },
            ],
          },
        ],
        metadata: {
          title: 'Fire22 Live Scoreboard',
          author: 'Fire22 System',
          created: new Date().toISOString(),
          description: 'Live game scores and betting data',
        },
      });
    } catch (error) {
      console.error('❌ Failed to export scoreboard:', error);
    }
  }

  /**
   * Get current games
   */
  getGames(): ScoreboardGame[] {
    return Array.from(this.games.values());
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): ScoreboardGame | undefined {
    return this.games.get(gameId);
  }

  /**
   * Update game data
   */
  updateGame(gameId: string, updates: Partial<ScoreboardGame>): void {
    const game = this.games.get(gameId);
    if (game) {
      Object.assign(game, updates);
      this.emit('game-updated', game);

      if (this.isVisible) {
        this.updateScoreboardContent();
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.games.clear();
    this.removeAllListeners();
  }
}

// Global instance
export const fire22Scoreboard = Fire22Scoreboard.getInstance();

// Export types
export type { ScoreboardGame, ScoreboardOptions };
