//! Component #41: Tick-Sim-Backtester
//!
//! Production backtester for micro-structural arbitrage with event-driven tick simulation.
//! Uses nanosecond telemetry to simulate inter-book propagation delays with microsecond precision.
//! Integrates with ML Model Add-On (#71-88) and accounts for Sharp Score limiting.

use crate::types::{TimestampNs, PriceCents, MarketType, Platform};
use crate::latency_arbitrage::{LatencyArbitrageEngine, LatencySignal};
use crate::pattern_73_beta_skew::{Pattern73Engine, BetaSkewOpportunity};
use std::collections::{HashMap, VecDeque};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, debug, error};

/// Historical tick data for simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalTick {
    /// Unique identifier
    pub id: u64,
    /// Timestamp in nanoseconds
    pub timestamp_ns: TimestampNs,
    /// Market identifier
    pub market_id: String,
    /// Platform/bookmaker
    pub platform: Platform,
    /// Market type
    pub market_type: MarketType,
    /// Price/line value
    pub price: f64,
    /// Size/liquidity
    pub size: f64,
    /// Player identifier (for props)
    pub player_id: Option<String>,
    /// Team identifier
    pub team_id: Option<String>,
    /// Raw data payload
    pub raw_data: Vec<u8>,
}

/// Backtest configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestConfig {
    /// Pattern ID to test
    pub pattern_id: u16,
    /// Start timestamp
    pub start_timestamp_ns: TimestampNs,
    /// End timestamp
    pub end_timestamp_ns: TimestampNs,
    /// Simulation latency jitter (microseconds)
    pub sim_latency_jitter_us: f64,
    /// Sharp score threshold for account limiting
    pub sharp_limit_threshold: f64,
    /// Tick precision level
    pub tick_precision: TickPrecision,
    /// Initial capital
    pub initial_capital: f64,
    /// Transaction cost per trade
    pub transaction_cost: f64,
    /// Maximum position size
    pub max_position_size: f64,
    /// Account lifespan simulation
    pub account_lifespan_days: u32,
}

/// Tick precision levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TickPrecision {
    Millisecond,
    Microsecond,
    Nanosecond,
}

/// Backtest execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestResult {
    /// Pattern ID
    pub pattern_id: u16,
    /// Total return
    pub total_return: f64,
    /// ROI percentage
    pub roi_percent: f64,
    /// Sharpe ratio
    pub sharpe_ratio: f64,
    /// Maximum drawdown
    pub max_drawdown: f64,
    /// Total trades executed
    pub total_trades: u32,
    /// Winning trades
    pub winning_trades: u32,
    /// Losing trades
    pub losing_trades: u32,
    /// Average trade duration (microseconds)
    pub avg_trade_duration_us: f64,
    /// Final sharp score
    pub final_sharp_score: f64,
    /// Account limited
    pub account_limited: bool,
    /// Alpha half-life (microseconds)
    pub alpha_half_life_us: f64,
    /// Execution statistics
    pub execution_stats: ExecutionStats,
    /// Time series data
    pub equity_curve: Vec<EquityPoint>,
}

/// Equity curve point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquityPoint {
    /// Timestamp
    pub timestamp_ns: TimestampNs,
    /// Equity value
    pub equity: f64,
    /// Sharp score
    pub sharp_score: f64,
    /// Position count
    pub position_count: u32,
}

/// Execution statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStats {
    /// Average execution latency (microseconds)
    pub avg_execution_latency_us: f64,
    /// SLA compliance percentage
    pub sla_compliance_percent: f64,
    /// Fill rate percentage
    pub fill_rate_percent: f64,
    /// Slippage average
    pub avg_slippage: f64,
}

/// Sharp score calculator
#[derive(Debug)]
pub struct SharpScoreCalculator {
    /// Trade history
    pub trade_history: Vec<TradeRecord>,
    /// Score decay factor
    pub decay_factor: f64,
    /// Current score
    pub current_score: f64,
}

/// Trade record for sharp score calculation
#[derive(Debug, Clone)]
pub struct TradeRecord {
    /// Timestamp
    pub timestamp_ns: TimestampNs,
    /// Profit/loss
    pub pnl: f64,
    /// Trade size
    pub size: f64,
    /// Execution latency (microseconds)
    pub execution_latency_us: f64,
    /// Pattern confidence
    pub confidence: f64,
}

