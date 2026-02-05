//! Multi-Market Feed Aggregator: Sub-10ms Latency Tracking
//!
//! Aggregates price feeds from multiple betting platforms with precise
//! timestamping for latency arbitrage detection. Supports concurrent
//! WebSocket connections and nanosecond-precision latency measurement.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio::time::{Duration, Instant};
use tracing::{info, warn, error};

use crate::types::*;
use crate::latency_arbitrage::{LatencyArbitrageEngine, PriceObservation, MarketTier};

/// Feed connection status
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FeedStatus {
    Connected,
    Connecting,
    Disconnected,
    Error,
}

/// Individual feed connection
pub struct FeedConnection {
    pub provider: Platform,
    pub status: FeedStatus,
    pub last_heartbeat: Instant,
    pub reconnect_attempts: u32,
    pub latency_ns: u64, // Round-trip latency measurement
}

/// Aggregated price update message
#[derive(Debug, Clone)]
pub struct PriceUpdate {
    pub market_id: u16,
    pub provider: Platform,
    pub market_type: MarketType,
    pub yes_price: PriceCents,
    pub no_price: PriceCents,
    pub yes_size: SizeCents,
    pub no_size: SizeCents,
    pub received_timestamp: TimestampNs, // When we received it
    pub provider_timestamp: Option<TimestampNs>, // Provider's timestamp if available
}

/// Feed aggregator configuration
#[derive(Debug, Clone)]
pub struct FeedAggregatorConfig {
    pub max_reconnect_attempts: u32,
    pub reconnect_delay_ms: u64,
    pub heartbeat_interval_ms: u64,
    pub latency_sample_window: usize, // Rolling window for latency stats
    pub enable_latency_tracking: bool,
}

impl Default for FeedAggregatorConfig {
    fn default() -> Self {
        Self {
            max_reconnect_attempts: 10,
            reconnect_delay_ms: 5000,
            heartbeat_interval_ms: 30000,
            latency_sample_window: 100,
            enable_latency_tracking: true,
        }
    }
}

/// Multi-market feed aggregator
pub struct FeedAggregator {
    /// Configuration
    config: FeedAggregatorConfig,
    /// Active feed connections
    connections: HashMap<Platform, FeedConnection>,
    /// Price update channel sender
    update_tx: mpsc::UnboundedSender<PriceUpdate>,
    /// Latency arbitrage engine
    latency_engine: Arc<RwLock<LatencyArbitrageEngine>>,
    /// Market tier mappings for latency analysis
    market_tiers: HashMap<u16, MarketTier>,
    /// Latency statistics per provider
    latency_stats: HashMap<Platform, LatencyStats>,
}

#[derive(Debug, Clone)]
pub struct LatencyStats {
    pub samples: Vec<u64>, // Rolling window of latency measurements
    pub min_latency_ns: u64,
    pub max_latency_ns: u64,
    pub avg_latency_ns: f64,
    pub last_updated: Instant,
}

impl LatencyStats {
    pub fn new() -> Self {
        Self {
            samples: Vec::new(),
            min_latency_ns: u64::MAX,
            max_latency_ns: 0,
            avg_latency_ns: 0.0,
            last_updated: Instant::now(),
        }
    }

    pub fn add_sample(&mut self, latency_ns: u64, window_size: usize) {
        self.samples.push(latency_ns);
        if self.samples.len() > window_size {
            self.samples.remove(0);
        }

        self.min_latency_ns = self.min_latency_ns.min(latency_ns);
        self.max_latency_ns = self.max_latency_ns.max(latency_ns);

        let sum: u64 = self.samples.iter().sum();
        self.avg_latency_ns = sum as f64 / self.samples.len() as f64;
        self.last_updated = Instant::now();
    }
}

impl FeedAggregator {
    /// Create new feed aggregator
    pub fn new(
        config: FeedAggregatorConfig,
        latency_engine: Arc<RwLock<LatencyArbitrageEngine>>,
    ) -> (Self, mpsc::UnboundedReceiver<PriceUpdate>) {
        let (update_tx, update_rx) = mpsc::unbounded_channel();

        let aggregator = Self {
            config,
            connections: HashMap::new(),
            update_tx,
            latency_engine,
            market_tiers: HashMap::new(),
            latency_stats: HashMap::new(),
        };

        (aggregator, update_rx)
    }

    /// Add a provider feed connection
    pub fn add_provider(&mut self, provider: Platform) {
        let connection = FeedConnection {
            provider,
            status: FeedStatus::Disconnected,
            last_heartbeat: Instant::now(),
            reconnect_attempts: 0,
            latency_ns: 0,
        };

        self.connections.insert(provider, connection);
        self.latency_stats.insert(provider, LatencyStats::new());

        info!("Added feed provider: {}", provider);
    }

    /// Set market tier for latency analysis
    pub fn set_market_tier(&mut self, market_id: u16, tier: MarketTier) {
        self.market_tiers.insert(market_id, tier);
    }

    /// Send price update to aggregator
    pub fn send_price_update(&self, update: PriceUpdate) -> Result<(), mpsc::error::SendError<PriceUpdate>> {
        self.update_tx.send(update)
    }

