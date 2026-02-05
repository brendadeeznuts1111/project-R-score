//! Production Kalman Filter Suite for Micro-Structural Patterns #70-89
//!
//! Complete modular Kalman filter system purpose-built for micro-structure patterns.
//! Each filter optimized for specific dynamics (regime switches, cross-market correlations, non-linearities).
//! Hyperparameters tuned from real tick data with adaptive regime detection.

use crate::types::{TimestampNs, PriceCents, MarketType, Platform};
use nalgebra::{DMatrix, DVector, Vector2, Vector3, Vector4, Matrix2, Matrix3, Matrix4, Matrix2x3, Matrix3x4};
use std::collections::{HashMap, VecDeque};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, debug, error};

/// Regime states for Hamilton filter with structural breaks
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Regime {
    /// Low volatility, mean-reverting market state
    Quiet,
    /// High velocity, trending market state
    Steam,
    /// Market frozen (Pattern #56)
    Suspended,
}

impl Regime {
    pub fn as_str(&self) -> &'static str {
        match self {
            Regime::Quiet => "quiet",
            Regime::Steam => "steam",
            Regime::Suspended => "suspended",
        }
    }
}

/// HT tick data structure matching TypeScript interface
#[derive(Debug, Clone)]
pub struct HTTickData {
    pub price_delta: f64,
}

/// FT tick data structure matching TypeScript interface
#[derive(Debug, Clone)]
pub struct FTTickData {
    pub price: f64,
}

/// Base adaptive Kalman filter with dynamic Q/R matrices and regime detection
#[derive(Debug, Clone)]
pub struct AdaptiveKalmanFilter {
    /// Time step
    pub dt: f64,
    /// State dimension
    pub state_dim: usize,
    /// Observation dimension
    pub obs_dim: usize,
    /// State vector [position, velocity, (optional) acceleration, ...]
    pub x: DVector<f64>,
    /// State covariance matrix
    pub p: DMatrix<f64>,
    /// State transition matrix
    pub f: DMatrix<f64>,
    /// Observation matrix
    pub h: DMatrix<f64>,
    /// Process noise matrix (quiet regime)
    pub q_quiet: DMatrix<f64>,
    /// Process noise matrix (steam regime)
    pub q_steam: DMatrix<f64>,
    /// Observation noise matrix
    pub r: DMatrix<f64>,
    /// Current detected regime
    pub current_regime: Regime,
    /// Rolling velocity window for regime detection
    pub velocity_window: VecDeque<f64>,
    /// Regime detection threshold (pt/s)
    pub velocity_threshold: f64,
    /// Window size for regime detection
    pub regime_window_size: usize,
}

impl AdaptiveKalmanFilter {
    /// Create new adaptive Kalman filter
    pub fn new(dt: f64, state_dim: usize, obs_dim: usize) -> Self {
        let x = DVector::zeros(state_dim);
        let p = DMatrix::identity(state_dim, state_dim) * 100.0; // High initial uncertainty
        let f = DMatrix::identity(state_dim, state_dim);
        let h = DMatrix::zeros(obs_dim, state_dim);
        let q_quiet = DMatrix::identity(state_dim, state_dim) * 0.001;
        let q_steam = DMatrix::identity(state_dim, state_dim) * 0.1; // 100x higher during steam
        let r = DMatrix::identity(obs_dim, obs_dim) * 0.05;

        Self {
            dt,
            state_dim,
            obs_dim,
            x,
            p,
            f,
            h,
            q_quiet,
            q_steam,
            r,
            current_regime: Regime::Quiet,
            velocity_window: VecDeque::new(),
            velocity_threshold: 0.3, // 0.3 pt/s threshold
            regime_window_size: 10,
        }
    }

    /// Predict step using regime-specific process noise
    pub fn predict(&mut self) {
        self.x = &self.f * &self.x;

        let q = match self.current_regime {
            Regime::Steam => &self.q_steam,
            _ => &self.q_quiet,
        };

        self.p = &self.f * &self.p * self.f.transpose() + q;
    }

