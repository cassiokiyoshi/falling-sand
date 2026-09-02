#include <stdint.h>
#include <string.h>
#include <emscripten/emscripten.h>

#define GRID_WIDTH 160
#define GRID_HEIGHT 120
#define GRID_SIZE (GRID_WIDTH * GRID_HEIGHT)

#define MATERIAL_EMPTY 0
#define MATERIAL_SAND 1
#define MATERIAL_WALL 2
#define MATERIAL_WATER 3

static uint8_t grid[GRID_SIZE];
static uint8_t moved_this_step[GRID_SIZE];
static unsigned int simulation_step = 0;

static int grid_index(int x, int y) {
  return y * GRID_WIDTH + x;
}

static int is_inside_grid(int x, int y) {
  return (
    x >= 0 &&
    x < GRID_WIDTH &&
    y >= 0 &&
    y < GRID_HEIGHT
  );
}

static int is_empty(int x, int y) {
  if (!is_inside_grid(x, y)) {
    return 0;
  }

  return grid[grid_index(x, y)] == MATERIAL_EMPTY;
}

static void move_cell(
  int source_x,
  int source_y,
  int destination_x,
  int destination_y
) {
  int source_index =
    grid_index(source_x, source_y);

  int destination_index =
    grid_index(destination_x, destination_y);

  grid[destination_index] = grid[source_index];
  grid[source_index] = MATERIAL_EMPTY;
  moved_this_step[destination_index] = 1;
}

static void swap_cells(
  int first_x,
  int first_y,
  int second_x,
  int second_y
) {
  int first_index = grid_index(first_x, first_y);
  int second_index = grid_index(second_x, second_y);
  uint8_t first_material = grid[first_index];

  grid[first_index] = grid[second_index];
  grid[second_index] = first_material;

  moved_this_step[first_index] = 1;
  moved_this_step[second_index] = 1;
}

EMSCRIPTEN_KEEPALIVE
int get_grid_width(void) {
  return GRID_WIDTH;
}

EMSCRIPTEN_KEEPALIVE
int get_grid_height(void) {
  return GRID_HEIGHT;
}

EMSCRIPTEN_KEEPALIVE
uint8_t *get_grid(void) {
  return grid;
}

EMSCRIPTEN_KEEPALIVE
void clear_grid(void) {
  memset(grid, MATERIAL_EMPTY, GRID_SIZE);
}

EMSCRIPTEN_KEEPALIVE
void set_cell(int x, int y, int material) {
  if (!is_inside_grid(x, y)) {
    return;
  }

  if (
    material < MATERIAL_EMPTY ||
    material > MATERIAL_WATER
  ) {
    return;
  }

  grid[grid_index(x, y)] = (uint8_t)material;
}

EMSCRIPTEN_KEEPALIVE
void step_simulation(void) {
  simulation_step += 1;
  memset(moved_this_step, 0, GRID_SIZE);

  /*
   * Work from bottom to top. A particle moved downward
   * enters a row that has already been processed, so it
   * cannot move multiple times during the same update.
   */
  for (int y = GRID_HEIGHT - 2; y >= 0; y -= 1) {
    /*
     * Alternate horizontal processing direction to avoid
     * consistently favoring the left or right side.
     */
    int starts_from_left = (simulation_step + y) % 2;

    for (int column = 0; column < GRID_WIDTH; column += 1) {
      int x = starts_from_left
        ? column
        : GRID_WIDTH - 1 - column;

      int index = grid_index(x, y);

      if (moved_this_step[index]) {
        continue;
      }

      int material = grid[index];

      if (material == MATERIAL_EMPTY || material == MATERIAL_WALL) {
        continue;
      }

      int checks_left_first =
        (simulation_step + x + y) % 2;

      int first_direction =
        checks_left_first ? -1 : 1;

      int second_direction =
        -first_direction;

      if (material == MATERIAL_SAND) {
        if (is_empty(x, y + 1)) {
          move_cell(x, y, x, y + 1);
          continue;
        }

        if (grid[grid_index(x, y + 1)] == MATERIAL_WATER) {
          swap_cells(x, y, x, y + 1);
          continue;
        }

        if (is_empty(x + first_direction, y + 1)) {
          move_cell(x, y, x + first_direction, y + 1);
          continue;
        }

        if (is_empty(x + second_direction, y + 1)) {
          move_cell(x, y, x + second_direction, y + 1);
        }

        continue;
      }

      if (material == MATERIAL_WATER) {
        if (is_empty(x, y + 1)) {
          move_cell(x, y, x, y + 1);
          continue;
        }

        if (is_empty(x + first_direction, y + 1)) {
          move_cell(x, y, x + first_direction, y + 1);
          continue;
        }

        if (is_empty(x + second_direction, y + 1)) {
          move_cell(x, y, x + second_direction, y + 1);
          continue;
        }

        if (is_empty(x + first_direction, y)) {
          move_cell(x, y, x + first_direction, y);
          continue;
        }

        if (is_empty(x + second_direction, y)) {
          move_cell(x, y, x + second_direction, y);
        }
      }
    }
  }
}
