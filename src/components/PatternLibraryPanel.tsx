import { useMemo, useState } from "react";
import { Grid3X3, Sparkles } from "lucide-react";
import { PATTERNS, PATTERN_CATEGORIES } from "@/data/patterns";
import { useColorStore } from "@/store/colorStore";
import { useCanvasStore } from "@/store/canvasStore";
import type { Pattern } from "@/types";
import clsx from "clsx";

function PatternPreview({ pattern }: { pattern: Pattern }) {
  const colors = useColorStore((s) => s.colors);
  const colorMap = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const rows = pattern.cells.length;
  const cols = rows > 0 ? pattern.cells[0].length : 0;
  const maxSide = Math.max(cols, rows);
  const cellSize = maxSide <= 5 ? 10 : maxSide <= 10 ? 7 : 5;

  return (
    <div
      className="grid bg-linen-100 rounded border border-linen-300"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        width: cols * cellSize,
        height: rows * cellSize,
      }}
    >
      {pattern.cells.map((row, r) =>
        row.map((cid, c) => {
          const color = cid ? colorMap.get(cid) : null;
          return (
            <div
              key={`${r}-${c}`}
              style={{
                backgroundColor: color ? color.hexColor : "transparent",
              }}
            />
          );
        })
      )}
    </div>
  );
}

export default function PatternLibraryPanel() {
  const colors = useColorStore((s) => s.colors);
  const initialized = useColorStore((s) => s.initialized);
  const cols = useCanvasStore((s) => s.cols);
  const rows = useCanvasStore((s) => s.rows);
  const addPattern = useCanvasStore((s) => s.addPattern);

  const [activeCategory, setActiveCategory] = useState("全部");

  const filtered = useMemo(() => {
    if (activeCategory === "全部") return PATTERNS;
    return PATTERNS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleDragStart = (e: React.DragEvent, pattern: Pattern) => {
    e.dataTransfer.setData("application/x-stitch-pattern", pattern.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleClick = (pattern: Pattern) => {
    const colorMap = new Map(colors.map((c) => [c.id, c]));
    let hasAll = true;
    for (const row of pattern.cells) {
      for (const cid of row) {
        if (cid && !colorMap.has(cid)) {
          hasAll = false;
          break;
        }
      }
    }
    if (!hasAll) {
      alert("图案中包含色号表中没有的颜色，请先添加对应色号。");
      return;
    }
    const pw = pattern.cells[0]?.length ?? 0;
    const ph = pattern.cells.length;
    const col = Math.floor((cols - pw) / 2);
    const row = Math.floor((rows - ph) / 2);
    addPattern(pattern, Math.max(0, col), Math.max(0, row));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-linen-200">
        <div className="flex items-center gap-1 mb-2 text-[11px] text-sienna-500">
          <Sparkles className="w-3 h-3" />
          <span>共 {PATTERNS.length} 种纹样 · 拖入画布或点击放置</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {PATTERN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "px-2 py-1 text-[11px] rounded-md border transition-all",
                activeCategory === cat
                  ? "bg-stitch-50 text-stitch-600 border-stitch-300 font-medium"
                  : "bg-white/60 text-sienna-500 border-linen-300 hover:bg-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {!initialized ? (
          <div className="text-center text-sienna-400 text-sm py-8">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sienna-400 text-sm py-8">该分类暂无纹样</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p)}
                onClick={() => handleClick(p)}
                className="group bg-white/80 border border-linen-300 rounded-lg p-2 cursor-grab hover:bg-white hover:border-stitch-300 hover:shadow-sm transition-all active:cursor-grabbing"
                title={`${p.name} · 拖拽到画布或点击放置`}
              >
                <div className="flex items-center justify-center py-2 bg-linen-50 rounded-md border border-linen-200 mb-1.5">
                  <PatternPreview pattern={p} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-sienna-700 truncate">{p.name}</div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-sienna-400 mt-0.5">
                    <Grid3X3 className="w-2.5 h-2.5" />
                    <span>
                      {p.cells[0]?.length ?? 0}×{p.cells.length}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-linen-200 bg-linen-50/50">
        <div className="text-[10px] text-sienna-400 leading-relaxed">
          <p>💡 提示：</p>
          <p>· 选中图案后可拖拽移动位置</p>
          <p>· 拖动四角按 1×/2×/3× 整数缩放</p>
          <p>· 点击顶部 ↻ 按钮 90° 旋转</p>
          <p>· 按 Delete/Backspace 删除选中</p>
        </div>
      </div>
    </div>
  );
}
