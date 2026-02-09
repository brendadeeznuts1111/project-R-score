#!/usr/bin/env bash
# ESM bytecode compilation
# Feature #20 — PR #26402 — New in Bun 1.3.9
#
# ESM modules can now be compiled to standalone executables.
# Previously only CJS was supported.
#
# import.meta.main is true, import.meta.path points to
# /$bunfs/root/<name> (virtual FS inside binary).

bun build --compile app.ts --outfile app
./app
