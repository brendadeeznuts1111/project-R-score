//! Risk Management System: Half-Life Decay Monitoring & Circuit Breakers
//!
//! Implements comprehensive risk controls for latency arbitrage including:
//! - Half-life decay monitoring with exponential edge evaporation tracking
//! - Cross-book net exposure limits with jurisdiction-aware position management
//! - Provider failure circuit breakers with automatic failover
//! - Anti-fingerprinting order sizing with adaptive volume controls

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use tracing::{info, warn, error};

use crate::types::*;
use crate::latency_arbitrage::{LatencyArbitrageEngine, LatencySignal};
use crate::feed_aggregator::{FeedAggregator, LatencyStats};

/// Risk management configuration
#[derive(Debug, Clone)]
pub struct RiskConfig {
    /// Maximum net exposure per provider (in cents)
    pub max_provider_exposure_cents: i64,
    /// Maximum cross-book exposure ratio
    pub max_cross_book_ratio: f64,
    /// Half-life decay alert threshold (edge remaining %)
    pub half_life_decay_threshold: f64,
    /// Provider failure circuit breaker threshold
    pub provider_failure_threshold: u32,
    /// Anti-fingerprinting: maximum order size % of market volume
    pub max_order_size_percent: f64,
    /// Circuit breaker reset time (seconds)
    pub circuit_reset_seconds: u64,
    /// Exposure monitoring interval (milliseconds)
    pub exposure_monitor_interval_ms: u64,
}

impl Default for RiskConfig {
    fn default() -> Self {
        Self {
            max_provider_exposure_cents: 100_000, // $1000 max per provider
            max_cross_book_ratio: 0.8, // 80% of smaller book
            half_life_decay_threshold: 0.3, // Alert when <30% edge remains
            provider_failure_threshold: 5, // 5 failures trigger circuit breaker
            max_order_size_percent: 0.05, // 5% of market volume max
            circuit_reset_seconds: 300, // 5 minutes
            exposure_monitor_interval_ms: 1000, // 1 second
        }
    }
}

/// Provider exposure tracking
#[derive(Debug, Clone)]
struct ProviderExposure {
    pub net_exposure_cents: i64,
    pub active_positions: HashMap<u16, Position>, // market_id -> position
    pub last_updated: Instant,
}

#[derive(Debug, Clone)]
struct Position {
    pub size_cents: i64,
    pub entry_price_cents: PriceCents,
    pub timestamp_ns: TimestampNs,
}

/// Half-life decay monitor
#[derive(Debug)]
struct HalfLifeDecayMonitor {
    /// Tracked signals with their decay state
    tracked_signals: HashMap<u64, SignalDecayState>,
    /// Decay alerts sent
    alerts_sent: HashMap<u64, Instant>,
}

#[derive(Debug, Clone)]
struct SignalDecayState {
    pub signal_id: u64,
    pub initial_edge_cents: i16,
    pub half_life_ns: u64,
    pub creation_time_ns: TimestampNs,
    pub last_edge_cents: i16,
}

/// Circuit breaker state
#[derive(Debug, Clone)]
enum CircuitState {
    Closed,     // Normal operation
    Open,       // Circuit broken, reject trades
    HalfOpen,   // Testing recovery
}

/// Provider circuit breaker
#[derive(Debug)]
struct ProviderCircuitBreaker {
    pub provider: Platform,
    pub state: CircuitState,
    pub failure_count: u32,
    pub last_failure: Option<Instant>,
    pub last_attempt: Option<Instant>,
    pub success_count: u32,
}

impl ProviderCircuitBreaker {
    fn new(provider: Platform) -> Self {
        Self {
            provider,
            state: CircuitState::Closed,
            failure_count: 0,
            last_failure: None,
            last_attempt: None,
            success_count: 0,
        }
    }

    /// Record execution success
    fn record_success(&mut self) {
        self.success_count += 1;
        if let CircuitState::HalfOpen = self.state {
            // Successful test, close circuit
            self.state = CircuitState::Closed;
            self.failure_count = 0;
            info!("Circuit closed for {} after successful test", self.provider);
        }
    }

