{
  description = "Bun FFI Development Environment with C_INCLUDE_PATH/LIBRARY_PATH Support";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    
    # Pin specific LLVM version that Bun uses
    llvm-overlay = final: prev: {
      llvmPackages = prev.llvmPackages_16; # Bun uses LLVM 16
    };
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ llvm-overlay ];
        };

        # Dependencies for building Bun itself
        bunBuildDeps = with pkgs; [
          # Core build tools
          cmake
          ninja
          pkg-config
          python3
          git
          
          # LLVM toolchain (Bun uses clang/lld)
          llvmPackages.clang
          llvmPackages.lld
          llvmPackages.llvm
          llvmPackages.libclang
          
          # JavaScript runtime for bootstrap
          nodejs_20
          
          # Bun's specific dependencies
          zlib
          zstd
          libiconv
          icu
          openssl
          libarchive
          sqlite
          
          # For FFI testing
          libxml2
          zlib
        ];

        # Environment variables for the build
        bunBuildEnv = {
          # Bun uses these specifically
          CC = "${pkgs.llvmPackages.clang}/bin/clang";
          CXX = "${pkgs.llvmPackages.clang}/bin/clang++";
          
          # v1.3.7: These will be picked up by bun:ffi
          C_INCLUDE_PATH = pkgs.lib.makeSearchPathOutput "dev" "include" [
            pkgs.libxml2
            pkgs.zlib
            pkgs.openssl
            pkgs.icu
          ];
          
          LIBRARY_PATH = pkgs.lib.makeLibraryPath [
            pkgs.libxml2
            pkgs.zlib
            pkgs.openssl
            pkgs.icu
          ];
          
          # Tell Bun build where to find LLVM
          LLVM_PREFIX = "${pkgs.llvmPackages.llvm}";
        };
        
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = bunBuildDeps;
          
          shellHook = ''
            export PATH="${pkgs.llvmPackages.clang}/bin:$PATH"
            
            # Export FFI environment variables
            ${pkgs.lib.toShellVars bunBuildEnv}
            
            echo "🔧 Bun FFI Development Environment"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
            echo "LIBRARY_PATH: $LIBRARY_PATH"
            echo ""
            echo "Quick start:"
            echo "  1. git clone https://github.com/oven-sh/bun.git"
            echo "  2. cd bun"
            echo "  3. bun run build"
            echo "  4. bun run test:ffi"
            echo ""
            echo "Test your changes:"
            echo "  C_INCLUDE_PATH=/custom/path LIBRARY_PATH=/custom/lib bun test"
          '';
          
          # Inherit all the build environment variables
          inherit (bunBuildEnv) CC CXX LLVM_PREFIX C_INCLUDE_PATH LIBRARY_PATH;
        };

        # Package for testing the FFI feature specifically
        packages.ffi-test = pkgs.writeShellApplication {
          name = "bun-ffi-test";
          runtimeInputs = [ pkgs.bun pkgs.libxml2 pkgs.zlib ];
          text = ''
            export C_INCLUDE_PATH="${pkgs.libxml2.dev}/include/libxml2:${pkgs.zlib.dev}/include"
            export LIBRARY_PATH="${pkgs.libxml2}/lib:${pkgs.zlib}/lib"
            
            echo "Testing FFI with Nix paths..."
            echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
            
            bun test src/js/bun/ffi/test/env-paths.test.ts
          '';
        };
      });
}
