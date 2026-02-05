//! Pattern #73: Player Prop to Team Total Beta Skew
//!
//! Deep latency arbitrage pattern exploiting the relationship between player props and team totals.
//! High-usage player props have a non-linear impact on team totals with measurable beta coefficients.
//! Uses Kalman filters for state estimation and recursive least squares for beta modeling.

use crate::types::{TimestampNs, PriceCents, MarketType, Platform};
use nalgebra::{DMatrix, DVector, Vector2, Matrix2};
use std::collections::HashMap;
use tracing::{info, warn, debug};

/// Player prop market state with Kalman filter
#[derive(Debug, Clone)]
pub struct PlayerPropState {
    /// Market identifier
    pub market_id: String,
    /// Player identifier
    pub player_id: String,
    /// Team identifier
    pub team_id: String,
    /// Current price (points line)
    pub price: f64,
    /// Velocity (points/second)
    pub velocity: f64,
    /// Acceleration (points/second²)
    pub acceleration: f64,
    /// Last update timestamp
    pub last_update_ns: TimestampNs,
    /// Kalman filter state
    pub kalman: KalmanFilter2D,
    /// Historical observations for beta calculation
    pub price_history: Vec<(TimestampNs, f64)>,
}

/// Team total market state with Kalman filter
#[derive(Debug, Clone)]
pub struct TeamTotalState {
    /// Market identifier
    pub market_id: String,
    /// Team identifier
    pub team_id: String,
    /// Current total line
    pub total: f64,
    /// Velocity (points/second)
    pub velocity: f64,
    /// Acceleration (points/second²)
    pub acceleration: f64,
    /// Last update timestamp
    pub last_update_ns: TimestampNs,
    /// Kalman filter state
    pub kalman: KalmanFilter2D,
    /// Historical observations for beta calculation
    pub total_history: Vec<(TimestampNs, f64)>,
}

/// Beta relationship between player prop and team total
#[derive(Debug, Clone)]
pub struct BetaRelationship {
    /// Player identifier
    pub player_id: String,
    /// Team identifier
    pub team_id: String,
    /// Current beta estimate
    pub beta: f64,
    /// Beta uncertainty (standard deviation)
    pub beta_uncertainty: f64,
    /// Player usage rate (0-1)
    pub usage_rate: f64,
    /// Last beta update timestamp
    pub last_update_ns: TimestampNs,
    /// RLS filter for beta estimation
    pub rls_filter: RecursiveLeastSquares,
    /// Historical beta values
    pub beta_history: Vec<(TimestampNs, f64)>,
}

/// Pattern #73 opportunity detection result
#[derive(Debug, Clone)]
pub struct BetaSkewOpportunity {
    /// Player prop market
    pub player_prop_market: String,
    /// Team total market
    pub team_total_market: String,
    /// Player identifier
    pub player_id: String,
    /// Team identifier
    pub team_id: String,
    /// Current player prop price
    pub current_player_price: f64,
    /// Current team total
    pub current_team_total: f64,
    /// Estimated beta
    pub beta: f64,
    /// Predicted team total change
    pub predicted_team_change: f64,
    /// Expected team total after half-life adjustment
    pub expected_team_total: f64,
    /// Current gap (expected - actual)
    pub gap: f64,
    /// Gap as percentage of total
    pub gap_percent: f64,
    /// Opportunity strength (0-1)
    pub strength: f64,
    /// Direction: 1 for over, -1 for under
    pub direction: i8,
    /// Half-life in milliseconds
    pub half_life_ms: f64,
    /// Opportunity timestamp
    pub timestamp_ns: TimestampNs,
}

/// 2D Kalman filter for price and velocity estimation
#[derive(Debug, Clone)]
pub struct KalmanFilter2D {
    /// State vector [price, velocity]
    pub state: Vector2<f64>,
    /// State covariance matrix
    pub covariance: Matrix2<f64>,
    /// Process noise covariance
    pub process_noise: Matrix2<f64>,
    /// Observation noise variance
    pub observation_noise: f64,
    /// Last prediction time
    pub last_time_ns: TimestampNs,
}

