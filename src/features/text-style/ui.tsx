import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AlignCenter, AlignLeft, AlignRight, BookmarkPlus, Palette, RotateCcw, Trash2, RefreshCw, Type } from "lucide-react";
import type { Layer, StyleCard, TextAlign, TextStyle, TextStyleKey } from "@/shared/types";
import { ALIGN_OPTIONS, FONT_WEIGHTS, pickTextStyle, styleOverridesCount, toHexColor } from "./model";

type StylePanelProps = {
  layer?: Layer;
  cards: StyleCard[];
  onStyleChange: (key: TextStyleKey, value: TextStyle[keyof TextStyle]) => void;
  onApplyCard: (card: StyleCard) => void;
  onUpdateCard: (card: StyleCard) => void;
  onDeleteCard: (card: StyleCard) => void;
  onCreateCard: (label: string) => void;
  onResetStyle: () => void;
};

const ALIGN_ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight } as const;

export function StylePanel({ layer, cards, onStyleChange, onApplyCard, onUpdateCard, onDeleteCard, onCreateCard, onResetStyle }: StylePanelProps) {
  const isText = layer?.kind === "text";
  const style = isText ? pickTextStyle(layer) : null;
  const overrideCount = isText ? styleOverridesCount(layer) : 0;
  const activeCard = isText && layer?.styleId ? cards.find((card) => card.id === layer.styleId) : undefined;
  const [cardName, setCardName] = useState("");
  const nextName = cardName.trim() || `样式 ${cards.length + 1}`;

  return <section className="side-panel style-panel" aria-label="文字样式面板">
    <div className="panel-heading"><div><span className="eyebrow">02B / TYPOGRAPHY</span><h2>文字样式</h2></div><Palette size={17} /></div>

    <div className="style-card-block">
      <div className="section-label"><span>样式卡片</span><span className="muted">可复用</span></div>
      <div className="style-card-grid">
        {cards.map((card) => <div key={card.id} className={`style-card ${activeCard?.id === card.id ? "active" : ""}`} aria-label={`样式卡片 ${card.label}`}>
          <button type="button" className="style-card-apply" aria-label={`应用样式 ${card.label}`} title={isText ? `应用 ${card.label}` : "需要选中文字层"} onClick={() => onApplyCard(card)}>
            <span className="style-card-preview" style={previewStyle(card.style)}>Aa</span>
            <span className="style-card-label">{card.label}</span>
          </button>
          <div className="style-card-actions">
            <button type="button" aria-label={`更新样式 ${card.label}`} title={isText ? "用当前选中文字更新此卡片" : "需要选中文字层"} disabled={!isText} onClick={() => onUpdateCard(card)}><RefreshCw size={12} /></button>
            <button type="button" aria-label={`删除样式 ${card.label}`} title="删除样式卡片" onClick={() => onDeleteCard(card)}><Trash2 size={12} /></button>
          </div>
        </div>)}
        {cards.length === 0 && <p className="style-empty">还没有样式卡片。调好样式后保存，即可复用到其他文字。</p>}
      </div>
      <div className="style-save-row">
        <input aria-label="样式卡片名称" placeholder={nextName} value={cardName} onChange={(event) => setCardName(event.target.value)} />
        <button type="button" className="small-button" aria-label="保存当前样式为卡片" disabled={!isText} onClick={() => { onCreateCard(nextName); setCardName(""); }}><BookmarkPlus size={14} />保存卡片</button>
      </div>
    </div>

    {isText && style ? <div className="style-controls">
      <div className="inspector-heading">
        <span>{activeCard ? `已应用：${activeCard.label}` : "自由样式"}</span>
        <span className={`override-badge ${overrideCount ? "visible" : ""}`}>{overrideCount ? `${overrideCount} 项覆盖` : "跟随卡片"}</span>
      </div>
      {activeCard && <button type="button" className="small-button reset-style" disabled={!overrideCount} onClick={onResetStyle}><RotateCcw size={13} />恢复卡片样式</button>}

      <ColorField label="填充色" value={style.fillColor} overridden={"fillColor" in (layer.styleOverrides ?? {})} onChange={(value) => onStyleChange("fillColor", value)} />
      <ColorField label="描边色" value={style.strokeColor} overridden={"strokeColor" in (layer.styleOverrides ?? {})} onChange={(value) => onStyleChange("strokeColor", value)} />

      <label className="field-label">描边宽度 <span>{style.strokeWidth}px{"strokeWidth" in (layer.styleOverrides ?? {}) ? " · 覆盖" : ""}</span>
        <input type="range" min="0" max="20" step="1" value={style.strokeWidth} aria-label="描边宽度" onChange={(event) => onStyleChange("strokeWidth", Number(event.target.value))} />
      </label>

      <label className="field-label">字重 <span>{"fontWeight" in (layer.styleOverrides ?? {}) ? "覆盖" : ""}</span>
        <select aria-label="字重" value={style.fontWeight} onChange={(event) => onStyleChange("fontWeight", Number(event.target.value) as TextStyle["fontWeight"])}>
          {FONT_WEIGHTS.map((weight) => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
        </select>
      </label>

      <label className="field-label">行高 <span>{style.lineHeight.toFixed(2)}{"lineHeight" in (layer.styleOverrides ?? {}) ? " · 覆盖" : ""}</span>
        <input type="range" min="0.8" max="2" step="0.02" value={style.lineHeight} aria-label="行高" onChange={(event) => onStyleChange("lineHeight", Number(event.target.value))} />
      </label>

      <div className="field-label align-field"><span>对齐方式</span>
        <div className="align-group" role="group" aria-label="对齐方式">
          {ALIGN_OPTIONS.map((option) => {
            const Icon = ALIGN_ICONS[option.value];
            return <button key={option.value} type="button" className={style.align === option.value ? "active" : ""} aria-label={option.label} aria-pressed={style.align === option.value} onClick={() => onStyleChange("align", option.value as TextAlign)}><Icon size={14} />{option.label}</button>;
          })}
        </div>
        {"align" in (layer.styleOverrides ?? {}) && <small className="override-hint">当前对齐为本地覆盖</small>}
      </div>
    </div> : <div className="style-placeholder"><Type size={18} /><p>选中一个文字层后即可调整填充、描边、字重、行高与对齐，并保存为样式卡片。</p></div>}
  </section>;
}

function previewStyle(style: TextStyle): CSSProperties {
  return {
    color: style.fillColor,
    WebkitTextStroke: style.strokeWidth > 0 ? `${Math.min(1.4, style.strokeWidth / 3)}px ${style.strokeColor}` : undefined,
    paintOrder: "stroke fill",
    fontWeight: style.fontWeight,
    textAlign: style.align
  };
}

type ColorFieldProps = { label: string; value: string; overridden: boolean; onChange: (value: string) => void };

function ColorField({ label, value, overridden, onChange }: ColorFieldProps) {
  const [draft, setDraft] = useState(toHexColor(value));
  const lastValue = useRef(value);
  useEffect(() => {
    if (lastValue.current !== value) {
      lastValue.current = value;
      setDraft(toHexColor(value));
    }
  }, [value]);

  const commit = (next: string) => {
    setDraft(next);
    if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase());
  };

  return <label className="field-label color-field"> <span>{label}{overridden ? <small className="override-hint">覆盖</small> : null}</span>
    <div className="color-row">
      <input type="color" aria-label={`${label}拾色器`} value={toHexColor(value)} onChange={(event) => commit(event.target.value)} />
      <input type="text" aria-label={label} value={draft} maxLength={7} onChange={(event) => commit(event.target.value)} />
    </div>
  </label>;
}
