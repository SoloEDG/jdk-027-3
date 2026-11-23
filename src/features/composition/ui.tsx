import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, Minus, Plus, RotateCcw, Type } from "lucide-react";
import { presets } from "@/shared/defaults";
import type { BackgroundAsset, Layer, Preset } from "@/shared/types";
import { TEXT_BOX_WIDTH, clearTextMeasureCache, lineHeightPx, textFont, wrapText } from "@/features/text-style/layout";

type StageProps = { background: BackgroundAsset; layers: Layer[]; selectedId: string | null; onSelect: (id: string) => void; onChange: (id: string, patch: Partial<Layer>) => void };

export function CanvasStage({ background, layers, selectedId, onSelect, onChange }: StageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(620);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setStageWidth(width);
    });
    observer.observe(node);
    setStageWidth(node.clientWidth || 620);
    return () => observer.disconnect();
  }, []);

  const stageScale = stageWidth / 1080;
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      clearTextMeasureCache();
      setFontTick((tick) => tick + 1);
    });
    return () => { cancelled = true; };
  }, []);

  const move = (event: React.PointerEvent<HTMLDivElement>, layer: Layer) => {
    if (layer.kind === "text" && event.button !== 0) return;
    const target = event.currentTarget.closest(".canvas-stage") as HTMLDivElement | null;
    if (!target) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: layer.x, y: layer.y };
    const handleMove = (moveEvent: PointerEvent) => {
      const nextX = Math.min(94, Math.max(6, start.x + ((moveEvent.clientX - startX) / target.clientWidth) * 100));
      const nextY = Math.min(94, Math.max(6, start.y + ((moveEvent.clientY - startY) / target.clientHeight) * 100));
      onChange(layer.id, { x: nextX, y: nextY });
    };
    const finish = () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
  };

  return <div className="canvas-stage" ref={stageRef} style={{ background: background.style }}>
    <div className="grain" />
    {layers.map((layer) => {
      const position = { left: `${layer.x}%`, top: `${layer.y}%`, opacity: layer.opacity };
      const transform = `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`;
      const selectedClass = selectedId === layer.id ? "selected" : "";
      const handlers = { onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => { onSelect(layer.id); move(event, layer); } };
      if (layer.kind === "text") {
        const fontSize = layer.fontSize * stageScale;
        const stroke = layer.strokeWidth > 0;
        const lines = wrapText(layer.content, TEXT_BOX_WIDTH, textFont(layer.fontWeight, layer.fontSize));
        const lineHeight = lineHeightPx(layer.fontSize, layer.lineHeight);
        return <div key={layer.id} className={`canvas-layer text ${selectedClass}`} {...handlers} data-font-tick={fontTick} style={{
          ...position,
          transform,
          width: `${TEXT_BOX_WIDTH * stageScale}px`,
          color: layer.fillColor,
          fontSize: `${fontSize}px`,
          fontWeight: layer.fontWeight,
          lineHeight: 1,
          textAlign: layer.align,
          WebkitTextStroke: stroke ? `${layer.strokeWidth * stageScale}px ${layer.strokeColor}` : undefined,
          paintOrder: stroke ? "stroke fill" : undefined
        }}>
          {lines.map((line, index) => <span className="canvas-text-line" key={index} style={{ height: `${lineHeight * stageScale}px`, lineHeight: `${lineHeight * stageScale}px` }}>{line || "\u00a0"}</span>)}
          <span className="layer-handle" />
        </div>;
      }
      return <div key={layer.id} className={`canvas-layer sticker ${selectedClass}`} {...handlers} style={{ ...position, transform, color: layer.color, fontSize: `${layer.fontSize * stageScale}px` }}>
        <span className="canvas-text-content">{layer.content}</span>
        <span className="layer-handle" />
      </div>;
    })}
    <div className="stage-caption"><span>LIVE CANVAS</span><span>1080 × 1080</span></div>
  </div>;
}

type LayerPanelProps = { layers: Layer[]; selectedId: string | null; onSelect: (id: string) => void; onChange: (id: string, patch: Partial<Layer>) => void; onRemove: () => void; onAddText: () => void; onMove: (direction: "up" | "down") => void };

export function LayerPanel({ layers, selectedId, onSelect, onChange, onRemove, onAddText, onMove }: LayerPanelProps) {
  const selected = layers.find((layer) => layer.id === selectedId);
  return <aside className="side-panel layer-panel">
    <div className="panel-heading"><div><span className="eyebrow">02 / COMPOSITION</span><h2>图层</h2></div><GripVertical size={17} /></div>
    <div className="layer-list">{layers.map((layer, index) => <button key={layer.id} className={`layer-row ${selectedId === layer.id ? "active" : ""}`} onClick={() => onSelect(layer.id)}><span className="layer-index">{String(index + 1).padStart(2, "0")}</span><span className="layer-icon">{layer.kind === "text" ? <Type size={15} /> : <span>{layer.content}</span>}</span><span className="layer-name">{layer.name}</span><span className="layer-drag">⠿</span></button>)}</div>
    <button className="add-text" onClick={onAddText}><Plus size={15} />添加文字层</button>
    {selected && <div className="inspector">
      <div className="inspector-heading"><span>选中元素</span><button className="icon-button" onClick={onRemove} aria-label="删除选中层"><Minus size={16} /></button></div>
      {selected.kind === "text" && <label className="field-label">文案<input value={selected.content} onChange={(event) => onChange(selected.id, { content: event.target.value })} /></label>}
      <label className="field-label">缩放 <span>{Math.round(selected.scale * 100)}%</span><input type="range" min="0.5" max="2" step="0.05" value={selected.scale} onChange={(event) => onChange(selected.id, { scale: Number(event.target.value) })} /></label>
      <label className="field-label">旋转 <span>{selected.rotation}°</span><input type="range" min="-30" max="30" step="1" value={selected.rotation} onChange={(event) => onChange(selected.id, { rotation: Number(event.target.value) })} /></label>
      <div className="move-actions"><button className="small-button" onClick={() => onMove("up")}><ArrowUp size={14} />上移</button><button className="small-button" onClick={() => onMove("down")}><ArrowDown size={14} />下移</button><button className="small-button" onClick={() => onChange(selected.id, { rotation: 0 })}><RotateCcw size={14} />复位角度</button></div>
    </div>}
  </aside>;
}

type PresetStripProps = { activeId: string; onApply: (preset: Preset) => void };

export function PresetStrip({ activeId, onApply }: PresetStripProps) {
  return <section className="preset-strip"><div className="section-label"><span>版式预设</span><span className="muted">保留内容与样式，更新构图</span></div><div className="preset-list">{presets.map((preset) => <button key={preset.id} className={`preset-card ${activeId === preset.id ? "active" : ""}`} onClick={() => onApply(preset)}><span className="preset-preview" style={{ background: preset.id === "headline" ? "linear-gradient(150deg,#42225f,#e17061)" : preset.id === "editorial" ? "linear-gradient(150deg,#604b38,#e4c58f)" : "linear-gradient(150deg,#1d6d68,#d5e9a2)" }}><span /><span /><span /></span><span className="preset-copy"><strong>{preset.label}</strong><small>{preset.description}</small></span><Copy size={14} /></button>)}</div></section>;
}

export function applyPreset(layers: Layer[], preset: Preset) {
  return layers.map((layer, index) => {
    const position = preset.positions[index % preset.positions.length];
    return { ...layer, ...position };
  });
}