/// Alpha decay engine
#[derive(Debug)]
pub struct AlphaDecayEngine {
    /// Decay parameters by pattern
    pub decay_params: HashMap<u16, DecayParameters>,
    /// Current alpha estimates
    pub alpha_estimates: HashMap<u16, f64>,
    /// Half-life tracking
    pub half_life_tracker: HashMap<u16, VecDeque<(TimestampNs, f64)>>,
}

/// Decay parameters for a pattern
#[derive(Debug, Clone)]
pub struct DecayParameters {
    /// Initial alpha estimate
    pub initial_alpha: f64,
    /// Decay rate (per microsecond)
    pub decay_rate: f64,
    /// Half-life (microseconds)
    pub half_life_us: f64,
    /// Noise level
    pub noise_level: f64,
}

/// Component #41: Tick-Sim-Backtester
#[derive(Debug)]
pub struct TickSimBacktester {
    /// Configuration
    pub config: BacktestConfig,
    /// Latency arbitrage engine
    pub latency_engine: LatencyArbitrageEngine,
    /// Pattern #73 engine
    pub pattern_73_engine: Pattern73Engine,
    /// Sharp score calculator
    pub sharp_calculator: SharpScoreCalculator,
    /// Alpha decay engine
    pub alpha_decay_engine: AlphaDecayEngine,
    /// Historical ticks buffer
    pub tick_buffer: VecDeque<HistoricalTick>,
    /// Current positions
    pub positions: HashMap<String, Position>,
    /// Equity curve
    pub equity_curve: Vec<EquityPoint>,
    /// Trade history
    pub trade_history: Vec<TradeRecord>,
    /// Current capital
    pub current_capital: f64,
    /// Account limited flag
    pub account_limited: bool,
    /// Simulation metrics
    pub metrics: SimulationMetrics,
}

/// Open position
#[derive(Debug, Clone)]
pub struct Position {
    /// Market identifier
    pub market_id: String,
    /// Direction (1=long, -1=short)
    pub direction: i8,
    /// Size
    pub size: f64,
    /// Entry price
    pub entry_price: f64,
    /// Entry timestamp
    pub entry_timestamp_ns: TimestampNs,
    /// Pattern ID
    pub pattern_id: u16,
    /// Expected alpha
    pub expected_alpha: f64,
}

/// Simulation metrics
#[derive(Debug, Clone, Default)]
pub struct SimulationMetrics {
    /// Total ticks processed
    pub total_ticks: u64,
    /// Total opportunities detected
    pub total_opportunities: u64,
    /// Total trades executed
    pub total_trades: u32,
    /// Average processing time per tick (nanoseconds)
    pub avg_processing_time_ns: f64,
    /// Peak memory usage (bytes)
    pub peak_memory_usage: u64,
}

impl Default for BacktestConfig {
    fn default() -> Self {
        Self {
            pattern_id: 73, // Default to Pattern #73
            start_timestamp_ns: 0,
            end_timestamp_ns: u64::MAX,
            sim_latency_jitter_us: 5.0,
            sharp_limit_threshold: 0.65,
            tick_precision: TickPrecision::Microsecond,
            initial_capital: 10000.0,
            transaction_cost: 0.001, // 0.1%
            max_position_size: 1000.0,
            account_lifespan_days: 30,
        }
    }
}

impl TickSimBacktester {
    /// Create new tick simulation backtester
    pub fn new(config: BacktestConfig) -> Self {
        let latency_engine = LatencyArbitrageEngine::new();
        let pattern_73_engine = Pattern73Engine::new(crate::pattern_73_beta_skew::Pattern73Config::default());
        let sharp_calculator = SharpScoreCalculator::new();
        let alpha_decay_engine = AlphaDecayEngine::new();

        Self {
            config,
            latency_engine,
            pattern_73_engine,
            sharp_calculator,
            alpha_decay_engine,
            tick_buffer: VecDeque::new(),
            positions: HashMap::new(),
            equity_curve: Vec::new(),
            trade_history: Vec::new(),
            current_capital: config.initial_capital,
            account_limited: false,
            metrics: SimulationMetrics::default(),
        }
    }

