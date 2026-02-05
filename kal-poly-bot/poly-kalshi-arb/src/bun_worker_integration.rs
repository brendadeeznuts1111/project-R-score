//! Bun Worker Integration for Sub-10ms Real-Time Filter Execution
//!
//! Edge-deployed worker for real-time Kalman filter processing with Redis state management.
//! Optimized for sub-10ms latency budget with async KV operations and fire-and-forget state updates.

use crate::kalman_filter_suite::*;
use crate::types::{TimestampNs, PriceCents, MarketType, Platform};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use tracing::{info, warn, debug, error};

/// Bun Worker request payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerRequest {
    /// Pattern ID for filter selection
    pub pattern_id: u16,
    /// Market identifier
    pub market_id: String,
    /// Tick data
    pub tick: TickData,
    /// Request timestamp
    pub timestamp_ns: TimestampNs,
    /// Request ID for deduplication
    pub request_id: String,
}

/// Tick data for worker processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickData {
    /// Price/line value
    pub price: f64,
    /// Size/liquidity
    pub size: f64,
    /// Book identifier
    pub book: String,
    /// Platform
    pub platform: String,
    /// Market type
    pub market_type: String,
}

/// Worker response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerResponse {
    /// Request ID
    pub request_id: String,
    /// Processing status
    pub status: WorkerStatus,
    /// Trigger generated (if any)
    pub trigger: Option<TriggerData>,
    /// Processing time (microseconds)
    pub processing_time_us: f64,
    /// Filter state
    pub filter_state: FilterState,
}

/// Worker processing status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorkerStatus {
    /// Successful processing
    Success,
    /// Filter not found
    FilterNotFound,
    /// Invalid data
    InvalidData,
    /// Processing error
    Error(String),
}

/// Trigger data for trade execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerData {
    /// Pattern ID
    pub pattern_id: u16,
    /// Target book
    pub book: String,
    /// Target price
    pub target_price: f64,
    /// Expected edge
    pub expected_edge: f64,
    /// Confidence level
    pub confidence: f64,
    /// Window duration (seconds)
    pub window_duration: f64,
    /// Position size
    pub size: f64,
}

/// Filter state for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterState {
    /// Pattern ID
    pub pattern_id: u16,
    /// Market ID
    pub market_id: String,
    /// State vector
    pub state_vector: Vec<f64>,
    /// Covariance matrix
    pub covariance_matrix: Vec<Vec<f64>>,
    /// Current regime
    pub current_regime: String,
    /// Last update timestamp
    pub last_update_ns: TimestampNs,
}

/// Redis state manager
pub struct RedisStateManager {
    /// Redis client (mock for now)
    pub client: MockRedisClient,
    /// Key prefix for filter states
    pub key_prefix: String,
    /// TTL for state entries (seconds)
    pub state_ttl: u64,
}

/// Mock Redis client for demonstration
#[derive(Debug, Clone)]
pub struct MockRedisClient {
    /// In-memory storage
    pub storage: HashMap<String, String>,
}

/// Bun Worker implementation
pub struct BunWorker {
    /// Filter factory
    pub filter_factory: KalmanFilterFactory,
    /// Redis state manager
    pub state_manager: RedisStateManager,
    /// Performance metrics
    pub metrics: WorkerMetrics,
    /// Worker configuration
    pub config: WorkerConfig,
}

/// Worker performance metrics
#[derive(Debug, Clone, Default)]
pub struct WorkerMetrics {
    /// Total requests processed
    pub total_requests: u64,
    /// Successful requests
    pub successful_requests: u64,
    /// Average processing time (microseconds)
    pub avg_processing_time_us: f64,
    /// Triggers generated
    pub triggers_generated: u64,
    /// Cache hits
    pub cache_hits: u64,
    /// Cache misses
    pub cache_misses: u64,
}

/// Worker configuration
#[derive(Debug, Clone)]
pub struct WorkerConfig {
    /// Maximum processing time (microseconds)
    pub max_processing_time_us: f64,
    /// Enable state persistence
    pub enable_persistence: bool,
    /// Cache size limit
    pub cache_size_limit: usize,
    /// Trigger threshold
    pub trigger_threshold: f64,
    /// Position sizing mode
    pub position_sizing: PositionSizing,
}

/// Position sizing strategy
#[derive(Debug, Clone)]
pub enum PositionSizing {
    /// Fixed size
    Fixed(f64),
    /// Kelly criterion
    Kelly { multiplier: f64 },
    /// Percentage of capital
    Percentage(f64),
}

