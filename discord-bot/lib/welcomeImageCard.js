const { existsSync } = require("fs");
const path = require("path");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");

const W = 1200;
const H = 515;
const TEXT_MAX_W = 860;
/** Скругление всей карточки (как в dashboard `welcomeImageCardLayout.ts`). */
const IMAGE_CARD_RADIUS_PX = 32;

const DEFAULT_TEXT_COLOR = "#f4f4f5";
const DEFAULT_OVERLAY_COLOR = "#09090b";
const DEFAULT_OVERLAY_OPACITY = 0.35;

const FONT_FILES = {
  inter: "inter.ttf",
  manrope: "manrope.ttf",
  montserrat: "montserrat.ttf",
  nunito: "nunito.ttf",
  rubik: "rubik.ttf",
  roboto: "roboto.ttf",
  oswald: "oswald.ttf",
  open_sans: "open-sans.ttf",
  play: "play.ttf",
  russo_one: "russo-one.ttf",
  comfortaa: "comfortaa.ttf",
  cormorant_garamond: "cormorant-garamond.ttf",
  alice: "alice.ttf",
  marck_script: "marck-script.ttf",
  underdog: "underdog.ttf",
  cinzel: "cinzel.ttf",
};

const FONT_NAMES = {
  inter: "Inter",
  manrope: "Manrope",
  montserrat: "Montserrat",
  nunito: "Nunito Sans",
  rubik: "Rubik",
  roboto: "Roboto",
  oswald: "Oswald",
  open_sans: "Open Sans",
  play: "Play",
  russo_one: "Russo One",
  comfortaa: "Comfortaa",
  cormorant_garamond: "Cormorant Garamond",
  alice: "Alice",
  marck_script: "Marck Script",
  underdog: "Underdog",
  cinzel: "Cinzel",
};

const FONT_KEYS = new Set(Object.keys(FONT_FILES));

const PRESET_METRICS = {
  s: {
    avatarDiameterPx: 190,
    titlePx: 30,
    subtitlePx: 20,
    titleLineHeightPx: 38,
    subtitleLineHeightPx: 25,
    gapAvatarToTextPx: 12,
    gapTitleToSubtitlePx: 6,
    titleFirstBaselineOffsetPx: 30 * 0.92,
    subtitleFirstBaselineOffsetPx: 20 * 0.92,
  },
  m: {
    avatarDiameterPx: 215,
    titlePx: 38,
    subtitlePx: 25,
    titleLineHeightPx: 48,
    subtitleLineHeightPx: 32,
    gapAvatarToTextPx: 14,
    gapTitleToSubtitlePx: 8,
    titleFirstBaselineOffsetPx: 38 * 0.92,
    subtitleFirstBaselineOffsetPx: 25 * 0.92,
  },
  l: {
    avatarDiameterPx: 240,
    titlePx: 45,
    subtitlePx: 30,
    titleLineHeightPx: 57,
    subtitleLineHeightPx: 38,
    gapAvatarToTextPx: 16,
    gapTitleToSubtitlePx: 10,
    titleFirstBaselineOffsetPx: 45 * 0.92,
    subtitleFirstBaselineOffsetPx: 30 * 0.92,
  },
};

function getMetrics(preset) {
  return PRESET_METRICS[preset] || PRESET_METRICS.m;
}

function mergedAvatarDiameter(titlePreset, subPreset) {
  return Math.max(getMetrics(titlePreset).avatarDiameterPx, getMetrics(subPreset).avatarDiameterPx);
}

function computeAvatarTop(titleCount, subCount, titleM, subM, avatarD) {
  const avatarH = avatarD;
  const bottomPad = 10;
  const minTop = 12;
  const gapAvatar = Math.max(titleM.gapAvatarToTextPx, subM.gapAvatarToTextPx);
  const gapTitleSub = Math.max(titleM.gapTitleToSubtitlePx, subM.gapTitleToSubtitlePx);

  if (titleCount === 0 && subCount === 0) {
    return Math.max(minTop, (H - avatarH) / 2);
  }

  let lastBaselineFromAvatarTop = 0;
  if (titleCount > 0) {
    const titleFirst = avatarH + gapAvatar + titleM.titleFirstBaselineOffsetPx;
    const lastTitleBaseline = titleFirst + (titleCount - 1) * titleM.titleLineHeightPx;
    if (subCount > 0) {
      const firstSubBaseline =
        titleFirst + titleCount * titleM.titleLineHeightPx + gapTitleSub;
      lastBaselineFromAvatarTop = firstSubBaseline + (subCount - 1) * subM.subtitleLineHeightPx;
    } else {
      lastBaselineFromAvatarTop = lastTitleBaseline;
    }
  } else {
    const firstSub = avatarH + gapAvatar + subM.subtitleFirstBaselineOffsetPx;
    lastBaselineFromAvatarTop = firstSub + (subCount - 1) * subM.subtitleLineHeightPx;
  }
  const totalH = lastBaselineFromAvatarTop + bottomPad;
  return Math.max(minTop, (H - totalH) / 2);
}