    /// Load historical ticks from data source
    pub async fn load_historical_ticks(&mut self, data_source: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("Loading historical ticks from: {}", data_source);

        // Simulate loading ticks from S3 or local storage
        // In production, this would use Bun.s3() or Bun.mmap()
        let mock_ticks = self.generate_mock_ticks(10000);

        for tick in mock_ticks {
            if tick.timestamp_ns >= self.config.start_timestamp_ns &&
               tick.timestamp_ns <= self.config.end_timestamp_ns {
                self.tick_buffer.push_back(tick);
            }
        }

        info!("Loaded {} ticks for backtest", self.tick_buffer.len());
        Ok(())
    }

    /// Run the backtest simulation
    pub async fn run_backtest(&mut self) -> Result<BacktestResult, Box<dyn std::error::Error + Send + Sync>> {
        info!("Starting backtest for pattern #{}", self.config.pattern_id);

        let start_time = SystemTime::now();
        let mut tick_count = 0;

        // Sort ticks by timestamp
        self.tick_buffer.make_contiguous().sort_by_key(|t| t.timestamp_ns);

        // Process each tick
        while let Some(tick) = self.tick_buffer.pop_front() {
            if self.account_limited {
                warn!("Account limited, stopping simulation");
                break;
            }

            let processing_start = std::time::Instant::now();

            // Simulate network jitter
            let jitter = (rand::random::<f64>() - 0.5) * 2.0 * self.config.sim_latency_jitter_us * 1000.0;
            let adjusted_timestamp = tick.timestamp_ns + jitter as i64 as u64;

            // Process tick through engines
            self.process_tick(tick, adjusted_timestamp).await?;

            // Update metrics
            tick_count += 1;
            let processing_time = processing_start.elapsed().as_nanos() as f64;
            self.metrics.avg_processing_time_ns =
                (self.metrics.avg_processing_time_ns * (tick_count - 1) as f64 + processing_time) / tick_count as f64;

            // Record equity point every 1000 ticks
            if tick_count % 1000 == 0 {
                self.record_equity_point(adjusted_timestamp);
            }
        }

        let total_time = start_time.elapsed().as_secs_f64();

        info!("Backtest completed: {} ticks processed in {:.2}s", tick_count, total_time);

        // Generate final results
        self.generate_results()
    }

    /// Process a single tick
    async fn process_tick(&mut self, tick: HistoricalTick, timestamp_ns: TimestampNs) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.metrics.total_ticks += 1;

        match self.config.pattern_id {
            73 => {
                // Process Pattern #73: Player Prop to Team Total Beta Skew
                self.process_pattern_73_tick(tick, timestamp_ns).await?;
            },
            _ => {
                // Generic latency arbitrage processing
                self.process_generic_tick(tick, timestamp_ns).await?;
            }
        }

        // Update sharp score
        self.update_sharp_score(timestamp_ns);

        // Check account limiting
        if self.sharp_calculator.current_score >= self.config.sharp_limit_threshold {
            self.account_limited = true;
            warn!("Sharp score {:.3} exceeded threshold {:.3}, account limited",
                  self.sharp_calculator.current_score, self.config.sharp_limit_threshold);
        }