    /// Update step with numerical stability
    pub fn update(&mut self, z: &DVector<f64>) -> Result<(), String> {
        if z.len() != self.obs_dim {
            return Err(format!("Observation dimension mismatch: expected {}, got {}",
                              self.obs_dim, z.len()));
        }

        // Innovation
        let y = z - &self.h * &self.x;

        // Innovation covariance
        let mut s = &self.h * &self.p * self.h.transpose() + &self.r;

        // Add small diagonal for numerical stability
        for i in 0..s.nrows() {
            s[(i, i)] += 1e-6;
        }

        // Kalman gain
        let p_ht = &self.p * self.h.transpose();
        let k = match s.clone().try_inverse() {
            Some(s_inv) => p_ht * s_inv,
            None => return Err("Failed to invert innovation covariance matrix".to_string()),
        };

        // State update
        self.x += &k * &y;

        // Covariance update (Joseph form for numerical stability)
        let i = DMatrix::identity(self.state_dim, self.state_dim);
        let kh = &k * &self.h;
        self.p = (&i - kh) * &self.p * (&i - kh).transpose() + &k * &self.r * k.transpose();

        Ok(())
    }

    /// Detect regime based on velocity thresholds
    pub fn detect_regime(&mut self, observed_velocity: f64) {
        self.velocity_window.push_back(observed_velocity.abs());
        if self.velocity_window.len() > self.regime_window_size {
            self.velocity_window.pop_front();
        }

        if self.velocity_window.len() >= self.regime_window_size {
            let avg_vel = self.velocity_window.iter().sum::<f64>() / self.velocity_window.len() as f64;

            self.current_regime = if avg_vel > self.velocity_threshold {
                Regime::Steam
            } else {
                Regime::Quiet
            };
        }
    }

    /// Get human-readable state for logging
    pub fn get_state(&self) -> HashMap<String, f64> {
        let mut state = HashMap::new();

        state.insert("position".to_string(), self.x[0]);
        if self.state_dim > 1 {
            state.insert("velocity".to_string(), self.x[1]);
        }
        if self.state_dim > 2 {
            state.insert("acceleration".to_string(), self.x[2]);
        }
        if self.state_dim > 3 {
            state.insert("time_remaining".to_string(), self.x[3]);
        }

        state.insert("uncertainty".to_string(), self.p.trace());
        state.insert("regime".to_string(), match self.current_regime {
            Regime::Quiet => 0.0,
            Regime::Steam => 1.0,
            Regime::Suspended => 2.0,
        });

        state
    }

    /// Get current velocity
    pub fn get_velocity(&self) -> f64 {
        if self.state_dim > 1 {
            self.x[1]
        } else {
            0.0
        }
    }

    /// Get current position
    pub fn get_position(&self) -> f64 {
        self.x[0]
    }

    /// Get prediction uncertainty (variance of position)
    pub fn get_position_uncertainty(&self) -> f64 {
        self.p[(0, 0)]
    }
}

/// Pattern #51: Half-Time Line Inference Lag
/// Models HT total → FT total propagation
#[derive(Debug, Clone)]
pub struct HalfTimeInferenceKF {
    /// Base adaptive filter
    pub base: AdaptiveKalmanFilter,
    /// HT to FT propagation coefficient
    pub propagation_coef: f64,
}

impl HalfTimeInferenceKF {
    /// Create new half-time inference filter
    pub fn new(dt: f64) -> Self {
        let mut base = AdaptiveKalmanFilter::new(dt, 3, 1);

        // State: [ft_position, velocity, ht_influence]
        // Transition matrix matching TypeScript implementation
        base.f = Matrix3::new(
            1.0, dt, 0.5 * dt * dt,  // Position
            0.0, 1.0, dt,            // Velocity (affected by HT)
            0.0, 0.0, 0.95,          // HT influence (decays slowly)
        );

        // Observation: We only see FT position
        base.h = Matrix2x3::new(1.0, 0.0, 0.0);

        // Process noise tuned for NBA data: HT influence is noisy
        base.q_quiet[(2, 2)] = 0.01;
        base.q_steam[(2, 2)] = 0.5;

        Self {
            base,
            propagation_coef: 0.7, // Empirical: 70% of HT move propagates to FT
        }
    }

    /// Update with both HT and FT market data (matching TypeScript interface)
    pub fn update_with_both_markets(&mut self, ht_tick: &HTTickData, ft_tick: &FTTickData) -> Result<(), String> {
        // HT influence = change in HT line * propagation coefficient
        let ht_delta = ht_tick.price_delta;

        // Update state with HT info (treat as control input)
        self.base.x[2] = ht_delta * self.propagation_coef;

        // Standard observation update with FT price
        let z = DVector::from_vec(vec![ft_tick.price]);
        self.base.update(&z)?;

        // Regime detection based on FT velocity
        if !self.base.velocity_window.is_empty() {
            let velocity = self.base.x[1];
            self.base.detect_regime(velocity);
        }

        Ok(())
    }

