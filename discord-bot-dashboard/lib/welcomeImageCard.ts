import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { existsSync } from "node:fs";

import {
  DEFAULT_IMAGE_CARD_FONT,
  DEFAULT_OVERLAY_COLOR,
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_TEXT_COLOR,
  type ImageCardFontKey,
} from "./welcomeCardConstants";
import { resolveImageCardFontForRendering } from "./resolveImageCardFont";
import {
  computeImageCardAvatarTopPx,
  getImageCardLayoutMetrics,
  getImageCardMergedAvatarDiameterPx,
  IMAGE_CARD_H,
  IMAGE_CARD_RADIUS_PX,
  IMAGE_CARD_TEXT_MAX_W,
  IMAGE_CARD_W,
  type ImageCardFontStyle,
  type ImageCardFontWeight,
  type ImageCardTextSizePreset,
} from "./welcomeImageCardLayout";
import { canvasFontFamilyName, ensureWelcomeCardFontsRegistered } from "./registerWelcomeCardFonts";

export type ImageCardBackgroundMode = "gradient" | "solid" | "image" | "transparent";

export type ImageCardRenderableFieldStyle = {
  textSize: ImageCardTextSizePreset;
  fontWeight: ImageCardFontWeight;
  fontStyle: ImageCardFontStyle;
};

export type ImageCardGenerationInput = {
  title: string;
  subtitle: string;
  /** Игнорируется при отрисовке PNG */
  description: string;
  /** Глобальный шрифт карточки */
  fontFamily: ImageCardFontKey;
  /** Глобальный цвет текста */
  textColor: string;
  titleStyle: ImageCardRenderableFieldStyle;
  subtitleStyle: ImageCardRenderableFieldStyle;
  overlayColor: string;
  overlayOpacity: number;
  backgroundMode: ImageCardBackgroundMode;
  /** 0..1, только слой фона (не оверлей, не текст). */
  backgroundOpacity?: number;
  backgroundColor: string;
  accentColor: string;
  backgroundGradientStartColor?: string;
  backgroundGradientEndColor?: string;
  backgroundGradientMode?: "diagonal" | "radial";
  /** Приоритет над backgroundImagePath */
  backgroundImageDataUrl?: string | null;
  backgroundImagePath?: string | null;
  showAvatar?: boolean;
  showUsername?: boolean;
  displayName: string;
  avatarUrl: string | null;
};

const W = IMAGE_CARD_W;
const H = IMAGE_CARD_H;
const textMaxW = IMAGE_CARD_TEXT_MAX_W;

