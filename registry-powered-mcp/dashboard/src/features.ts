// Bun v1.3.5 Compile-time Feature Flags Demo
// This demonstrates dead-code elimination based on feature flags

// Feature flag for enhanced terminal features
const TERMINAL_ENHANCED = true; // In real usage: feature("TERMINAL_ENHANCED")

// Feature flag for POSIX shared memory
const POSIX_SHM = true; // In real usage: feature("POSIX_SHM")

// Feature flag for UUID v7 causal ordering
const UUID_V7_ORDERING = true; // In real usage: feature("UUID_V7_ORDERING")

export { TERMINAL_ENHANCED, POSIX_SHM, UUID_V7_ORDERING };