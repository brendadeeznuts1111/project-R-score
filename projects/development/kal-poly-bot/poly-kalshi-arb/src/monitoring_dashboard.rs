//! Monitoring Dashboard: Real-Time Latency Arbitrage Metrics
//!
//! Provides real-time dashboard data for the Propagation Half-Life Framework:
//! - Half-life heatmap across markets with color-coded decay visualization
//! - Cross-book price derivative matrix showing convergence patterns
//! - Provider health status with latency deltas and failure tracking
//! - Regulatory delay arbitrage windows by jurisdiction
//! - ML Intelligence Layer telemetry (Component #40): Tier 1-4 model performance and SLAs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};

use crate::latency_arbitrage::{LatencyArbitrageEngine, LatencySignal, MarketTier};
use crate::feed_aggregator::{FeedAggregator, LatencyStats};
use crate::latency_execution::LatencyExecutionStats;
use crate::risk_management::RiskManagementEngine;
use crate::pattern_73_beta_skew::{Pattern73Engine, BetaSkewOpportunity};
use crate::tick_sim_backtester::{TickSimBacktester, BacktestResult, BacktestConfig};
use crate::backtester_config::{BacktesterControls, PatternVerification};
use crate::types::{TimestampNs, MarketType, Platform};

/// Dashboard data snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSnapshot {
    pub timestamp_ns: TimestampNs,
    pub half_life_heatmap: HalfLifeHeatmap,
    pub cross_book_matrix: CrossBookMatrix,
    pub provider_health: ProviderHealthStatus,
    pub regulatory_windows: RegulatoryDelayWindows,
    pub execution_stats: LatencyExecutionStats,
    pub risk_alerts: Vec<RiskAlertData>,
    pub ml_telemetry: MLIntelligenceTelemetry, // Component #40
    pub pattern_73_opportunities: Vec<BetaSkewOpportunityData>, // Pattern #73 telemetry
    pub backtester_results: Option<BacktestResultData>, // Component #41 telemetry
    pub pattern_verifications: Vec<PatternVerificationData>, // ROI & Half-Life verification
}

/// ML Intelligence Layer telemetry (Component #40)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MLIntelligenceTelemetry {
    pub tier1_models: Vec<ModelTelemetry>, // #75 Velocity Convexity, #76 MM Compression, #85 Liquidity Mirage
    pub tier2_models: Vec<ModelTelemetry>, // #71 Asymmetric Prop, #74 Provider Glitch
    pub tier3_models: Vec<ModelTelemetry>, // #73 Prop Beta Skew, #88 Source ID Classifier
    pub tier4_models: Vec<ModelTelemetry>, // #77 Regulatory Delay
    pub behavioral_models: Vec<ModelTelemetry>, // #79, #82 Bayesian Emotional Carryover
    pub overall_sla_compliance: SLACompliance,
}

/// Pattern #73 opportunity data for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BetaSkewOpportunityData {
    pub player_prop_market: String,
    pub team_total_market: String,
    pub player_id: String,
    pub team_id: String,
    pub current_player_price: f64,
    pub current_team_total: f64,
    pub beta: f64,
    pub predicted_team_change: f64,
    pub expected_team_total: f64,
    pub gap: f64,
    pub gap_percent: f64,
    pub strength: f64,
    pub direction: i8,
    pub half_life_ms: f64,
    pub timestamp_ns: TimestampNs,
}

/// Component #41 backtester results for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestResultData {
    pub pattern_id: u16,
    pub total_return: f64,
    pub roi_percent: f64,
    pub sharpe_ratio: f64,
    pub max_drawdown: f64,
    pub total_trades: u32,
    pub winning_trades: u32,
    pub losing_trades: u32,
    pub avg_trade_duration_us: f64,
    pub final_sharp_score: f64,
    pub account_limited: bool,
    pub alpha_half_life_us: f64,
    pub avg_execution_latency_us: f64,
    pub sla_compliance_percent: f64,
    pub fill_rate_percent: f64,
    pub timestamp_ns: TimestampNs,
}