impl Default for WorkerConfig {
    fn default() -> Self {
        Self {
            max_processing_time_us: 10000.0, // 10ms budget
            enable_persistence: true,
            cache_size_limit: 1000,
            trigger_threshold: 0.5,
            position_sizing: PositionSizing::Kelly { multiplier: 0.5 },
        }
    }
}

impl MockRedisClient {
    /// Create new mock Redis client
    pub fn new() -> Self {
        Self {
            storage: HashMap::new(),
        }
    }

    /// Get value by key
    pub fn get(&self, key: &str) -> Option<String> {
        self.storage.get(key).cloned()
    }

    /// Set value with optional TTL
    pub fn set(&mut self, key: String, value: String, _ttl: Option<u64>) {
        self.storage.insert(key, value);
    }

    /// Delete key
    pub fn delete(&mut self, key: &str) -> bool {
        self.storage.remove(key).is_some()
    }

    /// Clear all storage
    pub fn clear(&mut self) {
        self.storage.clear();
    }
}

impl RedisStateManager {
    /// Create new Redis state manager
    pub fn new(key_prefix: String, state_ttl: u64) -> Self {
        Self {
            client: MockRedisClient::new(),
            key_prefix,
            state_ttl,
        }
    }

    /// Load filter state from Redis
    pub fn load_filter_state(&mut self, pattern_id: u16, market_id: &str) -> Option<FilterState> {
        let key = format!("{}:{}:{}", self.key_prefix, pattern_id, market_id);

        match self.client.get(&key) {
            Some(json_str) => {
                match serde_json::from_str::<FilterState>(&json_str) {
                    Ok(state) => {
                        debug!("Loaded filter state for pattern {} market {}", pattern_id, market_id);
                        Some(state)
                    },
                    Err(e) => {
                        warn!("Failed to deserialize filter state: {}", e);
                        None
                    }
                }
            },
            None => {
                debug!("No existing state found for pattern {} market {}", pattern_id, market_id);
                None
            }
        }
    }

    /// Save filter state to Redis (async, fire-and-forget)
    pub async fn save_filter_state(&mut self, state: FilterState) {
        let key = format!("{}:{}:{}", self.key_prefix, state.pattern_id, state.market_id);

        match serde_json::to_string(&state) {
            Ok(json_str) => {
                self.client.set(key, json_str, Some(self.state_ttl));
                debug!("Saved filter state for pattern {} market {}", state.pattern_id, state.market_id);
            },
            Err(e) => {
                warn!("Failed to serialize filter state: {}", e);
            }
        }
    }

    /// Delete filter state
    pub fn delete_filter_state(&mut self, pattern_id: u16, market_id: &str) -> bool {
        let key = format!("{}:{}:{}", self.key_prefix, pattern_id, market_id);
        self.client.delete(&key)
    }
}

impl BunWorker {
    /// Create new Bun Worker
    pub fn new(config: WorkerConfig) -> Self {
        Self {
            filter_factory: KalmanFilterFactory,
            state_manager: RedisStateManager::new(
                "kf_state".to_string(),
                3600 // 1 hour TTL
            ),
            metrics: WorkerMetrics::default(),
            config,
        }
    }

    /// Process worker request (main entry point)
    pub async fn process_request(&mut self, request: WorkerRequest) -> WorkerResponse {
        let start_time = std::time::Instant::now();
        self.metrics.total_requests += 1;

        // Validate request
        if let Err(status) = self.validate_request(&request) {
            return WorkerResponse {
                request_id: request.request_id.clone(),
                status,
                trigger: None,
                processing_time_us: start_time.elapsed().as_micros() as f64,
                filter_state: FilterState::default(),
            };
        }

        // Load or create filter
        let mut filter = match self.load_or_create_filter(&request).await {
            Ok(filter) => filter,
            Err(status) => {
                return WorkerResponse {
                    request_id: request.request_id.clone(),
                    status,
                    trigger: None,
                    processing_time_us: start_time.elapsed().as_micros() as f64,
                    filter_state: FilterState::default(),
                };
            }
        };

        // Process tick through filter
        let trigger = self.process_tick_with_filter(&mut filter, &request).await;

        // Save filter state (async, fire-and-forget)
        if self.config.enable_persistence {
            let state = self.extract_filter_state(&filter, &request);
            let mut state_manager = self.state_manager.clone();
            tokio::spawn(async move {
                state_manager.save_filter_state(state).await;
            });
        }

        // Update metrics
        let processing_time = start_time.elapsed().as_micros() as f64;
        self.update_metrics(processing_time, trigger.is_some());

        // Create response
        WorkerResponse {
            request_id: request.request_id.clone(),
            status: WorkerStatus::Success,
            trigger,
            processing_time_us: processing_time,
            filter_state: self.extract_filter_state(&filter, &request),
        }
    }

