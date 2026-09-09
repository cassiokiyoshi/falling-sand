# Falling Sand

An interactive particle simulation written in C and compiled to WebAssembly, with a JavaScript canvas interface.

[Play online](https://cassiokiyoshi.github.io/falling-sand/) · [Source](https://github.com/cassiokiyoshi/falling-sand)

## Run locally

From this project directory, with Python 3 installed:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Prebuilt WebAssembly files are included in `dist/`, so no compiler is needed to try the simulation. Serve over HTTP instead of opening `index.html` directly.

## Controls

Choose **Sand**, **Water**, or **Wall**, then draw on the canvas. Use **Erase** to remove particles or **Clear** to reset the field.

## Rebuild the simulation

Install and activate the Emscripten SDK so `emcc` is on your PATH, then run:

```sh
bash scripts/build.sh
```

This compiles `src/simulation.c` into `dist/simulation.mjs` and `dist/simulation.wasm`. Rebuild both files whenever the C simulation changes.

## Structure

- `src/simulation.c`: grid state, particle rules, and exported C functions.
- `js/app.js`: WebAssembly loading, canvas rendering, and pointer controls.
- `css/style.css` and `index.html`: presentation and interface.
- `scripts/build.sh`: Emscripten build command.

The project runs as a static site, including on GitHub Pages.