/// Pattern verification data for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternVerificationData {
    pub component_id: u16,
    pub component_name: String,
    pub roi_target_percent: f64,
    pub alpha_half_life_weeks: f64,
    pub primary_constraint: String,
    pub verified_roi_percent: f64,
    pub verification_status: String,
    pub is_target_met: bool,
}

/// Individual ML model telemetry data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelTelemetry {
    pub component_id: u16, // #71-#88
    pub component_name: String,
    pub tier: u8, // 1-4
    pub current_latency_ms: f64,
    pub target_sla_ms: f64,
    pub sla_compliance_percent: f64, // 0.0-1.0
    pub status: ModelStatus,
    pub last_execution_ns: TimestampNs,
    pub error_count: u32,
    pub feature_flag: String, // PREMIUM, BETA_FEATURES, DEBUG
    pub stability: String, // STABLE, EXPERIMENTAL
    pub dependency: String, // Component #37, #34, #38
    pub metric_value: f64, // Model-specific metric (accuracy, correlation, etc.)
    pub processing_load_percent: f64,
}

/// Model execution status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelStatus {
    Active,
    Degraded,
    Failed,
    Disabled,
}

/// Overall SLA compliance summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SLACompliance {
    pub tier1_compliance: f64, // Average compliance across tier 1 models
    pub overall_compliance: f64,
    pub violations_last_hour: u32,
    pub critical_alerts: u32,
}

/// Half-life heatmap data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HalfLifeHeatmap {
    pub markets: Vec<MarketHeatmapData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketHeatmapData {
    pub market_id: u16,
    pub provider: String,
    pub market_type: String,
    pub tier: String,
    pub half_life_ms: f64,
    pub current_decay_percent: f64, // 0.0-1.0, where 1.0 = full edge
    pub color_intensity: f64, // For visualization: 0.0 (green/good) to 1.0 (red/bad)
    pub arbitrage_opportunities: u32,
}

/// Cross-book price derivative matrix
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossBookMatrix {
    pub providers: Vec<String>,
    pub convergence_matrix: Vec<Vec<ConvergenceData>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvergenceData {
    pub fast_provider: String,
    pub slow_provider: String,
    pub avg_convergence_time_ms: f64,
    pub active_signals: u32,
    pub successful_arbs: u32,
    pub failure_rate: f64,
}

/// Provider health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderHealthStatus {
    pub providers: Vec<ProviderStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub provider: String,
    pub status: String, // "healthy", "degraded", "critical", "down"
    pub latency_ns: u64,
    pub latency_trend: String, // "improving", "stable", "degrading"
    pub circuit_breaker_state: String,
    pub failure_count: u32,
    pub uptime_percent: f64,
}

/// Regulatory delay arbitrage windows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegulatoryDelayWindows {
    pub jurisdictions: Vec<JurisdictionWindow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionWindow {
    pub jurisdiction: String,
    pub in_play_delay_seconds: u64,
    pub active_opportunities: u32,
    pub avg_delay_arbitrage_edge: f64,
    pub regulatory_status: String, // "compliant", "warning", "restricted"
}

/// Risk alerts for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAlertData {
    pub alert_type: String,
    pub severity: String, // "low", "medium", "high", "critical"
    pub message: String,
    pub timestamp_ns: TimestampNs,
}

/// Monitoring dashboard engine
pub struct MonitoringDashboard {
    /// Latency arbitrage engine
    latency_engine: Arc<RwLock<LatencyArbitrageEngine>>,
    /// Feed aggregator
    feed_aggregator: Arc<RwLock<FeedAggregator>>,
    /// Pattern #73 engine
    pattern_73_engine: Arc<RwLock<Pattern73Engine>>,
    /// Risk management engine (optional)
    risk_engine: Option<Arc<RwLock<RiskManagementEngine>>>,
    /// Execution stats (optional)
    execution_stats: Option<LatencyExecutionStats>,
    /// Alert history
    alert_history: Vec<RiskAlertData>,
    /// Dashboard update interval
    update_interval_ms: u64,
    /// ML model performance tracking
    ml_model_stats: HashMap<u16, ModelPerformance>,
}

