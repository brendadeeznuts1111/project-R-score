//! Latency Arbitrage Module: Propagation Half-Life Framework
//!
//! Implements the deep latency & cross-market arbitrage system as described
//! in the Propagation Half-Life Framework. This module handles multi-market
//! feed aggregation, cross-correlation detection, half-life modeling, and
//! predictive execution timing.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use rustc_hash::FxHashMap;

use crate::types::*;

/// Market tier classification for half-life modeling
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarketTier {
    /// Tier 1: Core Markets (200-400ms half-life)
    Tier1,
    /// Tier 2: Derived Markets (400ms-1.5s half-life)
    Tier2,
    /// Tier 3: Proposition Markets (800ms-2s half-life)
    Tier3,
    /// Tier 4: Complex Derivatives (2-5s half-life)
    Tier4,
}

impl MarketTier {
    /// Get the characteristic half-life in milliseconds for this tier
    pub fn half_life_ms(&self) -> f64 {
        match self {
            MarketTier::Tier1 => 300.0,  // 200-400ms average
            MarketTier::Tier2 => 950.0,  // 400ms-1.5s average
            MarketTier::Tier3 => 1400.0, // 800ms-2s average
            MarketTier::Tier4 => 3500.0, // 2-5s average
        }
    }

    /// Get the update constraint description
    pub fn constraint(&self) -> &'static str {
        match self {
            MarketTier::Tier1 => "Direct betting volume",
            MarketTier::Tier2 => "Model calculation time",
            MarketTier::Tier3 => "Provider feed latency",
            MarketTier::Tier4 => "Correlation matrix updates",
        }
    }
}

/// Cross-market price observation with latency metadata
#[derive(Debug, Clone)]
pub struct PriceObservation {
    pub market_id: u16,
    pub provider: Platform,
    pub market_type: MarketType,
    pub price: PriceCents,
    pub size: SizeCents,
    pub timestamp_ns: TimestampNs,
    pub tier: MarketTier,
}

/// Latency disparity signal for arbitrage detection
#[derive(Debug, Clone)]
pub struct LatencySignal {
    pub fast_market: PriceObservation,
    pub slow_market: PriceObservation,
    pub disparity_cents: i16,
    pub expected_convergence_ns: u64,
    pub pattern_id: Option<u16>, // #70-#89 pattern identifier
    pub confidence: f64, // 0.0-1.0
}

/// Propagation half-life state for a market pair
#[derive(Debug)]
pub struct HalfLifeState {
    pub market_a: u16,
    pub market_b: u16,
    pub lambda: f64, // convergence speed (1/half-life)
    pub sigma: f64, // volatility component
    pub last_update_ns: TimestampNs,
    pub convergence_history: Vec<(TimestampNs, f64)>, // timestamp, convergence speed
}

/// Kalman filter for convergence prediction
pub struct ConvergenceKalman {
    // State: [price_diff, velocity, acceleration]
    state: [f64; 3],
    covariance: [[f64; 3]; 3],
    process_noise: f64,
    measurement_noise: f64,
}

impl ConvergenceKalman {
    pub fn new() -> Self {
        Self {
            state: [0.0, 0.0, 0.0],
            covariance: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            process_noise: 0.01,
            measurement_noise: 0.1,
        }
    }

    /// Predict next state
    pub fn predict(&mut self, dt: f64) {
        // Simple kinematic model: constant acceleration
        let x = self.state[0] + self.state[1] * dt + 0.5 * self.state[2] * dt * dt;
        let v = self.state[1] + self.state[2] * dt;
        let a = self.state[2];

        self.state = [x, v, a];

        // Update covariance with process noise
        // Simplified: add process noise to diagonal
        for i in 0..3 {
            self.covariance[i][i] += self.process_noise;
        }
    }

    /// Update with measurement
    pub fn update(&mut self, measurement: f64) {
        let residual = measurement - self.state[0];
        let residual_cov = self.covariance[0][0] + self.measurement_noise;

        let kalman_gain = [
            self.covariance[0][0] / residual_cov,
            self.covariance[1][0] / residual_cov,
            self.covariance[2][0] / residual_cov,
        ];

        for i in 0..3 {
            self.state[i] += kalman_gain[i] * residual;
        }

        // Update covariance
        let temp_cov = self.covariance;
        for i in 0..3 {
            for j in 0..3 {
                self.covariance[i][j] = (1.0 - kalman_gain[i]) * temp_cov[i][j];
            }
        }
    }