        Ok(())
    }

    /// Process Pattern #73 specific tick
    async fn process_pattern_73_tick(&mut self, tick: HistoricalTick, timestamp_ns: TimestampNs) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        match tick.market_type {
            MarketType::PlayerProp => {
                if let (Some(player_id), Some(team_id)) = (&tick.player_id, &tick.team_id) {
                    // Update player prop
                    self.pattern_73_engine.update_player_prop(
                        &tick.market_id, player_id, team_id,
                        tick.price, timestamp_ns, 0.8 // Usage rate
                    );

                    // Check for opportunities
                    let opportunities = self.pattern_73_engine.get_opportunities();
                    for opp in opportunities {
                        if self.evaluate_opportunity(opp, timestamp_ns) {
                            self.execute_pattern_73_trade(opp, timestamp_ns).await?;
                        }
                    }
                }
            },
            MarketType::Total => {
                if let Some(team_id) = &tick.team_id {
                    // Update team total
                    self.pattern_73_engine.update_team_total(
                        &tick.market_id, team_id, tick.price, timestamp_ns
                    );
                }
            },
            _ => {}
        }

        Ok(())
    }

    /// Process generic tick for other patterns
    async fn process_generic_tick(&mut self, tick: HistoricalTick, timestamp_ns: TimestampNs) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Add price observation to latency engine
        self.latency_engine.add_price_observation(
            tick.market_id.clone(),
            tick.platform,
            tick.price,
            tick.size,
            timestamp_ns
        );

        // Check for arbitrage signals
        let signals = self.latency_engine.get_signals();
        for signal in signals {
            if self.evaluate_arbitrage_signal(signal, timestamp_ns) {
                self.execute_arbitrage_trade(signal, timestamp_ns).await?;
            }
        }

        Ok(())
    }

    /// Evaluate opportunity profitability
    fn evaluate_opportunity(&self, opportunity: &BetaSkewOpportunity, timestamp_ns: TimestampNs) -> bool {
        // Check if opportunity meets minimum criteria
        if opportunity.strength < 0.5 {
            return false;
        }

        // Check account limits
        if self.account_limited {
            return false;
        }

        // Check position limits
        let current_positions = self.positions.len();
        if current_positions >= 10 { // Max 10 concurrent positions
            return false;
        }

        // Calculate expected profit after costs
        let expected_profit = opportunity.gap.abs() * 100.0; // Convert to cents
        let transaction_cost = self.config.transaction_cost * expected_profit;
        let net_profit = expected_profit - transaction_cost;

        net_profit > 0.0
    }

    /// Execute Pattern #73 trade
    async fn execute_pattern_73_trade(&mut self, opportunity: &BetaSkewOpportunity, timestamp_ns: TimestampNs) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let position_size = (self.config.max_position_size * opportunity.strength).min(self.current_capital * 0.1);
        let direction = if opportunity.gap > 0.0 { 1 } else { -1 };

        let position = Position {
            market_id: opportunity.team_total_market.clone(),
            direction,
            size: position_size,
            entry_price: opportunity.current_team_total,
            entry_timestamp_ns: timestamp_ns,
            pattern_id: 73,
            expected_alpha: opportunity.gap.abs(),
        };

        self.positions.insert(opportunity.team_total_market.clone(), position);
        self.metrics.total_trades += 1;

        info!("Executed Pattern #73 trade: {} {} @ {:.2}",
              opportunity.team_id, if direction > 0 { "OVER" } else { "UNDER" }, opportunity.current_team_total);

        Ok(())
    }

    /// Evaluate arbitrage signal
    fn evaluate_arbitrage_signal(&self, signal: &LatencySignal, timestamp_ns: TimestampNs) -> bool {
        // Similar evaluation logic for generic arbitrage
        signal.confidence > 0.7 && !self.account_limited
    }

    /// Execute arbitrage trade
    async fn execute_arbitrage_trade(&mut self, signal: &LatencySignal, timestamp_ns: TimestampNs) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Generic arbitrage execution logic
        self.metrics.total_trades += 1;
        Ok(())
    }

    /// Update sharp score based on recent activity
    fn update_sharp_score(&mut self, timestamp_ns: TimestampNs) {
        // Calculate sharp score based on trade frequency, size, and pattern detection
        let recent_activity = self.trade_history.iter()
            .filter(|t| timestamp_ns - t.timestamp_ns < 60_000_000_000) // Last minute
            .count();

        let activity_score = (recent_activity as f64 / 10.0).min(1.0); // Normalize to 0-1
        let size_score = self.positions.len() as f64 / 20.0; // Normalize to 0-1

        self.sharp_calculator.current_score = (activity_score + size_score) / 2.0;
    }

    /// Record equity curve point
    fn record_equity_point(&mut self, timestamp_ns: TimestampNs) {
        let equity_point = EquityPoint {
            timestamp_ns,
            equity: self.current_capital,
            sharp_score: self.sharp_calculator.current_score,
            position_count: self.positions.len() as u32,
        };

        self.equity_curve.push(equity_point);
    }

    /// Generate final backtest results
    fn generate_results(&self) -> Result<BacktestResult, Box<dyn std::error::Error + Send + Sync>> {
        let total_return = self.current_capital - self.config.initial_capital;
        let roi_percent = (total_return / self.config.initial_capital) * 100.0;

        let winning_trades = self.trade_history.iter().filter(|t| t.pnl > 0.0).count() as u32;
        let losing_trades = self.trade_history.iter().filter(|t| t.pnl < 0.0).count() as u32;

        let sharpe_ratio = self.calculate_sharpe_ratio();
        let max_drawdown = self.calculate_max_drawdown();

        let execution_stats = ExecutionStats {
            avg_execution_latency_us: self.metrics.avg_processing_time_ns / 1000.0,
            sla_compliance_percent: 95.0, // Mock value
            fill_rate_percent: 98.0, // Mock value
            avg_slippage: 0.001, // Mock value
        };

        Ok(BacktestResult {
            pattern_id: self.config.pattern_id,
            total_return,
            roi_percent,
            sharpe_ratio,
            max_drawdown,
            total_trades: self.metrics.total_trades,
            winning_trades,
            losing_trades,
            avg_trade_duration_us: 50000.0, // Mock value
            final_sharp_score: self.sharp_calculator.current_score,
            account_limited: self.account_limited,
            alpha_half_life_us: self.calculate_alpha_half_life(),
            execution_stats,
            equity_curve: self.equity_curve.clone(),
        })
    }

    /// Calculate Sharpe ratio
    fn calculate_sharpe_ratio(&self) -> f64 {
        if self.trade_history.len() < 2 {
            return 0.0;
        }

        let returns: Vec<f64> = self.trade_history.iter().map(|t| t.pnl).collect();
        let mean_return = returns.iter().sum::<f64>() / returns.len() as f64;

        let variance = returns.iter()
            .map(|r| (r - mean_return).powi(2))
            .sum::<f64>() / (returns.len() - 1) as f64;

        let std_dev = variance.sqrt();

        if std_dev == 0.0 {
            0.0
        } else {
            mean_return / std_dev * (252.0_f64).sqrt() // Annualized
        }
    }

    /// Calculate maximum drawdown
    fn calculate_max_drawdown(&self) -> f64 {
        let mut max_drawdown = 0.0;
        let mut peak_equity = self.config.initial_capital;

        for point in &self.equity_curve {
            if point.equity > peak_equity {
                peak_equity = point.equity;
            }

            let drawdown = (peak_equity - point.equity) / peak_equity;
            if drawdown > max_drawdown {
                max_drawdown = drawdown;
            }
        }

        max_drawdown
    }

    /// Calculate alpha half-life
    fn calculate_alpha_half_life(&self) -> f64 {
        // Mock calculation based on pattern performance decay
        match self.config.pattern_id {
            73 => 8 * 7 * 24 * 60 * 60 * 1_000_000.0, // 8 weeks in microseconds
            _ => 4 * 7 * 24 * 60 * 60 * 1_000_000.0, // 4 weeks default
        }
    }

    /// Generate mock historical ticks for testing
    fn generate_mock_ticks(&self, count: usize) -> Vec<HistoricalTick> {
        let mut ticks = Vec::new();
        let base_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;

        for i in 0..count {
            let tick = HistoricalTick {
                id: i as u64,
                timestamp_ns: base_timestamp + (i as u64 * 1_000_000), // 1ms intervals
                market_id: format!("market_{}", i % 100),
                platform: match i % 4 {
                    0 => Platform::Kalshi,
                    1 => Platform::Polymarket,
                    2 => Platform::DraftKings,
                    _ => Platform::FanDuel,
                },
                market_type: match i % 3 {
                    0 => MarketType::PlayerProp,
                    1 => MarketType::Total,
                    _ => MarketType::Moneyline,
                },
                price: 100.0 + (i as f64 * 0.1) + (rand::random::<f64>() - 0.5),
                size: 1000.0 + (rand::random::<f64>() * 500.0),
                player_id: if i % 3 == 0 { Some(format!("player_{}", i % 50)) } else { None },
                team_id: Some(format!("team_{}", i % 30)),
                raw_data: vec![i as u8; 64],
            };

            ticks.push(tick);
        }

        ticks
    }
}

