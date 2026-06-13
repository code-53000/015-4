import type { CellGrid, PlacedPattern } from "@/types";

export function cloneGrid(grid: CellGrid): CellGrid {
  return grid.map((row) => row.slice());
}

export function gridSize(grid: CellGrid): { cols: number; rows: number } {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  return { cols, rows };
}

export function rotateGrid90(grid: CellGrid): CellGrid {
  const { cols, rows } = gridSize(grid);
  const result: CellGrid = Array.from({ length: cols }, () => Array(rows).fill(null));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = grid[r][c];
    }
  }
  return result;
}

export function rotateGrid(grid: CellGrid, rotation: 0 | 90 | 180 | 270): CellGrid {
  let result = grid;
  const steps = (rotation / 90) % 4;
  for (let i = 0; i < steps; i++) {
    result = rotateGrid90(result);
  }
  return result;
}

export function scaleGrid(grid: CellGrid, scale: number): CellGrid {
  if (scale <= 1) return cloneGrid(grid);
  const { cols, rows } = gridSize(grid);
  const result: CellGrid = Array.from({ length: rows * scale }, () =>
    Array(cols * scale).fill(null)
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === null) continue;
      for (let dr = 0; dr < scale; dr++) {
        for (let dc = 0; dc < scale; dc++) {
          result[r * scale + dr][c * scale + dc] = v;
        }
      }
    }
  }
  return result;
}

export function getTransformedCells(pp: PlacedPattern): CellGrid {
  let grid = cloneGrid(pp.cells);
  grid = rotateGrid(grid, pp.rotation);
  grid = scaleGrid(grid, pp.scale);
  return grid;
}

export function getPatternBounds(pp: PlacedPattern): {
  col: number;
  row: number;
  cols: number;
  rows: number;
} {
  const transformed = getTransformedCells(pp);
  const { cols, rows } = gridSize(transformed);
  return { col: pp.col, row: pp.row, cols, rows };
}

export function bakePlacedPatterns(
  baseCells: CellGrid,
  baseCols: number,
  baseRows: number,
  patterns: PlacedPattern[]
): CellGrid {
  const result: CellGrid = Array.from({ length: baseRows }, () =>
    Array(baseCols).fill(null)
  );
  for (let r = 0; r < baseRows; r++) {
    for (let c = 0; c < baseCols; c++) {
      result[r][c] = baseCells[r]?.[c] ?? null;
    }
  }
  for (const pp of patterns) {
    const transformed = getTransformedCells(pp);
    const { cols, rows } = gridSize(transformed);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = transformed[r][c];
        if (v === null) continue;
        const tr = pp.row + r;
        const tc = pp.col + c;
        if (tr >= 0 && tr < baseRows && tc >= 0 && tc < baseCols) {
          result[tr][tc] = v;
        }
      }
    }
  }
  return result;
}

export function patternToCellChanges(
  pp: PlacedPattern
): { col: number; row: number; colorId: string | null }[] {
  const transformed = getTransformedCells(pp);
  const { cols, rows } = gridSize(transformed);
  const changes: { col: number; row: number; colorId: string | null }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = transformed[r][c];
      if (v !== null) {
        changes.push({ col: pp.col + c, row: pp.row + r, colorId: v });
      }
    }
  }
  return changes;
}
