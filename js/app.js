import createSimulation from "../dist/simulation.mjs";

const canvas = document.querySelector("#sand-canvas");
const context = canvas.getContext("2d");

const status = document.querySelector("#simulation-status");
const loader = document.querySelector("#glitch-loader");
const clearButton = document.querySelector("#clear-button");
const toolButtons = document.querySelectorAll(".tool");

const MATERIAL = {
  empty: 0,
  erase: 0,
  sand: 1,
  wall: 2,
  water: 3,
};

const MATERIAL_COLOR = {
  [MATERIAL.sand]: "#e8c56a",
  [MATERIAL.wall]: "#787878",
  [MATERIAL.water]: "#54f0ff",
};

const SIMULATION_INTERVAL = 1 / 60;
const MINIMUM_LOADER_TIME = 850;

let selectedMaterial = MATERIAL.sand;
let isDrawing = false;
const loaderStartedAt = performance.now();

function updateStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

function dismissLoader() {
  if (!loader) {
    return;
  }

  const elapsedTime = performance.now() - loaderStartedAt;
  const remainingTime = Math.max(0, MINIMUM_LOADER_TIME - elapsedTime);

  window.setTimeout(() => {
    loader.classList.add("is-hidden");

    window.setTimeout(() => {
      loader.hidden = true;
    }, 300);
  }, remainingTime);
}

async function startSimulation() {
  updateStatus("Loading WebAssembly…");

  try {
    const simulation = await createSimulation();

    const gridWidth = simulation._get_grid_width();
    const gridHeight = simulation._get_grid_height();
    const gridSize = gridWidth * gridHeight;
    const gridPointer = simulation._get_grid();

    // This view reads directly from the C program's WebAssembly memory.
    const grid = new Uint8Array(
      simulation.HEAPU8.buffer,
      gridPointer,
      gridSize,
    );

    const cellWidth = canvas.width / gridWidth;
    const cellHeight = canvas.height / gridHeight;

    function getGridIndex(x, y) {
      return y * gridWidth + x;
    }

    function drawBrush(x, y, material) {
      const brushRadius = 2;

      for (
        let offsetY = -brushRadius;
        offsetY <= brushRadius;
        offsetY += 1
      ) {
        for (
          let offsetX = -brushRadius;
          offsetX <= brushRadius;
          offsetX += 1
        ) {
          if (Math.hypot(offsetX, offsetY) <= brushRadius) {
            simulation._set_cell(
              x + offsetX,
              y + offsetY,
              material,
            );
          }
        }
      }
    }

    function getPointerCell(event) {
      const bounds = canvas.getBoundingClientRect();

      const canvasX =
        (event.clientX - bounds.left) *
        (canvas.width / bounds.width);

      const canvasY =
        (event.clientY - bounds.top) *
        (canvas.height / bounds.height);

      return {
        x: Math.floor(canvasX / cellWidth),
        y: Math.floor(canvasY / cellHeight),
      };
    }

    function drawFromPointer(event) {
      const cell = getPointerCell(event);
      drawBrush(cell.x, cell.y, selectedMaterial);
    }

    function renderGrid() {
      context.fillStyle = "#030303";
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < gridHeight; y += 1) {
        for (let x = 0; x < gridWidth; x += 1) {
          const material = grid[getGridIndex(x, y)];

          if (material === MATERIAL.empty) {
            continue;
          }

          context.fillStyle = MATERIAL_COLOR[material];
          context.fillRect(
            x * cellWidth,
            y * cellHeight,
            cellWidth,
            cellHeight,
          );
        }
      }
    }

    function selectTool(button) {
      toolButtons.forEach((toolButton) => {
        const isSelected = toolButton === button;

        toolButton.classList.toggle("is-active", isSelected);
        toolButton.setAttribute("aria-pressed", String(isSelected));
      });

      selectedMaterial = MATERIAL[button.dataset.material];
    }

    toolButtons.forEach((button) => {
      button.addEventListener("click", () => selectTool(button));
    });

    clearButton.addEventListener("click", () => {
      simulation._clear_grid();
    });

    canvas.addEventListener("pointerdown", (event) => {
      isDrawing = true;
      canvas.setPointerCapture(event.pointerId);
      drawFromPointer(event);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (isDrawing) {
        drawFromPointer(event);
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      isDrawing = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("pointercancel", () => {
      isDrawing = false;
    });

    let previousTime = 0;
    let accumulatedTime = 0;

    function animate(currentTime) {
      if (previousTime === 0) {
        previousTime = currentTime;
      }

      const deltaTime = Math.min(
        (currentTime - previousTime) / 1000,
        0.05,
      );

      previousTime = currentTime;
      accumulatedTime += deltaTime;

      // Run C at a fixed rate, independent of the display refresh rate.
      while (accumulatedTime >= SIMULATION_INTERVAL) {
        simulation._step_simulation();
        accumulatedTime -= SIMULATION_INTERVAL;
      }

      renderGrid();
      requestAnimationFrame(animate);
    }

    updateStatus(
      `${gridWidth} × ${gridHeight} · C/Wasm ready`,
    );

    dismissLoader();

    requestAnimationFrame(animate);
  } catch (error) {
    console.error(error);
    updateStatus("WebAssembly failed to load");

    if (loader) {
      const loaderTitle = loader.querySelector(".glitch-loader-title");

      loaderTitle.textContent = "SIGNAL LOST";
      loaderTitle.dataset.text = "SIGNAL LOST";
    }
  }
}

startSimulation();