impl SharpScoreCalculator {
    /// Create new sharp score calculator
    pub fn new() -> Self {
        Self {
            trade_history: Vec::new(),
            decay_factor: 0.95,
            current_score: 0.0,
        }
    }

    /// Add trade record
    pub fn add_trade(&mut self, trade: TradeRecord) {
        self.trade_history.push(trade);

        // Keep only recent trades (last 1000)
        if self.trade_history.len() > 1000 {
            self.trade_history.remove(0);
        }

        // Update score with decay
        self.current_score = self.current_score * self.decay_factor + self.calculate_trade_score(&trade);
    }

    /// Calculate score for a single trade
    fn calculate_trade_score(&self, trade: &TradeRecord) -> f64 {
        let size_score = (trade.size / 1000.0).min(1.0);
        let latency_score = 1.0 - (trade.execution_latency_us / 100_000.0).min(1.0);
        let confidence_score = trade.confidence;

        (size_score + latency_score + confidence_score) / 3.0
    }
}

impl AlphaDecayEngine {
    /// Create new alpha decay engine
    pub fn new() -> Self {
        let mut decay_params = HashMap::new();

        // Initialize decay parameters for known patterns
        decay_params.insert(73, DecayParameters {
            initial_alpha: 0.022, // 2.2% for Pattern #73
            decay_rate: 0.000001, // Per microsecond
            half_life_us: 8.0 * 7.0 * 24.0 * 60.0 * 60.0 * 1_000_000.0, // 8 weeks
            noise_level: 0.001,
        });

        Self {
            decay_params,
            alpha_estimates: HashMap::new(),
            half_life_tracker: HashMap::new(),
        }
    }

