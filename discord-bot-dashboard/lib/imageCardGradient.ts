/** Общая логика второго цвета градиента фона карточки (превью + PNG). */

function parseHex(hex: string, fallback: string): { r: number; g: number; b: number } {
  const s = (hex || fallback).trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) {
    const f = fallback.replace(/^#/, "");
    const n = Number.parseInt(f, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const n = Number.parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(c: { r: number; g: number; b: number }): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  const k = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

/**
 * Второй стоп градиента: заметное смешение фона с акцентом (не «чуть светлее»).
 */
export function imageCardGradientEndHex(backgroundColor: string, accentColor: string): string {
  const bg = parseHex(backgroundColor, "#12131a");
  const acc = parseHex(accentColor, "#8038ce");
  const towardAccent = mixRgb(bg, acc, 0.58);
  const lifted = mixRgb(towardAccent, { r: 255, g: 255, b: 255 }, 0.12);
  return rgbToHex(lifted);
}
