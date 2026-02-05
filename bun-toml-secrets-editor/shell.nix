{ pkgs ? import <nixpkgs> {} }:

let
  # Helper to create library paths with dev headers
  makeIncludePath = paths: pkgs.lib.makeSearchPathOutput "dev" "include" paths;
  makeLibPath = paths: pkgs.lib.makeLibraryPath paths;
  
  # Core libraries for RSS optimization
  rssLibs = with pkgs; [
    # XML parsing (native performance)
    libxml2      # Preferred: fast, standards-compliant
    expat        # Alternative: lightweight
    libxslt      # For feed transformations
    
    # Compression (common in RSS feeds)
    zlib
    zstd
    
    # Security (for TLS certificate validation if needed in FFI)
    openssl
    
    # Hashing (for cache keys)
    openssl  # Already listed, but provides SHA256
  ];

in pkgs.mkShell {
  name = "rss-optimizer";
  
  buildInputs = [
    # Runtime
    pkgs.bun  # v1.3.7 or later
    
    # Build tools (for native compilation)
    pkgs.gcc
    pkgs.gnumake
    
    # Libraries
  ] ++ rssLibs;
  
  shellHook = ''
    export C_INCLUDE_PATH="${makeIncludePath rssLibs}"
    export LIBRARY_PATH="${makeLibPath rssLibs}"
    
    # Bun specific optimizations
    export BUN_CONFIG_MAX_HTTP_REQUESTS=512
    
    echo "🚀 RSS Optimizer Environment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Bun version: $(bun --version)"
    echo ""
    echo "📦 FFI Libraries configured:"
    echo "  libxml2: ${pkgs.libxml2.version}"
    echo "  zlib: ${pkgs.zlib.version}"
    echo ""
    echo "🔧 Environment variables:"
    echo "  C_INCLUDE_PATH: $C_INCLUDE_PATH"
    echo "  LIBRARY_PATH: $LIBRARY_PATH"
    echo ""
    echo "Quick start:"
    echo "  bun run src/server.ts        # Start RSS server"
    echo "  bun test                     # Run test suite"
    echo "  bun bench                    # Run benchmarks"
  '';
}
