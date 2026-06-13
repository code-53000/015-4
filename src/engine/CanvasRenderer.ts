import type { CanvasViewport, CellGrid, ColorEntry, PlacedPattern } from "@/types";
import { getTransformedCells, gridSize } from "@/lib/patternUtils";

export interface RenderOptions {
  viewport: CanvasViewport;
  cols: number;
  rows: number;
  cells: CellGrid;
  colorMap: Map<string, ColorEntry>;
  hoveredCell: { col: number; row: number } | null;
  showStitchMark: boolean;
  placedPatterns?: PlacedPattern[];
  selectedPatternId?: string | null;
  highlightEmpty?: boolean;
}

export type HitResult =
  | { type: "none" }
  | { type: "pattern"; id: string }
  | { type: "handle"; id: string; corner: "tl" | "tr" | "bl" | "br" | "rotate" };

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(cssWidth: number, cssHeight: number) {
    this.canvas.width = cssWidth * this.dpr;
    this.canvas.height = cssHeight * this.dpr;
    this.canvas.style.width = cssWidth + "px";
    this.canvas.style.height = cssHeight + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  screenToGrid(sx: number, sy: number, vp: CanvasViewport): { col: number; row: number } {
    const col = Math.floor((sx - vp.offsetX) / vp.scale);
    const row = Math.floor((sy - vp.offsetY) / vp.scale);
    return { col, row };
  }

  gridToScreen(col: number, row: number, vp: CanvasViewport): { x: number; y: number; size: number } {
    return {
      x: col * vp.scale + vp.offsetX,
      y: row * vp.scale + vp.offsetY,
      size: vp.scale,
    };
  }

  hitTest(sx: number, sy: number, vp: CanvasViewport, patterns: PlacedPattern[], selectedId: string | null): HitResult {
    if (selectedId) {
      const selected = patterns.find((p) => p.id === selectedId);
      if (selected) {
        const transformed = getTransformedCells(selected);
        const { cols: pcols, rows: prows } = gridSize(transformed);
        const g = this.gridToScreen(selected.col, selected.row, vp);
        const w = pcols * vp.scale;
        const h = prows * vp.scale;
        const handleSize = Math.max(10, vp.scale * 0.8);

        const rotateCx = g.x + w / 2;
        const rotateCy = g.y - handleSize - 6;
        const dist = Math.hypot(sx - rotateCx, sy - rotateCy);
        if (dist <= handleSize / 2 + 2) {
          return { type: "handle", id: selectedId, corner: "rotate" };
        }

        const corners: { key: "tl" | "tr" | "bl" | "br"; x: number; y: number }[] = [
          { key: "tl", x: g.x, y: g.y },
          { key: "tr", x: g.x + w, y: g.y },
          { key: "bl", x: g.x, y: g.y + h },
          { key: "br", x: g.x + w, y: g.y + h },
        ];
        for (const c of corners) {
          if (
            sx >= c.x - handleSize / 2 - 2 &&
            sx <= c.x + handleSize / 2 + 2 &&
            sy >= c.y - handleSize / 2 - 2 &&
            sy <= c.y + handleSize / 2 + 2
          ) {
            return { type: "handle", id: selectedId, corner: c.key };
          }
        }
      }
    }

    for (let i = patterns.length - 1; i >= 0; i--) {
      const pp = patterns[i];
      const transformed = getTransformedCells(pp);
      const { cols: pcols, rows: prows } = gridSize(transformed);
      if (
        sx >= pp.col * vp.scale + vp.offsetX &&
        sx < (pp.col + pcols) * vp.scale + vp.offsetX &&
        sy >= pp.row * vp.scale + vp.offsetY &&
        sy < (pp.row + prows) * vp.scale + vp.offsetY
      ) {
        const localCol = Math.floor((sx - vp.offsetX) / vp.scale) - pp.col;
        const localRow = Math.floor((sy - vp.offsetY) / vp.scale) - pp.row;
        if (transformed[localRow]?.[localCol] !== null && transformed[localRow]?.[localCol] !== undefined) {
          return { type: "pattern", id: pp.id };
        }
      }
    }
    return { type: "none" };
  }

  render(opts: RenderOptions) {
    const { viewport: vp, cols, rows, cells, colorMap, hoveredCell, showStitchMark, placedPatterns = [], selectedPatternId = null } = opts;
    const ctx = this.ctx;
    const cssW = this.canvas.width / this.dpr;
    const cssH = this.canvas.height / this.dpr;

    ctx.clearRect(0, 0, cssW, cssH);
    this.drawLinenBackground(cssW, cssH);

    const gridLeft = vp.offsetX;
    const gridTop = vp.offsetY;
    const gridW = cols * vp.scale;
    const gridH = rows * vp.scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(gridLeft - 1, gridTop - 1, gridW + 2, gridH + 2);
    ctx.clip();

    const startCol = Math.max(0, Math.floor(-vp.offsetX / vp.scale));
    const endCol = Math.min(cols, Math.ceil((cssW - vp.offsetX) / vp.scale));
    const startRow = Math.max(0, Math.floor(-vp.offsetY / vp.scale));
    const endRow = Math.min(rows, Math.ceil((cssH - vp.offsetY) / vp.scale));

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const cid = cells[r]?.[c];
        if (!cid) continue;
        const color = colorMap.get(cid);
        if (!color) continue;
        this.drawCell(c, r, vp, color.hexColor, showStitchMark);
      }
    }

    for (const pp of placedPatterns) {
      this.drawPlacedPattern(pp, vp, colorMap, showStitchMark, pp.id === selectedPatternId);
    }

    if (hoveredCell) {
      const { col, row } = hoveredCell;
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        const g = this.gridToScreen(col, row, vp);
        ctx.save();
        ctx.strokeStyle = "#C25B56";
        ctx.lineWidth = 2;
        ctx.strokeRect(g.x + 1, g.y + 1, g.size - 2, g.size - 2);
        ctx.restore();
      }
    }

    this.drawGridLines(vp, cols, rows, cssW, cssH);
    ctx.restore();

    this.drawGridBorder(gridLeft, gridTop, gridW, gridH);

    if (selectedPatternId) {
      const selected = placedPatterns.find((p) => p.id === selectedPatternId);
      if (selected) {
        this.drawSelectionHandles(selected, vp);
      }
    }
  }

  private drawPlacedPattern(
    pp: PlacedPattern,
    vp: CanvasViewport,
    colorMap: Map<string, ColorEntry>,
    showStitchMark: boolean,
    selected: boolean
  ) {
    const transformed = getTransformedCells(pp);
    const { cols: pcols, rows: prows } = gridSize(transformed);
    for (let r = 0; r < prows; r++) {
      for (let c = 0; c < pcols; c++) {
        const cid = transformed[r][c];
        if (!cid) continue;
        const color = colorMap.get(cid);
        if (!color) continue;
        this.drawCell(pp.col + c, pp.row + r, vp, color.hexColor, showStitchMark);
      }
    }
    if (selected) {
      const ctx = this.ctx;
      const g = this.gridToScreen(pp.col, pp.row, vp);
      const w = pcols * vp.scale;
      const h = prows * vp.scale;
      ctx.save();
      ctx.strokeStyle = "#C25B56";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(g.x - 2, g.y - 2, w + 4, h + 4);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private drawSelectionHandles(pp: PlacedPattern, vp: CanvasViewport) {
    const ctx = this.ctx;
    const transformed = getTransformedCells(pp);
    const { cols: pcols, rows: prows } = gridSize(transformed);
    const g = this.gridToScreen(pp.col, pp.row, vp);
    const w = pcols * vp.scale;
    const h = prows * vp.scale;
    const handleSize = Math.max(10, vp.scale * 0.8);

    const corners: { x: number; y: number }[] = [
      { x: g.x, y: g.y },
      { x: g.x + w, y: g.y },
      { x: g.x, y: g.y + h },
      { x: g.x + w, y: g.y + h },
    ];
    for (const c of corners) {
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#C25B56";
      ctx.lineWidth = 2;
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.restore();
    }

    const rotateCx = g.x + w / 2;
    const rotateCy = g.y - handleSize - 6;
    ctx.save();
    ctx.strokeStyle = "#C25B56";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x + w / 2, g.y);
    ctx.lineTo(rotateCx, rotateCy + handleSize / 2);
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(rotateCx, rotateCy, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#C25B56";
    ctx.font = `${Math.max(10, handleSize * 0.6)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("↻", rotateCx, rotateCy);
    ctx.restore();
  }

  private drawLinenBackground(w: number, h: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, w, h);
  }

  private drawCell(col: number, row: number, vp: CanvasViewport, color: string, showMark: boolean) {
    const ctx = this.ctx;
    const g = this.gridToScreen(col, row, vp);

    if (vp.scale < 3) {
      ctx.fillStyle = color;
      ctx.fillRect(g.x, g.y, g.size, g.size);
      return;
    }

    const px = Math.max(1, Math.floor(vp.scale / 16));
    ctx.fillStyle = color;
    ctx.fillRect(g.x + px, g.y + px, g.size - px * 2, g.size - px * 2);

    if (showMark && vp.scale >= 10) {
      ctx.save();
      ctx.strokeStyle = this.darken(color, 0.25);
      ctx.lineWidth = Math.max(1, vp.scale / 20);
      ctx.lineCap = "round";
      ctx.beginPath();
      const pad = vp.scale / 4.5;
      ctx.moveTo(g.x + pad, g.y + pad);
      ctx.lineTo(g.x + g.size - pad, g.y + g.size - pad);
      ctx.moveTo(g.x + g.size - pad, g.y + pad);
      ctx.lineTo(g.x + pad, g.y + g.size - pad);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGridLines(
    vp: CanvasViewport,
    cols: number,
    rows: number,
    _cssW: number,
    _cssH: number
  ) {
    const ctx = this.ctx;
    const thin = Math.max(0.5, vp.scale / 40);
    const thick = Math.max(1, vp.scale / 14);

    ctx.save();
    for (let c = 0; c <= cols; c++) {
      const x = c * vp.scale + vp.offsetX + 0.5;
      const is10 = c % 10 === 0;
      ctx.strokeStyle = is10 ? "rgba(139,111,71,0.55)" : "rgba(179,147,100,0.3)";
      ctx.lineWidth = is10 ? thick : thin;
      ctx.beginPath();
      ctx.moveTo(x, vp.offsetY);
      ctx.lineTo(x, rows * vp.scale + vp.offsetY);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * vp.scale + vp.offsetY + 0.5;
      const is10 = r % 10 === 0;
      ctx.strokeStyle = is10 ? "rgba(139,111,71,0.55)" : "rgba(179,147,100,0.3)";
      ctx.lineWidth = is10 ? thick : thin;
      ctx.beginPath();
      ctx.moveTo(vp.offsetX, y);
      ctx.lineTo(cols * vp.scale + vp.offsetX, y);
      ctx.stroke();
    }
    if (cols % 2 === 0 && rows % 2 === 0) {
      ctx.strokeStyle = "rgba(194,91,86,0.6)";
      ctx.lineWidth = thick;
      const midX = (cols / 2) * vp.scale + vp.offsetX + 0.5;
      const midY = (rows / 2) * vp.scale + vp.offsetY + 0.5;
      ctx.beginPath();
      ctx.moveTo(midX, vp.offsetY);
      ctx.lineTo(midX, rows * vp.scale + vp.offsetY);
      ctx.moveTo(vp.offsetX, midY);
      ctx.lineTo(cols * vp.scale + vp.offsetX, midY);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGridBorder(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#8B6F47";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.shadowColor = "rgba(87,67,42,0.25)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.restore();
  }

  generateThumbnail(
    cells: CellGrid,
    cols: number,
    rows: number,
    colorMap: Map<string, ColorEntry>,
    size = 120
  ): string {
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, size, size);

    const maxSide = Math.max(cols, rows);
    const padding = size > 60 ? 8 : 4;
    let cellSize = Math.floor((size - padding * 2) / maxSide);
    cellSize = Math.max(1, cellSize);

    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const ox = Math.floor((size - totalW) / 2);
    const oy = Math.floor((size - totalH) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cid = cells[r]?.[c];
        if (cid) {
          const color = colorMap.get(cid);
          if (color) {
            ctx.fillStyle = color.hexColor;
            ctx.fillRect(ox + c * cellSize, oy + r * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    if (cellSize >= 3) {
      ctx.strokeStyle = "rgba(179,147,100,0.2)";
      ctx.lineWidth = 1;
      const every = Math.max(1, Math.round(10 / cellSize));
      for (let c = 0; c <= cols; c += every * 5) {
        const x = ox + c * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, oy);
        ctx.lineTo(x, oy + totalH);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r += every * 5) {
        const y = oy + r * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(ox, y);
        ctx.lineTo(ox + totalW, y);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(139,111,71,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, totalW, totalH);

    return off.toDataURL("image/png");
  }

  private darken(hex: string, amount: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const dr = Math.max(0, Math.floor(r * (1 - amount)));
    const dg = Math.max(0, Math.floor(g * (1 - amount)));
    const db = Math.max(0, Math.floor(b * (1 - amount)));
    return `rgb(${dr},${dg},${db})`;
  }
}
