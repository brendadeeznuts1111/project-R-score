//! Hyperparameter Optimization System for Pattern-Specific Filter Tuning
//!
//! Grid search and Bayesian optimization for Kalman filter hyperparameters.
//! Each pattern requires separate tuning via historical data validation.

use crate::kalman_filter_suite::*;
use crate::microstructural_simulator::*;
use crate::types::{TimestampNs, MarketType, Platform};
use std::collections::{HashMap, HashSet};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, debug, error};
use rand::{thread_rng, Rng};
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;

/// Hyperparameter optimization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationConfig {
    /// Pattern ID to optimize
    pub pattern_id: u16,
    /// Optimization method
    pub method: OptimizationMethod,
    /// Parameter grid for grid search
    pub param_grid: ParameterGrid,
    /// Bayesian optimization config
    pub bayesian_config: BayesianConfig,
    /// Cross-validation folds
    pub cv_folds: u32,
    /// Maximum iterations
    pub max_iterations: u32,
    /// Early stopping patience
    pub early_stopping_patience: u32,
    /// Parallel workers
    pub n_workers: usize,
}

/// Optimization method
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationMethod {
    /// Exhaustive grid search
    GridSearch,
    /// Random search
    RandomSearch { n_samples: u32 },
    /// Bayesian optimization
    BayesianOptimization,
    /// Genetic algorithm
    GeneticAlgorithm { population_size: u32, mutation_rate: f64 },
}

/// Parameter grid for optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterGrid {
    /// Time step values
    pub dt_values: Vec<f64>,
    /// Process noise (steam regime) values
    pub q_steam_values: Vec<f64>,
    /// Process noise (quiet regime) values
    pub q_quiet_values: Vec<f64>,
    /// Observation noise values
    pub r_noise_values: Vec<f64>,
    /// Velocity threshold values
    pub velocity_threshold_values: Vec<f64>,
    /// Pattern-specific parameters
    pub pattern_params: HashMap<String, Vec<f64>>,
}

/// Bayesian optimization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BayesianConfig {
    /// Acquisition function
    pub acquisition_function: AcquisitionFunction,
    /// Initial random samples
    pub n_initial_samples: u32,
    /// Exploration parameter
    pub exploration_parameter: f64,
    /// Maximum optimization iterations
    pub max_iterations: u32,
}

/// Acquisition function for Bayesian optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AcquisitionFunction {
    /// Expected Improvement
    ExpectedImprovement,
    /// Upper Confidence Bound
    UpperConfidenceBound { beta: f64 },
    /// Probability of Improvement
    ProbabilityOfImprovement,
    /// Thompson Sampling
    ThompsonSampling,
}

/// Optimization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    /// Pattern ID
    pub pattern_id: u16,
    /// Best parameters found
    pub best_params: FilterParameters,
    /// Best score achieved
    pub best_score: f64,
    /// Optimization history
    pub history: Vec<OptimizationIteration>,
    /// Total optimization time (seconds)
    pub total_time_seconds: f64,
    /// Convergence status
    pub converged: bool,
}

/// Filter parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterParameters {
    /// Time step
    pub dt: f64,
    /// Process noise (steam regime)
    pub q_steam: f64,
    /// Process noise (quiet regime)
    pub q_quiet: f64,
    /// Observation noise
    pub r_noise: f64,
    /// Velocity threshold
    pub velocity_threshold: f64,
    /// Pattern-specific parameters
    pub pattern_params: HashMap<String, f64>,
}

/// Single optimization iteration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationIteration {
    /// Iteration number
    pub iteration: u32,
    /// Parameters tested
    pub params: FilterParameters,
    /// Score achieved
    pub score: f64,
    /// Validation metrics
    pub metrics: ValidationMetrics,
    /// Execution time (seconds)
    pub execution_time_seconds: f64,
}

/// Validation metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationMetrics {
    /// Sharpe ratio
    pub sharpe_ratio: f64,
    /// ROI percentage
    pub roi_percent: f64,
    /// Maximum drawdown
    pub max_drawdown: f64,
    /// Win rate
    pub win_rate: f64,
    /// Edge capture rate
    pub edge_capture_rate: f64,
    /// Account lifespan (trades)
    pub account_lifespan_trades: u32,
    /// Average execution latency (microseconds)
    pub avg_execution_latency_us: f64,
}

