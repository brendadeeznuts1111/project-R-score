// Half-Time Inference Kalman Filter Implementation
// Pattern #51: Half-Time Line Inference Lag

export interface HTTickData {
  price_delta: number;
}

export interface FTTickData {
  price: number;
}

export enum Regime {
  Quiet = "quiet",
  Steam = "steam",
  Volatile = "volatile",
}

export interface StateVector {
  position: number;
  velocity: number;
  acceleration: number;
}

export class HalfTimeInferenceKF {
  private dt: number;
  private state: StateVector;
  private currentRegime: Regime;

  constructor(dt: number = 0.05) {
    this.dt = dt;
    this.state = { position: 0, velocity: 0, acceleration: 0 };
    this.currentRegime = Regime.Quiet;
  }

  updateWithBothMarkets(htTick: HTTickData, ftTick: FTTickData): void {
    // Update state based on HT and FT data
    this.state.velocity += htTick.price_delta * this.dt;
    this.state.position = ftTick.price;

    // Update regime based on velocity
    this.updateRegime();
  }

  predictFTTotal(): number {
    return this.state.position + this.state.velocity * this.dt;
  }

  getRegimeInfo(): [Regime, number, number] {
    const velocity = Math.abs(this.state.velocity);
    const htInfluence = this.calculateHTInfluence();
    return [this.currentRegime, velocity, htInfluence];
  }

  getStateVector(): StateVector {
    return { ...this.state };
  }

  getTransitionMatrix(): number[][] {
    return [
      [1, this.dt, 0.5 * this.dt * this.dt],
      [0, 1, this.dt],
      [0, 0, 1],
    ];
  }

  getObservationMatrix(): number[][] {
    return [[1, 0, 0]];
  }

  private updateRegime(): void {
    const velocity = Math.abs(this.state.velocity);

    if (velocity > 1.0) {
      this.currentRegime = Regime.Steam;
    } else if (velocity > 0.5) {
      this.currentRegime = Regime.Volatile;
    } else {
      this.currentRegime = Regime.Quiet;
    }
  }

  private calculateHTInfluence(): number {
    return Math.min(Math.abs(this.state.velocity) / 2.0, 1.0);
  }

  get positionUncertainty(): number {
    return 0.01; // Placeholder
  }
}