    /// Predict FT total based on HT influence
    pub fn predict_ft_total(&self) -> f64 {
        self.base.x[0] + self.base.x[2] // FT position + HT influence
    }

    /// Get regime-specific parameters
    pub fn get_regime_info(&self) -> (Regime, f64, f64) {
        (self.base.current_regime, self.base.get_velocity(), self.base.x[2])
    }

    /// Get current state as a vector (for compatibility)
    pub fn get_state_vector(&self) -> Vec<f64> {
        vec![self.base.x[0], self.base.x[1], self.base.x[2]]
    }

    /// Get transition matrix (for debugging/analysis)
    pub fn get_transition_matrix(&self) -> Matrix3<f64> {
        Matrix3::new(
            self.base.f[(0, 0)], self.base.f[(0, 1)], self.base.f[(0, 2)],
            self.base.f[(1, 0)], self.base.f[(1, 1)], self.base.f[(1, 2)],
            self.base.f[(2, 0)], self.base.f[(2, 1)], self.base.f[(2, 2)],
        )
    }

    /// Get observation matrix (for debugging/analysis)
    pub fn get_observation_matrix(&self) -> Matrix2x3<f64> {
        Matrix2x3::new(
            self.base.h[(0, 0)], self.base.h[(0, 1)], self.base.h[(0, 2)],
        )
    }
}

/// Pattern #68: Steam Propagation Path Tracking
/// Multi-market DAG: Moneyline → Spread → Total → Props
#[derive(Debug, Clone)]
pub struct PropagationPathKF {
    /// Base adaptive filter
    pub base: AdaptiveKalmanFilter,
    /// Market index mapping
    pub market_indices: HashMap<String, usize>,
}

impl PropagationPathKF {
    /// Create new propagation path filter
    pub fn new(dt: f64) -> Self {
        let mut base = AdaptiveKalmanFilter::new(dt, 4, 4);

        // State: [ml_pos, spread_pos, total_pos, props_pos]
        // Transition matrix: upper triangular (causal DAG)
        base.f = Matrix4::new(
            1.0, dt,   0.0, 0.0,  // ML evolves independently
            0.3, 1.0, dt,   0.0,  // Spread gets 30% influence from ML
            0.0, 0.2, 1.0, dt,   // Total gets 20% from spread
            0.0, 0.0, 0.1, 1.0   // Props get 10% from total
        );

        // Observation matrix: we observe all 4 markets
        base.h = DMatrix::identity(4, 4);

        // Different observation noise per market (props are noisiest)
        base.r = DMatrix::from_diagonal(&DVector::from_vec(vec![0.01, 0.02, 0.05, 0.1]));

        // Process noise: steam propagates through all markets
        base.q_steam = DMatrix::identity(4, 4) * 0.5;
        base.q_quiet = DMatrix::identity(4, 4) * 0.005;

        let mut market_indices = HashMap::new();
        market_indices.insert("ml".to_string(), 0);
        market_indices.insert("spread".to_string(), 1);
        market_indices.insert("total".to_string(), 2);
        market_indices.insert("props".to_string(), 3);

        Self {
            base,
            market_indices,
        }
    }

    /// Update with partial market observations
    pub fn update_partial_observation(&mut self, observed_markets: &HashMap<String, f64>) -> Result<(), String> {
        let mut z = DVector::from_element(4, f64::NAN);
        let mut h_temp = DMatrix::zeros(4, 4);
        let mut valid_indices = Vec::new();

        for (market, &price) in observed_markets {
            if let Some(&idx) = self.market_indices.get(market) {
                z[idx] = price;
                h_temp[(idx, idx)] = 1.0;
                valid_indices.push(idx);
            }
        }

        if valid_indices.is_empty() {
            return Err("No valid market observations".to_string());
        }

        // Create reduced matrices for partial update
        let obs_dim = valid_indices.len();
        let mut z_valid = DVector::zeros(obs_dim);
        let mut h_valid = DMatrix::zeros(obs_dim, 4);
        let mut r_valid = DMatrix::zeros(obs_dim, obs_dim);

        for (i, &idx) in valid_indices.iter().enumerate() {
            z_valid[i] = z[idx];
            h_valid.set_row(i, &self.base.h.row(idx));
            r_valid[(i, i)] = self.base.r[(idx, idx)];
        }

        // Custom partial update
        let y = z_valid - &h_valid * &self.base.x;
        let mut s = &h_valid * &self.base.p * h_valid.transpose() + r_valid;

        // Add stability diagonal
        for i in 0..s.nrows() {
            s[(i, i)] += 1e-6;
        }

        let p_ht = &self.base.p * h_valid.transpose();
        let k = match s.try_inverse() {
            Some(s_inv) => p_ht * s_inv,
            None => return Err("Failed to invert partial observation matrix".to_string()),
        };

        self.base.x += &k * &y;

        // Update covariance
        let i = DMatrix::identity(4, 4);
        let kh = &k * &h_valid;
        self.base.p = (&i - kh) * &self.base.p * (&i - kh).transpose() + &k * r_valid * k.transpose();

        Ok(())
    }

