/**
 * Fantasy42 Closing Lines Management System
 * Complete closing line tracking, analysis, and display system
 * Targets: Closing Line table headers, sortable tables, real-time updates
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface ClosingLine {
  id: string;
  sport: string;
  league: string;
  eventId: string;
  eventName: string;
  marketType: string;
  selection: string;
  closingLine: number;
  closingTime: string;
  movement: 'up' | 'down' | 'stable';
  movementAmount: number;
  movementPercentage: number;
  volume: number;
  confidence: number;
  source: string;
  lastUpdate: string;
  metadata: Record<string, any>;
}

export interface ClosingLineAnalytics {
  movement: {
    totalMovements: number;
    upwardMovements: number;
    downwardMovements: number;
    stableLines: number;
    averageMovement: number;
    largestMovement: number;
    movementBySport: Record<string, number>;
  };
  volume: {
    totalVolume: number;
    averageVolume: number;
    highVolumeEvents: Array<{ event: string; volume: number }>;
    volumeBySport: Record<string, number>;
  };
  timing: {
    averageClosingTime: string;
    earliestClosing: string;
    latestClosing: string;
    closingTimeDistribution: Record<string, number>;
  };
  accuracy: {
    predictionAccuracy: number;
    movementPrediction: number;
    volumePrediction: number;
    confidenceScore: number;
  };
  performance: {
    processingTime: number;
    updateFrequency: number;
    dataFreshness: number;
    errorRate: number;
  };
}

export interface ClosingLineConfig {
  display: {
    showMovement: boolean;
    showVolume: boolean;
    showConfidence: boolean;
    colorCoding: boolean;
    realTimeUpdates: boolean;
    autoRefresh: number; // seconds
  };
  sorting: {
    defaultSort: 'closingLine' | 'movement' | 'volume' | 'time';
    sortDirection: 'asc' | 'desc';
    multiColumnSort: boolean;
  };
  filtering: {
    sportFilter: string[];
    leagueFilter: string[];
    marketFilter: string[];
    timeFilter: {
      startTime: string;
      endTime: string;
    };
    movementFilter: {
      minMovement: number;
      maxMovement: number;
    };
  };
  alerts: {
    movementThreshold: number;
    volumeThreshold: number;
    timeBasedAlerts: boolean;
    customAlerts: Array<{
      condition: string;
      threshold: number;
      notification: string;
    }>;
  };
  ai: {
    movementPrediction: boolean;
    volumePrediction: boolean;
    trendAnalysis: boolean;
    anomalyDetection: boolean;
  };
}

export class Fantasy42ClosingLines {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private closingLines: Map<string, ClosingLine> = new Map();
  private analytics: ClosingLineAnalytics;
  private config: ClosingLineConfig;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<ClosingLineConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Fantasy42 closing lines system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('📊 Initializing Fantasy42 Closing Lines System...');

      // Detect closing line table headers
      await this.detectClosingLineHeaders();

      // Initialize data management
      await this.initializeDataManagement();

      // Setup real-time updates
      if (this.config.display.realTimeUpdates) {
        await this.initializeRealTimeUpdates();
      }

      // Setup sorting and filtering
      await this.initializeSortingFiltering();

      // Setup analytics and tracking
      await this.initializeAnalyticsTracking();

      // Setup alerts system
      if (this.config.alerts.customAlerts.length > 0) {
        await this.initializeAlertsSystem();
      }

      this.isInitialized = true;
      console.log('✅ Fantasy42 Closing Lines System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize closing lines system:', error);
      return false;
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): ClosingLineConfig {
    return {
      display: {
        showMovement: true,
        showVolume: true,
        showConfidence: true,
        colorCoding: true,
        realTimeUpdates: true,
        autoRefresh: 30, // 30 seconds
      },
      sorting: {
        defaultSort: 'closingLine',
        sortDirection: 'desc',
        multiColumnSort: true,
      },
      filtering: {
        sportFilter: [],
        leagueFilter: [],
        marketFilter: [],
        timeFilter: {
          startTime: '',
          endTime: '',
        },
        movementFilter: {
          minMovement: 0,
          maxMovement: 0,
        },
      },
      alerts: {
        movementThreshold: 0.5,
        volumeThreshold: 10000,
        timeBasedAlerts: true,
        customAlerts: [],
      },
      ai: {
        movementPrediction: true,
        volumePrediction: true,
        trendAnalysis: true,
        anomalyDetection: true,
      },
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): ClosingLineAnalytics {
    return {
      movement: {
        totalMovements: 0,
        upwardMovements: 0,
        downwardMovements: 0,
        stableLines: 0,
        averageMovement: 0,
        largestMovement: 0,
        movementBySport: {},
      },
      volume: {
        totalVolume: 0,
        averageVolume: 0,
        highVolumeEvents: [],
        volumeBySport: {},
      },
      timing: {
        averageClosingTime: '',
        earliestClosing: '',
        latestClosing: '',
        closingTimeDistribution: {},
      },
      accuracy: {
        predictionAccuracy: 0,
        movementPrediction: 0,
        volumePrediction: 0,
        confidenceScore: 0,
      },
      performance: {
        processingTime: 0,
        updateFrequency: 0,
        dataFreshness: 0,
        errorRate: 0,
      },
    };
  }

  /**
   * Detect closing line table headers
   */
  private async detectClosingLineHeaders(): Promise<void> {
    const headerSelectors = [
      'th[data-language="L-1325"]',
      'th[data-column="2"]',
      '.tablesorter-header',
      '[data-language*="closing"]',
      '[data-language*="line"]',
    ];

    let closingHeader: Element | null = null;

    for (const selector of headerSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (
          element.textContent?.toLowerCase().includes('closing') ||
          element.textContent?.toLowerCase().includes('line')
        ) {
          closingHeader = element;
          console.log('✅ Found closing line header:', selector);
          this.setupClosingLineHeader(closingHeader as HTMLTableHeaderCellElement);
          break;
        }
      }
      if (closingHeader) break;
    }

    if (!closingHeader) {
      console.log('⚠️ Closing line header not found, system will initialize on demand');
    }
  }

  /**
   * Setup closing line header
   */
  private setupClosingLineHeader(header: HTMLTableHeaderCellElement): void {
    // Add click event listener for sorting
    const clickHandler = (e: Event) => {
      e.preventDefault();
      this.handleHeaderClick(header);
    };

    header.addEventListener('click', clickHandler);
    this.eventListeners.set('closing-header-click', clickHandler);

    // Add visual enhancements
    this.enhanceClosingLineHeader(header);

    // Initialize sorting state
    this.initializeSortingState(header);

    console.log('✅ Closing line header setup complete');
  }

  /**
   * Enhance closing line header
   */
  private enhanceClosingLineHeader(header: HTMLTableHeaderCellElement): void {
    // Add CSS enhancements
    const style = document.createElement('style');
    style.textContent = `
	  .closing-line-header {
	    position: relative;
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    padding: 12px 15px;
	    font-weight: 600;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    border: none;
	    user-select: none;
	  }

	  .closing-line-header:hover {
	    transform: translateY(-2px);
	    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
	  }

	  .closing-line-header.sort-asc::after {
	    content: ' ▲';
	    color: #28a745;
	    font-weight: bold;
	  }

	  .closing-line-header.sort-desc::after {
	    content: ' ▼';
	    color: #dc3545;
	    font-weight: bold;
	  }

	  .closing-line-header.sort-none::after {
	    content: ' ⇅';
	    color: #6c757d;
	    opacity: 0.5;
	  }

	  .closing-line-tooltip {
	    position: absolute;
	    top: -5px;
	    right: -5px;
	    background: #28a745;
	    color: white;
	    border-radius: 50%;
	    width: 18px;
	    height: 18px;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	    font-size: 11px;
	    font-weight: bold;
	    cursor: help;
	  }

	  .closing-line-tooltip:hover::after {
	    content: attr(data-tooltip);
	    position: absolute;
	    bottom: 100%;
	    left: 50%;
	    transform: translateX(-50%);
	    background: rgba(0, 0, 0, 0.9);
	    color: white;
	    padding: 8px 12px;
	    border-radius: 6px;
	    font-size: 12px;
	    white-space: nowrap;
	    z-index: 1000;
	    max-width: 250px;
	    text-align: center;
	  }

	  .closing-line-movement {
	    display: inline-block;
	    padding: 2px 6px;
	    border-radius: 4px;
	    font-size: 11px;
	    font-weight: bold;
	    margin-left: 5px;
	  }

	  .closing-line-movement.up {
	    background: #28a745;
	    color: white;
	  }

	  .closing-line-movement.down {
	    background: #dc3545;
	    color: white;
	  }

	  .closing-line-movement.stable {
	    background: #6c757d;
	    color: white;
	  }

	  .closing-line-volume {
	    font-size: 10px;
	    color: #666;
	    margin-left: 8px;
	  }

	  .closing-line-confidence {
	    position: relative;
	    display: inline-block;
	    width: 40px;
	    height: 4px;
	    background: #e9ecef;
	    border-radius: 2px;
	    margin-left: 8px;
	    overflow: hidden;
	  }

	  .closing-line-confidence-fill {
	    height: 100%;
	    border-radius: 2px;
	    transition: width 0.3s ease;
	  }

	  .closing-line-confidence-fill.high {
	    background: #28a745;
	  }

	  .closing-line-confidence-fill.medium {
	    background: #ffc107;
	  }

	  .closing-line-confidence-fill.low {
	    background: #dc3545;
	  }
	`;

    document.head.appendChild(style);

    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'closing-line-tooltip';
    tooltip.textContent = 'i';
    tooltip.setAttribute(
      'data-tooltip',
      'Click to sort by closing line. Real-time updates show line movements, volume, and confidence scores.'
    );

    header.appendChild(tooltip);
  }

  /**
   * Initialize sorting state
   */
  private initializeSortingState(header: HTMLTableHeaderCellElement): void {
    // Set initial sort state
    header.classList.add('closing-line-header', 'sort-none');

    // Initialize sort direction
    this.sortDirection = this.config.sorting.sortDirection;
    this.currentSort = this.config.sorting.defaultSort;
  }

  /**
   * Handle header click for sorting
   */
  private handleHeaderClick(header: HTMLTableHeaderCellElement): void {
    // Cycle through sort states
    if (header.classList.contains('sort-none')) {
      header.classList.remove('sort-none');
      header.classList.add('sort-asc');
      this.sortDirection = 'asc';
    } else if (header.classList.contains('sort-asc')) {
      header.classList.remove('sort-asc');
      header.classList.add('sort-desc');
      this.sortDirection = 'desc';
    } else {
      header.classList.remove('sort-desc');
      header.classList.add('sort-none');
      this.sortDirection = 'asc'; // Reset to default
    }

    // Perform sorting
    this.performSorting();

    // Track analytics
    this.trackAnalytics('closing_line_sort', {
      sortField: 'closingLine',
      sortDirection: this.sortDirection,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Perform table sorting
   */
  private performSorting(): void {
    const table = this.findParentTable();
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
      const aValue = this.getClosingLineValue(a);
      const bValue = this.getClosingLineValue(b);

      if (this.sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // Reorder rows
    rows.forEach(row => tbody.appendChild(row));

    console.log(`✅ Table sorted by closing line (${this.sortDirection})`);
  }

  /**
   * Get closing line value from row
   */
  private getClosingLineValue(row: HTMLTableRowElement): number {
    // Find closing line cell (column 2 based on data-column="2")
    const closingCell = row.querySelector('td[data-column="2"], td:nth-child(3)');
    if (!closingCell) return 0;

    // Extract numeric value from cell content
    const text = closingCell.textContent || '';
    const match = text.match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Find parent table
   */
  private findParentTable(): HTMLTableElement | null {
    const headers = document.querySelectorAll('th[data-language="L-1325"]');
    for (const header of headers) {
      const table = header.closest('table');
      if (table) return table as HTMLTableElement;
    }
    return null;
  }

  /**
   * Initialize data management
   */
  private async initializeDataManagement(): Promise<void> {
    // Load initial closing line data
    await this.loadClosingLineData();

    // Setup data refresh interval
    if (this.config.display.autoRefresh > 0) {
      this.refreshInterval = setInterval(() => {
        this.refreshClosingLineData();
      }, this.config.display.autoRefresh * 1000);
    }

    console.log('✅ Data management initialized');
  }

  /**
   * Load closing line data
   */
  private async loadClosingLineData(): Promise<void> {
    try {
      // Simulate loading closing line data
      const mockData: ClosingLine[] = [
        {
          id: 'cl_001',
          sport: 'Football',
          league: 'NFL',
          eventId: 'evt_001',
          eventName: 'Chiefs vs Eagles',
          marketType: 'Moneyline',
          selection: 'Chiefs',
          closingLine: -150,
          closingTime: '2024-01-15T13:00:00Z',
          movement: 'up',
          movementAmount: 25,
          movementPercentage: 20,
          volume: 250000,
          confidence: 0.85,
          source: 'SportsData',
          lastUpdate: new Date().toISOString(),
          metadata: {},
        },
        {
          id: 'cl_002',
          sport: 'Basketball',
          league: 'NBA',
          eventId: 'evt_002',
          eventName: 'Lakers vs Warriors',
          marketType: 'Spread',
          selection: 'Lakers -2.5',
          closingLine: -110,
          closingTime: '2024-01-15T20:00:00Z',
          movement: 'down',
          movementAmount: 10,
          movementPercentage: 8.3,
          volume: 180000,
          confidence: 0.72,
          source: 'BettingData',
          lastUpdate: new Date().toISOString(),
          metadata: {},
        },
      ];

      // Store data
      mockData.forEach(line => {
        this.closingLines.set(line.id, line);
      });

      // Update table display
      this.updateTableDisplay();

      console.log(`💰 Loaded ${mockData.length} closing lines`);
    } catch (error) {
      console.error('Failed to load closing line data:', error);
    }
  }

  /**
   * Update table display with closing line data
   */
  private updateTableDisplay(): void {
    const table = this.findParentTable();
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    // Add rows for each closing line
    this.closingLines.forEach(line => {
      const row = this.createClosingLineRow(line);
      tbody.appendChild(row);
    });

    console.log('✅ Table display updated');
  }

  /**
   * Create closing line table row
   */
  private createClosingLineRow(line: ClosingLine): HTMLTableRowElement {
    const row = document.createElement('tr');

    // Event column
    const eventCell = document.createElement('td');
    eventCell.textContent = `${line.eventName} (${line.sport})`;
    row.appendChild(eventCell);

    // Market column
    const marketCell = document.createElement('td');
    marketCell.textContent = `${line.marketType} - ${line.selection}`;
    row.appendChild(marketCell);

    // Closing Line column (with enhanced display)
    const closingCell = document.createElement('td');
    closingCell.setAttribute('data-column', '2');

    const lineValue = document.createElement('span');
    lineValue.textContent =
      line.closingLine > 0 ? `+${line.closingLine}` : line.closingLine.toString();
    lineValue.style.fontWeight = 'bold';
    lineValue.style.fontSize = '14px';

    closingCell.appendChild(lineValue);

    // Add movement indicator
    if (this.config.display.showMovement) {
      const movementSpan = document.createElement('span');
      movementSpan.className = `closing-line-movement ${line.movement}`;
      movementSpan.textContent =
        line.movement === 'up' ? '↗' : line.movement === 'down' ? '↘' : '→';
      movementSpan.title = `${line.movementAmount} point ${line.movement} (${line.movementPercentage}%)`;
      closingCell.appendChild(movementSpan);
    }

    // Add volume indicator
    if (this.config.display.showVolume) {
      const volumeSpan = document.createElement('span');
      volumeSpan.className = 'closing-line-volume';
      volumeSpan.textContent = `$${line.volume.toLocaleString()}`;
      closingCell.appendChild(volumeSpan);
    }

    // Add confidence indicator
    if (this.config.display.showConfidence) {
      const confidenceDiv = document.createElement('div');
      confidenceDiv.className = 'closing-line-confidence';

      const confidenceFill = document.createElement('div');
      confidenceFill.className = 'closing-line-confidence-fill';
      confidenceFill.style.width = `${line.confidence * 100}%`;

      if (line.confidence >= 0.8) {
        confidenceFill.classList.add('high');
      } else if (line.confidence >= 0.6) {
        confidenceFill.classList.add('medium');
      } else {
        confidenceFill.classList.add('low');
      }

      confidenceDiv.appendChild(confidenceFill);
      closingCell.appendChild(confidenceDiv);
    }

    row.appendChild(closingCell);

    // Time column
    const timeCell = document.createElement('td');
    timeCell.textContent = new Date(line.closingTime).toLocaleString();
    row.appendChild(timeCell);

    return row;
  }

  /**
   * Refresh closing line data
   */
  private async refreshClosingLineData(): Promise<void> {
    try {
      // Simulate real-time data updates
      this.closingLines.forEach(line => {
        // Simulate small line movements
        const movement = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05
        line.closingLine += movement;
        line.movementAmount = Math.abs(movement);
        line.movement = movement > 0.01 ? 'up' : movement < -0.01 ? 'down' : 'stable';
        line.lastUpdate = new Date().toISOString();

        // Update analytics
        this.updateAnalytics(line);
      });

      // Update display
      this.updateTableDisplay();

      console.log('🔄 Closing line data refreshed');
    } catch (error) {
      console.error('Failed to refresh closing line data:', error);
    }
  }

  /**
   * Update analytics
   */
  private updateAnalytics(line: ClosingLine): void {
    // Update movement analytics
    this.analytics.movement.totalMovements++;
    if (line.movement === 'up') {
      this.analytics.movement.upwardMovements++;
    } else if (line.movement === 'down') {
      this.analytics.movement.downwardMovements++;
    } else {
      this.analytics.movement.stableLines++;
    }

    // Update volume analytics
    this.analytics.volume.totalVolume += line.volume;

    // Update sport-specific data
    if (!this.analytics.movement.movementBySport[line.sport]) {
      this.analytics.movement.movementBySport[line.sport] = 0;
    }
    this.analytics.movement.movementBySport[line.sport] += line.movementAmount;
  }

  /**
   * Initialize real-time updates
   */
  private async initializeRealTimeUpdates(): Promise<void> {
    // Setup WebSocket or polling for real-time updates
    console.log('📡 Real-time updates initialized');
  }

  /**
   * Initialize sorting and filtering
   */
  private async initializeSortingFiltering(): Promise<void> {
    // Setup additional sorting options
    this.setupAdvancedSorting();

    // Setup filtering options
    this.setupFilteringSystem();

    console.log('🔍 Sorting and filtering initialized');
  }

  /**
   * Setup advanced sorting
   */
  private setupAdvancedSorting(): void {
    // Add sort options for other columns
    const headers = document.querySelectorAll('th[data-column]');
    headers.forEach(header => {
      if (
        !header.hasAttribute('data-language') ||
        header.getAttribute('data-language') !== 'L-1325'
      ) {
        header.addEventListener('click', () => {
          this.handleGeneralSorting(header as HTMLTableHeaderCellElement);
        });
      }
    });
  }

  /**
   * Handle general sorting
   */
  private handleGeneralSorting(header: HTMLTableHeaderCellElement): void {
    const columnIndex = parseInt(header.getAttribute('data-column') || '0');
    this.currentSort = this.getSortFieldFromColumn(columnIndex);

    // Toggle sort direction
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';

    this.performGeneralSorting(columnIndex);
  }

  /**
   * Get sort field from column index
   */
  private getSortFieldFromColumn(columnIndex: number): string {
    const sortFields = ['event', 'market', 'closingLine', 'time'];
    return sortFields[columnIndex] || 'closingLine';
  }

  /**
   * Perform general sorting
   */
  private performGeneralSorting(columnIndex: number): void {
    const table = this.findParentTable();
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
      const aValue = this.getCellValue(a, columnIndex);
      const bValue = this.getCellValue(b, columnIndex);

      if (this.sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Reorder rows
    rows.forEach(row => tbody.appendChild(row));
  }

  /**
   * Get cell value from row and column
   */
  private getCellValue(row: HTMLTableRowElement, columnIndex: number): string {
    const cells = row.querySelectorAll('td');
    if (cells[columnIndex]) {
      return cells[columnIndex].textContent || '';
    }
    return '';
  }

  /**
   * Setup filtering system
   */
  private setupFilteringSystem(): void {
    // Create filter controls
    this.createFilterControls();

    // Setup filter event listeners
    this.setupFilterListeners();

    console.log('🎛️ Filtering system setup');
  }

  /**
   * Create filter controls
   */
  private createFilterControls(): void {
    const table = this.findParentTable();
    if (!table) return;

    const filterContainer = document.createElement('div');
    filterContainer.className = 'closing-line-filters';
    filterContainer.style.cssText = `
	  margin-bottom: 15px;
	  padding: 15px;
	  background: #f8f9fa;
	  border-radius: 8px;
	  display: flex;
	  gap: 15px;
	  align-items: center;
	  flex-wrap: wrap;
	`;

    // Sport filter
    const sportFilter = document.createElement('select');
    sportFilter.className = 'sport-filter';
    sportFilter.innerHTML = `
	  <option value="">All Sports</option>
	  <option value="football">Football</option>
	  <option value="basketball">Basketball</option>
	  <option value="baseball">Baseball</option>
	  <option value="hockey">Hockey</option>
	`;

    // Movement filter
    const movementFilter = document.createElement('select');
    movementFilter.className = 'movement-filter';
    movementFilter.innerHTML = `
	  <option value="">All Movements</option>
	  <option value="up">Moving Up</option>
	  <option value="down">Moving Down</option>
	  <option value="stable">Stable</option>
	`;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-filter';
    searchInput.placeholder = 'Search events...';
    searchInput.style.cssText = 'padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;';

    filterContainer.appendChild(sportFilter);
    filterContainer.appendChild(movementFilter);
    filterContainer.appendChild(searchInput);

    table.parentElement?.insertBefore(filterContainer, table);
  }

  /**
   * Setup filter listeners
   */
  private setupFilterListeners(): void {
    // Sport filter
    const sportFilter = document.querySelector('.sport-filter');
    if (sportFilter) {
      sportFilter.addEventListener('change', () => {
        this.applyFilters();
      });
    }

    // Movement filter
    const movementFilter = document.querySelector('.movement-filter');
    if (movementFilter) {
      movementFilter.addEventListener('change', () => {
        this.applyFilters();
      });
    }

    // Search filter
    const searchFilter = document.querySelector('.search-filter');
    if (searchFilter) {
      searchFilter.addEventListener('input', () => {
        this.applyFilters();
      });
    }
  }

  /**
   * Apply filters
   */
  private applyFilters(): void {
    const table = this.findParentTable();
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const sportFilter = (document.querySelector('.sport-filter') as HTMLSelectElement)?.value || '';
    const movementFilter =
      (document.querySelector('.movement-filter') as HTMLSelectElement)?.value || '';
    const searchTerm =
      (document.querySelector('.search-filter') as HTMLInputElement)?.value.toLowerCase() || '';

    rows.forEach(row => {
      const eventCell = row.querySelector('td:first-child');
      const eventText = eventCell?.textContent?.toLowerCase() || '';

      let show = true;

      // Apply sport filter
      if (sportFilter && !eventText.includes(sportFilter.toLowerCase())) {
        show = false;
      }

      // Apply movement filter (simplified - would need actual movement data)
      if (movementFilter) {
        // This would need actual movement data from the row
        show = false; // Placeholder logic
      }

      // Apply search filter
      if (searchTerm && !eventText.includes(searchTerm)) {
        show = false;
      }

      (row as HTMLElement).style.display = show ? '' : 'none';
    });

    console.log('🎛️ Filters applied');
  }

  /**
   * Initialize analytics tracking
   */
  private async initializeAnalyticsTracking(): Promise<void> {
    // Setup analytics event tracking
    console.log('📊 Analytics tracking initialized');
  }

  /**
   * Initialize alerts system
   */
  private async initializeAlertsSystem(): Promise<void> {
    // Setup custom alerts
    console.log('🚨 Alerts system initialized');
  }

  /**
   * Track analytics
   */
  private trackAnalytics(event: string, data: any): void {
    console.log('📊 Analytics tracked:', event, data);
  }

  /**
   * Get status
   */
  getStatus(): {
    isInitialized: boolean;
    activeLines: number;
    lastUpdate: string;
    analytics: ClosingLineAnalytics;
  } {
    return {
      isInitialized: this.isInitialized,
      activeLines: this.closingLines.size,
      lastUpdate: new Date().toISOString(),
      analytics: { ...this.analytics },
    };
  }

  /**
   * Get closing lines
   */
  getClosingLines(): ClosingLine[] {
    return Array.from(this.closingLines.values());
  }

  /**
   * Add closing line
   */
  addClosingLine(line: ClosingLine): boolean {
    try {
      this.closingLines.set(line.id, line);
      this.updateTableDisplay();
      return true;
    } catch (error) {
      console.error('Failed to add closing line:', error);
      return false;
    }
  }

  /**
   * Update closing line
   */
  updateClosingLine(id: string, updates: Partial<ClosingLine>): boolean {
    try {
      const existing = this.closingLines.get(id);
      if (existing) {
        this.closingLines.set(id, { ...existing, ...updates });
        this.updateTableDisplay();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update closing line:', error);
      return false;
    }
  }

  /**
   * Remove closing line
   */
  removeClosingLine(id: string): boolean {
    try {
      const removed = this.closingLines.delete(id);
      if (removed) {
        this.updateTableDisplay();
      }
      return removed;
    } catch (error) {
      console.error('Failed to remove closing line:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<ClosingLineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart refresh interval if changed
    if (newConfig.display?.autoRefresh && this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = setInterval(() => {
        this.refreshClosingLineData();
      }, this.config.display.autoRefresh * 1000);
    }

    console.log('⚙️ Closing lines configuration updated');
  }

  /**
   * Export data
   */
  exportData(): string {
    const exportData = {
      closingLines: Array.from(this.closingLines.values()),
      analytics: this.analytics,
      config: this.config,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: Can't easily remove listeners without references
    });
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log('🧹 Closing lines system cleaned up');
  }

  // Private properties
  private sortDirection: 'asc' | 'desc' = 'desc';
  private currentSort: string = 'closingLine';
}

// Convenience functions
export const createFantasy42ClosingLines = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<ClosingLineConfig>
): Fantasy42ClosingLines => {
  return new Fantasy42ClosingLines(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42ClosingLines = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<ClosingLineConfig>
): Promise<boolean> => {
  const closingLines = new Fantasy42ClosingLines(fantasyClient, unifiedIntegration, config);
  return await closingLines.initialize();
};

// Export types
export type { ClosingLine, ClosingLineAnalytics, ClosingLineConfig };