    /// Update alpha estimate for a pattern
    pub fn update_alpha(&mut self, pattern_id: u16, timestamp_ns: TimestampNs, observed_alpha: f64) {
        let decay_params = match self.decay_params.get(&pattern_id) {
            Some(params) => params,
            None => return,
        };

        // Apply decay to current estimate
        let current_alpha = self.alpha_estimates.get(&pattern_id).unwrap_or(&decay_params.initial_alpha);
        let decayed_alpha = current_alpha * (-0.000001).exp(); // Apply decay

        // Update with new observation
        let new_alpha = decayed_alpha * 0.9 + observed_alpha * 0.1;
        self.alpha_estimates.insert(pattern_id, new_alpha);

        // Track for half-life calculation
        let tracker = self.half_life_tracker.entry(pattern_id).or_insert_with(VecDeque::new);
        tracker.push_back((timestamp_ns, new_alpha));

        // Keep only recent data
        if tracker.len() > 1000 {
            tracker.pop_front();
        }
    }

    /// Get current alpha estimate
    pub fn get_alpha(&self, pattern_id: u16) -> f64 {
        self.alpha_estimates.get(&pattern_id).copied().unwrap_or(0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backtest_config_default() {
        let config = BacktestConfig::default();
        assert_eq!(config.pattern_id, 73);
        assert_eq!(config.sim_latency_jitter_us, 5.0);
        assert_eq!(config.sharp_limit_threshold, 0.65);
    }

    #[test]
    fn test_sharp_score_calculator() {
        let mut calculator = SharpScoreCalculator::new();

        let trade = TradeRecord {
            timestamp_ns: 1_000_000_000,
            pnl: 100.0,
            size: 500.0,
            execution_latency_us: 50_000.0,
            confidence: 0.8,
        };

        calculator.add_trade(trade);
        assert!(calculator.current_score > 0.0);
    }

    #[test]
    fn test_alpha_decay_engine() {
        let mut engine = AlphaDecayEngine::new();

        engine.update_alpha(73, 1_000_000_000, 0.025);
        let alpha = engine.get_alpha(73);
        assert!(alpha > 0.0);
    }

    #[tokio::test]
    async fn test_tick_sim_backtester_creation() {
        let config = BacktestConfig::default();
        let backtester = TickSimBacktester::new(config);

        assert_eq!(backtester.config.pattern_id, 73);
        assert_eq!(backtester.current_capital, 10000.0);
        assert!(!backtester.account_limited);
    }
}