/// ML model performance tracking
#[derive(Debug, Clone)]
struct ModelPerformance {
    pub executions: u32,
    pub total_latency_ms: f64,
    pub errors: u32,
    pub last_execution_ns: TimestampNs,
    pub metric_history: Vec<f64>,
}

impl MonitoringDashboard {
    /// Create new monitoring dashboard
    pub fn new(
        latency_engine: Arc<RwLock<LatencyArbitrageEngine>>,
        feed_aggregator: Arc<RwLock<FeedAggregator>>,
        pattern_73_engine: Arc<RwLock<Pattern73Engine>>,
    ) -> Self {
        Self {
            latency_engine,
            feed_aggregator,
            pattern_73_engine,
            risk_engine: None,
            execution_stats: None,
            alert_history: Vec::new(),
            update_interval_ms: 1000, // 1 second updates
            ml_model_stats: HashMap::new(),
        }
    }

    /// Set risk management engine for alerts
    pub fn with_risk_engine(mut self, risk_engine: Arc<RwLock<RiskManagementEngine>>) -> Self {
        self.risk_engine = Some(risk_engine);
        self
    }

    /// Set execution stats provider
    pub fn with_execution_stats(mut self, stats: LatencyExecutionStats) -> Self {
        self.execution_stats = Some(stats);
        self
    }

    /// Generate dashboard snapshot
    pub async fn generate_snapshot(&self) -> Result<DashboardSnapshot, Box<dyn std::error::Error + Send + Sync>> {
    let timestamp_ns = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;

    // Generate half-life heatmap
    let half_life_heatmap = self.generate_half_life_heatmap().await;

    // Generate cross-book matrix
    let cross_book_matrix = self.generate_cross_book_matrix().await;

    // Generate provider health status
    let provider_health = self.generate_provider_health_status().await;

    // Generate regulatory delay windows
    let regulatory_windows = self.generate_regulatory_windows().await;

    // Generate ML telemetry
    let ml_telemetry = self.generate_ml_telemetry(timestamp_ns);
        let mut markets = Vec::new();

        // Get latency engine data
        let engine = self.latency_engine.read().await;
        let signals = engine.get_signals();

        // Group signals by market
        let mut market_signals: HashMap<u16, Vec<&LatencySignal>> = HashMap::new();
        for signal in signals {
            market_signals.entry(signal.fast_market.market_id)
                .or_insert_with(Vec::new)
                .push(signal);
            market_signals.entry(signal.slow_market.market_id)
                .or_insert_with(Vec::new)
                .push(signal);
        }

        // Generate heatmap data for each market
        for (market_id, market_signals) in market_signals {
            let tier = engine.market_tiers.get(&market_id).copied().unwrap_or(MarketTier::Tier1);
            let half_life_ms = tier.half_life_ms();

            // Calculate average decay across signals
            let total_signals = market_signals.len();
            let avg_decay: f64 = if total_signals > 0 {
                market_signals.iter()
                    .map(|s| s.disparity_cents as f64 / s.disparity_cents.abs() as f64)
                    .sum::<f64>() / total_signals as f64
            } else {
                1.0
            };

            // Color intensity based on decay and opportunities
            let color_intensity = (1.0 - avg_decay) + (total_signals as f64 * 0.1).min(0.5);

            markets.push(MarketHeatmapData {
                market_id,
                provider: "Multiple".to_string(), // TODO: Get actual provider
                market_type: "Mixed".to_string(), // TODO: Get market type
                tier: format!("{:?}", tier),
                half_life_ms,
                current_decay_percent: avg_decay,
                color_intensity: color_intensity.min(1.0),
                arbitrage_opportunities: total_signals as u32,
            });
        }

        HalfLifeHeatmap { markets }
    }

