//! Backtester Configuration and Controls
//!
//! Sportsbook Feed Hub configuration for Component #41: Tick-Sim-Backtester
//! Provides SIM_* environment variables and control parameters for backtesting

use std::env;
use serde::{Serialize, Deserialize};

/// Backtester configuration from environment variables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktesterControls {
    /// Simulation latency jitter (milliseconds)
    pub sim_latency_jitter: f64,
    /// Sharp score threshold for account limiting
    pub sharp_limit_threshold: f64,
    /// Tick precision level
    pub tick_precision: TickPrecision,
    /// Maximum simulation speed multiplier
    pub max_speed_multiplier: f64,
    /// Memory limit for tick buffer (MB)
    pub memory_limit_mb: u64,
    /// Enable real-time monitoring
    pub enable_monitoring: bool,
    /// Log level for simulation
    pub log_level: LogLevel,
    /// Data source configuration
    pub data_source: DataSource,
}

/// Tick precision levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TickPrecision {
    Millisecond,
    Microsecond,
    Nanosecond,
}

/// Log levels for simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

/// Data source configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSource {
    /// Source type
    pub source_type: DataSourceType,
    /// Connection string or path
    pub connection_string: String,
    /// Authentication token (if required)
    pub auth_token: Option<String>,
    /// Compression enabled
    pub compression: bool,
}

/// Data source types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataSourceType {
    /// Local file system
    Local,
    /// S3 bucket
    S3,
    /// Database
    Database,
    /// WebSocket stream
    WebSocket,
}

impl Default for BacktesterControls {
    fn default() -> Self {
        Self {
            sim_latency_jitter: 5.0,
            sharp_limit_threshold: 0.65,
            tick_precision: TickPrecision::Millisecond,
            max_speed_multiplier: 1000.0,
            memory_limit_mb: 2048,
            enable_monitoring: true,
            log_level: LogLevel::Info,
            data_source: DataSource {
                source_type: DataSourceType::Local,
                connection_string: "./data/historical_ticks".to_string(),
                auth_token: None,
                compression: true,
            },
        }
    }
}

impl BacktesterControls {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        let mut config = Self::default();

        // SIM_LATENCY_JITTER
        if let Ok(val) = env::var("SIM_LATENCY_JITTER") {
            if let Ok(jitter) = val.parse::<f64>() {
                config.sim_latency_jitter = jitter;
            }
        }

        // SIM_SHARP_LIMIT_THRESHOLD
        if let Ok(val) = env::var("SIM_SHARP_LIMIT_THRESHOLD") {
            if let Ok(threshold) = val.parse::<f64>() {
                config.sharp_limit_threshold = threshold;
            }
        }

        // SIM_TICK_PRECISION
        if let Ok(val) = env::var("SIM_TICK_PRECISION") {
            config.tick_precision = match val.to_lowercase().as_str() {
                "micro" => TickPrecision::Microsecond,
                "nano" => TickPrecision::Nanosecond,
                _ => TickPrecision::Millisecond,
            };
        }

        // SIM_MAX_SPEED_MULTIPLIER
        if let Ok(val) = env::var("SIM_MAX_SPEED_MULTIPLIER") {
            if let Ok(multiplier) = val.parse::<f64>() {
                config.max_speed_multiplier = multiplier;
            }
        }

        // SIM_MEMORY_LIMIT_MB
        if let Ok(val) = env::var("SIM_MEMORY_LIMIT_MB") {
            if let Ok(limit) = val.parse::<u64>() {
                config.memory_limit_mb = limit;
            }
        }

        // SIM_ENABLE_MONITORING
        if let Ok(val) = env::var("SIM_ENABLE_MONITORING") {
            config.enable_monitoring = match val.to_lowercase().as_str() {
                "false" | "0" | "no" => false,
                _ => true,
            };
        }

        // SIM_LOG_LEVEL
        if let Ok(val) = env::var("SIM_LOG_LEVEL") {
            config.log_level = match val.to_lowercase().as_str() {
                "error" => LogLevel::Error,
                "warn" => LogLevel::Warn,
                "debug" => LogLevel::Debug,
                "trace" => LogLevel::Trace,
                _ => LogLevel::Info,
            };
        }

        // SIM_DATA_SOURCE_TYPE
        if let Ok(val) = env::var("SIM_DATA_SOURCE_TYPE") {
            config.data_source.source_type = match val.to_lowercase().as_str() {
                "s3" => DataSourceType::S3,
                "database" | "db" => DataSourceType::Database,
                "websocket" | "ws" => DataSourceType::WebSocket,
                _ => DataSourceType::Local,
            };
        }