impl KalmanFilter2D {
    /// Create new 2D Kalman filter
    pub fn new(initial_price: f64, process_noise: f64, observation_noise: f64) -> Self {
        let state = Vector2::new(initial_price, 0.0);
        let covariance = Matrix2::new(
            1.0, 0.0,
            0.0, 1.0
        );
        let process_noise = Matrix2::new(
            process_noise, 0.0,
            0.0, process_noise * 0.1
        );

        Self {
            state,
            covariance,
            process_noise,
            observation_noise,
            last_time_ns: 0,
        }
    }

    /// Predict state forward to target time
    pub fn predict(&mut self, dt_ns: u64) {
        let dt = dt_ns as f64 / 1_000_000_000.0; // Convert to seconds

        // State transition matrix
        let F = Matrix2::new(
            1.0, dt,
            0.0, 1.0
        );

        // Predict state
        self.state = F * self.state;

        // Predict covariance
        self.covariance = F * self.covariance * F.transpose() + self.process_noise;
    }

    /// Update with new observation
    pub fn update(&mut self, observation: f64, timestamp_ns: TimestampNs) {
        if self.last_time_ns > 0 {
            let dt = timestamp_ns - self.last_time_ns;
            self.predict(dt);
        }

        // Observation matrix
        let H = DVector::from_vec(vec![1.0, 0.0]);

        // Innovation
        let y = observation - H.dot(&self.state);

        // Innovation covariance
        let S = H.dot(&self.covariance * &H.transpose()) + self.observation_noise;

        // Kalman gain
        let K = &self.covariance * &H.transpose() / S;

        // Update state
        self.state += K * y;

        // Update covariance
        let I = Matrix2::identity();
        self.covariance = (I - K * H.transpose()) * self.covariance;

        self.last_time_ns = timestamp_ns;
    }

    /// Get current price estimate
    pub fn get_price(&self) -> f64 {
        self.state[0]
    }

    /// Get current velocity estimate
    pub fn get_velocity(&self) -> f64 {
        self.state[1]
    }

    /// Get current acceleration estimate
    pub fn get_acceleration(&self) -> f64 {
        // Approximate from velocity changes
        self.state[1] * 0.1 // Simplified acceleration estimate
    }
}

/// Recursive Least Squares filter for beta estimation
#[derive(Debug, Clone)]
pub struct RecursiveLeastSquares {
    /// Current beta estimate
    pub beta: f64,
    /// Covariance matrix
    pub P: f64,
    /// Forgetting factor (0 < lambda <= 1)
    pub lambda: f64,
    /// Number of observations
    pub n: u32,
}

impl RecursiveLeastSquares {
    /// Create new RLS filter
    pub fn new(lambda: f64) -> Self {
        Self {
            beta: 0.5, // Initial beta guess
            P: 1000.0, // Large initial uncertainty
            lambda,
            n: 0,
        }
    }

    /// Update beta with new observation
    pub fn update(&mut self, x: f64, y: f64) {
        // Prediction error
        let error = y - self.beta * x;

        // Gain
        let K = self.P * x / (self.lambda + self.P * x * x);

        // Update beta
        self.beta += K * error;

        // Update covariance
        self.P = (1.0 / self.lambda) * (self.P - K * x * self.P);

        self.n += 1;
    }

    /// Get beta estimate
    pub fn get_beta(&self) -> f64 {
        self.beta
    }

    /// Get beta uncertainty
    pub fn get_uncertainty(&self) -> f64 {
        self.P.sqrt()
    }
}