    /// Generate cross-book convergence matrix
    async fn generate_cross_book_matrix(&self) -> CrossBookMatrix {
        let providers = vec![
            "Kalshi".to_string(),
            "Polymarket".to_string(),
            "DraftKings".to_string(),
            "FanDuel".to_string(),
        ];

        let mut convergence_matrix = Vec::new();

        // Generate mock convergence data (TODO: Use real data)
        for fast_provider in &providers {
            let mut row = Vec::new();
            for slow_provider in &providers {
                if fast_provider == slow_provider {
                    row.push(ConvergenceData {
                        fast_provider: fast_provider.clone(),
                        slow_provider: slow_provider.clone(),
                        avg_convergence_time_ms: 0.0,
                        active_signals: 0,
                        successful_arbs: 0,
                        failure_rate: 0.0,
                    });
                } else {
                    // Mock data based on provider combinations
                    let convergence_time = match (fast_provider.as_str(), slow_provider.as_str()) {
                        ("Kalshi", "Polymarket") => 150.0,
                        ("Polymarket", "Kalshi") => 200.0,
                        _ => 300.0, // Sportsbooks
                    };

                    row.push(ConvergenceData {
                        fast_provider: fast_provider.clone(),
                        slow_provider: slow_provider.clone(),
                        avg_convergence_time_ms: convergence_time,
                        active_signals: (convergence_time / 50.0) as u32, // Mock
                        successful_arbs: (convergence_time / 75.0) as u32, // Mock
                        failure_rate: 0.05 + (convergence_time / 10000.0), // Mock
                    });
                }
            }
            convergence_matrix.push(row);
        }

        CrossBookMatrix {
            providers,
            convergence_matrix,
        }
    }

    /// Generate provider health status
    async fn generate_provider_health_status(&self) -> ProviderHealthStatus {
        let aggregator = self.feed_aggregator.read().await;
        let status_summary = aggregator.get_status_summary();

        let providers: Vec<ProviderStatus> = status_summary
            .into_iter()
            .map(|(provider, (status, latency_ns))| {
                let (status_str, uptime_percent) = match status {
                    crate::feed_aggregator::FeedStatus::Connected => ("healthy", 99.9),
                    crate::feed_aggregator::FeedStatus::Connecting => ("degraded", 95.0),
                    crate::feed_aggregator::FeedStatus::Disconnected => ("critical", 50.0),
                    crate::feed_aggregator::FeedStatus::Error => ("down", 0.0),
                };

                // Get latency trend (mock for now)
                let latency_trend = "stable".to_string();

                // Circuit breaker state (mock for now)
                let circuit_breaker_state = "closed".to_string();

                ProviderStatus {
                    provider: format!("{:?}", provider),
                    status: status_str.to_string(),
                    latency_ns,
                    latency_trend,
                    circuit_breaker_state,
                    failure_count: 0, // TODO: Get from risk engine
                    uptime_percent,
                }
            })
            .collect();

        ProviderHealthStatus { providers }
    }

    /// Generate regulatory delay windows
    async fn generate_regulatory_windows(&self) -> RegulatoryDelayWindows {
        // Mock regulatory data (TODO: Implement real jurisdiction tracking)
        let jurisdictions = vec![
            JurisdictionWindow {
                jurisdiction: "New York".to_string(),
                in_play_delay_seconds: 25,
                active_opportunities: 12,
                avg_delay_arbitrage_edge: 3.2,
                regulatory_status: "compliant".to_string(),
            },
            JurisdictionWindow {
                jurisdiction: "New Jersey".to_string(),
                in_play_delay_seconds: 5,
                active_opportunities: 8,
                avg_delay_arbitrage_edge: 1.8,
                regulatory_status: "compliant".to_string(),
            },
            JurisdictionWindow {
                jurisdiction: "Pennsylvania".to_string(),
                in_play_delay_seconds: 15,
                active_opportunities: 15,
                avg_delay_arbitrage_edge: 2.7,
                regulatory_status: "warning".to_string(),
            },
        ];

        RegulatoryDelayWindows { jurisdictions }
    }