        // SIM_DATA_SOURCE_PATH
        if let Ok(val) = env::var("SIM_DATA_SOURCE_PATH") {
            config.data_source.connection_string = val;
        }

        // SIM_DATA_SOURCE_AUTH_TOKEN
        if let Ok(val) = env::var("SIM_DATA_SOURCE_AUTH_TOKEN") {
            config.data_source.auth_token = Some(val);
        }

        // SIM_DATA_SOURCE_COMPRESSION
        if let Ok(val) = env::var("SIM_DATA_SOURCE_COMPRESSION") {
            config.data_source.compression = match val.to_lowercase().as_str() {
                "false" | "0" | "no" => false,
                _ => true,
            };
        }

        config
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.sim_latency_jitter < 0.0 {
            return Err("SIM_LATENCY_JITTER must be non-negative".to_string());
        }

        if !(0.0..=1.0).contains(&self.sharp_limit_threshold) {
            return Err("SIM_SHARP_LIMIT_THRESHOLD must be between 0.0 and 1.0".to_string());
        }

        if self.max_speed_multiplier <= 0.0 {
            return Err("SIM_MAX_SPEED_MULTIPLIER must be positive".to_string());
        }

        if self.memory_limit_mb < 64 {
            return Err("SIM_MEMORY_LIMIT_MB must be at least 64".to_string());
        }

        if self.data_source.connection_string.is_empty() {
            return Err("SIM_DATA_SOURCE_PATH cannot be empty".to_string());
        }

        Ok(())
    }

    /// Get precision multiplier for timestamp conversion
    pub fn get_precision_multiplier(&self) -> u64 {
        match self.tick_precision {
            TickPrecision::Millisecond => 1_000_000,
            TickPrecision::Microsecond => 1_000,
            TickPrecision::Nanosecond => 1,
        }
    }

    /// Get precision name as string
    pub fn get_precision_name(&self) -> &'static str {
        match self.tick_precision {
            TickPrecision::Millisecond => "millisecond",
            TickPrecision::Microsecond => "microsecond",
            TickPrecision::Nanosecond => "nanosecond",
        }
    }

    /// Convert configuration to environment file format
    pub fn to_env_file(&self) -> String {
        format!(
            "# Component #41: Tick-Sim-Backtester Configuration\n\
             # Generated automatically - do not edit manually\n\n\
             # Simulation latency jitter (milliseconds)\n\
             SIM_LATENCY_JITTER={}\n\n\
             # Sharp score threshold for account limiting\n\
             SIM_SHARP_LIMIT_THRESHOLD={}\n\n\
             # Tick precision level (milli, micro, nano)\n\
             SIM_TICK_PRECISION={}\n\n\
             # Maximum simulation speed multiplier\n\
             SIM_MAX_SPEED_MULTIPLIER={}\n\n\
             # Memory limit for tick buffer (MB)\n\
             SIM_MEMORY_LIMIT_MB={}\n\n\
             # Enable real-time monitoring\n\
             SIM_ENABLE_MONITORING={}\n\n\
             # Log level (error, warn, info, debug, trace)\n\
             SIM_LOG_LEVEL={:?}\n\n\
             # Data source type (local, s3, database, websocket)\n\
             SIM_DATA_SOURCE_TYPE={:?}\n\n\
             # Data source connection string or path\n\
             SIM_DATA_SOURCE_PATH={}\n\n\
             # Data source authentication token (optional)\n\
             SIM_DATA_SOURCE_AUTH_TOKEN={}\n\n\
             # Data source compression enabled\n\
             SIM_DATA_SOURCE_COMPRESSION={}\n",
            self.sim_latency_jitter,
            self.sharp_limit_threshold,
            match self.tick_precision {
                TickPrecision::Millisecond => "milli",
                TickPrecision::Microsecond => "micro",
                TickPrecision::Nanosecond => "nano",
            },
            self.max_speed_multiplier,
            self.memory_limit_mb,
            self.enable_monitoring,
            self.log_level,
            self.data_source.source_type,
            self.data_source.connection_string,
            self.data_source.auth_token.as_deref().unwrap_or(""),
            self.data_source.compression
        )
    }
}

/// Pattern ROI and Half-Life verification data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternVerification {
    /// Component ID
    pub component_id: u16,
    /// Component name
    pub component_name: String,
    /// ROI target percentage
    pub roi_target_percent: f64,
    /// Alpha half-life (weeks)
    pub alpha_half_life_weeks: f64,
    /// Primary constraint
    pub primary_constraint: String,
    /// Current verified ROI
    pub verified_roi_percent: f64,
    /// Verification status
    pub verification_status: VerificationStatus,
}