function resolveFontForRendering(requested, fontDir) {
  const req = typeof requested === "string" && FONT_KEYS.has(requested) ? requested : "inter";
  const full = path.join(fontDir, FONT_FILES[req]);
  if (existsSync(full)) {
    return { resolved: req, missingFile: false };
  }
  const available = Object.keys(FONT_FILES).filter((k) =>
    existsSync(path.join(fontDir, FONT_FILES[k]))
  );
  if (available.length === 0) {
    console.warn("[welcomeImageCard] нет ни одного .ttf в", fontDir);
    return { resolved: "inter", missingFile: true };
  }
  const fallback = available.includes("inter") ? "inter" : available[0];
  console.warn(`[welcomeImageCard] файл шрифта не найден: ${req} → ${fallback}`);
  return { resolved: fallback, missingFile: true };
}

function canvasFontString(style, weight, sizePx, ff) {
  const w = weight === "bold" ? "700" : "400";
  const st = style === "italic" ? "italic" : "normal";
  return `${st} ${w} ${sizePx}px "${ff}", system-ui, sans-serif`;
}

let fontsRegistered = false;

function ensureFonts(fontDir) {
  if (fontsRegistered) return;
  for (const key of Object.keys(FONT_FILES)) {
    const full = path.join(fontDir, FONT_FILES[key]);
    if (existsSync(full)) {
      try {
        GlobalFonts.registerFromPath(full, FONT_NAMES[key]);
      } catch (e) {
        console.warn("[welcomeImageCard] font register failed:", key, e?.message || e);
      }
    } else {
      console.warn("[welcomeImageCard] font file missing:", full);
    }
  }
  fontsRegistered = true;
}

function canvasFamily(key) {
  return FONT_NAMES[key] || FONT_NAMES.inter;
}