    /// Process incoming price updates (call this in a task)
    pub async fn process_updates(mut update_rx: mpsc::UnboundedReceiver<PriceUpdate>, latency_engine: Arc<RwLock<LatencyArbitrageEngine>>) {
        while let Some(update) = update_rx.recv().await {
            // Measure processing latency
            let process_start = Instant::now();

            // Convert to PriceObservation for latency analysis
            let tier = MarketTier::Tier1; // TODO: Get from market_tiers mapping

            let obs = PriceObservation {
                market_id: update.market_id,
                provider: update.provider,
                market_type: update.market_type,
                price: update.yes_price, // TODO: Handle both sides
                size: update.yes_size,
                timestamp_ns: update.received_timestamp,
                tier,
            };

            // Add to latency engine
            {
                let mut engine = latency_engine.write().await;
                engine.add_price_observation(obs);
            }

            // Log processing latency
            let process_duration = process_start.elapsed().as_nanos();
            if process_duration > 10_000_000 { // >10ms warning
                warn!("Slow price processing: {}ns for {} update", process_duration, update.provider);
            }
        }
    }

    /// Get current latency statistics
    pub fn get_latency_stats(&self, provider: Platform) -> Option<&LatencyStats> {
        self.latency_stats.get(&provider)
    }

    /// Update connection status
    pub fn update_connection_status(&mut self, provider: Platform, status: FeedStatus, latency_ns: Option<u64>) {
        if let Some(conn) = self.connections.get_mut(&provider) {
            conn.status = status;
            conn.last_heartbeat = Instant::now();

            if let Some(latency) = latency_ns {
                conn.latency_ns = latency;
                if let Some(stats) = self.latency_stats.get_mut(&provider) {
                    stats.add_sample(latency, self.config.latency_sample_window);
                }
            }

            match status {
                FeedStatus::Connected => {
                    info!("Feed connected: {} (latency: {}ns)", provider, conn.latency_ns);
                    conn.reconnect_attempts = 0;
                }
                FeedStatus::Disconnected => {
                    warn!("Feed disconnected: {}", provider);
                }
                FeedStatus::Error => {
                    error!("Feed error: {}", provider);
                    conn.reconnect_attempts += 1;
                }
                FeedStatus::Connecting => {
                    info!("Connecting to feed: {}", provider);
                }
            }
        }
    }

    /// Get connection status summary
    pub fn get_status_summary(&self) -> HashMap<Platform, (FeedStatus, u64)> {
        self.connections.iter()
            .map(|(provider, conn)| (*provider, (conn.status, conn.latency_ns)))
            .collect()
    }

    /// Check for stale connections and trigger reconnects
    pub async fn check_connections(&mut self) {
        let now = Instant::now();
        let stale_threshold = Duration::from_millis(self.config.heartbeat_interval_ms * 2);

        for (provider, conn) in &mut self.connections {
            if now.duration_since(conn.last_heartbeat) > stale_threshold {
                if conn.status == FeedStatus::Connected {
                    warn!("Feed heartbeat timeout: {}", provider);
                    self.update_connection_status(*provider, FeedStatus::Disconnected, None);
                }

                // Trigger reconnect if under max attempts
                if conn.reconnect_attempts < self.config.max_reconnect_attempts {
                    self.update_connection_status(*provider, FeedStatus::Connecting, None);
                    // TODO: Actually trigger reconnect logic
                }
            }
        }
    }

    /// Measure round-trip latency to provider
    pub async fn measure_latency(&mut self, provider: Platform) -> Option<u64> {
        if !self.config.enable_latency_tracking {
            return None;
        }

        let start = Instant::now();

        // TODO: Send ping/pong or measure actual message round-trip
        // For now, simulate based on provider
        let simulated_latency_ns = match provider {
            Platform::Kalshi => 50_000,      // 50μs
            Platform::Polymarket => 75_000,  // 75μs
            Platform::DraftKings => 200_000, // 200μs (typical sportsbook)
            Platform::FanDuel => 180_000,    // 180μs
            _ => 150_000, // 150μs default
        };

        // Simulate network delay
        tokio::time::sleep(Duration::from_nanos(simulated_latency_ns)).await;

        let measured = start.elapsed().as_nanos() as u64;

        if let Some(stats) = self.latency_stats.get_mut(&provider) {
            stats.add_sample(measured, self.config.latency_sample_window);
        }

        Some(measured)
    }

    /// Get all active latency signals from the engine
    pub async fn get_latency_signals(&self) -> Vec<crate::latency_arbitrage::LatencySignal> {
        let engine = self.latency_engine.read().await;
        engine.get_signals().to_vec()
    }
}

/// WebSocket feed client trait for different providers
#[async_trait::async_trait]
pub trait FeedClient: Send + Sync {
    /// Provider this client handles
    fn provider(&self) -> Platform;

    /// Connect to the feed
    async fn connect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;

    /// Disconnect from the feed
    async fn disconnect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;

    /// Get price update stream
    fn price_stream(&mut self) -> mpsc::UnboundedReceiver<PriceUpdate>;

    /// Send ping for latency measurement
    async fn ping(&mut self) -> Result<u64, Box<dyn std::error::Error + Send + Sync>>;
}

impl Default for FeedAggregator {
    fn default() -> Self {
        let (engine, _) = Self::new(Default::default(), Arc::new(RwLock::new(LatencyArbitrageEngine::new())));
        engine
    }
}