    /// Get predicted convergence time
    pub fn predicted_convergence_time(&self, threshold: f64) -> Option<f64> {
        if self.state[0].abs() < threshold {
            return Some(0.0);
        }

        // Solve quadratic for when price_diff = 0
        // 0 = x + v*t + 0.5*a*t^2
        // 0.5*a*t^2 + v*t + x = 0
        let a = 0.5 * self.state[2];
        let b = self.state[1];
        let c = self.state[0];

        let discriminant = b * b - 4.0 * a * c;
        if discriminant < 0.0 {
            return None;
        }

        let sqrt_d = discriminant.sqrt();
        let t1 = (-b - sqrt_d) / (2.0 * a);
        let t2 = (-b + sqrt_d) / (2.0 * a);

        // Return smallest positive time
        if t1 > 0.0 && t2 > 0.0 {
            Some(t1.min(t2))
        } else if t1 > 0.0 {
            Some(t1)
        } else if t2 > 0.0 {
            Some(t2)
        } else {
            None
        }
    }
}

/// Core latency arbitrage engine
pub struct LatencyArbitrageEngine {
    /// Multi-market price feeds
    pub price_feeds: FxHashMap<(u16, Platform), TimestampedOrderbook>,
    /// Half-life states for market pairs
    pub half_life_states: FxHashMap<(u16, u16), HalfLifeState>,
    /// Active convergence filters
    pub kalman_filters: FxHashMap<(u16, u16), ConvergenceKalman>,
    /// Detected latency signals
    pub signals: Vec<LatencySignal>,
    /// Market tier mappings
    pub market_tiers: FxHashMap<u16, MarketTier>,
}

impl LatencyArbitrageEngine {
    pub fn new() -> Self {
        Self {
            price_feeds: FxHashMap::default(),
            half_life_states: FxHashMap::default(),
            kalman_filters: FxHashMap::default(),
            signals: Vec::new(),
            market_tiers: FxHashMap::default(),
        }
    }

    /// Add price observation from a market feed
    pub fn add_price_observation(&mut self, obs: PriceObservation) {
        let key = (obs.market_id, obs.provider);

        // Get or create orderbook for this market-provider pair
        let orderbook = self.price_feeds.entry(key).or_insert_with(TimestampedOrderbook::new);

        // Update the orderbook (assuming binary for now - YES side)
        // TODO: Extend for non-binary markets
        orderbook.update_yes(obs.price, obs.size, obs.timestamp_ns);

        // Update tier mapping
        self.market_tiers.insert(obs.market_id, obs.tier);

        // Trigger correlation analysis
        self.analyze_correlations(obs.market_id, obs.timestamp_ns);
    }

    /// Analyze cross-market correlations for latency signals
    fn analyze_correlations(&mut self, updated_market: u16, timestamp_ns: TimestampNs) {
        let updated_tier = match self.market_tiers.get(&updated_market) {
            Some(tier) => *tier,
            None => return,
        };

        // Find correlated markets (same event, different tiers/types)
        for (&(market_a, provider_a), orderbook_a) in &self.price_feeds {
            for (&(market_b, provider_b), orderbook_b) in &self.price_feeds {
                if market_a >= market_b {
                    continue; // Avoid duplicates
                }

                if provider_a == provider_b {
                    continue; // Skip same provider
                }

                let tier_a = match self.market_tiers.get(&market_a) {
                    Some(t) => *t,
                    None => continue,
                };
                let tier_b = match self.market_tiers.get(&market_b) {
                    Some(t) => *t,
                    None => continue,
                };

                // Load prices with timestamps
                let (price_a, _, size_a, _, ts_a) = orderbook_a.load();
                let (price_b, _, size_b, _, ts_b) = orderbook_b.load();

                if price_a == 0 || price_b == 0 {
                    continue;
                }

                // Calculate latency disparity
                let time_diff_ns = ts_a.abs_diff(ts_b);
                let price_diff_cents = price_a as i16 - price_b as i16;

                // Only consider significant disparities
                if price_diff_cents.abs() < 2 || time_diff_ns < 50_000_000 { // 50ms minimum
                    continue;
                }

                // Determine which is faster (earlier timestamp)
                let (fast_obs, slow_obs) = if ts_a < ts_b {
                    (
                        PriceObservation {
                            market_id: market_a,
                            provider: provider_a,
                            market_type: MarketType::Moneyline, // TODO: Get actual type
                            price: price_a,
                            size: size_a,
                            timestamp_ns: ts_a,
                            tier: tier_a,
                        },
                        PriceObservation {
                            market_id: market_b,
                            provider: provider_b,
                            market_type: MarketType::Moneyline,
                            price: price_b,
                            size: size_b,
                            timestamp_ns: ts_b,
                            tier: tier_b,
                        },
                    )
                } else {
                    (
                        PriceObservation {
                            market_id: market_b,
                            provider: provider_b,
                            market_type: MarketType::Moneyline,
                            price: price_b,
                            size: size_b,
                            timestamp_ns: ts_b,
                            tier: tier_b,
                        },
                        PriceObservation {
                            market_id: market_a,
                            provider: provider_a,
                            market_type: MarketType::Moneyline,
                            price: price_a,
                            size: size_a,
                            timestamp_ns: ts_a,
                            tier: tier_a,
                        },
                    )
                };

                // Identify arbitrage pattern
                let pattern_id = self.identify_arbitrage_pattern(&fast_obs, &slow_obs, price_diff_cents, time_diff_ns);

                if let Some(pattern) = pattern_id {
                    let signal = LatencySignal {
                        fast_market: fast_obs,
                        slow_market: slow_obs,
                        disparity_cents: price_diff_cents,
                        expected_convergence_ns: self.predict_convergence_time(&fast_obs, &slow_obs, timestamp_ns),
                        pattern_id: Some(pattern),
                        confidence: self.calculate_pattern_confidence(pattern, price_diff_cents, time_diff_ns),
                    };

                    // Only add if convergence is predicted soon enough
                    if signal.expected_convergence_ns < 5_000_000_000 { // 5 seconds
                        self.signals.push(signal);
                    }
                }
            }
        }

        // Clean up old signals
        self.signals.retain(|s| timestamp_ns - s.fast_market.timestamp_ns < 30_000_000_000); // 30s max age
    }