function addRoundedRectClipPath(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function canvasFontString(
  style: ImageCardFontStyle,
  weight: ImageCardFontWeight,
  sizePx: number,
  ff: string
): string {
  const w = weight === "bold" ? "700" : "400";
  const st = style === "italic" ? "italic" : "normal";
  return `${st} ${w} ${sizePx}px "${ff}", system-ui, sans-serif`;
}

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

function rgbToCss(c: { r: number; g: number; b: number }): string {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function rgbaFromHex(hex: string, alpha: number, fallbackHex: string): string {
  const c = parseHex(hex, fallbackHex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_OVERLAY_OPACITY;
  return Math.min(1, Math.max(0, n));
}

function clamp01Unit(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

function wrapLines(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const raw = (text || "").trim();
  if (!raw) return [""];
  const normalized = raw.replace(/\s+/g, " ");
  if (ctx.measureText(normalized).width <= maxWidth) {
    return [normalized];
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (ctx.measureText(w).width > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          const t2 = chunk + ch;
          if (ctx.measureText(t2).width <= maxWidth) chunk = t2;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawImageCover(
  ctx: SKRSContext2D,
  img: Image,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const iw = img.width;
  const ih = img.height;
  const destAspect = dWidth / dHeight;
  const srcAspect = iw / ih;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;
  if (srcAspect > destAspect) {
    sh = ih;
    sw = ih * destAspect;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = iw / destAspect;
    sx = 0;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
}

async function drawBackground(ctx: SKRSContext2D, input: ImageCardGenerationInput): Promise<void> {
  const rawMode = input.backgroundMode;
  const mode: ImageCardBackgroundMode =
    rawMode === "transparent" ? "solid" : rawMode === "image" || rawMode === "gradient" || rawMode === "solid"
      ? rawMode
      : "gradient";

  const bgLayerAlpha = clamp01Unit(
    typeof input.backgroundOpacity === "number" ? input.backgroundOpacity : 1
  );
  if (bgLayerAlpha <= 0) {
    return;
  }

  if (mode === "solid") {
    ctx.save();
    ctx.globalAlpha = bgLayerAlpha;
    const bg = parseHex(input.backgroundColor, "#12131a");
    ctx.fillStyle = rgbToCss(bg);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  if (mode === "gradient") {
    ctx.save();
    ctx.globalAlpha = bgLayerAlpha;
    const start = parseHex(
      (input.backgroundGradientStartColor ?? input.backgroundColor)?.trim() || "#12131a",
      "#12131a"
    );
    const end = parseHex(
      (input.backgroundGradientEndColor ?? input.accentColor)?.trim() || "#8038ce",
      "#8038ce"
    );
    const gMode = input.backgroundGradientMode === "radial" ? "radial" : "diagonal";
    if (gMode === "radial") {
      const cx = W / 2;
      const cy = H / 2;
      const r = Math.hypot(W, H) / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgbToCss(start));
      g.addColorStop(1, rgbToCss(end));
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, rgbToCss(start));
      g.addColorStop(1, rgbToCss(end));
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  /* image */
  ctx.save();
  ctx.globalAlpha = bgLayerAlpha;
  const dataUrl =
    typeof input.backgroundImageDataUrl === "string" ? input.backgroundImageDataUrl.trim() : "";
  if (dataUrl.startsWith("data:image/") && dataUrl.includes("base64,")) {
    try {
      const bgImg = await loadImage(dataUrl);
      drawImageCover(ctx, bgImg, 0, 0, W, H);
      ctx.restore();
      return;
    } catch {
      /* fallback file */
    }
  }

  const useImage =
    typeof input.backgroundImagePath === "string" &&
    input.backgroundImagePath.trim() !== "" &&
    existsSync(input.backgroundImagePath);

  if (useImage && input.backgroundImagePath) {
    try {
      const bgImg = await loadImage(input.backgroundImagePath);
      drawImageCover(ctx, bgImg, 0, 0, W, H);
      ctx.restore();
      return;
    } catch {
      /* пусто */
    }
  }
  const fallbackBg = parseHex(input.backgroundColor, "#12131a");
  ctx.fillStyle = rgbToCss(fallbackBg);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export async function generateWelcomeImageCardPngBuffer(
  input: ImageCardGenerationInput,
  fontDir: string
): Promise<Buffer> {
  ensureWelcomeCardFontsRegistered(fontDir);

  const titleSt = input.titleStyle;
  const subSt = input.subtitleStyle;

  const requestedFont = input.fontFamily ?? DEFAULT_IMAGE_CARD_FONT;
  const { resolved: cardFontKey } = resolveImageCardFontForRendering(requestedFont, fontDir);
  const ff = canvasFontFamilyName(cardFontKey);
  if (process.env.NODE_ENV === "development") {
    console.log("[welcomeCard png]", {
      requestedFont,
      resolvedFont: cardFontKey,
      canvasFamily: ff,
    });
  }
  const ffTitle = ff;
  const ffSub = ff;

  const titleM = getImageCardLayoutMetrics(titleSt.textSize ?? "m");
  const subM = getImageCardLayoutMetrics(subSt.textSize ?? "m");
  const avatarD = getImageCardMergedAvatarDiameterPx(
    titleSt.textSize ?? "m",
    subSt.textSize ?? "m"
  );
  const AVATAR_R = avatarD / 2;

  const titleWeight: ImageCardFontWeight = titleSt.fontWeight === "bold" ? "bold" : "regular";
  const titleStyle: ImageCardFontStyle = titleSt.fontStyle === "italic" ? "italic" : "normal";
  const subWeight: ImageCardFontWeight = subSt.fontWeight === "bold" ? "bold" : "regular";
  const subStyle: ImageCardFontStyle = subSt.fontStyle === "italic" ? "italic" : "normal";

  const textHex = input.textColor?.trim() || DEFAULT_TEXT_COLOR;
  const titleHex = textHex;
  const subHex = textHex;
  const overlayHex = input.overlayColor?.trim() || DEFAULT_OVERLAY_COLOR;
  const overlayOp = clamp01(
    typeof input.overlayOpacity === "number" ? input.overlayOpacity : DEFAULT_OVERLAY_OPACITY
  );

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  addRoundedRectClipPath(ctx, 0, 0, W, H, IMAGE_CARD_RADIUS_PX);
  ctx.clip();

  await drawBackground(ctx, input);

  const effectiveMode =
    input.backgroundMode === "transparent" ? "solid" : input.backgroundMode;
  if (effectiveMode === "image") {
    const overlayRgb = parseHex(overlayHex, DEFAULT_OVERLAY_COLOR);
    ctx.fillStyle = `rgba(${overlayRgb.r},${overlayRgb.g},${overlayRgb.b},${overlayOp})`;
    ctx.fillRect(0, 0, W, H);
  }

  const cx = W / 2;

  ctx.font = canvasFontString(titleStyle, titleWeight, titleM.titlePx, ffTitle);
  const rawTitle = (input.title || "").trim();
  const titleLines = rawTitle ? wrapLines(ctx, rawTitle, textMaxW).slice(0, 4) : [];
  ctx.font = canvasFontString(subStyle, subWeight, subM.subtitlePx, ffSub);
  const subLines = wrapLines(ctx, input.subtitle || "", textMaxW).slice(0, 3);

  const subs = subLines.filter((l) => l.trim());
  const titleDraw = titleLines.filter((l) => l.trim());

  const gapAvatar = Math.max(titleM.gapAvatarToTextPx, subM.gapAvatarToTextPx);
  const gapTitleSub = Math.max(titleM.gapTitleToSubtitlePx, subM.gapTitleToSubtitlePx);

  const ay = computeImageCardAvatarTopPx({
    titleLineCount: titleDraw.length,
    subtitleLineCount: subs.length,
    titleM,
    subtitleM: subM,
    avatarDiameterPx: avatarD,
  });

  const ax = cx - AVATAR_R;

  const drawAvatarFallback = () => {
    ctx.fillStyle = rgbaFromHex(titleHex, 0.75, DEFAULT_TEXT_COLOR);
    ctx.font = canvasFontString(titleStyle, titleWeight, Math.round(AVATAR_R * 1.1), ffTitle);
    const initial = (input.displayName || "?").slice(0, 1).toUpperCase();
    ctx.fillText(initial, cx - ctx.measureText(initial).width / 2, ay + AVATAR_R + AVATAR_R * 0.35);
  };

  if (input.avatarUrl) {
    try {
      const img = await loadImage(input.avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + AVATAR_R, ay + AVATAR_R, AVATAR_R, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, ax, ay, AVATAR_R * 2, AVATAR_R * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax + AVATAR_R, ay + AVATAR_R, AVATAR_R, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(ax + AVATAR_R, ay + AVATAR_R, AVATAR_R, 0, Math.PI * 2);
      ctx.fill();
      drawAvatarFallback();
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(ax + AVATAR_R, ay + AVATAR_R, AVATAR_R, 0, Math.PI * 2);
    ctx.fill();
    drawAvatarFallback();
  }

  let y = ay + avatarD + gapAvatar + titleM.titleFirstBaselineOffsetPx;

  ctx.textAlign = "center";

  ctx.fillStyle = rgbaFromHex(titleHex, 1, DEFAULT_TEXT_COLOR);
  ctx.font = canvasFontString(titleStyle, titleWeight, titleM.titlePx, ffTitle);
  for (const line of titleDraw) {
    ctx.fillText(line, cx, y);
    y += titleM.titleLineHeightPx;
  }
  if (titleDraw.length && subs.length) y += gapTitleSub;

  ctx.fillStyle = rgbaFromHex(subHex, 1, DEFAULT_TEXT_COLOR);
  ctx.font = canvasFontString(subStyle, subWeight, subM.subtitlePx, ffSub);
  if (!titleDraw.length && subs.length) {
    y = ay + avatarD + gapAvatar + subM.subtitleFirstBaselineOffsetPx;
  }
  for (const line of subs) {
    ctx.fillText(line, cx, y);
    y += subM.subtitleLineHeightPx;
  }

  ctx.restore();

  return canvas.toBuffer("image/png");
}