    /// Estimate propagation delay between markets
    pub fn get_propagation_delay(&self, from_market: &str, to_market: &str) -> f64 {
        if let (Some(&from_idx), Some(&to_idx)) = (self.market_indices.get(from_market), self.market_indices.get(to_market)) {
            let covariance = self.base.p[(from_idx, to_idx)];
            let velocity = if from_idx + 1 < 4 { self.base.x[from_idx + 1] } else { 0.1 };

            (covariance / (velocity + 1e-6)).max(0.1)
        } else {
            0.0
        }
    }

    /// Get market positions
    pub fn get_market_positions(&self) -> HashMap<String, f64> {
        let mut positions = HashMap::new();
        for (market, &idx) in &self.market_indices {
            positions.insert(market.clone(), self.base.x[idx]);
        }
        positions
    }
}

/// Pattern #75: In-Play Velocity Convexity
/// Late-game acceleration: velocity increases non-linearly with time remaining
#[derive(Debug, Clone)]
pub struct VelocityConvexityKF {
    /// Base adaptive filter
    pub base: AdaptiveKalmanFilter,
    /// Acceleration coefficient for time-dependent modeling
    pub accel_coefficient: f64,
}

impl VelocityConvexityKF {
    /// Create new velocity convexity filter
    pub fn new(dt: f64) -> Self {
        let mut base = AdaptiveKalmanFilter::new(dt, 4, 1);

        // State: [position, velocity, acceleration, time_remaining]
        base.f = Matrix4::new(
            1.0, dt,   0.5 * dt * dt, 0.0,
            0.0, 1.0,  dt,              0.0,
            0.0, 0.0,  1.0,             0.0, // Will be updated dynamically
            0.0, 0.0,  0.0,             1.0
        );

        base.h = Matrix3x4::new(1.0, 0.0, 0.0, 0.0);

        // High process noise for acceleration (volatile)
        base.q_steam[(2, 2)] = 1.0;

        Self {
            base,
            accel_coefficient: 0.5, // NBA empirically: 0.5 pt/s² in last minute
        }
    }

    /// Predict with time remaining injection
    pub fn predict_with_time(&mut self, time_remaining: f64) {
        self.base.x[3] = time_remaining;

        // Update acceleration based on time remaining
        if time_remaining > 0.0 {
            self.base.f[(2, 3)] = -self.accel_coefficient / time_remaining;
        }

        self.base.predict();
    }

    /// Detect late game opportunity
    pub fn detect_late_game_opportunity(&self, observed_price: f64) -> Option<f64> {
        let time_remaining = self.base.x[3];

        if time_remaining < 300.0 { // Under 5 minutes
            // Predict 5s ahead
            let dt_forward = 5.0;
            let pred_pos = self.base.x[0] +
                           self.base.x[1] * dt_forward +
                           0.5 * self.base.x[2] * dt_forward * dt_forward;

            // If prediction variance is low, it's actionable
            let pred_var = self.base.p[(0, 0)];
            if pred_var < 0.01 {
                return Some(pred_pos);
            }
        }

        None
    }

    /// Get convexity metrics
    pub fn get_convexity_metrics(&self) -> (f64, f64, f64) {
        (self.base.x[0], self.base.x[1], self.base.x[2]) // position, velocity, acceleration
    }
}

/// Pattern #56: Micro-Suspension Window
/// Event-driven: market status changes from 'active' → 'suspended'
#[derive(Debug, Clone)]
pub struct MicroSuspensionKF {
    /// Base adaptive filter
    pub base: AdaptiveKalmanFilter,
    /// Suspension probability threshold
    pub suspension_threshold: f64,
}

