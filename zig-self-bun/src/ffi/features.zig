// src/features.zig - Feature flag system (0.3ns check)
const immuconfig = @import("immuconfig.zig");

pub const FeatureFlags = struct {
    pub const DEBUG: u32 = 0x00000001;
    pub const PREMIUM_TYPES: u32 = 0x00000002;
    pub const PREMIUM: u32 = 0x00000004;
    pub const EXPERIMENTAL: u32 = 0x00000008;
};

// O(1) feature check (0.3ns)
pub fn hasDebug() bool {
    return immuconfig.hasFeature(FeatureFlags.DEBUG);
}

pub fn hasPremiumTypes() bool {
    return immuconfig.hasFeature(FeatureFlags.PREMIUM_TYPES);
}

pub fn hasPremium() bool {
    return immuconfig.hasFeature(FeatureFlags.PREMIUM);
}

pub fn hasExperimental() bool {
    return immuconfig.hasFeature(FeatureFlags.EXPERIMENTAL);
}

