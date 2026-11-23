import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, History, Menu, MoreHorizontal, Redo2, Save, Undo2 } from "lucide-react";
import { AssetPanel } from "@/features/assets";
import { CanvasStage, LayerPanel, PresetStrip, applyPreset } from "@/features/composition";
import { ExportPanel, downloadPng } from "@/features/export";
import { StylePanel } from "@/features/text-style";
import { applyCardToLayer, detachDeletedCard, resetLayerStyle, setLayerStyleValue, syncLayersWithCard, withTextStyle } from "@/features/text-style/model";
import { backgrounds, canvasSizes, defaultLayers, defaultStyleCards, presets } from "@/shared/defaults";
import type { BackgroundAsset, CanvasSize, Layer, Preset, StyleCard, TextStyle, TextStyleKey } from "@/shared/types";

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const newTextLayer = (): Layer => ({
  id: makeId("text"), kind: "text", name: "新文字", content: "输入你的句子", x: 50, y: 52, scale: 0.72, rotation: 0,
  color: "#fff7e8", fontSize: 72, opacity: 1,
  fillColor: "#fff7e8", strokeColor: "#1a1226", strokeWidth: 0, fontWeight: 700, lineHeight: 1.12, align: "center",
  styleId: null, styleOverrides: {}
});

export default function App() {
  const [background, setBackground] = useState<BackgroundAsset>(backgrounds[0]);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundAsset[]>(backgrounds);
  const [layers, setLayers] = useState<Layer[]>(defaultLayers);
  const [styleCards, setStyleCards] = useState<StyleCard[]>(defaultStyleCards);
  const [selectedId, setSelectedId] = useState<string | null>(defaultLayers[0].id);
  const [activePreset, setActivePreset] = useState("headline");
  const [exportSize, setExportSize] = useState<CanvasSize>(canvasSizes[0]);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedIndex = layers.findIndex((layer) => layer.id === selectedId);
  const selected = layers[selectedIndex];
  const projectLabel = useMemo(() => `${layers.filter((layer) => layer.kind === "text").length} 个文字 · ${layers.filter((layer) => layer.kind === "sticker").length} 个贴纸`, [layers]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateLayer = (id: string, patch: Partial<Layer>) => setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));

  const updateTextStyle = (key: TextStyleKey, value: TextStyle[keyof TextStyle]) => {
    if (!selected) return;
    setLayers((current) => current.map((layer) => layer.id === selected.id ? setLayerStyleValue(layer, key, value) : layer));
  };

  const addText = () => { const layer = newTextLayer(); setLayers((current) => [...current, layer]); setSelectedId(layer.id); };
  const addSticker = (sticker: { label: string; glyph: string; color: string }) => { const layer: Layer = { ...newTextLayer(), id: makeId("sticker"), kind: "sticker", name: sticker.label, content: sticker.glyph, x: 50, y: 68, scale: 0.82, rotation: 0, color: sticker.color, fontSize: 150, opacity: 1, styleId: null, styleOverrides: {} }; setLayers((current) => [...current, layer]); setSelectedId(layer.id); };
  const addBackground = (file: File) => { const asset: BackgroundAsset = { id: makeId("upload"), label: file.name.replace(/\.[^/.]+$/, "").slice(0, 16) || "上传底图", accent: "#ffffff", style: `url("${URL.createObjectURL(file)}") center / cover no-repeat` }; setBackgroundOptions((current) => [...current, asset]); setBackground(asset); };
  const moveLayer = (direction: "up" | "down") => { if (selectedIndex < 0) return; const next = direction === "up" ? selectedIndex + 1 : selectedIndex - 1; if (next < 0 || next >= layers.length) return; setLayers((current) => { const copy = [...current]; [copy[selectedIndex], copy[next]] = [copy[next], copy[selectedIndex]]; return copy; }); };
  const removeSelected = () => { if (!selected) return; setLayers((current) => current.filter((layer) => layer.id !== selected.id)); setSelectedId(layers[selectedIndex - 1]?.id ?? layers[selectedIndex + 1]?.id ?? null); };
  const selectPreset = (preset: Preset) => { setLayers((current) => applyPreset(current, preset)); setBackground(backgrounds.find((item) => item.id === preset.backgroundId) ?? backgrounds[0]); setExportSize(preset.canvas); setActivePreset(preset.id); };
  const exportArtwork = () => downloadPng({ background, layers, size: exportSize });

  const applyCard = (card: StyleCard) => {
    if (!selected || selected.kind !== "text") { setNotice("请先选中一个文字层再应用样式"); return; }
    setLayers((current) => current.map((layer) => layer.id === selected.id ? applyCardToLayer(layer, card) : layer));
    setNotice(`已应用「${card.label}」`);
  };

  const createCard = (label: string) => {
    if (!selected || selected.kind !== "text") { setNotice("请先选中一个文字层"); return; }
    const style = { fillColor: selected.fillColor, strokeColor: selected.strokeColor, strokeWidth: selected.strokeWidth, fontWeight: selected.fontWeight, lineHeight: selected.lineHeight, align: selected.align };
    const card: StyleCard = { id: makeId("style"), label, style, createdAt: Date.now() };
    setStyleCards((current) => [...current, card]);
    setLayers((current) => current.map((layer) => layer.id === selected.id ? withTextStyle({ ...layer, styleId: card.id, styleOverrides: {} }, style) : layer));
    setNotice(`已保存样式卡片「${label}」`);
  };

  const updateCard = (card: StyleCard) => {
    if (!selected || selected.kind !== "text") { setNotice("请先选中一个文字层"); return; }
    const style: TextStyle = { fillColor: selected.fillColor, strokeColor: selected.strokeColor, strokeWidth: selected.strokeWidth, fontWeight: selected.fontWeight, lineHeight: selected.lineHeight, align: selected.align };
    const nextCard = { ...card, style };
    const protectedCount = layers.filter((layer) => layer.kind === "text" && layer.styleId === card.id && Object.keys(layer.styleOverrides).length > 0).length;
    setStyleCards((current) => current.map((item) => item.id === card.id ? nextCard : item));
    setLayers((current) => current.map((layer) => syncLayersWithCard(layer, nextCard)));
    setNotice(protectedCount ? `样式卡片已更新，${protectedCount} 个文字保留自身覆盖值` : "样式卡片已更新");
  };

  const deleteCard = (card: StyleCard) => {
    setStyleCards((current) => current.filter((item) => item.id !== card.id));
    setLayers((current) => current.map((layer) => detachDeletedCard(layer, card.id)));
    setNotice(`已删除样式卡片「${card.label}」，已应用文字保持现状`);
  };

  const resetStyle = () => {
    if (!selected) return;
    const card = selected.styleId ? styleCards.find((item) => item.id === selected.styleId) : undefined;
    if (!card) return;
    setLayers((current) => current.map((layer) => layer.id === selected.id ? resetLayerStyle(layer, card) : layer));
  };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">P</span><span>POSTURE</span><span className="brand-divider" /><span className="workspace-name">情绪海报工作台</span></div><div className="project-status"><span className="status-dot" />{projectLabel}<span className="status-divider" />自动保存已开启</div><div className="top-actions"><button className="icon-button" aria-label="撤销"><Undo2 size={17} /></button><button className="icon-button" aria-label="重做"><Redo2 size={17} /></button><button className="save-button" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }}>{saved ? <Check size={16} /> : <Save size={16} />}<span>{saved ? "已保存" : "保存"}</span></button><button className="icon-button" aria-label="更多"><MoreHorizontal size={18} /></button><button className="avatar">LC</button></div></header>
    <div className="mobile-toolbar"><button className="icon-button"><Menu size={18} /></button><span>POSTURE / 工作区</span><button className="icon-button"><MoreHorizontal size={18} /></button></div>
    <main className="workspace"><AssetPanel background={background} backgroundOptions={backgroundOptions} onBackgroundChange={setBackground} onUpload={addBackground} onAddSticker={addSticker} setLayers={setLayers} /><section className="canvas-column"><div className="canvas-toolbar"><div><span className="eyebrow">CURRENT BOARD</span><h1>Weekend moodboard <ChevronDown size={18} /></h1></div><div className="canvas-toolbar-actions"><button className="toolbar-button"><History size={15} />版本</button><button className="toolbar-button">100%</button><button className="toolbar-button">适配画布</button></div></div><div className="canvas-wrap"><CanvasStage background={background} layers={layers} selectedId={selectedId} onSelect={setSelectedId} onChange={updateLayer} /></div><PresetStrip activeId={activePreset} onApply={selectPreset} /></section><section className="right-column"><LayerPanel layers={layers} selectedId={selectedId} onSelect={setSelectedId} onChange={updateLayer} onRemove={removeSelected} onAddText={addText} onMove={moveLayer} /><StylePanel layer={selected} cards={styleCards} onStyleChange={updateTextStyle} onApplyCard={applyCard} onUpdateCard={updateCard} onDeleteCard={deleteCard} onCreateCard={createCard} onResetStyle={resetStyle} /><ExportPanel sizes={canvasSizes} selected={exportSize} onChange={setExportSize} onExport={exportArtwork} /></section></main>
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}
