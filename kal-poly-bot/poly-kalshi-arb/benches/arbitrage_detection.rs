use criterion::{black_box, criterion_group, criterion_main, Criterion};
use arb_bot::types::AtomicMarketState;

fn bench_check_arbs_detection(c: &mut Criterion) {
    c.bench_function("check_arbs_detection", |b| {
        let market = AtomicMarketState::new(0);
        
        // Set up Kalshi prices (0-100, representing $0-$1.00)
        market.kalshi.update_yes(50, 100);   // $0.50
        market.kalshi.update_no(50, 100);    // $0.50
        
        // Set up Polymarket prices (create arb opportunity)
        market.poly.update_yes(49, 100);     // $0.49
        market.poly.update_no(51, 100);      // $0.51
        
        b.iter(|| {
            let _result = market.check_arbs(black_box(1)); // 1 cent threshold
        });
    });
}

fn bench_orderbook_updates(c: &mut Criterion) {
    c.bench_function("orderbook_yes_updates", |b| {
        let market = AtomicMarketState::new(0);
        b.iter(|| {
            for i in 0..100 {
                let price = black_box(((i % 100) as u16));
                market.kalshi.update_yes(price, black_box(100));
            }
        });
    });
}

fn bench_orderbook_load(c: &mut Criterion) {
    c.bench_function("orderbook_concurrent_load", |b| {
        let market = AtomicMarketState::new(0);
        market.kalshi.update_yes(50, 100);
        market.kalshi.update_no(50, 100);
        market.poly.update_yes(49, 100);
        market.poly.update_no(51, 100);
        
        b.iter(|| {
            let (k_yes, k_no, _, _) = market.kalshi.load();
            let (p_yes, p_no, _, _) = market.poly.load();
            black_box((k_yes, k_no, p_yes, p_no));
        });
    });
}

criterion_group!(
    benches,
    bench_check_arbs_detection,
    bench_orderbook_updates,
    bench_orderbook_load
);
criterion_main!(benches);
