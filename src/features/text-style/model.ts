import type { Layer, StyleCard, TextStyle, TextStyleKey } from "@/shared/types";

export const FONT_WEIGHTS = [
  { value: 400, label: "常规 400" },
  { value: 500, label: "中等 500" },
  { value: 600, label: "半粗 600" },
  { value: 700, label: "粗体 700" },
  { value: 800, label: "特粗 800" }
] as const;

export const ALIGN_OPTIONS = [
  { value: "left", label: "左对齐" },
  { value: "center", label: "居中" },
  { value: "right", label: "右对齐" }
] as const;

const styleKeys: TextStyleKey[] = ["fillColor", "strokeColor", "strokeWidth", "fontWeight", "lineHeight", "align"];

/** Snapshot the resolvable style of a text layer. */
export function pickTextStyle(layer: Layer): TextStyle {
  return {
    fillColor: layer.fillColor ?? layer.color,
    strokeColor: layer.strokeColor ?? "#000000",
    strokeWidth: layer.strokeWidth ?? 0,
    fontWeight: layer.fontWeight ?? 700,
    lineHeight: layer.lineHeight ?? 1.1,
    align: layer.align ?? "center"
  };
}

/** Merge a card style with a layer's own overrides. Overrides always win. */
export function resolveTextStyle(base: TextStyle, overrides: Partial<TextStyle>): TextStyle {
  return { ...base, ...overrides };
}

/** Apply a resolved style onto a layer, keeping the legacy color field in sync. */
export function withTextStyle(layer: Layer, style: TextStyle): Layer {
  return {
    ...layer,
    ...style,
    color: style.fillColor
  };
}

/** Attach a card to a text layer. Explicit application starts from a clean slate. */
export function applyCardToLayer(layer: Layer, card: StyleCard): Layer {
  return {
    ...withTextStyle(layer, card.style),
    styleId: card.id,
    styleOverrides: {}
  };
}

/**
 * Push an updated card style into every applied layer.
 * Layers keep values they overrode themselves; only untouched keys follow the card.
 */
export function syncLayersWithCard(layer: Layer, card: StyleCard): Layer {
  if (layer.styleId !== card.id) return layer;
  return withTextStyle(layer, resolveTextStyle(card.style, layer.styleOverrides));
}

/**
 * Record a local edit on a text layer. If the layer uses a card, the edited key
 * becomes an override so later card updates cannot silently rewrite it.
 */
export function setLayerStyleValue(layer: Layer, key: TextStyleKey, value: TextStyle[keyof TextStyle]): Layer {
  const style = { ...pickTextStyle(layer), [key]: value } as TextStyle;
  const next = withTextStyle(layer, style);
  if (!layer.styleId) return next;
  return { ...next, styleOverrides: { ...layer.styleOverrides, [key]: value } };
}

/** Drop every local override and fall back to the attached card (if any). */
export function resetLayerStyle(layer: Layer, card: StyleCard | undefined): Layer {
  if (!card) return layer;
  return applyCardToLayer(layer, card);
}

/** Detach layers from a deleted card without changing how they look. */
export function detachDeletedCard(layer: Layer, cardId: string): Layer {
  if (layer.styleId !== cardId) return layer;
  return { ...layer, styleId: null, styleOverrides: {} };
}

/** Produce a safe #rrggbb value for native color inputs. */
export function toHexColor(value: string, fallback = "#ffffff"): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${value.slice(1).split("").map((char) => char + char).join("")}`;
  return fallback;
}

export function styleOverridesCount(layer: Layer | undefined): number {
  if (!layer) return 0;
  return styleKeys.filter((key) => key in layer.styleOverrides).length;
}