/// Verification status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VerificationStatus {
    Pending,
    InProgress,
    Verified,
    Failed,
    Exceeded,
}

impl PatternVerification {
    /// Create new pattern verification
    pub fn new(component_id: u16, component_name: &str, roi_target: f64, half_life_weeks: f64, constraint: &str) -> Self {
        Self {
            component_id,
            component_name: component_name.to_string(),
            roi_target_percent: roi_target,
            alpha_half_life_weeks: half_life_weeks,
            primary_constraint: constraint.to_string(),
            verified_roi_percent: 0.0,
            verification_status: VerificationStatus::Pending,
        }
    }

    /// Update verification results
    pub fn update_results(&mut self, verified_roi: f64, status: VerificationStatus) {
        self.verified_roi_percent = verified_roi;
        self.verification_status = status;
    }

    /// Check if target is met
    pub fn is_target_met(&self) -> bool {
        self.verified_roi_percent >= self.roi_target_percent
    }
}

/// Default pattern verifications based on blueprint
pub fn get_default_pattern_verifications() -> Vec<PatternVerification> {
    vec![
        PatternVerification::new(51, "HT Inference", 0.5, 6.0, "Provider Latency"),
        PatternVerification::new(68, "Steam Prop", 1.2, 4.0, "Account Limiting"),
        PatternVerification::new(75, "Velocity Conv", 2.2, 8.0, "Model Complexity"),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_backtester_controls_default() {
        let config = BacktesterControls::default();
        assert_eq!(config.sim_latency_jitter, 5.0);
        assert_eq!(config.sharp_limit_threshold, 0.65);
        assert!(matches!(config.tick_precision, TickPrecision::Millisecond));
    }

    #[test]
    fn test_backtester_controls_from_env() {
        // Set environment variables
        env::set_var("SIM_LATENCY_JITTER", "10");
        env::set_var("SIM_SHARP_LIMIT_THRESHOLD", "0.7");
        env::set_var("SIM_TICK_PRECISION", "micro");

        let config = BacktesterControls::from_env();

        assert_eq!(config.sim_latency_jitter, 10.0);
        assert_eq!(config.sharp_limit_threshold, 0.7);
        assert!(matches!(config.tick_precision, TickPrecision::Microsecond));

        // Clean up
        env::remove_var("SIM_LATENCY_JITTER");
        env::remove_var("SIM_SHARP_LIMIT_THRESHOLD");
        env::remove_var("SIM_TICK_PRECISION");
    }

    #[test]
    fn test_config_validation() {
        let mut config = BacktesterControls::default();

        // Valid config should pass
        assert!(config.validate().is_ok());

        // Invalid jitter should fail
        config.sim_latency_jitter = -1.0;
        assert!(config.validate().is_err());

        // Invalid sharp threshold should fail
        config.sim_latency_jitter = 5.0;
        config.sharp_limit_threshold = 1.5;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_precision_multiplier() {
        let mut config = BacktesterControls::default();

        config.tick_precision = TickPrecision::Millisecond;
        assert_eq!(config.get_precision_multiplier(), 1_000_000);

        config.tick_precision = TickPrecision::Microsecond;
        assert_eq!(config.get_precision_multiplier(), 1_000);

        config.tick_precision = TickPrecision::Nanosecond;
        assert_eq!(config.get_precision_multiplier(), 1);
    }

    #[test]
    fn test_pattern_verification() {
        let mut verification = PatternVerification::new(75, "Velocity Conv", 2.2, 8.0, "Model Complexity");

        assert_eq!(verification.component_id, 75);
        assert_eq!(verification.roi_target_percent, 2.2);
        assert!(matches!(verification.verification_status, VerificationStatus::Pending));
        assert!(!verification.is_target_met());

        verification.update_results(2.5, VerificationStatus::Verified);
        assert_eq!(verification.verified_roi_percent, 2.5);
        assert!(verification.is_target_met());
    }

    #[test]
    fn test_default_pattern_verifications() {
        let verifications = get_default_pattern_verifications();

        assert_eq!(verifications.len(), 3);
        assert_eq!(verifications[0].component_id, 51);
        assert_eq!(verifications[1].roi_target_percent, 1.2);
        assert_eq!(verifications[2].alpha_half_life_weeks, 8.0);
    }
}