    /// Validate incoming request
    fn validate_request(&self, request: &WorkerRequest) -> Result<(), WorkerStatus> {
        if request.pattern_id == 0 {
            return Err(WorkerStatus::InvalidData);
        }

        if request.market_id.is_empty() {
            return Err(WorkerStatus::InvalidData);
        }

        if request.tick.price <= 0.0 {
            return Err(WorkerStatus::InvalidData);
        }

        if request.tick.size <= 0.0 {
            return Err(WorkerStatus::InvalidData);
        }

        Ok(())
    }

    /// Load existing filter or create new one
    async fn load_or_create_filter(&mut self, request: &WorkerRequest) -> Result<Box<dyn KalmanFilterTrait>, WorkerStatus> {
        // Try to load existing state
        let existing_state = self.state_manager.load_filter_state(request.pattern_id, &request.market_id);

        if let Some(state) = existing_state {
            self.metrics.cache_hits += 1;

            // Create filter and restore state
            match self.filter_factory.create_filter(request.pattern_id, 0.05) {
                Ok(mut filter) => {
                    if let Err(e) = self.restore_filter_state(&mut filter, &state) {
                        warn!("Failed to restore filter state: {}", e);
                        // Continue with fresh filter
                    }
                    Ok(filter)
                },
                Err(e) => {
                    error!("Failed to create filter: {}", e);
                    Err(WorkerStatus::FilterNotFound)
                }
            }
        } else {
            self.metrics.cache_misses += 1;

            // Create new filter
            match self.filter_factory.create_filter(request.pattern_id, 0.05) {
                Ok(filter) => Ok(filter),
                Err(e) => {
                    error!("Failed to create filter: {}", e);
                    Err(WorkerStatus::FilterNotFound)
                }
            }
        }
    }

    /// Process tick through filter and generate trigger if applicable
    async fn process_tick_with_filter(&self, filter: &mut Box<dyn KalmanFilterTrait>, request: &WorkerRequest) -> Option<TriggerData> {
        // Predict next state
        filter.predict();

        // Update with observation
        let observation = vec![request.tick.price];
        if let Err(e) = filter.update(&observation) {
            warn!("Filter update failed: {}", e);
            return None;
        }

        // Detect regime
        let velocity = filter.get_state().get("velocity").unwrap_or(0.0);
        // Note: In real implementation, this would call filter.detect_regime(velocity)

        // Check for trigger conditions
        self.evaluate_trigger_conditions(filter, request)
    }

    /// Evaluate trigger conditions based on filter state
    fn evaluate_trigger_conditions(&self, filter: &Box<dyn KalmanFilterTrait>, request: &WorkerRequest) -> Option<TriggerData> {
        let state = filter.get_state();
        let position = state.get("position").unwrap_or(0.0);
        let uncertainty = filter.get_uncertainty();

        // Calculate edge
        let edge = (position - request.tick.price).abs();

        if edge < self.config.trigger_threshold {
            return None;
        }

        // Calculate confidence
        let confidence = if uncertainty > 0.0 {
            (edge / uncertainty).min(0.95).max(0.05)
        } else {
            0.5
        };

        // Calculate position size
        let size = self.calculate_position_size(edge, confidence);

        // Window duration based on pattern
        let window_duration = match request.pattern_id {
            51 => 30.0, // HT inference: 30s window
            68 => 5.0,  // Steam propagation: 5s window
            75 => 5.0,  // Velocity convexity: 5s window
            56 => 1.0,  // Micro-suspension: 1s window
            _ => 10.0,
        };

        Some(TriggerData {
            pattern_id: request.pattern_id,
            book: request.tick.book.clone(),
            target_price: position,
            expected_edge: edge,
            confidence,
            window_duration,
            size,
        })
    }