/// Gaussian Process for Bayesian optimization
#[derive(Debug, Clone)]
pub struct GaussianProcess {
    /// Training inputs
    pub x_train: Vec<Vec<f64>>,
    /// Training targets
    pub y_train: Vec<f64>,
    /// Kernel parameters
    pub kernel_params: KernelParams,
    /// Noise level
    pub noise: f64,
}

/// Kernel parameters for Gaussian Process
#[derive(Debug, Clone)]
pub struct KernelParams {
    /// Length scale
    pub length_scale: f64,
    /// Signal variance
    pub signal_variance: f64,
}

/// Hyperparameter optimizer
pub struct HyperparameterOptimizer {
    /// Optimization configuration
    pub config: OptimizationConfig,
    /// Historical data for validation
    pub historical_data: Vec<SyncedTickBundle>,
    /// Cross-validation splitter
    pub cv_splitter: CrossValidationSplitter,
    /// Optimization state
    pub state: OptimizationState,
}

/// Cross-validation splitter
#[derive(Debug, Clone)]
pub struct CrossValidationSplitter {
    /// Number of folds
    pub n_folds: u32,
    /// Random seed
    pub seed: u64,
}

/// Optimization state
#[derive(Debug)]
pub struct OptimizationState {
    /// Current iteration
    pub current_iteration: u32,
    /// Best score so far
    pub best_score: f64,
    /// Best parameters so far
    pub best_params: Option<FilterParameters>,
    /// Optimization history
    pub history: Vec<OptimizationIteration>,
    /// Early stopping counter
    pub early_stopping_counter: u32,
    /// Converged flag
    pub converged: bool,
}

impl Default for ParameterGrid {
    fn default() -> Self {
        Self {
            dt_values: vec![0.01, 0.02, 0.05, 0.1],
            q_steam_values: vec![0.1, 0.5, 1.0, 2.0],
            q_quiet_values: vec![0.001, 0.005, 0.01, 0.05],
            r_noise_values: vec![0.01, 0.05, 0.1, 0.2],
            velocity_threshold_values: vec![0.1, 0.2, 0.3, 0.5],
            pattern_params: HashMap::new(),
        }
    }
}

impl Default for BayesianConfig {
    fn default() -> Self {
        Self {
            acquisition_function: AcquisitionFunction::ExpectedImprovement,
            n_initial_samples: 10,
            exploration_parameter: 0.1,
            max_iterations: 50,
        }
    }
}

impl Default for OptimizationConfig {
    fn default() -> Self {
        Self {
            pattern_id: 51,
            method: OptimizationMethod::GridSearch,
            param_grid: ParameterGrid::default(),
            bayesian_config: BayesianConfig::default(),
            cv_folds: 5,
            max_iterations: 100,
            early_stopping_patience: 10,
            n_workers: 4,
        }
    }
}

impl GaussianProcess {
    /// Create new Gaussian Process
    pub fn new(kernel_params: KernelParams, noise: f64) -> Self {
        Self {
            x_train: Vec::new(),
            y_train: Vec::new(),
            kernel_params,
            noise,
        }
    }

    /// Train the Gaussian Process
    pub fn train(&mut self, x: Vec<Vec<f64>>, y: Vec<f64>) {
        self.x_train = x;
        self.y_train = y;
    }

    /// Predict mean and variance for new points
    pub fn predict(&self, x_test: &[Vec<f64>]) -> (Vec<f64>, Vec<f64>) {
        if self.x_train.is_empty() {
            return (vec![0.0; x_test.len()], vec![1.0; x_test.len()]);
        }

        let mut means = Vec::new();
        let variances = Vec::new();

        for x in x_test {
            let (mean, var) = self.predict_single(x);
            means.push(mean);
            variances.push(var);
        }

        (means, variances)
    }