    /// Generate ML Intelligence Layer telemetry (Component #40)
    fn generate_ml_telemetry(&self, current_time_ns: TimestampNs) -> MLIntelligenceTelemetry {
        let mut tier1_models = Vec::new();
        let mut tier2_models = Vec::new();
        let mut tier3_models = Vec::new();
        let mut tier4_models = Vec::new();
        let mut behavioral_models = Vec::new();

        // Tier 1: High-frequency models (sub-200ms SLAs) - PREMIUM, STABLE, Component #37
        tier1_models.push(self.create_model_telemetry(75, "Velocity Convexity", 1, 200.0, current_time_ns, "PREMIUM", "STABLE", "Component #37 (Delta Engine)", 0.85, 0.15));
        tier1_models.push(self.create_model_telemetry(76, "MM Compression", 1, 150.0, current_time_ns, "PREMIUM", "STABLE", "Component #37 (Delta Engine)", 0.92, 0.12));
        tier1_models.push(self.create_model_telemetry(85, "Liquidity Mirage", 1, 100.0, current_time_ns, "PREMIUM", "STABLE", "Component #37 (Delta Engine)", 0.78, 0.08));

        // Tier 2: Quantitative models (800ms-1.3s SLAs) - BETA_FEATURES, STABLE, Component #34
        tier2_models.push(self.create_model_telemetry(71, "Asymmetric Prop", 2, 1300.0, current_time_ns, "BETA_FEATURES", "STABLE", "Component #34 (SecureDataView)", 0.65, 0.25));
        tier2_models.push(self.create_model_telemetry(74, "Provider Glitch", 2, 800.0, current_time_ns, "BETA_FEATURES", "STABLE", "Component #34 (SecureDataView)", 0.88, 0.18));

        // Tier 3: Advanced models (900ms-1.85s SLAs) - BETA_FEATURES, STABLE, Component #34
        tier3_models.push(self.create_model_telemetry(73, "Prop Beta Skew", 3, 1850.0, current_time_ns, "BETA_FEATURES", "STABLE", "Component #34 (SecureDataView)", 0.72, 0.32));
        tier3_models.push(self.create_model_telemetry(88, "Source ID Classifier", 3, 900.0, current_time_ns, "BETA_FEATURES", "STABLE", "Component #34 (SecureDataView)", 0.81, 0.22));

        // Tier 4: Synchronization models (5s SLA) - DEBUG, EXPERIMENTAL, Component #38
        tier4_models.push(self.create_model_telemetry(77, "Regulatory Delay", 4, 5000.0, current_time_ns, "DEBUG", "EXPERIMENTAL", "Component #38 (DNS Security)", 0.95, 0.45));

        // Behavioral models: Bayesian Emotional Carryover - BETA_FEATURES, STABLE, Component #34
        behavioral_models.push(self.create_model_telemetry(79, "Bayesian Emotional Carryover", 0, 96000.0, current_time_ns, "BETA_FEATURES", "STABLE", "Component #34 (SecureDataView)", 0.89, 0.35));
        behavioral_models.push(self.create_model_telemetry(82, "Momentum Transfer", 0, 96000.0, current_time_ns, "BETA_FEATURES", "STABLE", "Component #34 (SecureDataView)", 0.76, 0.28));

        // Calculate SLA compliance
        let overall_sla_compliance = self.calculate_sla_compliance(&tier1_models, &tier2_models, &tier3_models, &tier4_models, &behavioral_models);

        MLIntelligenceTelemetry {
            tier1_models,
            tier2_models,
            tier3_models,
            tier4_models,
            behavioral_models,
            overall_sla_compliance,
        }
    }

    /// Create telemetry data for a single ML model
    fn create_model_telemetry(&self, component_id: u16, name: &str, tier: u8, target_sla_ms: f64, current_time_ns: TimestampNs, feature_flag: &str, stability: &str, dependency: &str, base_metric: f64, load_percent: f64) -> ModelTelemetry {
        // Simulate realistic performance data
        let (current_latency_ms, status, error_count) = self.simulate_model_performance(component_id, target_sla_ms);
        let sla_compliance = (target_sla_ms / current_latency_ms).min(1.0);

        ModelTelemetry {
            component_id,
            component_name: name.to_string(),
            tier,
            current_latency_ms,
            target_sla_ms,
            sla_compliance_percent: sla_compliance,
            status,
            last_execution_ns: current_time_ns - (rand::random::<u64>() % 10_000_000_000), // Within last 10 seconds
            error_count,
            feature_flag: feature_flag.to_string(),
            stability: stability.to_string(),
            dependency: dependency.to_string(),
            metric_value: base_metric + (rand::random::<f64>() - 0.5) * 0.2, // Add some variation
            processing_load_percent: load_percent,
        }
    }

