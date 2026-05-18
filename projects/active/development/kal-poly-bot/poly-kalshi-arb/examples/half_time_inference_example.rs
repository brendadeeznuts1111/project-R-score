//! Half-Time Inference Filter Usage Example
//!
//! Demonstrates how to use the HalfTimeInferenceKF with the TypeScript-compatible interface
//! for Pattern #51: Half-Time Line Inference Lag

use poly_kalshi_arb::kalman_filter_suite::{HalfTimeInferenceKF, HTTickData, FTTickData, Regime};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Half-Time Inference Filter Example ===");

    // Create filter with default dt = 0.05 (50ms time step)
    let mut kf = HalfTimeInferenceKF::new(0.05);

    println!("Initial filter state:");
    println!("  Regime: {:?}", kf.base.current_regime);
    println!("  State vector: {:?}", kf.get_state_vector());
    println!();

    // Simulate a sequence of HT and FT updates
    println!("Processing HT/FT tick sequence:");

    // Example 1: Small HT move
    let ht_tick1 = HTTickData { price_delta: 0.2 };
    let ft_tick1 = FTTickData { price: 220.5 };

    kf.update_with_both_markets(&ht_tick1, &ft_tick1)?;
    let predicted_ft1 = kf.predict_ft_total();

    println!("  Tick 1 - HT delta: {:.2}, FT price: {:.1}", ht_tick1.price_delta, ft_tick1.price);
    println!("    Predicted FT total: {:.2}", predicted_ft1);
    println!("    Current regime: {:?}", kf.base.current_regime);
    println!();

    // Example 2: Larger HT move (potential trigger)
    let ht_tick2 = HTTickData { price_delta: 0.8 };
    let ft_tick2 = FTTickData { price: 221.0 };

    kf.update_with_both_markets(&ht_tick2, &ft_tick2)?;
    let predicted_ft2 = kf.predict_ft_total();

    println!("  Tick 2 - HT delta: {:.2}, FT price: {:.1}", ht_tick2.price_delta, ft_tick2.price);
    println!("    Predicted FT total: {:.2}", predicted_ft2);
    println!("    Current regime: {:?}", kf.base.current_regime);

    // Calculate edge
    let edge = (predicted_ft2 - ft_tick2.price).abs();
    println!("    Edge: {:.2} points", edge);
    println!();

    // Example 3: High velocity move (should trigger steam regime)
    let ht_tick3 = HTTickData { price_delta: 1.5 };
    let ft_tick3 = FTTickData { price: 222.5 };

    kf.update_with_both_markets(&ht_tick3, &ft_tick3)?;
    let predicted_ft3 = kf.predict_ft_total();

    println!("  Tick 3 - HT delta: {:.2}, FT price: {:.1}", ht_tick3.price_delta, ft_tick3.price);
    println!("    Predicted FT total: {:.2}", predicted_ft3);
    println!("    Current regime: {:?}", kf.base.current_regime);

    let edge3 = (predicted_ft3 - ft_tick3.price).abs();
    println!("    Edge: {:.2} points", edge3);

    // Get detailed regime information
    let (regime, velocity, ht_influence) = kf.get_regime_info();
    println!("    Velocity: {:.3} pt/s", velocity);
    println!("    HT influence: {:.3}", ht_influence);
    println!();

    // Display transition and observation matrices
    println!("Filter matrices:");
    println!("  Transition matrix (F):");
    let f_matrix = kf.get_transition_matrix();
    for i in 0..3 {
        print!("    [");
        for j in 0..3 {
            print!("{:8.4}", f_matrix[(i, j)]);
        }
        println!(" ]");
    }

    println!("  Observation matrix (H):");
    let h_matrix = kf.get_observation_matrix();
    print!("    [");
    for j in 0..3 {
        print!("{:8.4}", h_matrix[(0, j)]);
    }
    println!(" ]");
    println!();

    // Performance metrics
    println!("Performance metrics:");
    println!("  Position uncertainty: {:.6}", kf.base.get_position_uncertainty());
    println!("  Total uncertainty (trace): {:.6}", kf.base.p.trace());
    println!("  Propagation coefficient: {:.2}", kf.propagation_coef);

    // Trading decision logic
    println!();
    println!("Trading decision analysis:");
    if edge3 > 0.5 && regime == Regime::Steam {
        println!("  ✓ TRADE SIGNAL: Edge {:.2} > 0.5 in STEAM regime", edge3);
        println!("    Recommended action: Bet FT total {:.2}", predicted_ft3);
        println!("    Expected edge: {:.2} points", edge3);
        println!("    Confidence: {:.1}%", (velocity / (velocity + 0.3)) * 100.0);
    } else if edge3 > 0.5 {
        println!("  ⚠ MARGINAL SIGNAL: Edge {:.2} > 0.5 but not in STEAM regime", edge3);
        println!("    Current regime: {:?}", regime);
        println!("    Wait for STEAM regime confirmation");
    } else {
        println!("  ✗ NO SIGNAL: Edge {:.2} < 0.5 threshold", edge3);
    }

    println!();
    println!("=== Example Complete ===");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_half_time_inference_workflow() {
        let mut kf = HalfTimeInferenceKF::new(0.05);

        // Test initial state
        assert_eq!(kf.base.current_regime, Regime::Quiet);

        // Process multiple ticks
        let ht_ticks = vec![HTTickData { price_delta: 0.3 }, HTTickData { price_delta: 0.7 }];
        let ft_ticks = vec![FTTickData { price: 220.0 }, FTTickData { price: 221.0 }];

        for (ht_tick, ft_tick) in ht_ticks.iter().zip(ft_ticks.iter()) {
            kf.update_with_both_markets(ht_tick, ft_tick).unwrap();

            let predicted = kf.predict_ft_total();
            assert!(predicted > 0.0);

            let state = kf.get_state_vector();
            assert_eq!(state.len(), 3);
        }

        // Should have some HT influence by now
        let (_, _, ht_influence) = kf.get_regime_info();
        assert!(ht_influence > 0.0);
    }

    #[test]
    fn test_regime_transition() {
        let mut kf = HalfTimeInferenceKF::new(0.05);

        // Start in quiet regime
        assert_eq!(kf.base.current_regime, Regime::Quiet);

        // Add high velocity moves to trigger steam regime
        for i in 0..15 {
            let ht_tick = HTTickData { price_delta: 0.5 * (i as f64) };
            let ft_tick = FTTickData { price: 220.0 + (i as f64) };

            kf.update_with_both_markets(&ht_tick, &ft_tick).unwrap();
        }

        // Should transition to steam regime
        assert_eq!(kf.base.current_regime, Regime::Steam);
    }

    #[test]
    fn test_matrix_access() {
        let kf = HalfTimeInferenceKF::new(0.05);

        // Test transition matrix
        let f_matrix = kf.get_transition_matrix();
        assert_eq!(f_matrix.nrows(), 3);
        assert_eq!(f_matrix.ncols(), 3);

        // Test observation matrix
        let h_matrix = kf.get_observation_matrix();
        assert_eq!(h_matrix.nrows(), 1);
        assert_eq!(h_matrix.ncols(), 3);

        // Verify observation matrix structure [1, 0, 0]
        assert!((h_matrix[(0, 0)] - 1.0).abs() < 1e-10);
        assert!((h_matrix[(0, 1)] - 0.0).abs() < 1e-10);
        assert!((h_matrix[(0, 2)] - 0.0).abs() < 1e-10);
    }
}