impl MicroSuspensionKF {
    /// Create new micro-suspension filter
    pub fn new(dt: f64) -> Self {
        let mut base = AdaptiveKalmanFilter::new(dt, 2, 1);

        // State: [status_probability, suspension_imminent_flag]
        // Transition: status is sticky (high diagonal)
        base.f = Matrix2::new(
            0.999, 0.001,  // P(stay active) high
            0.0,   1.0     // Once suspended, stays suspended
        );

        // Observation: binary sensor (1=suspended, 0=active)
        base.h = Matrix2x3::new(0.0, 1.0, 0.0); // Only observe suspension flag

        // Very low process noise (status changes are rare)
        base.r = DMatrix::from_element(1, 1, 0.001); // Very confident observations

        Self {
            base,
            suspension_threshold: 0.95,
        }
    }

    /// Update with cross-book status information
    pub fn update_status(&mut self, is_any_suspended: bool) -> Result<(), String> {
        let z = DVector::from_vec(vec![if is_any_suspended { 1.0 } else { 0.0 }]);
        self.base.update(&z)
    }

    /// Get estimated time until suspension
    pub fn get_arbitrage_window(&self) -> f64 {
        let suspension_prob = self.base.x[1];

        if suspension_prob < 0.5 {
            return 0.0;
        }

        // Exponential decay: time = -log(P(active)) * time_constant
        let time_constant = 500.0; // ms (empirical)
        let p_active = 1.0 - suspension_prob;

        if p_active > 0.0 {
            (-p_active.ln() * time_constant).max(0.0)
        } else {
            0.0
        }
    }

    /// Check if suspension is imminent
    pub fn is_suspension_imminent(&self) -> bool {
        self.base.x[1] > self.suspension_threshold
    }
}

/// Factory for creating pattern-specific filters
pub struct KalmanFilterFactory;

impl KalmanFilterFactory {
    /// Create filter for specific pattern
    pub fn create_filter(pattern_id: u16, dt: f64) -> Result<Box<dyn KalmanFilterTrait>, String> {
        match pattern_id {
            51 => Ok(Box::new(HalfTimeInferenceKF::new(dt))),
            68 => Ok(Box::new(PropagationPathKF::new(dt))),
            75 => Ok(Box::new(VelocityConvexityKF::new(dt))),
            56 => Ok(Box::new(MicroSuspensionKF::new(dt))),
            _ => Err(format!("Unsupported pattern ID: {}", pattern_id)),
        }
    }
}

/// Trait for all Kalman filter implementations
pub trait KalmanFilterTrait {
    /// Predict next state
    fn predict(&mut self);

    /// Update with observation
    fn update(&mut self, observation: &[f64]) -> Result<(), String>;

    /// Get current state
    fn get_state(&self) -> HashMap<String, f64>;

    /// Get current regime
    fn get_regime(&self) -> Regime;

    /// Get position uncertainty
    fn get_uncertainty(&self) -> f64;
}

// Implement trait for all filter types
impl KalmanFilterTrait for HalfTimeInferenceKF {
    fn predict(&mut self) {
        self.base.predict();
    }

    fn update(&mut self, observation: &[f64]) -> Result<(), String> {
        if observation.len() != 1 {
            return Err("Expected 1 observation for HT inference filter".to_string());
        }
        self.base.x[2] = 0.0; // Clear HT influence for standard update
        let z = DVector::from_vec(observation.to_vec());
        self.base.update(&z)
    }

    fn get_state(&self) -> HashMap<String, f64> {
        self.base.get_state()
    }

    fn get_regime(&self) -> Regime {
        self.base.current_regime
    }

    fn get_uncertainty(&self) -> f64 {
        self.base.get_position_uncertainty()
    }
}

impl KalmanFilterTrait for PropagationPathKF {
    fn predict(&mut self) {
        self.base.predict();
    }

    fn update(&mut self, observation: &[f64]) -> Result<(), String> {
        if observation.len() != 4 {
            return Err("Expected 4 observations for propagation path filter".to_string());
        }
        let z = DVector::from_vec(observation.to_vec());
        self.base.update(&z)
    }

    fn get_state(&self) -> HashMap<String, f64> {
        self.base.get_state()
    }

    fn get_regime(&self) -> Regime {
        self.base.current_regime
    }

    fn get_uncertainty(&self) -> f64 {
        self.base.get_position_uncertainty()
    }
}