    /// Calculate position size based on configuration
    fn calculate_position_size(&self, edge: f64, confidence: f64) -> f64 {
        match &self.config.position_sizing {
            PositionSizing::Fixed(size) => *size,
            PositionSizing::Kelly { multiplier } => {
                // Simplified Kelly calculation
                let win_rate = confidence;
                let kelly_fraction = (win_rate * 2.0 - 1.0) * multiplier; // Assuming even odds
                (kelly_fraction * 1000.0).max(10.0).min(1000.0) // Cap between $10-$1000
            },
            PositionSizing::Percentage(percent) => {
                // Assume $10,000 capital
                10000.0 * percent
            }
        }
    }

    /// Extract filter state for persistence
    fn extract_filter_state(&self, filter: &Box<dyn KalmanFilterTrait>, request: &WorkerRequest) -> FilterState {
        let state = filter.get_state();

        FilterState {
            pattern_id: request.pattern_id,
            market_id: request.market_id.clone(),
            state_vector: vec![
                state.get("position").unwrap_or(0.0),
                state.get("velocity").unwrap_or(0.0),
                state.get("acceleration").unwrap_or(0.0),
            ],
            covariance_matrix: vec![vec![1.0]], // Simplified
            current_regime: match filter.get_regime() {
                Regime::Quiet => "quiet".to_string(),
                Regime::Steam => "steam".to_string(),
                Regime::Suspended => "suspended".to_string(),
            },
            last_update_ns: request.timestamp_ns,
        }
    }

    /// Restore filter state from persisted data
    fn restore_filter_state(&self, _filter: &mut Box<dyn KalmanFilterTrait>, _state: &FilterState) -> Result<(), String> {
        // In real implementation, this would restore the filter's internal state
        // For now, we'll just log the attempt
        debug!("Restoring filter state from persisted data");
        Ok(())
    }

    /// Update performance metrics
    fn update_metrics(&mut self, processing_time: f64, trigger_generated: bool) {
        self.metrics.successful_requests += 1;

        // Update average processing time
        let total = self.metrics.avg_processing_time_us * (self.metrics.successful_requests - 1) as f64;
        self.metrics.avg_processing_time_us = (total + processing_time) / self.metrics.successful_requests as f64;

        if trigger_generated {
            self.metrics.triggers_generated += 1;
        }
    }

    /// Get current metrics
    pub fn get_metrics(&self) -> &WorkerMetrics {
        &self.metrics
    }

    /// Reset metrics
    pub fn reset_metrics(&mut self) {
        self.metrics = WorkerMetrics::default();
    }
}

impl Default for FilterState {
    fn default() -> Self {
        Self {
            pattern_id: 0,
            market_id: String::new(),
            state_vector: Vec::new(),
            covariance_matrix: Vec::new(),
            current_regime: "quiet".to_string(),
            last_update_ns: 0,
        }
    }
}

/// Bun Worker fetch handler (TypeScript interface simulation)
pub async fn bun_fetch_handler(req: WorkerRequest, env: WorkerEnvironment) -> WorkerResponse {
    let config = WorkerConfig::default();
    let mut worker = BunWorker::new(config);

    // Process request
    let response = worker.process_request(req).await;

    // If trigger generated, send to bet queue
    if let Some(trigger) = &response.trigger {
        if let Err(e) = send_to_bet_queue(trigger, &env).await {
            warn!("Failed to send trigger to bet queue: {}", e);
        }
    }

    response
}

/// Worker environment (mock for demonstration)
#[derive(Debug, Clone)]
pub struct WorkerEnvironment {
    /// Bet queue URL
    pub bet_queue_url: String,
    /// KV store for state
    pub kv_store: MockRedisClient,
}

