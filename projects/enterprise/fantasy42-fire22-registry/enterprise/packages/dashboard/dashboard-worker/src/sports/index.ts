/**
 * Sports Betting System
 * Consolidated modular sports betting system with event management, betting, odds, and risk assessment
 */

import { EventManagement } from './events/event-management';
import { BetProcessing } from './betting/bet-processing';
import { OddsManagement } from './betting/odds-management';
import { RiskAssessmentEngine } from './risk/risk-assessment';

export * from './core/sports-types';

export class SportsBettingSystem {
  private eventManager: EventManagement;
  private betProcessor: BetProcessing;
  private oddsManager: OddsManagement;
  private riskEngine: RiskAssessmentEngine;

  constructor() {
    this.eventManager = new EventManagement();
    this.betProcessor = new BetProcessing();
    this.oddsManager = new OddsManagement();
    this.riskEngine = new RiskAssessmentEngine();

    this.initializeSystem();
  }

  /**
   * Initialize the sports betting system
   */
  private async initializeSystem(): Promise<void> {
    console.log('🏈 Initializing Sports Betting System...');

    // Initialize default events
    this.eventManager.initializeDefaultEvents();

    console.log('✅ Sports Betting System initialized');
  }

  // Event Management Methods

  /**
   * Get all sports events
   */
  getAllEvents() {
    return this.eventManager.getAllEvents();
  }

  /**
   * Get events by sport
   */
  getEventsBySport(sport: any) {
    return this.eventManager.getEventsBySport(sport);
  }

  /**
   * Get events by VIP tier
   */
  getEventsByVIP(vipTier: any) {
    return this.eventManager.getEventsByVIP(vipTier);
  }

