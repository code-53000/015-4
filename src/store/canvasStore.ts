import { create } from "zustand";
import type { CellGrid, ToolMode, UndoSnapshot, CanvasViewport, PlacedPattern, Pattern } from "@/types";
import { generateId } from "@/utils/sizeCalculator";
import { cloneGrid, getTransformedCells, gridSize, patternToCellChanges } from "@/lib/patternUtils";

interface CanvasState {
  cols: number;
  rows: number;
  mmPerCell: number;
  cells: CellGrid;
  tool: ToolMode;
  showStitchMark: boolean;
  viewport: CanvasViewport;
  hoveredCell: { col: number; row: number } | null;
  undos: UndoSnapshot[];
  redos: UndoSnapshot[];
  currentSchemeId: number | null;
  currentSchemeName: string;
  placedPatterns: PlacedPattern[];
  selectedPatternId: string | null;

  setTool: (tool: ToolMode) => void;
  setGridSize: (cols: number, rows: number) => void;
  setMmPerCell: (mm: number) => void;
  setViewport: (vp: Partial<CanvasViewport>) => void;
  setHoveredCell: (cell: { col: number; row: number } | null) => void;
  setShowStitchMark: (show: boolean) => void;
  setSchemeMeta: (id: number | null, name: string) => void;

  paintCell: (col: number, row: number, colorId: string | null) => boolean;
  paintCells: (changes: { col: number; row: number; colorId: string | null }[]) => boolean;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  loadCells: (cells: CellGrid, cols: number, rows: number, mmPerCell: number) => void;
  fitViewport: (canvasW: number, canvasH: number, padding?: number) => void;

  addPattern: (pattern: Pattern, col: number, row: number) => string;
  removePattern: (id: string) => void;
  updatePattern: (id: string, patch: Partial<PlacedPattern>) => void;
  selectPattern: (id: string | null) => void;
  rotateSelectedPattern: () => void;
  scaleSelectedPattern: (scale: number) => void;
  bakeAllPatterns: () => void;
}

