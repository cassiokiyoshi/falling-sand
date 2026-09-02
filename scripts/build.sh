#!/usr/bin/env bash

set -euo pipefail

EXPERIMENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

emcc \
  "$EXPERIMENT_DIR/src/simulation.c" \
  -O2 \
  --no-entry \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=0 \
  -sEXPORTED_RUNTIME_METHODS='["HEAPU8"]' \
  -sEXPORTED_FUNCTIONS='["_get_grid_width","_get_grid_height","_get_grid","_clear_grid","_set_cell","_step_simulation"]' \
  -o "$EXPERIMENT_DIR/dist/simulation.mjs"

echo "Built dist/simulation.mjs and dist/simulation.wasm"