/// Pattern #73: Player Prop to Team Total Beta Skew Engine
#[derive(Debug)]
pub struct Pattern73Engine {
    /// Player prop states
    pub player_props: HashMap<String, PlayerPropState>,
    /// Team total states
    pub team_totals: HashMap<String, TeamTotalState>,
    /// Beta relationships
    pub beta_relationships: HashMap<String, BetaRelationship>,
    /// Configuration
    pub config: Pattern73Config,
    /// Detected opportunities
    pub opportunities: Vec<BetaSkewOpportunity>,
}

/// Configuration for Pattern #73
#[derive(Debug, Clone)]
pub struct Pattern73Config {
    /// Minimum gap threshold for opportunity (points)
    pub min_gap_threshold: f64,
    /// Minimum gap percentage for opportunity
    pub min_gap_percent: f64,
    /// Maximum half-life to consider (ms)
    pub max_half_life_ms: f64,
    /// Minimum observations for beta estimation
    pub min_beta_observations: u32,
    /// Process noise for Kalman filters
    pub kalman_process_noise: f64,
    /// Observation noise for Kalman filters
    pub kalman_observation_noise: f64,
    /// RLS forgetting factor
    pub rls_forgetting_factor: f64,
    /// Minimum usage rate for high-impact players
    pub min_usage_rate: f64,
}

impl Default for Pattern73Config {
    fn default() -> Self {
        Self {
            min_gap_threshold: 0.5, // 0.5 points minimum gap
            min_gap_percent: 0.02, // 2% minimum gap percentage
            max_half_life_ms: 5000.0, // 5 seconds max half-life
            min_beta_observations: 10,
            kalman_process_noise: 0.01,
            kalman_observation_noise: 0.1,
            rls_forgetting_factor: 0.95,
            min_usage_rate: 0.2, // 20% minimum usage rate
        }
    }
}

impl Pattern73Engine {
    /// Create new Pattern #73 engine
    pub fn new(config: Pattern73Config) -> Self {
        Self {
            player_props: HashMap::new(),
            team_totals: HashMap::new(),
            beta_relationships: HashMap::new(),
            config,
            opportunities: Vec::new(),
        }
    }

    /// Add or update player prop observation
    pub fn update_player_prop(&mut self, market_id: &str, player_id: &str, team_id: &str,
                             price: f64, timestamp_ns: TimestampNs, usage_rate: f64) {
        let key = format!("{}_{}", player_id, team_id);

        let player_state = self.player_props.entry(key.clone()).or_insert_with(|| {
            PlayerPropState {
                market_id: market_id.to_string(),
                player_id: player_id.to_string(),
                team_id: team_id.to_string(),
                price,
                velocity: 0.0,
                acceleration: 0.0,
                last_update_ns: timestamp_ns,
                kalman: KalmanFilter2D::new(price, self.config.kalman_process_noise,
                                         self.config.kalman_observation_noise),
                price_history: Vec::new(),
            }
        });

        // Update Kalman filter
        player_state.kalman.update(price, timestamp_ns);
        player_state.price = player_state.kalman.get_price();
        player_state.velocity = player_state.kalman.get_velocity();
        player_state.acceleration = player_state.kalman.get_acceleration();
        player_state.last_update_ns = timestamp_ns;

        // Store price history for beta calculation
        player_state.price_history.push((timestamp_ns, price));
        if player_state.price_history.len() > 100 {
            player_state.price_history.remove(0);
        }

        // Update beta relationship if we have corresponding team total
        self.update_beta_relationship(&key, usage_rate);

        // Check for opportunities
        self.detect_opportunities(&key);
    }