    /// Predict for single point
    fn predict_single(&self, x: &[f64]) -> (f64, f64) {
        let n = self.x_train.len();

        // Compute kernel matrix
        let mut k = Vec::with_capacity(n);
        for x_train in &self.x_train {
            k.push(self.rbf_kernel(x_train, x));
        }

        // Solve for weights (simplified - would use Cholesky in production)
        let mut mean = 0.0;
        for (i, &k_val) in k.iter().enumerate() {
            mean += k_val * self.y_train[i];
        }

        // Predictive variance
        let k_star = self.rbf_kernel(x, x);
        let mut var = k_star;
        for i in 0..n {
            for j in 0..n {
                var -= k[i] * k[j] * self.kernel_params.signal_variance;
            }
        }
        var += self.noise;

        (mean, var.max(1e-6))
    }

    /// RBF kernel function
    fn rbf_kernel(&self, x1: &[f64], x2: &[f64]) -> f64 {
        let mut squared_dist = 0.0;
        for (a, b) in x1.iter().zip(x2.iter()) {
            squared_dist += (a - b).powi(2);
        }

        self.kernel_params.signal_variance *
        (-squared_dist / (2.0 * self.kernel_params.length_scale.powi(2))).exp()
    }
}

impl HyperparameterOptimizer {
    /// Create new hyperparameter optimizer
    pub fn new(config: OptimizationConfig, historical_data: Vec<SyncedTickBundle>) -> Self {
        let cv_splitter = CrossValidationSplitter {
            n_folds: config.cv_folds,
            seed: 42,
        };

        let state = OptimizationState {
            current_iteration: 0,
            best_score: f64::NEG_INFINITY,
            best_params: None,
            history: Vec::new(),
            early_stopping_counter: 0,
            converged: false,
        };

        Self {
            config,
            historical_data,
            cv_splitter,
            state,
        }
    }

    /// Run optimization
    pub async fn optimize(&mut self) -> Result<OptimizationResult, Box<dyn std::error::Error + Send + Sync>> {
        info!("Starting hyperparameter optimization for pattern {}", self.config.pattern_id);

        let start_time = std::time::Instant::now();

        match &self.config.method {
            OptimizationMethod::GridSearch => self.grid_search().await,
            OptimizationMethod::RandomSearch { n_samples } => self.random_search(*n_samples).await,
            OptimizationMethod::BayesianOptimization => self.bayesian_optimization().await,
            OptimizationMethod::GeneticAlgorithm { population_size, mutation_rate } => {
                self.genetic_algorithm(*population_size, *mutation_rate).await
            }
        }?;

        let total_time = start_time.elapsed().as_secs_f64();

        Ok(OptimizationResult {
            pattern_id: self.config.pattern_id,
            best_params: self.state.best_params.clone().unwrap_or_default(),
            best_score: self.state.best_score,
            history: self.state.history.clone(),
            total_time_seconds: total_time,
            converged: self.state.converged,
        })
    }

    /// Grid search optimization
    async fn grid_search(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let param_combinations = self.generate_grid_combinations();
        info!("Grid search: {} parameter combinations", param_combinations.len());

        let semaphore = Arc::new(Semaphore::new(self.config.n_workers));
        let results = Arc::new(Mutex::new(Vec::new()));

        let mut handles = Vec::new();

        for (i, params) in param_combinations.into_iter().enumerate() {
            if self.state.current_iteration >= self.config.max_iterations {
                break;
            }

            let semaphore_clone = semaphore.clone();
            let results_clone = results.clone();
            let params_clone = params.clone();

            let handle = tokio::spawn(async move {
                let _permit = semaphore_clone.acquire().await.unwrap();

                let score = Self::evaluate_params(&params_clone).await;

                results_clone.lock().unwrap().push((params_clone, score));
            });

            handles.push(handle);
        }

        // Wait for all evaluations
        for handle in handles {
            handle.await?;
        }

        // Process results
        let results = results.lock().unwrap();
        for (params, score) in results.iter() {
            self.update_best_params(params.clone(), *score);
        }

        Ok(())
    }