    /// Record execution failure
    fn record_failure(&mut self, config: &RiskConfig) {
        self.failure_count += 1;
        self.last_failure = Some(Instant::now());

        if self.failure_count >= config.provider_failure_threshold {
            if let CircuitState::Closed = self.state {
                self.state = CircuitState::Open;
                warn!("Circuit opened for {} after {} failures", self.provider, self.failure_count);
            }
        }
    }

    /// Check if trade is allowed
    fn allow_trade(&self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                // Check if enough time has passed to try half-open
                if let Some(last_failure) = self.last_failure {
                    if last_failure.elapsed() > Duration::from_secs(60) { // 1 minute cooldown
                        return true; // Allow one test trade
                    }
                }
                false
            }
            CircuitState::HalfOpen => true,
        }
    }
}

/// Anti-fingerprinting order sizer
#[derive(Debug)]
struct OrderSizer {
    /// Historical market volumes by provider and market type
    market_volumes: HashMap<(Platform, MarketType), u64>,
    /// Adaptive sizing factor (0.0-1.0)
    sizing_factor: f64,
}

impl OrderSizer {
    fn new() -> Self {
        Self {
            market_volumes: HashMap::new(),
            sizing_factor: 1.0,
        }
    }

    /// Calculate safe order size to avoid fingerprinting
    fn calculate_safe_size(&self, provider: Platform, market_type: MarketType, requested_size_cents: SizeCents, max_percent: f64) -> SizeCents {
        let key = (provider, market_type);
        let estimated_volume = self.market_volumes.get(&key).copied().unwrap_or(100_000); // Default $1000

        let max_safe_size = (estimated_volume as f64 * max_percent) as SizeCents;
        let adaptive_size = (max_safe_size as f64 * self.sizing_factor) as SizeCents;

        requested_size_cents.min(adaptive_size).max(100) // Min 100¢ = $1
    }

    /// Update market volume estimate
    fn update_volume_estimate(&mut self, provider: Platform, market_type: MarketType, observed_volume: u64) {
        let key = (provider, market_type);
        let current = self.market_volumes.get(&key).copied().unwrap_or(0);
        // Exponential moving average
        let alpha = 0.1;
        let updated = (current as f64 * (1.0 - alpha) + observed_volume as f64 * alpha) as u64;
        self.market_volumes.insert(key, updated);
    }
}

/// Risk management engine for latency arbitrage
pub struct RiskManagementEngine {
    /// Configuration
    config: RiskConfig,
    /// Provider exposure tracking
    provider_exposure: HashMap<Platform, ProviderExposure>,
    /// Half-life decay monitor
    decay_monitor: HalfLifeDecayMonitor,
    /// Provider circuit breakers
    circuit_breakers: HashMap<Platform, ProviderCircuitBreaker>,
    /// Anti-fingerprinting order sizer
    order_sizer: OrderSizer,
    /// Latency arbitrage engine reference
    latency_engine: Arc<RwLock<LatencyArbitrageEngine>>,
    /// Feed aggregator reference
    feed_aggregator: Arc<RwLock<FeedAggregator>>,
    /// Risk alerts channel
    alert_tx: tokio::sync::mpsc::UnboundedSender<RiskAlert>,
}

#[derive(Debug, Clone)]
pub enum RiskAlert {
    HalfLifeDecay { signal_id: u64, remaining_percent: f64 },
    ExposureLimit { provider: Platform, exposure_cents: i64, limit_cents: i64 },
    CircuitBreaker { provider: Platform, state: String },
    ProviderFailure { provider: Platform, failure_count: u32 },
}