    /// Predict convergence time using Kalman filter
    fn predict_convergence_time(&mut self, fast_obs: &PriceObservation, slow_obs: &PriceObservation, current_time: TimestampNs) -> u64 {
        let key = (fast_obs.market_id.min(slow_obs.market_id), fast_obs.market_id.max(slow_obs.market_id));
        let filter = self.kalman_filters.entry(key).or_insert_with(ConvergenceKalman::new);

        // For now, return estimated based on tiers
        let half_life = (fast_obs.tier.half_life_ms() + slow_obs.tier.half_life_ms()) / 2.0;
        (half_life * 1_000_000.0) as u64 // convert ms to ns
    }

    /// Identify arbitrage pattern based on framework #70-#89
    fn identify_arbitrage_pattern(&self, fast_obs: &PriceObservation, slow_obs: &PriceObservation, price_diff_cents: i16, time_diff_ns: u64) -> Option<u16> {
        // Pattern recognition based on market types and tiers
        match (fast_obs.market_type, slow_obs.market_type, fast_obs.tier, slow_obs.tier) {
            // #70: Second-Half Derivative Reversion
            (MarketType::HalfTotal, MarketType::Total, _, _) if fast_obs.tier != slow_obs.tier => Some(70),

            // #71: Quarter-to-Half Asymmetric Propagation
            (MarketType::QuarterTotal, MarketType::HalfTotal, _, _) => Some(71),

            // #72: Alt-Line Step Function Delay
            (MarketType::AltLine, _, MarketTier::Tier3, _) => Some(72),

            // #73: Player Prop to Team Total Beta Skew
            (MarketType::PlayerProp, MarketType::TeamTotal, _, _) => Some(73),

            // #74: Cross-Book Derivative Provider Sync
            (_, _, _, _) if fast_obs.provider != slow_obs.provider => Some(74),

            // Default to #73 for prop vs total disparities
            (MarketType::PlayerProp, _, _, _) if price_diff_cents.abs() > 3 => Some(73),

            // #87: Main-to-Prop Volatility Scaling
            (MarketType::Moneyline, MarketType::PlayerProp, _, _) => Some(87),

            // Default pattern
            _ => Some(70),
        }
    }

    /// Calculate confidence score for pattern (0.0-1.0)
    fn calculate_pattern_confidence(&self, pattern_id: u16, price_diff_cents: i16, time_diff_ns: u64) -> f64 {
        let base_confidence = match pattern_id {
            70..=79 => 0.8, // Derivative patterns
            80..=89 => 0.75, // Steam and behavioral patterns
            _ => 0.6,
        };

        // Adjust based on disparity magnitude
        let disparity_factor = (price_diff_cents.abs() as f64 / 10.0).min(1.0);

        // Adjust based on time difference (optimal around 100-500ms)
        let time_factor = if time_diff_ns > 100_000_000 && time_diff_ns < 500_000_000 {
            1.0
        } else if time_diff_ns > 50_000_000 && time_diff_ns < 1_000_000_000 {
            0.8
        } else {
            0.5
        };

        base_confidence * disparity_factor * time_factor
    }

    /// Get active latency signals
    pub fn get_signals(&self) -> &[LatencySignal] {
        &self.signals
    }

    /// Clear old signals (older than threshold)
    pub fn clear_old_signals(&mut self, current_time: TimestampNs, max_age_ns: u64) {
        self.signals.retain(|s| current_time - s.fast_market.timestamp_ns < max_age_ns);
    }
}

impl Default for LatencyArbitrageEngine {
    fn default() -> Self {
        Self::new()
    }
}