    /// Simulate realistic model performance based on component specifications
    fn simulate_model_performance(&self, component_id: u16, target_sla_ms: f64) -> (f64, ModelStatus, u32) {
        let mut rng = rand::thread_rng();

        // Base performance varies by component
        let (base_latency, error_rate) = match component_id {
            75 => (180.0, 0.02), // Velocity Convexity: close to 200ms SLA
            76 => (135.0, 0.01), // MM Compression: under 150ms SLA
            85 => (95.0, 0.03), // Liquidity Mirage: under 100ms SLA
            71 => (1250.0, 0.05), // Asymmetric Prop: under 1.3s SLA
            74 => (720.0, 0.02), // Provider Glitch: under 800ms SLA
            73 => (1780.0, 0.04), // Prop Beta Skew: under 1.85s SLA
            88 => (850.0, 0.03), // Source ID Classifier: under 900ms SLA
            77 => (4800.0, 0.01), // Regulatory Delay: under 5s SLA
            79 => (95000.0, 0.02), // Bayesian Emotional Carryover: 1.6min SLA
            82 => (92000.0, 0.03), // Momentum Transfer: 1.6min SLA
            _ => (target_sla_ms * 1.1, 0.05),
        };

        // Add some random variation (±10%)
        let variation = (rng.gen::<f64>() - 0.5) * 0.2;
        let current_latency = base_latency * (1.0 + variation);

        // Determine status based on SLA compliance
        let status = if current_latency <= target_sla_ms {
            ModelStatus::Active
        } else if current_latency <= target_sla_ms * 1.5 {
            ModelStatus::Degraded
        } else {
            ModelStatus::Failed
        };

        // Simulate error count based on error rate
        let error_count = ((rng.gen::<f64>() * 100.0 * error_rate) as u32).min(10);

        (current_latency, status, error_count)
    }

    /// Generate Pattern #73 opportunities for dashboard
    async fn generate_pattern_73_opportunities(&self) -> Vec<BetaSkewOpportunityData> {
        let pattern_73_engine = self.pattern_73_engine.read().await;
        let opportunities = pattern_73_engine.get_opportunities();

        opportunities.iter().map(|opp| BetaSkewOpportunityData {
            player_prop_market: opp.player_prop_market.clone(),
            team_total_market: opp.team_total_market.clone(),
            player_id: opp.player_id.clone(),
            team_id: opp.team_id.clone(),
            current_player_price: opp.current_player_price,
            current_team_total: opp.current_team_total,
            beta: opp.beta,
            predicted_team_change: opp.predicted_team_change,
            expected_team_total: opp.expected_team_total,
            gap: opp.gap,
            gap_percent: opp.gap_percent,
            strength: opp.strength,
            direction: opp.direction,
            half_life_ms: opp.half_life_ms,
            timestamp_ns: opp.timestamp_ns,
        }).collect()
    }
        let all_models: Vec<&ModelTelemetry> = tier1.iter()
            .chain(tier2.iter())
            .chain(tier3.iter())
            .chain(tier4.iter())
            .chain(behavioral.iter())
            .collect();

        let total_models = all_models.len();
        if total_models == 0 {
            return SLACompliance {
                tier1_compliance: 0.0,
                overall_compliance: 0.0,
                violations_last_hour: 0,
                critical_alerts: 0,
            };
        }

        let tier1_compliance = if !tier1.is_empty() {
            tier1.iter().map(|m| m.sla_compliance_percent).sum::<f64>() / tier1.len() as f64
        } else {
            0.0
        };

        let overall_compliance = all_models.iter()
            .map(|m| m.sla_compliance_percent)
            .sum::<f64>() / total_models as f64;

        let violations_last_hour = all_models.iter()
            .filter(|m| matches!(m.status, ModelStatus::Failed))
            .count() as u32;

        let critical_alerts = all_models.iter()
            .filter(|m| matches!(m.status, ModelStatus::Failed) && m.error_count > 5)
            .count() as u32;