impl RiskManagementEngine {
    /// Create new risk management engine
    pub fn new(
        config: RiskConfig,
        latency_engine: Arc<RwLock<LatencyArbitrageEngine>>,
        feed_aggregator: Arc<RwLock<FeedAggregator>>,
    ) -> (Self, tokio::sync::mpsc::UnboundedReceiver<RiskAlert>) {
        let (alert_tx, alert_rx) = tokio::sync::mpsc::UnboundedSender::new();

        let mut circuit_breakers = HashMap::new();
        // Initialize circuit breakers for all providers
        for provider in [Platform::Kalshi, Platform::Polymarket, Platform::DraftKings, Platform::FanDuel] {
            circuit_breakers.insert(provider, ProviderCircuitBreaker::new(provider));
        }

        Self {
            config,
            provider_exposure: HashMap::new(),
            decay_monitor: HalfLifeDecayMonitor {
                tracked_signals: HashMap::new(),
                alerts_sent: HashMap::new(),
            },
            circuit_breakers,
            order_sizer: OrderSizer::new(),
            latency_engine,
            feed_aggregator,
            alert_tx,
        }
    }

    /// Evaluate risk for a potential latency arbitrage trade
    pub async fn evaluate_trade_risk(&mut self, signal: &LatencySignal) -> Result<TradeRiskAssessment, RiskRejectionReason> {
        // Check circuit breakers
        if !self.check_circuit_breakers(signal) {
            return Err(RiskRejectionReason::CircuitBreaker);
        }

        // Check exposure limits
        self.check_exposure_limits(signal)?;

        // Check half-life decay
        if self.check_half_life_decay(signal).is_err() {
            return Err(RiskRejectionReason::HalfLifeDecay);
        }

        // Calculate safe order sizes
        let safe_sizes = self.calculate_safe_order_sizes(signal);

        Ok(TradeRiskAssessment {
            approved: true,
            recommended_fast_size: safe_sizes.0,
            recommended_slow_size: safe_sizes.1,
            risk_score: self.calculate_risk_score(signal),
            warnings: Vec::new(), // TODO: Add specific warnings
        })
    }

    /// Check provider circuit breakers
    fn check_circuit_breakers(&self, signal: &LatencySignal) -> bool {
        let fast_cb = self.circuit_breakers.get(&signal.fast_market.provider);
        let slow_cb = self.circuit_breakers.get(&signal.slow_market.provider);

        fast_cb.map_or(true, |cb| cb.allow_trade()) && slow_cb.map_or(true, |cb| cb.allow_trade())
    }

    /// Check cross-book exposure limits
    fn check_exposure_limits(&self, signal: &LatencySignal) -> Result<(), RiskRejectionReason> {
        let fast_exposure = self.provider_exposure
            .get(&signal.fast_market.provider)
            .map(|e| e.net_exposure_cents)
            .unwrap_or(0);

        let slow_exposure = self.provider_exposure
            .get(&signal.slow_market.provider)
            .map(|e| e.net_exposure_cents)
            .unwrap_or(0);

        if fast_exposure.abs() >= self.config.max_provider_exposure_cents {
            let _ = self.alert_tx.send(RiskAlert::ExposureLimit {
                provider: signal.fast_market.provider,
                exposure_cents: fast_exposure,
                limit_cents: self.config.max_provider_exposure_cents,
            });
            return Err(RiskRejectionReason::ExposureLimit);
        }

        if slow_exposure.abs() >= self.config.max_provider_exposure_cents {
            let _ = self.alert_tx.send(RiskAlert::ExposureLimit {
                provider: signal.slow_market.provider,
                exposure_cents: slow_exposure,
                limit_cents: self.config.max_provider_exposure_cents,
            });
            return Err(RiskRejectionReason::ExposureLimit);
        }

        Ok(())
    }

    /// Check half-life decay for signal viability
    fn check_half_life_decay(&self, signal: &LatencySignal) -> Result<(), RiskRejectionReason> {
        let remaining_edge_percent = signal.disparity_cents as f64 / signal.disparity_cents.abs() as f64;

        if remaining_edge_percent < self.config.half_life_decay_threshold {
            return Err(RiskRejectionReason::HalfLifeDecay);
        }

        Ok(())
    }

    /// Calculate anti-fingerprinting safe order sizes
    fn calculate_safe_order_sizes(&self, signal: &LatencySignal) -> (SizeCents, SizeCents) {
        let fast_size = self.order_sizer.calculate_safe_size(
            signal.fast_market.provider,
            signal.fast_market.market_type,
            signal.fast_market.size,
            self.config.max_order_size_percent,
        );

        let slow_size = self.order_sizer.calculate_safe_size(
            signal.slow_market.provider,
            signal.slow_market.market_type,
            signal.slow_market.size,
            self.config.max_order_size_percent,
        );

        (fast_size, slow_size)
    }