    /// Add or update team total observation
    pub fn update_team_total(&mut self, market_id: &str, team_id: &str,
                            total: f64, timestamp_ns: TimestampNs) {
        let team_state = self.team_totals.entry(team_id.to_string()).or_insert_with(|| {
            TeamTotalState {
                market_id: market_id.to_string(),
                team_id: team_id.to_string(),
                total,
                velocity: 0.0,
                acceleration: 0.0,
                last_update_ns: timestamp_ns,
                kalman: KalmanFilter2D::new(total, self.config.kalman_process_noise,
                                         self.config.kalman_observation_noise),
                total_history: Vec::new(),
            }
        });

        // Update Kalman filter
        team_state.kalman.update(total, timestamp_ns);
        team_state.total = team_state.kalman.get_price();
        team_state.velocity = team_state.kalman.get_velocity();
        team_state.acceleration = team_state.kalman.get_acceleration();
        team_state.last_update_ns = timestamp_ns;

        // Store total history for beta calculation
        team_state.total_history.push((timestamp_ns, total));
        if team_state.total_history.len() > 100 {
            team_state.total_history.remove(0);
        }
    }

    /// Update beta relationship between player prop and team total
    fn update_beta_relationship(&mut self, key: &str, usage_rate: f64) {
        if usage_rate < self.config.min_usage_rate {
            return; // Skip low-usage players
        }

        let player_state = match self.player_props.get(key) {
            Some(state) => state,
            None => return,
        };

        let team_state = match self.team_totals.get(&player_state.team_id) {
            Some(state) => state,
            None => return,
        };

        // Need at least some history to estimate beta
        if player_state.price_history.len() < 2 || team_state.total_history.len() < 2 {
            return;
        }

        let beta_rel = self.beta_relationships.entry(key.to_string()).or_insert_with(|| {
            BetaRelationship {
                player_id: player_state.player_id.clone(),
                team_id: player_state.team_id.clone(),
                beta: 0.5,
                beta_uncertainty: 1.0,
                usage_rate,
                last_update_ns: 0,
                rls_filter: RecursiveLeastSquares::new(self.config.rls_forgetting_factor),
                beta_history: Vec::new(),
            }
        });

        beta_rel.usage_rate = usage_rate;

        // Calculate recent changes for beta estimation
        let player_change = self.calculate_recent_change(&player_state.price_history);
        let team_change = self.calculate_recent_change(&team_state.total_history);

        if player_change.abs() > 0.01 && team_change.abs() > 0.01 {
            // Update beta using RLS
            beta_rel.rls_filter.update(player_change, team_change);
            beta_rel.beta = beta_rel.rls_filter.get_beta();
            beta_rel.beta_uncertainty = beta_rel.rls_filter.get_uncertainty();
            beta_rel.last_update_ns = player_state.last_update_ns;

            // Store beta history
            beta_rel.beta_history.push((player_state.last_update_ns, beta_rel.beta));
            if beta_rel.beta_history.len() > 50 {
                beta_rel.beta_history.remove(0);
            }

            debug!("Updated beta for {} -> {}: {:.3} ± {:.3}",
                   beta_rel.player_id, beta_rel.team_id, beta_rel.beta, beta_rel.beta_uncertainty);
        }
    }

    /// Calculate recent price change from history
    fn calculate_recent_change(&self, history: &[(TimestampNs, f64)]) -> f64 {
        if history.len() < 2 {
            return 0.0;
        }

        // Use the most recent change
        let (_, latest_price) = history[history.len() - 1];
        let (_, previous_price) = history[history.len() - 2];

        latest_price - previous_price
    }

