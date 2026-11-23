export type ElementKind = "text" | "sticker";

export type CanvasSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
};

export type TextAlign = "left" | "center" | "right";

export type FontWeight = 400 | 500 | 600 | 700 | 800;

/** Visual text style that can be saved as a reusable style card. */
export type TextStyle = {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fontWeight: FontWeight;
  lineHeight: number;
  align: TextAlign;
};

/** Keys a text layer can override relative to its applied style card. */
export type TextStyleKey = keyof TextStyle;

export type Layer = {
  id: string;
  kind: ElementKind;
  name: string;
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  fontSize: number;
  opacity: number;
  /** Resolved text appearance. Stickers ignore these values. */
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fontWeight: FontWeight;
  lineHeight: number;
  align: TextAlign;
  /** Style card currently applied to this layer, if any. */
  styleId: string | null;
  /** Values the user changed locally; these win over later style card edits. */
  styleOverrides: Partial<TextStyle>;
};

export type BackgroundAsset = {
  id: string;
  label: string;
  style: string;
  accent: string;
};

export type StickerAsset = {
  id: string;
  label: string;
  glyph: string;
  color: string;
};

export type Preset = {
  id: string;
  label: string;
  description: string;
  canvas: CanvasSize;
  backgroundId: string;
  positions: { x: number; y: number; scale: number; rotation: number }[];
};

export type StyleCard = {
  id: string;
  label: string;
  style: TextStyle;
  createdAt: number;
};