        SLACompliance {
            tier1_compliance,
            overall_compliance,
            violations_last_hour,
            critical_alerts,
        }
    }

    /// Add risk alert to dashboard
    pub fn add_risk_alert(&mut self, alert_type: String, severity: String, message: String) {
        let timestamp_ns = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;

        let alert = RiskAlertData {
            alert_type,
            severity,
            message,
            timestamp_ns,
        };

        self.alert_history.push(alert);

        // Keep only last 1000 alerts
        if self.alert_history.len() > 1000 {
            self.alert_history.remove(0);
        }
    }

    /// Get dashboard data as JSON string
    pub async fn get_dashboard_json(&self) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let snapshot = self.generate_snapshot().await?;
        Ok(serde_json::to_string_pretty(&snapshot)?)
    }

    /// Get dashboard data as HTML (basic implementation)
    pub async fn get_dashboard_html(&self) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let snapshot = self.generate_snapshot().await?;

        let mut html = String::from(r#"
<!DOCTYPE html>
<html>
<head>
    <title>Propagation Half-Life Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        .healthy { color: green; }
        .degraded { color: orange; }
        .critical { color: red; }
        .down { color: darkred; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Propagation Half-Life Framework Dashboard</h1>
    <div class="section">
        <h2>Provider Health Status</h2>
        <table>
            <tr><th>Provider</th><th>Status</th><th>Latency (ns)</th><th>Trend</th><th>Circuit Breaker</th></tr>
"#);

        for provider in &snapshot.provider_health.providers {
            let status_class = match provider.status.as_str() {
                "healthy" => "healthy",
                "degraded" => "degraded",
                "critical" => "critical",
                "down" => "down",
                _ => "",
            };

            html.push_str(&format!(
                "<tr><td>{}</td><td class='{}'>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                provider.provider, status_class, provider.status, provider.latency_ns,
                provider.latency_trend, provider.circuit_breaker_state
            ));
        }

        html.push_str(r#"
        </table>
    </div>
    <div class="section">
        <h2>Half-Life Heatmap</h2>
        <table>
            <tr><th>Market ID</th><th>Tier</th><th>Half-Life (ms)</th><th>Decay %</th><th>Opportunities</th></tr>
"#);

        for market in &snapshot.half_life_heatmap.markets {
            html.push_str(&format!(
                "<tr><td>{}</td><td>{}</td><td>{:.0}</td><td>{:.1%}</td><td>{}</td></tr>",
                market.market_id, market.tier, market.half_life_ms,
        }

        html.push_str(r#"
        </table>
    </div>
    <div class="section">
        <h2>Execution Statistics</h2>
        <p>Active Executions: {}</p>
        <p>Success Rate: {:.1%}</p>
        <p>Avg Edge Captured: {}¢</p>
    </div>
    <div class="section">
        <h2>ML Intelligence Layer Telemetry (Component #40)</h2>
        <h3>SLA Compliance</h3>
        <p>Tier 1 Compliance: {:.1%}</p>
        <p>Overall Compliance: {:.1%}</p>
        <p>Violations (Last Hour): {}</p>
        <p>Critical Alerts: {}</p>

        <h3>Tier 1 Models (High-Frequency)</h3>
        <table>
            <tr><th>Component</th><th>Name</th><th>Latency</th><th>SLA</th><th>Status</th><th>Feature Flag</th><th>Dependency</th><th>Metric</th><th>Load</th></tr>
"#,
            snapshot.execution_stats.active_executions,
            snapshot.execution_stats.success_rate,
            snapshot.execution_stats.avg_edge_captured,
            snapshot.ml_telemetry.overall_sla_compliance.tier1_compliance,
            snapshot.ml_telemetry.overall_sla_compliance.overall_compliance,
            snapshot.ml_telemetry.overall_sla_compliance.violations_last_hour,
            snapshot.ml_telemetry.overall_sla_compliance.critical_alerts
        );

        // Tier 1 models
        for model in &snapshot.ml_telemetry.tier1_models {
            let status_class = match model.status {
                ModelStatus::Active => "healthy",
                ModelStatus::Degraded => "degraded",
                ModelStatus::Failed => "critical",
                ModelStatus::Disabled => "",
            };

            html.push_str(&format!(
                "<tr><td>#{}</td><td>{}</td><td>{:.0}ms</td><td>{:.0}ms</td><td class='{}'>{}</td><td>{}</td><td>{}</td><td>{:.2}</td><td>{:.1}%</td></tr>",
                model.component_id, model.component_name, model.current_latency_ms, model.target_sla_ms,
                status_class, format!("{:?}", model.status).to_lowercase(), model.feature_flag, model.dependency, model.metric_value, model.processing_load_percent
            ));
        }

        html.push_str(r#"
        </table>

        <h3>Tier 2 Models (Quantitative)</h3>
        <table>
            <tr><th>Component</th><th>Name</th><th>Latency</th><th>SLA</th><th>Status</th><th>Feature Flag</th><th>Dependency</th><th>Errors</th></tr>
"#);

        // Tier 2 models
        for model in &snapshot.ml_telemetry.tier2_models {
            let status_class = match model.status {
                ModelStatus::Active => "healthy",
                ModelStatus::Degraded => "degraded",
                ModelStatus::Failed => "critical",
                ModelStatus::Disabled => "",
            };

            html.push_str(&format!(
                "<tr><td>#{}</td><td>{}</td><td>{:.0}ms</td><td>{:.0}ms</td><td class='{}'>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                model.component_id, model.component_name, model.current_latency_ms, model.target_sla_ms,
                status_class, format!("{:?}", model.status).to_lowercase(), model.feature_flag, model.dependency, model.error_count
            ));
        }

        html.push_str(r#"
        </table>

        <h3>Behavioral Models</h3>
        <table>
            <tr><th>Component</th><th>Name</th><th>Latency</th><th>SLA</th><th>Status</th><th>Feature Flag</th><th>Dependency</th><th>Correlation</th></tr>
"#);

        // Behavioral models
        for model in &snapshot.ml_telemetry.behavioral_models {
            let status_class = match model.status {
                ModelStatus::Active => "healthy",
                ModelStatus::Degraded => "degraded",
                ModelStatus::Failed => "critical",
                ModelStatus::Disabled => "",
            };

            html.push_str(&format!(
                "<tr><td>#{}</td><td>{}</td><td>{:.0}s</td><td>{:.0}s</td><td class='{}'>{}</td><td>{}</td><td>{}</td><td>{:.2}</td></tr>",
                model.component_id, model.component_name, model.current_latency_ms / 1000.0, model.target_sla_ms / 1000.0,
                status_class, format!("{:?}", model.status).to_lowercase(), model.feature_flag, model.dependency, model.metric_value
            ));
        }

        html.push_str(r#"
        </table>
    </div>
    <div class="section">
        <h2>Pattern #73: Player Prop to Team Total Beta Skew</h2>
        <h3>Current Opportunities</h3>
        <table>
            <tr><th>Player</th><th>Team</th><th>Beta</th><th>Gap</th><th>Gap %</th><th>Strength</th><th>Direction</th><th>Half-Life</th></tr>
"#);

        for opportunity in &snapshot.pattern_73_opportunities {
            let direction_str = match opportunity.direction {
                1 => "Over",
                -1 => "Under",
                _ => "Neutral",
            };

            let strength_color = if opportunity.strength > 0.8 {
                "color: #22c55e;" // Green
            } else if opportunity.strength > 0.5 {
                "color: #f59e0b;" // Yellow
            } else {
                "color: #ef4444;" // Red
            };

            html.push_str(&format!(
                "<tr><td>{}</td><td>{}</td><td>{:.3}</td><td>{:.2}</td><td>{:.1}%</td><td style=\"{}\">{:.2}</td><td>{}</td><td>{:.0}ms</td></tr>",
                opportunity.player_id, opportunity.team_id, opportunity.beta, opportunity.gap,
                opportunity.gap_percent * 100.0, strength_color, opportunity.strength,
                direction_str, opportunity.half_life_ms
            ));
        }

        html.push_str(r#"
        </table>
    </div>
</body>
</html>
"#);

        Ok(html)
    }
}

impl Default for MonitoringDashboard {
    fn default() -> Self {
        Self::new(
            Arc::new(RwLock::new(LatencyArbitrageEngine::new())),
            Arc::new(RwLock::new(FeedAggregator::default())),
        )
    }
}