  /**
   * Get live events
   */
  getLiveEvents() {
    return this.eventManager.getLiveEvents();
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(hours = 24) {
    return this.eventManager.getUpcomingEvents(hours);
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string) {
    return this.eventManager.getEvent(eventId);
  }

  /**
   * Create new event
   */
  createEvent(eventData: any) {
    return this.eventManager.createEvent(eventData);
  }

  /**
   * Update event
   */
  updateEvent(eventId: string, updates: any) {
    return this.eventManager.updateEvent(eventId, updates);
  }

  /**
   * Delete event
   */
  deleteEvent(eventId: string) {
    return this.eventManager.deleteEvent(eventId);
  }

  /**
   * Update event status
   */
  updateEventStatus(eventId: string, status: any, notes?: string) {
    return this.eventManager.updateEventStatus(eventId, status, notes);
  }

  /**
   * Start live event
   */
  startLiveEvent(eventId: string) {
    return this.eventManager.startLiveEvent(eventId);
  }

  /**
   * Complete event
   */
  completeEvent(eventId: string, finalScore?: any) {
    return this.eventManager.completeEvent(eventId, finalScore);
  }

  /**
   * Cancel event
   */
  cancelEvent(eventId: string, reason: string) {
    return this.eventManager.cancelEvent(eventId, reason);
  }

  /**
   * Get event statistics
   */
  getEventStats() {
    return this.eventManager.getEventStats();
  }

  /**
   * Search events
   */
  searchEvents(query: string) {
    return this.eventManager.searchEvents(query);
  }

  // Betting Methods

  /**
   * Create a new bet
   */
  async createBet(betData: any, event: any) {
    return await this.betProcessor.createBet(betData, event);
  }

  /**
   * Get bet by ID
   */
  getBet(betId: string) {
    return this.betProcessor.getBet(betId);
  }

  /**
   * Get all bets
   */
  getAllBets() {
    return this.betProcessor.getAllBets();
  }

  /**
   * Get bets by filter
   */
  getBetsByFilter(filter: any) {
    return this.betProcessor.getBetsByFilter(filter);
  }

  /**
   * Get bets by player
   */
  getBetsByPlayer(playerId: string) {
    return this.betProcessor.getBetsByPlayer(playerId);
  }

  /**
   * Get bets by event
   */
  getBetsByEvent(eventId: string) {
    return this.betProcessor.getBetsByEvent(eventId);
  }

  /**
   * Get pending bets
   */
  getPendingBets() {
    return this.betProcessor.getPendingBets();
  }

  /**
   * Get active bets
   */
  getActiveBets() {
    return this.betProcessor.getActiveBets();
  }

  /**
   * Cancel bet
   */
  cancelBet(betId: string, reason: string) {
    return this.betProcessor.cancelBet(betId, reason);
  }

  /**
   * Settle bet
   */
  settleBet(settlement: any) {
    return this.betProcessor.settleBet(settlement);
  }

  /**
   * Bulk settle bets
   */
  bulkSettleBets(eventId: string, settlements: any[]) {
    return this.betProcessor.bulkSettleBets(eventId, settlements);
  }

  /**
   * Get bet statistics
   */
  getBetStats() {
    return this.betProcessor.getBetStats();
  }

  // Odds Management Methods

  /**
   * Get odds for event
   */
  getOdds(eventId: string) {
    return this.oddsManager.getOdds(eventId);
  }

  /**
   * Update odds
   */
  updateOdds(request: any) {
    return this.oddsManager.updateOdds(request);
  }

  /**
   * Calculate initial odds
   */
  calculateInitialOdds(event: any) {
    return this.oddsManager.calculateInitialOdds(event);
  }

  /**
   * Add special bet
   */
  addSpecialBet(eventId: string, specialBet: any) {
    return this.oddsManager.addSpecialBet(eventId, specialBet);
  }

  /**
   * Update special bet
   */
  updateSpecialBet(specialBetId: string, updates: any) {
    return this.oddsManager.updateSpecialBet(specialBetId, updates);
  }

  /**
   * Get special bet
   */
  getSpecialBet(specialBetId: string) {
    return this.oddsManager.getSpecialBet(specialBetId);
  }

  /**
   * Get special bets for event
   */
  getSpecialBetsForEvent(eventId: string) {
    return this.oddsManager.getSpecialBetsForEvent(eventId);
  }

  /**
   * Get odds history
   */
  getOddsHistory(eventId: string, limit = 50) {
    return this.oddsManager.getOddsHistory(eventId, limit);
  }

  /**
   * Get odds volatility
   */
  getOddsVolatility(eventId: string) {
    return this.oddsManager.getOddsVolatility(eventId);
  }

  /**
   * Validate odds
   */
  validateOdds(odds: any) {
    return this.oddsManager.validateOdds(odds);
  }

  // Risk Assessment Methods

  /**
   * Assess player risk
   */
  assessPlayerRisk(playerId: string, agentId: string, bets: any[], vipProfile?: any) {
    return this.riskEngine.assessPlayerRisk(playerId, agentId, bets, vipProfile);
  }

  /**
   * Get risk assessment
   */
  getRiskAssessment(playerId: string) {
    return this.riskEngine.getRiskAssessment(playerId);
  }

  /**
   * Update risk assessment
   */
  updateRiskAssessment(playerId: string, updates: any) {
    return this.riskEngine.updateRiskAssessment(playerId, updates);
  }

  /**
   * Check bet risk
   */
  checkBetRisk(bet: any, playerBets: any[], vipProfile?: any) {
    return this.riskEngine.checkBetRisk(bet, playerBets, vipProfile);
  }

  /**
   * Monitor player activity
   */
  monitorPlayerActivity(playerId: string, newBet: any, recentBets: any[]) {
    return this.riskEngine.monitorPlayerActivity(playerId, newBet, recentBets);
  }

  /**
   * Calculate system risk metrics
   */
  calculateSystemRiskMetrics() {
    return this.riskEngine.calculateSystemRiskMetrics();
  }

  /**
   * Generate risk mitigation strategies
   */
  generateRiskMitigationStrategies(assessment: any) {
    return this.riskEngine.generateRiskMitigationStrategies(assessment);
  }

  // System Health and Statistics

  /**
   * Get system statistics
   */
  getSystemStats() {
    const eventStats = this.getEventStats();
    const betStats = this.getBetStats();
    const riskMetrics = this.calculateSystemRiskMetrics();

    return {
      events: eventStats,
      bets: betStats,
      risk: riskMetrics,
      timestamp: new Date(),
    };
  }

  /**
   * Get system health
   */
  getSystemHealth() {
    return {
      events: this.getAllEvents().length,
      bets: this.getAllBets().length,
      riskAssessments: Array.from(this.riskEngine['assessments']).length,
      oddsTracked: Array.from(this.oddsManager['oddsCache']).length,
      timestamp: new Date(),
    };
  }
}

// Export individual modules for advanced usage
export { EventManagement } from './events/event-management';
export { BetProcessing } from './betting/bet-processing';
export { OddsManagement } from './betting/odds-management';
export { RiskAssessmentEngine } from './risk/risk-assessment';

// Export default instance factory
export function createSportsBettingSystem(): SportsBettingSystem {
  return new SportsBettingSystem();
}