    /// Detect arbitrage opportunities for a player-team pair
    fn detect_opportunities(&mut self, key: &str) {
        let player_state = match self.player_props.get(key) {
            Some(state) => state,
            None => return,
        };

        let team_state = match self.team_totals.get(&player_state.team_id) {
            Some(state) => state,
            None => return,
        };

        let beta_rel = match self.beta_relationships.get(key) {
            Some(rel) => rel,
            None => return,
        };

        // Need sufficient observations and stable beta
        if beta_rel.rls_filter.n < self.config.min_beta_observations {
            return;
        }

        if beta_rel.beta_uncertainty > 0.5 {
            return; // Beta too uncertain
        }

        // Calculate expected team total based on player prop change
        let player_change = self.calculate_recent_change(&player_state.price_history);
        let predicted_team_change = beta_rel.beta * player_change;

        // Calculate half-life adjustment
        let half_life_ms = self.estimate_half_life(&player_state.team_id);
        if half_life_ms > self.config.max_half_life_ms {
            return;
        }

        // Expected team total after half-life adjustment
        let time_since_update = (player_state.last_update_ns - team_state.last_update_ns) as f64 / 1_000_000.0; // ms
        let decay_factor = 1.0 - (-time_since_update / half_life_ms).exp();
        let expected_team_total = team_state.total + predicted_team_change * decay_factor;

        // Calculate gap
        let gap = expected_team_total - team_state.total;
        let gap_percent = gap.abs() / team_state.total;

        // Check if gap exceeds threshold
        if gap.abs() >= self.config.min_gap_threshold && gap_percent >= self.config.min_gap_percent {
            let opportunity = BetaSkewOpportunity {
                player_prop_market: player_state.market_id.clone(),
                team_total_market: team_state.market_id.clone(),
                player_id: player_state.player_id.clone(),
                team_id: player_state.team_id.clone(),
                current_player_price: player_state.price,
                current_team_total: team_state.total,
                beta: beta_rel.beta,
                predicted_team_change,
                expected_team_total,
                gap,
                gap_percent,
                strength: (gap_percent / self.config.min_gap_percent).min(1.0),
                direction: if gap > 0.0 { 1 } else { -1 },
                half_life_ms,
                timestamp_ns: player_state.last_update_ns,
            };

            info!("Pattern #73 opportunity detected: {} -> {} gap {:.2} ({:.1}%) strength {:.2}",
                  opportunity.player_id, opportunity.team_id, opportunity.gap,
                  opportunity.gap_percent * 100.0, opportunity.strength);

            self.opportunities.push(opportunity);
        }
    }

    /// Estimate half-life for team total adjustment
    fn estimate_half_life(&self, team_id: &str) -> f64 {
        // Simplified half-life estimation based on market tier
        // In practice, this would be estimated from historical data
        match team_id {
            _ => 2000.0, // 2 seconds default half-life
        }
    }

    /// Get current opportunities
    pub fn get_opportunities(&self) -> &[BetaSkewOpportunity] {
        &self.opportunities
    }

    /// Clear old opportunities
    pub fn clear_old_opportunities(&mut self, max_age_ns: TimestampNs) {
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;

        self.opportunities.retain(|opp| {
            current_time - opp.timestamp_ns < max_age_ns
        });
    }

    /// Get beta relationship for a player-team pair
    pub fn get_beta_relationship(&self, player_id: &str, team_id: &str) -> Option<&BetaRelationship> {
        let key = format!("{}_{}", player_id, team_id);
        self.beta_relationships.get(&key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kalman_filter() {
        let mut kf = KalmanFilter2D::new(100.0, 0.01, 0.1);

        kf.update(100.5, 1_000_000_000);
        assert!((kf.get_price() - 100.5).abs() < 0.1);

        kf.update(101.0, 2_000_000_000);
        assert!((kf.get_price() - 101.0).abs() < 0.1);
    }

    #[test]
    fn test_rls_filter() {
        let mut rls = RecursiveLeastSquares::new(0.95);

        // Simulate some beta updates
        for i in 0..20 {
            let x = i as f64;
            let y = 0.7 * x + (rand::random::<f64>() - 0.5) * 0.1;
            rls.update(x, y);
        }

        assert!((rls.get_beta() - 0.7).abs() < 0.1);
    }

    #[test]
    fn test_pattern_73_engine() {
        let config = Pattern73Config::default();
        let mut engine = Pattern73Engine::new(config);

        // Add some test data
        engine.update_player_prop("market1", "player1", "team1", 25.5, 1_000_000_000, 0.8);
        engine.update_team_total("market2", "team1", 220.5, 1_000_000_000);

        // Should not detect opportunity yet (insufficient data)
        assert_eq!(engine.get_opportunities().len(), 0);
    }
}