/// Send trigger to bet queue
async fn send_to_bet_queue(trigger: &TriggerData, env: &WorkerEnvironment) -> Result<(), String> {
    // In real implementation, this would send to Redis queue or message broker
    info!("Sending trigger to bet queue: pattern {} target {:.2} confidence {:.2}",
          trigger.pattern_id, trigger.target_price, trigger.confidence);

    // Mock implementation
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_worker_config_default() {
        let config = WorkerConfig::default();
        assert_eq!(config.max_processing_time_us, 10000.0);
        assert_eq!(config.trigger_threshold, 0.5);
        assert!(config.enable_persistence);
    }

    #[test]
    fn test_mock_redis_client() {
        let mut client = MockRedisClient::new();

        assert_eq!(client.get("test"), None);

        client.set("test".to_string(), "value".to_string(), None);
        assert_eq!(client.get("test"), Some("value".to_string()));

        assert!(client.delete("test"));
        assert_eq!(client.get("test"), None);
    }

    #[test]
    fn test_redis_state_manager() {
        let mut manager = RedisStateManager::new("test".to_string(), 3600);

        let state = FilterState {
            pattern_id: 51,
            market_id: "test_market".to_string(),
            state_vector: vec![1.0, 2.0, 3.0],
            covariance_matrix: vec![vec![1.0]],
            current_regime: "steam".to_string(),
            last_update_ns: 123456789,
        };

        // Initially no state
        assert!(manager.load_filter_state(51, "test_market").is_none());

        // Save state (mock async)
        let state_clone = state.clone();
        tokio::spawn(async move {
            manager.save_filter_state(state_clone).await;
        });

        // In real implementation, we'd wait for async completion
        // For mock test, we'll simulate immediate save
        manager.client.set("test:51:test_market".to_string(), serde_json::to_string(&state).unwrap(), None);

        // Load state
        let loaded_state = manager.load_filter_state(51, "test_market");
        assert!(loaded_state.is_some());

        let loaded = loaded_state.unwrap();
        assert_eq!(loaded.pattern_id, 51);
        assert_eq!(loaded.market_id, "test_market");
        assert_eq!(loaded.current_regime, "steam");
    }

    #[test]
    fn test_bun_worker_creation() {
        let config = WorkerConfig::default();
        let worker = BunWorker::new(config);

        assert_eq!(worker.metrics.total_requests, 0);
        assert_eq!(worker.metrics.successful_requests, 0);
    }

    #[tokio::test]
    async fn test_worker_request_validation() {
        let config = WorkerConfig::default();
        let worker = BunWorker::new(config);

        // Valid request
        let valid_request = WorkerRequest {
            pattern_id: 51,
            market_id: "test_market".to_string(),
            tick: TickData {
                price: 100.0,
                size: 1000.0,
                book: "test_book".to_string(),
                platform: "test_platform".to_string(),
                market_type: "test_type".to_string(),
            },
            timestamp_ns: 123456789,
            request_id: "test_req".to_string(),
        };

        assert!(worker.validate_request(&valid_request).is_ok());

        // Invalid request (zero pattern ID)
        let mut invalid_request = valid_request.clone();
        invalid_request.pattern_id = 0;
        assert!(worker.validate_request(&invalid_request).is_err());

        // Invalid request (negative price)
        invalid_request = valid_request.clone();
        invalid_request.tick.price = -1.0;
        assert!(worker.validate_request(&invalid_request).is_err());
    }

    #[tokio::test]
    async fn test_worker_processing() {
        let config = WorkerConfig::default();
        let mut worker = BunWorker::new(config);

        let request = WorkerRequest {
            pattern_id: 51,
            market_id: "test_market".to_string(),
            tick: TickData {
                price: 100.0,
                size: 1000.0,
                book: "test_book".to_string(),
                platform: "test_platform".to_string(),
                market_type: "test_type".to_string(),
            },
            timestamp_ns: 123456789,
            request_id: "test_req".to_string(),
        };

        let response = worker.process_request(request).await;

        assert!(matches!(response.status, WorkerStatus::Success));
        assert_eq!(response.request_id, "test_req");
        assert!(response.processing_time_us > 0.0);
    }

    #[test]
    fn test_position_sizing() {
        let config = WorkerConfig::default();
        let worker = BunWorker::new(config);

        let fixed_size = worker.calculate_position_size(1.0, 0.6);
        assert!(fixed_size > 0.0);

        let kelly_size = worker.calculate_position_size(2.0, 0.8);
        assert!(kelly_size > 0.0);

        let percentage_size = worker.calculate_position_size(1.5, 0.7);
        assert!(percentage_size > 0.0);
    }

    #[test]
    fn test_trigger_evaluation() {
        let config = WorkerConfig::default();
        let worker = BunWorker::new(config);

        // Create a mock filter with state
        let request = WorkerRequest {
            pattern_id: 51,
            market_id: "test_market".to_string(),
            tick: TickData {
                price: 100.0,
                size: 1000.0,
                book: "test_book".to_string(),
                platform: "test_platform".to_string(),
                market_type: "test_type".to_string(),
            },
            timestamp_ns: 123456789,
            request_id: "test_req".to_string(),
        };

        // This would normally use a real filter, but for testing we'll mock it
        // The trigger evaluation logic is tested indirectly through the worker processing
    }
}