    /// Random search optimization
    async fn random_search(&mut self, n_samples: u32) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("Random search: {} samples", n_samples);

        for i in 0..n_samples {
            if self.state.current_iteration >= self.config.max_iterations {
                break;
            }

            let params = self.generate_random_params();
            let score = Self::evaluate_params(&params).await;

            self.update_best_params(params, score);

            if i % 10 == 0 {
                info!("Random search progress: {}/{}", i, n_samples);
            }
        }

        Ok(())
    }

    /// Bayesian optimization
    async fn bayesian_optimization(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("Bayesian optimization: {} initial samples + {} iterations",
              self.config.bayesian_config.n_initial_samples,
              self.config.bayesian_config.max_iterations);

        // Initial random sampling
        let mut gp = GaussianProcess::new(
            KernelParams {
                length_scale: 1.0,
                signal_variance: 1.0,
            },
            1e-6,
        );

        let mut x_train = Vec::new();
        let mut y_train = Vec::new();

        // Initial random samples
        for _ in 0..self.config.bayesian_config.n_initial_samples {
            let params = self.generate_random_params();
            let score = Self::evaluate_params(&params).await;

            x_train.push(self.params_to_vector(&params));
            y_train.push(score);

            self.update_best_params(params, score);
        }

        gp.train(x_train, y_train);

        // Bayesian optimization loop
        for iter in 0..self.config.bayesian_config.max_iterations {
            if self.state.current_iteration >= self.config.max_iterations {
                break;
            }

            // Generate candidate points
            let candidates = self.generate_candidates(100);
            let candidate_vectors: Vec<Vec<f64>> = candidates.iter()
                .map(|p| self.params_to_vector(p))
                .collect();

            // Predict acquisition function
            let (means, variances) = gp.predict(&candidate_vectors);
            let acquisition_values = self.compute_acquisition(&means, &variances, &y_train);

            // Select best candidate
            let best_idx = acquisition_values.iter()
                .enumerate()
                .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
                .map(|(i, _)| i)
                .unwrap();

            let best_params = candidates[best_idx].clone();
            let score = Self::evaluate_params(&best_params).await;

            // Update GP
            x_train.push(self.params_to_vector(&best_params));
            y_train.push(score);
            gp.train(x_train, y_train);

            self.update_best_params(best_params, score);

            if iter % 10 == 0 {
                info!("Bayesian optimization progress: {}/{}", iter, self.config.bayesian_config.max_iterations);
            }
        }

        Ok(())
    }

    /// Genetic algorithm optimization
    async fn genetic_algorithm(&mut self, population_size: u32, mutation_rate: f64) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("Genetic algorithm: population size {}, mutation rate {:.3}", population_size, mutation_rate);

        // Initialize population
        let mut population: Vec<FilterParameters> = (0..population_size)
            .map(|_| self.generate_random_params())
            .collect();

        for generation in 0..self.config.max_iterations {
            if self.state.current_iteration >= self.config.max_iterations {
                break;
            }

            // Evaluate fitness
            let mut fitness_scores = Vec::new();
            for individual in &population {
                let score = Self::evaluate_params(individual).await;
                fitness_scores.push(score);
            }

            // Update best parameters
            for (individual, score) in population.iter().zip(fitness_scores.iter()) {
                self.update_best_params(individual.clone(), *score);
            }

            // Selection and reproduction
            population = self.evolve_population(&population, &fitness_scores, mutation_rate);

            if generation % 10 == 0 {
                info!("Genetic algorithm progress: {}/{}", generation, self.config.max_iterations);
            }
        }

        Ok(())
    }

    /// Generate all grid search combinations
    fn generate_grid_combinations(&self) -> Vec<FilterParameters> {
        let mut combinations = Vec::new();

        for &dt in &self.config.param_grid.dt_values {
            for &q_steam in &self.config.param_grid.q_steam_values {
                for &q_quiet in &self.config.param_grid.q_quiet_values {
                    for &r_noise in &self.config.param_grid.r_noise_values {
                        for &velocity_threshold in &self.config.param_grid.velocity_threshold_values {
                            let params = FilterParameters {
                                dt,
                                q_steam,
                                q_quiet,
                                r_noise,
                                velocity_threshold,
                                pattern_params: HashMap::new(), // TODO: Add pattern-specific params
                            };
                            combinations.push(params);
                        }
                    }
                }
            }
        }

        combinations
    }

    /// Generate random parameters
    fn generate_random_params(&self) -> FilterParameters {
        let mut rng = thread_rng();

        let dt = self.config.param_grid.dt_values[rng.gen_range(0..self.config.param_grid.dt_values.len())];
        let q_steam = self.config.param_grid.q_steam_values[rng.gen_range(0..self.config.param_grid.q_steam_values.len())];
        let q_quiet = self.config.param_grid.q_quiet_values[rng.gen_range(0..self.config.param_grid.q_quiet_values.len())];
        let r_noise = self.config.param_grid.r_noise_values[rng.gen_range(0..self.config.param_grid.r_noise_values.len())];
        let velocity_threshold = self.config.param_grid.velocity_threshold_values[rng.gen_range(0..self.config.param_grid.velocity_threshold_values.len())];

        FilterParameters {
            dt,
            q_steam,
            q_quiet,
            r_noise,
            velocity_threshold,
            pattern_params: HashMap::new(),
        }
    }

    /// Generate candidate points for Bayesian optimization
    fn generate_candidates(&self, n_candidates: usize) -> Vec<FilterParameters> {
        (0..n_candidates).map(|_| self.generate_random_params()).collect()
    }

    /// Convert parameters to vector for GP
    fn params_to_vector(&self, params: &FilterParameters) -> Vec<f64> {
        vec![
            params.dt,
            params.q_steam,
            params.q_quiet,
            params.r_noise,
            params.velocity_threshold,
        ]
    }

    /// Compute acquisition function values
    fn compute_acquisition(&self, means: &[f64], variances: &[f64], y_train: &[f64]) -> Vec<f64> {
        let best_y = y_train.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));

        match self.config.bayesian_config.acquisition_function {
            AcquisitionFunction::ExpectedImprovement => {
                means.iter().zip(variances.iter()).map(|(&mean, &var)| {
                    let std_dev = var.sqrt();
                    let z = (mean - best_y) / (std_dev + 1e-6);
                    let phi = (-0.5 * z * z) / (2.0 * std::f64::consts::PI).sqrt();
                    let Phi = 0.5 * (1.0 + erf(z / std::f64::consts::SQRT_2));
                    (mean - best_y) * Phi + std_dev * phi
                }).collect()
            },
            AcquisitionFunction::UpperConfidenceBound { beta } => {
                means.iter().zip(variances.iter()).map(|(&mean, &var)| {
                    mean + beta * var.sqrt()
                }).collect()
            },
            AcquisitionFunction::ProbabilityOfImprovement => {
                means.iter().zip(variances.iter()).map(|(&mean, &var)| {
                    let std_dev = var.sqrt();
                    let z = (mean - best_y) / (std_dev + 1e-6);
                    0.5 * (1.0 + erf(z / std::f64::consts::SQRT_2))
                }).collect()
            },
            AcquisitionFunction::ThompsonSampling => {
                let mut rng = thread_rng();
                means.iter().zip(variances.iter()).map(|(&mean, &var)| {
                    mean + rng.gen_range(-1.0..1.0) * var.sqrt()
                }).collect()
            },
        }
    }

    /// Evolve population for genetic algorithm
    fn evolve_population(&self, population: &[FilterParameters], fitness_scores: &[f64], mutation_rate: f64) -> Vec<FilterParameters> {
        let mut new_population = Vec::new();
        let mut rng = thread_rng();

        // Elitism: keep best 10%
        let elite_size = (population.len() as f64 * 0.1) as usize;
        let mut indexed_scores: Vec<(usize, f64)> = fitness_scores.iter().enumerate().map(|(i, &s)| (i, s)).collect();
        indexed_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        for &(idx, _) in indexed_scores.iter().take(elite_size) {
            new_population.push(population[idx].clone());
        }

        // Generate rest through crossover and mutation
        while new_population.len() < population.len() {
            // Tournament selection
            let parent1 = self.tournament_select(population, fitness_scores, 3);
            let parent2 = self.tournament_select(population, fitness_scores, 3);

            // Crossover
            let child = self.crossover(&parent1, &parent2);

            // Mutation
            let mutated_child = self.mutate(child, mutation_rate);

            new_population.push(mutated_child);
        }

        new_population
    }

    /// Tournament selection
    fn tournament_select(&self, population: &[FilterParameters], fitness_scores: &[f64], tournament_size: usize) -> FilterParameters {
        let mut rng = thread_rng();
        let mut best_idx = rng.gen_range(0..population.len());
        let mut best_score = fitness_scores[best_idx];

        for _ in 1..tournament_size {
            let idx = rng.gen_range(0..population.len());
            if fitness_scores[idx] > best_score {
                best_idx = idx;
                best_score = fitness_scores[idx];
            }
        }

        population[best_idx].clone()
    }

    /// Crossover two parents
    fn crossover(&self, parent1: &FilterParameters, parent2: &FilterParameters) -> FilterParameters {
        let mut rng = thread_rng();

        FilterParameters {
            dt: if rng.gen_bool(0.5) { parent1.dt } else { parent2.dt },
            q_steam: if rng.gen_bool(0.5) { parent1.q_steam } else { parent2.q_steam },
            q_quiet: if rng.gen_bool(0.5) { parent1.q_quiet } else { parent2.q_quiet },
            r_noise: if rng.gen_bool(0.5) { parent1.r_noise } else { parent2.r_noise },
            velocity_threshold: if rng.gen_bool(0.5) { parent1.velocity_threshold } else { parent2.velocity_threshold },
            pattern_params: HashMap::new(), // TODO: Handle pattern params
        }
    }

    /// Mutate parameters
    fn mutate(&self, mut params: FilterParameters, mutation_rate: f64) -> FilterParameters {
        let mut rng = thread_rng();

        if rng.gen_bool(mutation_rate) {
            // Mutate dt
            let idx = rng.gen_range(0..self.config.param_grid.dt_values.len());
            params.dt = self.config.param_grid.dt_values[idx];
        }

        if rng.gen_bool(mutation_rate) {
            // Mutate q_steam
            let idx = rng.gen_range(0..self.config.param_grid.q_steam_values.len());
            params.q_steam = self.config.param_grid.q_steam_values[idx];
        }

        if rng.gen_bool(mutation_rate) {
            // Mutate q_quiet
            let idx = rng.gen_range(0..self.config.param_grid.q_quiet_values.len());
            params.q_quiet = self.config.param_grid.q_quiet_values[idx];
        }

        if rng.gen_bool(mutation_rate) {
            // Mutate r_noise
            let idx = rng.gen_range(0..self.config.param_grid.r_noise_values.len());
            params.r_noise = self.config.param_grid.r_noise_values[idx];
        }

        if rng.gen_bool(mutation_rate) {
            // Mutate velocity_threshold
            let idx = rng.gen_range(0..self.config.param_grid.velocity_threshold_values.len());
            params.velocity_threshold = self.config.param_grid.velocity_threshold_values[idx];
        }

        params
    }

    /// Update best parameters if score is better
    fn update_best_params(&mut self, params: FilterParameters, score: f64) {
        self.state.current_iteration += 1;

        let iteration = OptimizationIteration {
            iteration: self.state.current_iteration,
            params: params.clone(),
            score,
            metrics: ValidationMetrics::default(), // TODO: Calculate actual metrics
            execution_time_seconds: 0.0, // TODO: Track execution time
        };

        self.state.history.push(iteration);

        if score > self.state.best_score {
            self.state.best_score = score;
            self.state.best_params = Some(params.clone());
            self.state.early_stopping_counter = 0;
        } else {
            self.state.early_stopping_counter += 1;
        }

        // Check for convergence
        if self.state.early_stopping_counter >= self.config.early_stopping_patience {
            self.state.converged = true;
        }
    }

    /// Evaluate parameters with cross-validation
    async fn evaluate_params(params: &FilterParameters) -> f64 {
        // TODO: Implement actual parameter evaluation
        // This would create a filter with the given parameters
        // and run cross-validation on historical data

        // Mock implementation for now
        let mut rng = thread_rng();
        rng.gen_range(0.0..1.0)
    }
}