function parseHex(hex, fallback) {
  const s = String(hex || fallback)
    .trim()
    .replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) {
    const f = fallback.replace(/^#/, "");
    const n = Number.parseInt(f, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const n = Number.parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToCss(c) {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function rgbaFromHex(hex, alpha, fallbackHex) {
  const c = parseHex(hex, fallbackHex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function mixRgb(a, b, t) {
  const k = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

function rgbToHexChannel(c) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function imageCardGradientEndHex(backgroundColor, accentColor) {
  const bg = parseHex(backgroundColor, "#12131a");
  const acc = parseHex(accentColor, "#8038ce");
  const towardAccent = mixRgb(bg, acc, 0.58);
  const lifted = mixRgb(towardAccent, { r: 255, g: 255, b: 255 }, 0.12);
  return rgbToHexChannel(lifted);
}

function wrapLines(ctx, text, maxWidth) {
  const raw = String(text || "").trim();
  if (!raw) return [""];
  const normalized = raw.replace(/\s+/g, " ");
  if (ctx.measureText(normalized).width <= maxWidth) {
    return [normalized];
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
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

function addRoundedRectClipPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawImageCover(ctx, img, dx, dy, dWidth, dHeight) {
  const iw = img.width;
  const ih = img.height;
  const destAspect = dWidth / dHeight;
  const srcAspect = iw / ih;
  let sx;
  let sy;
  let sw;
  let sh;
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

async function drawBackground(ctx, input) {
  const bg = parseHex(input.backgroundColor, "#12131a");
  const p = input.backgroundImagePath;
  const useImage =
    input.backgroundMode === "image" &&
    typeof p === "string" &&
    p.trim() !== "" &&
    existsSync(p);

  if (useImage) {
    try {
      const bgImg = await loadImage(p);
      drawImageCover(ctx, bgImg, 0, 0, W, H);
      return;
    } catch {
      /* fallback */
    }
  }

  const mode =
    input.backgroundMode === "solid"
      ? "solid"
      : input.backgroundMode === "gradient" || input.backgroundMode === "image"
        ? "gradient"
        : "gradient";

  if (mode === "gradient") {
    const endHex = imageCardGradientEndHex(
      String(input.backgroundColor || "#12131a").trim(),
      String(input.accentColor || "#8038ce").trim()
    );
    const end = parseHex(endHex, "#2a2d42");
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, rgbToCss(bg));
    g.addColorStop(1, rgbToCss(end));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = rgbToCss(bg);
  }
  ctx.fillRect(0, 0, W, H);
}

async function generateWelcomeImageCardPngBuffer(input, fontDir) {
  ensureFonts(fontDir);

  const titleSt = input.titleStyle || {};
  const subSt = input.subtitleStyle || {};

  const titlePreset =
    titleSt.textSize === "s" || titleSt.textSize === "m" || titleSt.textSize === "l"
      ? titleSt.textSize
      : "m";
  const subPreset =
    subSt.textSize === "s" || subSt.textSize === "m" || subSt.textSize === "l"
      ? subSt.textSize
      : "m";

  const titleM = getMetrics(titlePreset);
  const subM = getMetrics(subPreset);
  const avatarD = mergedAvatarDiameter(titlePreset, subPreset);
  const AVATAR_R = avatarD / 2;

  const cardFontReq =
    typeof input.fontFamily === "string" && FONT_KEYS.has(input.fontFamily)
      ? input.fontFamily
      : "inter";
  const { resolved: cardResolved } = resolveFontForRendering(cardFontReq, fontDir);
  const ff = canvasFamily(cardResolved);
  const ffTitle = ff;
  const ffSub = ff;

  const titleWeight = titleSt.fontWeight === "bold" ? "bold" : "regular";
  const titleFontStyle = titleSt.fontStyle === "italic" ? "italic" : "normal";
  const subWeight = subSt.fontWeight === "bold" ? "bold" : "regular";
  const subFontStyle = subSt.fontStyle === "italic" ? "italic" : "normal";

  const textHex =
    typeof input.textColor === "string" && input.textColor.trim()
      ? input.textColor.trim()
      : DEFAULT_TEXT_COLOR;
  const titleHex = textHex;
  const subHex = textHex;

  const overlayHex = input.overlayColor?.trim() || DEFAULT_OVERLAY_COLOR;
  let overlayOp =
    typeof input.overlayOpacity === "number" && !Number.isNaN(input.overlayOpacity)
      ? input.overlayOpacity
      : DEFAULT_OVERLAY_OPACITY;
  overlayOp = Math.min(1, Math.max(0, overlayOp));

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  addRoundedRectClipPath(ctx, 0, 0, W, H, IMAGE_CARD_RADIUS_PX);
  ctx.clip();

  await drawBackground(ctx, input);

  const overlayRgb = parseHex(overlayHex, DEFAULT_OVERLAY_COLOR);
  ctx.fillStyle = `rgba(${overlayRgb.r},${overlayRgb.g},${overlayRgb.b},${overlayOp})`;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;

  ctx.font = canvasFontString(titleFontStyle, titleWeight, titleM.titlePx, ffTitle);
  const rawTitle = String(input.title || "").trim();
  const titleLines = rawTitle ? wrapLines(ctx, rawTitle, TEXT_MAX_W).slice(0, 4) : [];
  ctx.font = canvasFontString(subFontStyle, subWeight, subM.subtitlePx, ffSub);
  const subLines = wrapLines(ctx, input.subtitle || "", TEXT_MAX_W).slice(0, 3);

  const subs = subLines.filter((l) => l.trim());
  const titleDraw = titleLines.filter((l) => l.trim());

  const gapAvatar = Math.max(titleM.gapAvatarToTextPx, subM.gapAvatarToTextPx);
  const gapTitleSub = Math.max(titleM.gapTitleToSubtitlePx, subM.gapTitleToSubtitlePx);

  const ay = computeAvatarTop(titleDraw.length, subs.length, titleM, subM, avatarD);
  const ax = cx - AVATAR_R;

  const drawFallbackInitial = () => {
    ctx.fillStyle = rgbaFromHex(titleHex, 0.75, DEFAULT_TEXT_COLOR);
    ctx.font = canvasFontString(titleFontStyle, titleWeight, Math.round(AVATAR_R * 1.1), ffTitle);
    const initial = (input.displayName || "?").slice(0, 1).toUpperCase();
    ctx.fillText(initial, cx - ctx.measureText(initial).width / 2, ay + AVATAR_R + AVATAR_R * 0.35);
  };

  const avatarUrl = input.avatarUrl;
  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl);
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
      drawFallbackInitial();
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(ax + AVATAR_R, ay + AVATAR_R, AVATAR_R, 0, Math.PI * 2);
    ctx.fill();
    drawFallbackInitial();
  }

  let y = ay + avatarD + gapAvatar + titleM.titleFirstBaselineOffsetPx;

  ctx.textAlign = "center";

  ctx.fillStyle = rgbaFromHex(titleHex, 1, DEFAULT_TEXT_COLOR);
  ctx.font = canvasFontString(titleFontStyle, titleWeight, titleM.titlePx, ffTitle);
  for (const line of titleDraw) {
    ctx.fillText(line, cx, y);
    y += titleM.titleLineHeightPx;
  }
  if (titleDraw.length && subs.length) y += gapTitleSub;

  ctx.fillStyle = rgbaFromHex(subHex, 1, DEFAULT_TEXT_COLOR);
  ctx.font = canvasFontString(subFontStyle, subWeight, subM.subtitlePx, ffSub);
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

module.exports = {
  generateWelcomeImageCardPngBuffer,
};
