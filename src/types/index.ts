export interface ColorEntry {
  id: string;
  brand: string;
  code: string;
  hexColor: string;
  inStock: boolean;
  note?: string;
}

export type CellValue = string | null;

export type CellGrid = CellValue[][];

export interface Pattern {
  id: string;
  name: string;
  category: string;
  cells: CellGrid;
}

export interface PlacedPattern {
  id: string;
  patternId: string;
  cells: CellGrid;
  col: number;
  row: number;
  scale: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface UndoSnapshot {
  cells: CellGrid;
  cols: number;
  rows: number;
  placedPatterns: PlacedPattern[];
}

export type ToolMode = "brush" | "eraser" | "picker";

export interface CanvasViewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Scheme {
  id?: number;
  name: string;
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
  gridCols: number;
  gridRows: number;
  mmPerCell: number;
  cells: string;
  colors?: ColorEntry[];
}

export interface CtReference {
  label: string;
  ct: number;
  mm: number;
}
