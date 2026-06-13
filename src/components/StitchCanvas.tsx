import { useEffect, useRef, useCallback } from "react";
import { CanvasRenderer, type HitResult } from "@/engine/CanvasRenderer";
import { useCanvasStore } from "@/store/canvasStore";
import { useColorStore } from "@/store/colorStore";
import { PATTERNS } from "@/data/patterns";
import { getTransformedCells, gridSize } from "@/lib/patternUtils";

export interface StitchCanvasHandle {
  getRenderer: () => CanvasRenderer | null;
}

type DragState =
  | { type: "none" }
  | { type: "move"; id: string; startCol: number; startRow: number; origCol: number; origRow: number }
  | { type: "scale"; id: string; corner: "tl" | "tr" | "bl" | "br"; startCol: number; startRow: number; origScale: number; origCol: number; origRow: number; origW: number; origH: number };

export default function StitchCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const isPanningRef = useRef(false);
  const isPaintingRef = useRef(false);
  const spacePressedRef = useRef(false);
  const lastPaintRef = useRef<{ col: number; row: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState>({ type: "none" });
  const dragOverCellRef = useRef<{ col: number; row: number } | null>(null);
  const dropPatternIdRef = useRef<string | null>(null);

  const {
    cols, rows, cells, viewport, tool,
    hoveredCell, showStitchMark, placedPatterns, selectedPatternId,
    setViewport, setHoveredCell, paintCell, pushUndo,
    selectPattern, addPattern, removePattern, updatePattern, rotateSelectedPattern, scaleSelectedPattern,
  } = useCanvasStore();

  const colors = useColorStore((s) => s.colors);
  const selectedColorId = useColorStore((s) => s.selectedColorId);
  const setSelectedColorId = useColorStore((s) => s.setSelected);

  const colorMapRef = useRef(new Map<string, ReturnType<typeof useColorStore.getState>["colors"][number]>());
  useEffect(() => {
    colorMapRef.current = new Map(colors.map((c) => [c.id, c]));
  }, [colors]);

  const scheduleRender = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const r = rendererRef.current;
      if (!r) return;
      const st = useCanvasStore.getState();
      r.render({
        viewport: st.viewport,
        cols: st.cols,
        rows: st.rows,
        cells: st.cells,
        colorMap: colorMapRef.current,
        hoveredCell: dragOverCellRef.current ?? st.hoveredCell,
        showStitchMark: st.showStitchMark,
        placedPatterns: st.placedPatterns,
        selectedPatternId: st.selectedPatternId,
      });
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;

    const handleResize = () => {
      const rect = el.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
      scheduleRender();
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    scheduleRender();

    setTimeout(() => {
      const store = useCanvasStore.getState();
      const rect = el.getBoundingClientRect();
      store.fitViewport(rect.width, rect.height, 40);
    }, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleRender]);

  useEffect(() => {
    scheduleRender();
  }, [viewport, cols, rows, cells, hoveredCell, showStitchMark, scheduleRender, placedPatterns, selectedPatternId]);

  useEffect(() => {
    scheduleRender();
  }, [colors, scheduleRender]);

  const applyPaintAt = useCallback(
    (col: number, row: number) => {
      const state = useCanvasStore.getState();
      const mode = state.tool;
      if (mode === "brush") {
        if (!selectedColorId) return;
        paintCell(col, row, selectedColorId);
      } else if (mode === "eraser") {
        paintCell(col, row, null);
      } else if (mode === "picker") {
        const cid = state.cells[row]?.[col];
        if (cid) setSelectedColorId(cid);
      }
    },
    [selectedColorId, paintCell, setSelectedColorId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = getPos(e);
      const renderer = rendererRef.current;
      if (!renderer) return;
      const vp = useCanvasStore.getState().viewport;
      const { col, row } = renderer.screenToGrid(pos.x, pos.y, vp);

      const drag = dragStateRef.current;

      if (drag.type === "move") {
        const dx = col - drag.startCol;
        const dy = row - drag.startRow;
        const st = useCanvasStore.getState();
        const pp = st.placedPatterns.find((p) => p.id === drag.id);
        if (pp) {
          const transformed = getTransformedCells(pp);
          const { cols: pw, rows: ph } = gridSize(transformed);
          const newCol = Math.max(0, Math.min(st.cols - pw, drag.origCol + dx));
          const newRow = Math.max(0, Math.min(st.rows - ph, drag.origRow + dy));
          st.updatePattern(drag.id, { col: newCol, row: newRow });
        }
        scheduleRender();
        return;
      }

      if (drag.type === "scale") {
        const st = useCanvasStore.getState();
        const pp = st.placedPatterns.find((p) => p.id === drag.id);
        if (!pp) return;
        const dx = col - drag.startCol;
        const dy = row - drag.startRow;
        let factor = 1;
        if (drag.corner === "br") {
          factor = Math.max(dx, dy);
        } else if (drag.corner === "tr") {
          factor = Math.max(dx, -dy);
        } else if (drag.corner === "bl") {
          factor = Math.max(-dx, dy);
        } else if (drag.corner === "tl") {
          factor = Math.max(-dx, -dy);
        }
        const step = Math.round(factor / Math.max(1, drag.origW));
        const newScale = Math.max(1, Math.min(3, drag.origScale + step));
        if (newScale !== pp.scale) {
          const transformed = getTransformedCells({ ...pp, scale: newScale });
          const { cols: pw, rows: ph } = gridSize(transformed);
          let newCol = drag.origCol;
          let newRow = drag.origRow;
          if (drag.corner === "tl" || drag.corner === "tr") {
            newRow = drag.origRow + (drag.origH - ph);
          }
          if (drag.corner === "tl" || drag.corner === "bl") {
            newCol = drag.origCol + (drag.origW - pw);
          }
          newCol = Math.max(0, Math.min(st.cols - pw, newCol));
          newRow = Math.max(0, Math.min(st.rows - ph, newRow));
          st.updatePattern(drag.id, { scale: newScale, col: newCol, row: newRow });
          scheduleRender();
        }
        return;
      }

      if (isPanningRef.current && panStartRef.current) {
        const dx = pos.x - panStartRef.current.x;
        const dy = pos.y - panStartRef.current.y;
        setViewport({
          offsetX: panStartRef.current.ox + dx,
          offsetY: panStartRef.current.oy + dy,
        });
      } else if (isPaintingRef.current && !spacePressedRef.current) {
        const last = lastPaintRef.current;
        if (!last || last.col !== col || last.row !== row) {
          const state = useCanvasStore.getState();
          if (col >= 0 && col < state.cols && row >= 0 && row < state.rows) {
            applyPaintAt(col, row);
            lastPaintRef.current = { col, row };
          }
        }
      } else {
        setHoveredCell({ col, row });
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const pos = getPos(e);
      const renderer = rendererRef.current;
      if (!renderer) return;
      const vp = useCanvasStore.getState().viewport;
      const st = useCanvasStore.getState();
      const { col, row } = renderer.screenToGrid(pos.x, pos.y, vp);
      const hit: HitResult = renderer.hitTest(pos.x, pos.y, vp, st.placedPatterns, st.selectedPatternId);

      const shouldPan =
        e.button === 1 ||
        (e.button === 0 && spacePressedRef.current) ||
        (e.button === 0 && e.shiftKey);

      if (shouldPan) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: pos.x,
          y: pos.y,
          ox: vp.offsetX,
          oy: vp.offsetY,
        };
        canvas.style.cursor = "grabbing";
        e.preventDefault();
        return;
      }

      if (e.button === 0) {
        if (hit.type === "handle" && hit.corner === "rotate") {
          st.pushUndo();
          st.rotateSelectedPattern();
          scheduleRender();
          return;
        }

        if (hit.type === "handle") {
          st.pushUndo();
          const pp = st.placedPatterns.find((p) => p.id === hit.id);
          if (pp) {
            const transformed = getTransformedCells(pp);
            const { cols: pw, rows: ph } = gridSize(transformed);
            dragStateRef.current = {
              type: "scale",
              id: hit.id,
              corner: hit.corner,
              startCol: col,
              startRow: row,
              origScale: pp.scale,
              origCol: pp.col,
              origRow: pp.row,
              origW: pw,
              origH: ph,
            };
          }
          return;
        }

        if (hit.type === "pattern") {
          st.pushUndo();
          st.selectPattern(hit.id);
          const pp = st.placedPatterns.find((p) => p.id === hit.id);
          if (pp) {
            dragStateRef.current = {
              type: "move",
              id: hit.id,
              startCol: col,
              startRow: row,
              origCol: pp.col,
              origRow: pp.row,
            };
          }
          scheduleRender();
          return;
        }

        st.selectPattern(null);

        const mode = useCanvasStore.getState().tool;
        if (mode === "picker") {
          const state = useCanvasStore.getState();
          const cid = state.cells[row]?.[col];
          if (cid) setSelectedColorId(cid);
          return;
        }
        const state = useCanvasStore.getState();
        if (col >= 0 && col < state.cols && row >= 0 && row < state.rows) {
          pushUndo();
          isPaintingRef.current = true;
          lastPaintRef.current = { col, row };
          applyPaintAt(col, row);
        }
      }
    };

    const onMouseUp = () => {
      if (dragStateRef.current.type !== "none") {
        dragStateRef.current = { type: "none" };
      }
      isPaintingRef.current = false;
      isPanningRef.current = false;
      panStartRef.current = null;
      lastPaintRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = spacePressedRef.current
          ? "grab"
          : "crosshair";
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      const vp = useCanvasStore.getState().viewport;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(2, Math.min(60, vp.scale * delta));
      const ratio = newScale / vp.scale;
      setViewport({
        scale: newScale,
        offsetX: pos.x - (pos.x - vp.offsetX) * ratio,
        offsetY: pos.y - (pos.y - vp.offsetY) * ratio,
      });
    };

    const onMouseLeave = () => {
      setHoveredCell(null);
      isPanningRef.current = false;
      isPaintingRef.current = false;
      panStartRef.current = null;
      lastPaintRef.current = null;
      if (dragStateRef.current.type !== "none") {
        dragStateRef.current = { type: "none" };
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onDragOver = (e: DragEvent) => {
      const patternId = e.dataTransfer?.types.includes("application/x-stitch-pattern")
        ? null
        : null;
      if (e.dataTransfer && e.dataTransfer.types.includes("application/x-stitch-pattern")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        const pos = {
          x: (e.clientX ?? 0) - (canvasRef.current?.getBoundingClientRect().left ?? 0),
          y: (e.clientY ?? 0) - (canvasRef.current?.getBoundingClientRect().top ?? 0),
        };
        const renderer = rendererRef.current;
        const vp = useCanvasStore.getState().viewport;
        if (renderer) {
          const { col, row } = renderer.screenToGrid(pos.x, pos.y, vp);
          dragOverCellRef.current = { col, row };
          scheduleRender();
        }
      }
      void patternId;
    };

    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.types.includes("application/x-stitch-pattern")) {
        e.preventDefault();
        dropPatternIdRef.current = e.dataTransfer.getData("application/x-stitch-pattern") || null;
      }
    };

    const onDragLeave = () => {
      dragOverCellRef.current = null;
      scheduleRender();
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const patternId = e.dataTransfer?.getData("application/x-stitch-pattern");
      const renderer = rendererRef.current;
      if (!patternId || !renderer) {
        dragOverCellRef.current = null;
        dropPatternIdRef.current = null;
        scheduleRender();
        return;
      }
      const pattern = PATTERNS.find((p) => p.id === patternId);
      if (!pattern) {
        dragOverCellRef.current = null;
        dropPatternIdRef.current = null;
        scheduleRender();
        return;
      }
      const pos = {
        x: (e.clientX ?? 0) - (canvasRef.current?.getBoundingClientRect().left ?? 0),
        y: (e.clientY ?? 0) - (canvasRef.current?.getBoundingClientRect().top ?? 0),
      };
      const vp = useCanvasStore.getState().viewport;
      const { col, row } = renderer.screenToGrid(pos.x, pos.y, vp);
      const pw = pattern.cells[0]?.length ?? 0;
      const ph = pattern.cells.length;
      const st = useCanvasStore.getState();
      const finalCol = Math.max(0, Math.min(st.cols - pw, col - Math.floor(pw / 2)));
      const finalRow = Math.max(0, Math.min(st.rows - ph, row - Math.floor(ph / 2)));
      st.addPattern(pattern, finalCol, finalRow);
      dragOverCellRef.current = null;
      dropPatternIdRef.current = null;
      scheduleRender();
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("dragover", onDragOver);
    canvas.addEventListener("dragenter", onDragEnter);
    canvas.addEventListener("dragleave", onDragLeave);
    canvas.addEventListener("drop", onDrop);

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("dragover", onDragOver);
      canvas.removeEventListener("dragenter", onDragEnter);
      canvas.removeEventListener("dragleave", onDragLeave);
      canvas.removeEventListener("drop", onDrop);
    };
  }, [applyPaintAt, setViewport, setHoveredCell, pushUndo, setSelectedColorId, selectPattern, addPattern, scheduleRender]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spacePressedRef.current = true;
        if (canvasRef.current && !isPanningRef.current) {
          canvasRef.current.style.cursor = "grab";
        }
      }
      if (e.code === "KeyB") useCanvasStore.getState().setTool("brush");
      if (e.code === "KeyE") useCanvasStore.getState().setTool("eraser");
      if (e.code === "KeyI") useCanvasStore.getState().setTool("picker");
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.getState().undo();
      }
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyZ") ||
        ((e.metaKey || e.ctrlKey) && e.code === "KeyY")
      ) {
        e.preventDefault();
        useCanvasStore.getState().redo();
      }
      const st = useCanvasStore.getState();
      if ((e.code === "Delete" || e.code === "Backspace") && st.selectedPatternId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          st.removePattern(st.selectedPatternId);
        }
      }
      if (e.code === "KeyR" && st.selectedPatternId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          st.rotateSelectedPattern();
        }
      }
      if (st.selectedPatternId) {
        if (e.code === "Digit1") {
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            st.scaleSelectedPattern(1);
          }
        }
        if (e.code === "Digit2") {
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            st.scaleSelectedPattern(2);
          }
        }
        if (e.code === "Digit3") {
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            st.scaleSelectedPattern(3);
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        if (canvasRef.current && !isPanningRef.current) {
          canvasRef.current.style.cursor = "crosshair";
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative linen-bg overflow-hidden rounded-xl"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "crosshair", touchAction: "none" }}
      />
    </div>
  );
}