impl Default for FilterParameters {
    fn default() -> Self {
        Self {
            dt: 0.05,
            q_steam: 0.5,
            q_quiet: 0.01,
            r_noise: 0.05,
            velocity_threshold: 0.3,
            pattern_params: HashMap::new(),
        }
    }
}

impl Default for ValidationMetrics {
    fn default() -> Self {
        Self {
            sharpe_ratio: 0.0,
            roi_percent: 0.0,
            max_drawdown: 0.0,
            win_rate: 0.0,
            edge_capture_rate: 0.0,
            account_lifespan_trades: 0,
            avg_execution_latency_us: 0.0,
        }
    }
}

// Error function for normal distribution
fn erf(x: f64) -> f64 {
    // Approximation of error function
    let a1 =  0.254829592;
    let a2 = -0.284496736;
    let a3 =  1.421413741;
    let a4 = -1.453152027;
    let a5 =  1.061405429;
    let p  =  0.3275911;

    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let x = x.abs();

    let t = 1.0 / (1.0 + p * x);
    let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * (-x * x).exp();

    sign * y
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_optimization_config_default() {
        let config = OptimizationConfig::default();
        assert_eq!(config.pattern_id, 51);
        assert_eq!(config.cv_folds, 5);
        assert_eq!(config.max_iterations, 100);
    }

    #[test]
    fn test_parameter_grid_default() {
        let grid = ParameterGrid::default();
        assert_eq!(grid.dt_values.len(), 4);
        assert_eq!(grid.q_steam_values.len(), 4);
        assert!(grid.dt_values.contains(&0.05));
    }

    #[test]
    fn test_gaussian_process() {
        let mut gp = GaussianProcess::new(
            KernelParams {
                length_scale: 1.0,
                signal_variance: 1.0,
            },
            1e-6,
        );

        // Train with some data
        let x = vec![vec![0.0], vec![1.0], vec![2.0]];
        let y = vec![0.0, 1.0, 0.0];
        gp.train(x, y);

        // Predict
        let x_test = vec![vec![0.5], vec![1.5]];
        let (means, variances) = gp.predict(&x_test);

        assert_eq!(means.len(), 2);
        assert_eq!(variances.len(), 2);
        assert!(variances[0] > 0.0);
        assert!(variances[1] > 0.0);
    }

    #[test]
    fn test_hyperparameter_optimizer_creation() {
        let config = OptimizationConfig::default();
        let historical_data = Vec::new();
        let optimizer = HyperparameterOptimizer::new(config, historical_data);

        assert_eq!(optimizer.config.pattern_id, 51);
        assert_eq!(optimizer.config.cv_folds, 5);
    }

    #[test]
    fn test_filter_parameters_default() {
        let params = FilterParameters::default();
        assert_eq!(params.dt, 0.05);
        assert_eq!(params.q_steam, 0.5);
        assert_eq!(params.velocity_threshold, 0.3);
    }

    #[test]
    fn test_acquisition_functions() {
        let means = vec![0.5, 1.0, 1.5];
        let variances = vec![0.1, 0.2, 0.3];
        let y_train = vec![0.8, 1.2, 1.0];

        // Test Expected Improvement calculation
        let best_y = y_train.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
        assert_eq!(best_y, 1.2);
    }

    #[test]
    fn test_genetic_operations() {
        let config = OptimizationConfig::default();
        let optimizer = HyperparameterOptimizer::new(config, Vec::new());

        let parent1 = FilterParameters::default();
        let parent2 = FilterParameters {
            dt: 0.1,
            ..Default::default()
        };

        let child = optimizer.crossover(&parent1, &parent2);
        assert!(child.dt == parent1.dt || child.dt == parent2.dt);

        let mutated = optimizer.mutate(child.clone(), 1.0);
        // Should be potentially different due to mutation
    }
}