function createEmptyGrid(cols: number, rows: number): CellGrid {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function snapshot(cells: CellGrid, cols: number, rows: number, placedPatterns: PlacedPattern[]): UndoSnapshot {
  return {
    cols,
    rows,
    cells: cloneGrid(cells),
    placedPatterns: placedPatterns.map((p) => ({
      ...p,
      cells: cloneGrid(p.cells),
    })),
  };
}

const INITIAL_COLS = 40;
const INITIAL_ROWS = 40;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  cols: INITIAL_COLS,
  rows: INITIAL_ROWS,
  mmPerCell: 1.81,
  cells: createEmptyGrid(INITIAL_COLS, INITIAL_ROWS),
  tool: "brush",
  showStitchMark: true,
  viewport: { scale: 12, offsetX: 40, offsetY: 40 },
  hoveredCell: null,
  undos: [],
  redos: [],
  currentSchemeId: null,
  currentSchemeName: "未命名方案",
  placedPatterns: [],
  selectedPatternId: null,

  setTool: (tool) => set({ tool }),
  setGridSize(cols, rows) {
    const prev = get();
    const newCells = createEmptyGrid(cols, rows);
    const minR = Math.min(rows, prev.rows);
    const minC = Math.min(cols, prev.cols);
    for (let r = 0; r < minR; r++) {
      for (let c = 0; c < minC; c++) {
        newCells[r][c] = prev.cells[r][c];
      }
    }
    const filteredPatterns = prev.placedPatterns.filter((pp) => {
      const bounds = getTransformedCells(pp);
      const { cols: pcols, rows: prows } = gridSize(bounds);
      return pp.col + pcols <= cols && pp.row + prows <= rows && pp.col >= 0 && pp.row >= 0;
    });
    set({ cols, rows, cells: newCells, placedPatterns: filteredPatterns });
  },
  setMmPerCell: (mm) => set({ mmPerCell: Math.max(0.1, Math.min(10, mm)) }),
  setViewport: (vp) =>
    set((s) => ({ viewport: { ...s.viewport, ...vp } })),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setShowStitchMark: (show) => set({ showStitchMark: show }),
  setSchemeMeta: (id, name) => set({ currentSchemeId: id, currentSchemeName: name }),

  paintCell(col, row, colorId) {
    const s = get();
    if (col < 0 || col >= s.cols || row < 0 || row >= s.rows) return false;
    if (s.cells[row][col] === colorId) return false;
    const newCells = s.cells.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? colorId : c)) : r
    );
    set({ cells: newCells });
    return true;
  },

  paintCells(changes) {
    const s = get();
    let changed = false;
    const newCells = s.cells.map((r) => r.slice());
    for (const { col, row, colorId } of changes) {
      if (col < 0 || col >= s.cols || row < 0 || row >= s.rows) continue;
      if (newCells[row][col] === colorId) continue;
      newCells[row][col] = colorId;
      changed = true;
    }
    if (changed) set({ cells: newCells });
    return changed;
  },

  pushUndo() {
    const s = get();
    const snap = snapshot(s.cells, s.cols, s.rows, s.placedPatterns);
    set({
      undos: [...s.undos, snap].slice(-100),
      redos: [],
    });
  },

  undo() {
    const s = get();
    if (s.undos.length === 0) return;
    const prevSnap = s.undos[s.undos.length - 1];
    const currentSnap = snapshot(s.cells, s.cols, s.rows, s.placedPatterns);
    set({
      undos: s.undos.slice(0, -1),
      redos: [...s.redos, currentSnap],
      cells: prevSnap.cells,
      cols: prevSnap.cols,
      rows: prevSnap.rows,
      placedPatterns: prevSnap.placedPatterns,
      selectedPatternId: null,
    });
  },

  redo() {
    const s = get();
    if (s.redos.length === 0) return;
    const nextSnap = s.redos[s.redos.length - 1];
    const currentSnap = snapshot(s.cells, s.cols, s.rows, s.placedPatterns);
    set({
      redos: s.redos.slice(0, -1),
      undos: [...s.undos, currentSnap],
      cells: nextSnap.cells,
      cols: nextSnap.cols,
      rows: nextSnap.rows,
      placedPatterns: nextSnap.placedPatterns,
      selectedPatternId: null,
    });
  },

  clearAll() {
    const s = get();
    s.pushUndo();
    set({ cells: createEmptyGrid(s.cols, s.rows), placedPatterns: [], selectedPatternId: null });
  },

  loadCells(cells, cols, rows, mmPerCell) {
    const grid: CellGrid = createEmptyGrid(cols, rows);
    const minR = Math.min(rows, cells.length);
    for (let r = 0; r < minR; r++) {
      const minC = Math.min(cols, cells[r].length);
      for (let c = 0; c < minC; c++) {
        grid[r][c] = cells[r][c];
      }
    }
    set({
      cells: grid,
      cols,
      rows,
      mmPerCell,
      undos: [],
      redos: [],
      placedPatterns: [],
      selectedPatternId: null,
    });
  },

  fitViewport(canvasW, canvasH, padding = 40) {
    const s = get();
    const gridW = s.cols;
    const gridH = s.rows;
    const scaleX = (canvasW - padding * 2) / gridW;
    const scaleY = (canvasH - padding * 2) / gridH;
    const scale = Math.max(4, Math.min(scaleX, scaleY));
    const offsetX = (canvasW - gridW * scale) / 2;
    const offsetY = (canvasH - gridH * scale) / 2;
    set({ viewport: { scale, offsetX, offsetY } });
  },

  addPattern(pattern, col, row) {
    const s = get();
    s.pushUndo();
    const id = generateId();
    const pp: PlacedPattern = {
      id,
      patternId: pattern.id,
      cells: cloneGrid(pattern.cells),
      col,
      row,
      scale: 1,
      rotation: 0,
    };
    set({ placedPatterns: [...s.placedPatterns, pp], selectedPatternId: id });
    return id;
  },

  removePattern(id) {
    const s = get();
    s.pushUndo();
    set({
      placedPatterns: s.placedPatterns.filter((p) => p.id !== id),
      selectedPatternId: s.selectedPatternId === id ? null : s.selectedPatternId,
    });
  },

  updatePattern(id, patch) {
    set((s) => ({
      placedPatterns: s.placedPatterns.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    }));
  },

  selectPattern(id) {
    set({ selectedPatternId: id });
  },

  rotateSelectedPattern() {
    const s = get();
    if (!s.selectedPatternId) return;
    s.pushUndo();
    set((st) => ({
      placedPatterns: st.placedPatterns.map((p) =>
        p.id === st.selectedPatternId
          ? { ...p, rotation: (((p.rotation + 90) % 360) as 0 | 90 | 180 | 270) }
          : p
      ),
    }));
  },

  scaleSelectedPattern(scale) {
    const s = get();
    if (!s.selectedPatternId) return;
    const clamped = Math.max(1, Math.min(3, Math.round(scale)));
    s.pushUndo();
    set((st) => ({
      placedPatterns: st.placedPatterns.map((p) =>
        p.id === st.selectedPatternId ? { ...p, scale: clamped } : p
      ),
    }));
  },

  bakeAllPatterns() {
    const s = get();
    if (s.placedPatterns.length === 0) return;
    s.pushUndo();
    const changes: { col: number; row: number; colorId: string | null }[] = [];
    for (const pp of s.placedPatterns) {
      changes.push(...patternToCellChanges(pp));
    }
    const newCells = s.cells.map((r) => r.slice());
    for (const { col, row, colorId } of changes) {
      if (col >= 0 && col < s.cols && row >= 0 && row < s.rows) {
        newCells[row][col] = colorId;
      }
    }
    set({ cells: newCells, placedPatterns: [], selectedPatternId: null });
  },
}));