    /// Calculate overall risk score (0.0-1.0, lower is better)
    fn calculate_risk_score(&self, signal: &LatencySignal) -> f64 {
        let mut score = 0.0;

        // Provider reliability factor
        let fast_reliability = self.get_provider_reliability(&signal.fast_market.provider);
        let slow_reliability = self.get_provider_reliability(&signal.slow_market.provider);
        score += (2.0 - fast_reliability - slow_reliability) * 0.3;

        // Edge decay factor
        let edge_decay = signal.disparity_cents as f64 * 0.01; // Normalize
        score += (1.0 - edge_decay).max(0.0) * 0.4;

        // Confidence factor
        score += (1.0 - signal.confidence) * 0.3;

        score.min(1.0)
    }

    /// Get provider reliability score (0.0-1.0)
    fn get_provider_reliability(&self, provider: Platform) -> f64 {
        if let Some(cb) = self.circuit_breakers.get(&provider) {
            if cb.failure_count == 0 {
                1.0
            } else {
                0.8_f64.powf(cb.failure_count as f64)
            }
        } else {
            0.5 // Unknown provider
        }
    }

    /// Record trade execution for risk tracking
    pub async fn record_trade_execution(&mut self, result: &crate::latency_execution::LatencyExecutionResult) {
        // Update circuit breakers
        if result.success {
            if let Some(cb) = self.circuit_breakers.get_mut(&Platform::Kalshi) { // TODO: Get actual providers
                cb.record_success();
            }
        } else {
            if let Some(cb) = self.circuit_breakers.get_mut(&Platform::Kalshi) {
                cb.record_failure(&self.config);
            }
        }

        // Update exposure tracking
        // TODO: Implement proper exposure tracking
    }

    /// Monitor and send risk alerts
    pub async fn monitor_risks(&mut self) {
        let current_time = Instant::now();

        // Monitor circuit breaker states
        for (provider, cb) in &self.circuit_breakers {
            match cb.state {
                CircuitState::Open => {
                    let _ = self.alert_tx.send(RiskAlert::CircuitBreaker {
                        provider: *provider,
                        state: "OPEN".to_string(),
                    });
                }
                CircuitState::HalfOpen => {
                    let _ = self.alert_tx.send(RiskAlert::CircuitBreaker {
                        provider: *provider,
                        state: "HALF_OPEN".to_string(),
                    });
                }
                CircuitState::Closed => {} // Normal state
            }
        }

        // Monitor exposure limits
        for (provider, exposure) in &self.provider_exposure {
            if exposure.net_exposure_cents.abs() > self.config.max_provider_exposure_cents * 8 / 10 { // 80% warning
                let _ = self.alert_tx.send(RiskAlert::ExposureLimit {
                    provider: *provider,
                    exposure_cents: exposure.net_exposure_cents,
                    limit_cents: self.config.max_provider_exposure_cents,
                });
            }
        }

        // Clean up old alerts
        self.decay_monitor.alerts_sent.retain(|_, time| {
            time.elapsed() < Duration::from_secs(3600) // Keep alerts for 1 hour
        });
    }
}

/// Trade risk assessment result
#[derive(Debug, Clone)]
pub struct TradeRiskAssessment {
    pub approved: bool,
    pub recommended_fast_size: SizeCents,
    pub recommended_slow_size: SizeCents,
    pub risk_score: f64,
    pub warnings: Vec<String>,
}

/// Risk rejection reasons
#[derive(Debug, Clone)]
pub enum RiskRejectionReason {
    CircuitBreaker,
    ExposureLimit,
    HalfLifeDecay,
    ProviderFailure,
}

impl Default for RiskManagementEngine {
    fn default() -> Self {
        let (engine, _) = Self::new(
            RiskConfig::default(),
            Arc::new(RwLock::new(LatencyArbitrageEngine::new())),
            Arc::new(RwLock::new(FeedAggregator::default())),
        );
        engine
    }
}