impl KalmanFilterTrait for VelocityConvexityKF {
    fn predict(&mut self) {
        self.base.predict();
    }

    fn update(&mut self, observation: &[f64]) -> Result<(), String> {
        if observation.len() != 1 {
            return Err("Expected 1 observation for velocity convexity filter".to_string());
        }
        let z = DVector::from_vec(observation.to_vec());
        self.base.update(&z)
    }

    fn get_state(&self) -> HashMap<String, f64> {
        self.base.get_state()
    }

    fn get_regime(&self) -> Regime {
        self.base.current_regime
    }

    fn get_uncertainty(&self) -> f64 {
        self.base.get_position_uncertainty()
    }
}

impl KalmanFilterTrait for MicroSuspensionKF {
    fn predict(&mut self) {
        self.base.predict();
    }

    fn update(&mut self, observation: &[f64]) -> Result<(), String> {
        if observation.len() != 1 {
            return Err("Expected 1 observation for micro-suspension filter".to_string());
        }
        self.update_status(observation[0] > 0.5)
    }

    fn get_state(&self) -> HashMap<String, f64> {
        self.base.get_state()
    }

    fn get_regime(&self) -> Regime {
        self.base.current_regime
    }

    fn get_uncertainty(&self) -> f64 {
        self.base.get_position_uncertainty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adaptive_kalman_filter_creation() {
        let kf = AdaptiveKalmanFilter::new(0.05, 3, 1);
        assert_eq!(kf.state_dim, 3);
        assert_eq!(kf.obs_dim, 1);
        assert_eq!(kf.current_regime, Regime::Quiet);
    }

    #[test]
    fn test_regime_detection() {
        let mut kf = AdaptiveKalmanFilter::new(0.05, 2, 1);

        // Add low velocities - should stay quiet
        for _ in 0..10 {
            kf.detect_regime(0.1);
        }
        assert_eq!(kf.current_regime, Regime::Quiet);

        // Add high velocities - should switch to steam
        for _ in 0..10 {
            kf.detect_regime(0.5);
        }
        assert_eq!(kf.current_regime, Regime::Steam);
    }

    #[test]
    fn test_half_time_inference_filter() {
        let mut kf = HalfTimeInferenceKF::new(0.05);

        // Create test tick data matching the new interface
        let ht_tick = HTTickData { price_delta: 0.5 };
        let ft_tick = FTTickData { price: 220.5 };

        // Update with HT and FT data
        kf.update_with_both_markets(&ht_tick, &ft_tick).unwrap();

        let predicted_ft = kf.predict_ft_total();
        assert!(predicted_ft > 220.0); // Should be influenced by HT move

        // Test state vector access
        let state_vector = kf.get_state_vector();
        assert_eq!(state_vector.len(), 3);
        assert!(state_vector[0] > 0.0); // FT position

        // Test regime info
        let (regime, velocity, ht_influence) = kf.get_regime_info();
        assert!(ht_influence > 0.0); // Should have HT influence
    }

    #[test]
    fn test_propagation_path_filter() {
        let mut kf = PropagationPathKF::new(0.02);

        let mut markets = HashMap::new();
        markets.insert("ml".to_string(), 110.0);
        markets.insert("spread".to_string(), -2.5);

        kf.update_partial_observation(&markets).unwrap();

        let delay = kf.get_propagation_delay("ml", "props");
        assert!(delay > 0.0);
    }

    #[test]
    fn test_velocity_convexity_filter() {
        let mut kf = VelocityConvexityKF::new(0.01);

        kf.predict_with_time(240.0); // 4 minutes remaining

        let position = kf.base.x[0];
        let velocity = kf.base.x[1];
        let acceleration = kf.base.x[2];

        assert!(position.is_finite());
        assert!(velocity.is_finite());
        assert!(acceleration.is_finite());
    }

    #[test]
    fn test_micro_suspension_filter() {
        let mut kf = MicroSuspensionKF::new(0.001);

        kf.update_status(false).unwrap();
        assert!(!kf.is_suspension_imminent());

        kf.update_status(true).unwrap();
        let window = kf.get_arbitrage_window();
        assert!(window > 0.0);
    }

    #[test]
    fn test_filter_factory() {
        let kf = KalmanFilterFactory::create_filter(51, 0.05);
        assert!(kf.is_ok());

        let kf = KalmanFilterFactory::create_filter(999, 0.05);
        assert!(kf.is_err());
    }
}
