/** Shared text layout so the live canvas and the PNG export wrap identically. */

/** Design-space width (in 1080-wide artboard pixels) used for text wrapping. */
export const TEXT_BOX_WIDTH = 760;

let measureCanvas: HTMLCanvasElement | null = null;

function measureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  return measureCanvas.getContext("2d");
}

export const TEXT_FONT_STACK = '"DM Sans", "Noto Sans SC", sans-serif';

export function textFont(weight: number, size: number, family = TEXT_FONT_STACK): string {
  return `${weight} ${size}px ${family}`;
}

const widthCache = new Map<string, number>();

function measureWidth(text: string, font: string): number {
  const key = `${font}\u0000${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const context = measureContext();
  if (!context) return text.length * 0.55 * parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "16");
  context.font = font;
  const width = context.measureText(text).width;
  if (widthCache.size > 4000) widthCache.clear();
  widthCache.set(key, width);
  return width;
}

export function clearTextMeasureCache(): void {
  widthCache.clear();
}

/**
 * Greedy wrap in design-space pixels. Spaces break first, while long
 * unspaced runs (CJK copy) fall back to per-character breaks.
 */
export function wrapText(text: string, maxWidth: number, font: string): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let line = "";
    const flush = () => {
      lines.push(line.replace(/\s+$/, ""));
      line = "";
    };

    const tokens = paragraph.split(/(\s+)/).filter(Boolean);
    tokens.forEach((token) => {
      if (measureWidth(line + token, font) <= maxWidth) {
        line += token;
        return;
      }
      if (line.trim()) flush();
      else line = "";
      if (!token.trim()) return;
      if (measureWidth(token.trim(), font) <= maxWidth) {
        line = token.trim();
        return;
      }
      Array.from(token.trim()).forEach((char) => {
        if (line && measureWidth(line + char, font) > maxWidth) flush();
        line += char;
      });
    });
    flush();
  });

  return lines.length ? lines : [""];
}

export function lineHeightPx(fontSize: number, lineHeight: number): number {
  return fontSize * lineHeight;
}
