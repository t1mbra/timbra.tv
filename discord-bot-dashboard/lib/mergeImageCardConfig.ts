import {
  DEFAULT_IMAGE_CARD_FONT,
  DEFAULT_OVERLAY_COLOR,
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_TEXT_COLOR,
  MAX_IMAGE_CARD_BACKGROUND_DATA_URL_CHARS,
  isImageCardFontKey,
  type ImageCardFontKey,
} from "./welcomeCardConstants";
import {
  isImageCardTextSizePreset,
  type ImageCardFontStyle,
  type ImageCardFontWeight,
  type ImageCardTextSizePreset,
} from "./welcomeImageCardLayout";

export type ImageCardBackgroundImageConfig = {
  enabled: boolean;
  path: string;
  filename?: string;
};

/** Только размер и начертание поля; цвет и шрифт карточки задаются глобально */
export type ImageCardFieldStyleMerged = {
  textSize: ImageCardTextSizePreset;
  fontWeight: ImageCardFontWeight;
  fontStyle: ImageCardFontStyle;
};

export type ImageCardGuildConfigMerged = {
  title: string;
  subtitle: string;
  description: string;
  /** Глобальный шрифт карточки (заголовок и подзаголовок) */
  fontFamily: ImageCardFontKey;
  /** Глобальный цвет текста карточки */
  textColor: string;
  titleStyle: ImageCardFieldStyleMerged;
  subtitleStyle: ImageCardFieldStyleMerged;
  /** Устаревшие поля корня конфига — зеркалируют titleStyle для совместимости */
  textSize: ImageCardTextSizePreset;
  fontWeight: ImageCardFontWeight;
  fontStyle: ImageCardFontStyle;
  overlayColor: string;
  overlayOpacity: number;
  backgroundMode: "gradient" | "solid" | "image";
  backgroundColor: string;
  accentColor: string;
  /** Фон как data URL (приоритетнее файла на диске). */
  backgroundImageDataUrl: string;
  backgroundImage: ImageCardBackgroundImageConfig;
  showAvatar: boolean;
  showUsername: boolean;
};

function defaultFieldStyle(): ImageCardFieldStyleMerged {
  return {
    textSize: "m",
    fontWeight: "regular",
    fontStyle: "normal",
  };
}

const defaults: ImageCardGuildConfigMerged = {
  title: "Добро пожаловать",
  subtitle: "Новый участник",
  description: "Рады видеть тебя на {server}",
  fontFamily: DEFAULT_IMAGE_CARD_FONT,
  textColor: DEFAULT_TEXT_COLOR,
  titleStyle: defaultFieldStyle(),
  subtitleStyle: { ...defaultFieldStyle() },
  textSize: "m",
  fontWeight: "regular",
  fontStyle: "normal",
  overlayColor: DEFAULT_OVERLAY_COLOR,
  overlayOpacity: DEFAULT_OVERLAY_OPACITY,
  backgroundMode: "gradient",
  backgroundColor: "#12131a",
  accentColor: "#8038ce",
  backgroundImageDataUrl: "",
  backgroundImage: { enabled: false, path: "" },
  showAvatar: true,
  showUsername: false,
};

function clamp01(n: unknown, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function pickCoercedFont(
  requested: ImageCardFontKey,
  available?: readonly ImageCardFontKey[]
): ImageCardFontKey {
  if (!available || available.length === 0) return requested;
  if (available.includes(requested)) return requested;
  if (available.includes(DEFAULT_IMAGE_CARD_FONT)) return DEFAULT_IMAGE_CARD_FONT;
  return available[0];
}

function readFontFromUnknown(
  v: unknown,
  fallback: ImageCardFontKey,
  avail?: readonly ImageCardFontKey[]
): ImageCardFontKey {
  if (typeof v === "string" && isImageCardFontKey(v)) {
    return pickCoercedFont(v, avail);
  }
  return pickCoercedFont(fallback, avail);
}

function parseFieldStyle(
  raw: unknown,
  base: ImageCardFieldStyleMerged
): ImageCardFieldStyleMerged {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...base };
  }
  const o = raw as Record<string, unknown>;

  let textSize = base.textSize;
  if (typeof o.textSize === "string" && isImageCardTextSizePreset(o.textSize)) {
    textSize = o.textSize;
  }

  let fontWeight: ImageCardFontWeight = base.fontWeight;
  if (o.fontWeight === "bold") fontWeight = "bold";
  else if (o.fontWeight === "regular") fontWeight = "regular";

  let fontStyle: ImageCardFontStyle = base.fontStyle;
  if (o.fontStyle === "italic") fontStyle = "italic";
  else if (o.fontStyle === "normal") fontStyle = "normal";

  return { textSize, fontWeight, fontStyle };
}

function fieldStylesEqual(a: ImageCardFieldStyleMerged, b: ImageCardFieldStyleMerged): boolean {
  return (
    a.textSize === b.textSize &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle
  );
}

export function imageCardsEqual(a: ImageCardGuildConfigMerged, b: ImageCardGuildConfigMerged): boolean {
  return (
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.description === b.description &&
    a.fontFamily === b.fontFamily &&
    a.textColor === b.textColor &&
    fieldStylesEqual(a.titleStyle, b.titleStyle) &&
    fieldStylesEqual(a.subtitleStyle, b.subtitleStyle) &&
    a.overlayColor === b.overlayColor &&
    a.overlayOpacity === b.overlayOpacity &&
    a.backgroundMode === b.backgroundMode &&
    a.backgroundColor === b.backgroundColor &&
    a.accentColor === b.accentColor &&
    a.backgroundImageDataUrl === b.backgroundImageDataUrl &&
    a.backgroundImage.enabled === b.backgroundImage.enabled &&
    a.backgroundImage.path === b.backgroundImage.path &&
    (a.backgroundImage.filename ?? "") === (b.backgroundImage.filename ?? "")
  );
}

function normalizeBackgroundImageDataUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s.startsWith("data:image/") || !s.includes("base64,")) return "";
  if (s.length > MAX_IMAGE_CARD_BACKGROUND_DATA_URL_CHARS) return "";
  if (!/^data:image\/(png|jpeg|webp|jpg);base64,/i.test(s)) return "";
  return s;
}

export function mergeImageCard(
  raw: unknown,
  opts?: { availableFontKeys?: readonly ImageCardFontKey[] }
): ImageCardGuildConfigMerged {
  const avail = opts?.availableFontKeys;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const base = {
      ...defaults,
      backgroundImageDataUrl: "",
      backgroundImage: { ...defaults.backgroundImage },
      titleStyle: { ...defaults.titleStyle },
      subtitleStyle: { ...defaults.subtitleStyle },
    };
    return {
      ...base,
      fontFamily: pickCoercedFont(base.fontFamily, avail),
    };
  }
  const o = raw as Record<string, unknown>;

  let backgroundMode: "gradient" | "solid" | "image" = "gradient";
  if (o.backgroundMode === "solid") backgroundMode = "solid";
  else if (o.backgroundMode === "image") backgroundMode = "image";
  else if (o.backgroundMode === "gradient") backgroundMode = "gradient";

  const titleRaw = o.titleStyle && typeof o.titleStyle === "object" && !Array.isArray(o.titleStyle)
    ? (o.titleStyle as Record<string, unknown>)
    : null;
  const subtitleRaw =
    o.subtitleStyle && typeof o.subtitleStyle === "object" && !Array.isArray(o.subtitleStyle)
      ? (o.subtitleStyle as Record<string, unknown>)
      : null;

  let fontFamily: ImageCardFontKey = pickCoercedFont(DEFAULT_IMAGE_CARD_FONT, avail);
  if (typeof o.fontFamily === "string" && isImageCardFontKey(o.fontFamily)) {
    fontFamily = pickCoercedFont(o.fontFamily, avail);
  } else if (titleRaw && typeof titleRaw.fontFamily === "string") {
    fontFamily = readFontFromUnknown(titleRaw.fontFamily, fontFamily, avail);
  } else if (subtitleRaw && typeof subtitleRaw.fontFamily === "string") {
    fontFamily = readFontFromUnknown(subtitleRaw.fontFamily, fontFamily, avail);
  }

  let textColor = DEFAULT_TEXT_COLOR;
  if (typeof o.textColor === "string" && o.textColor.trim()) {
    textColor = o.textColor;
  } else if (titleRaw && typeof titleRaw.textColor === "string" && titleRaw.textColor.trim()) {
    textColor = titleRaw.textColor;
  } else if (
    subtitleRaw &&
    typeof subtitleRaw.textColor === "string" &&
    subtitleRaw.textColor.trim()
  ) {
    textColor = subtitleRaw.textColor;
  }

  let legacyTextSize: ImageCardTextSizePreset = defaults.textSize;
  if (typeof o.textSize === "string" && isImageCardTextSizePreset(o.textSize)) {
    legacyTextSize = o.textSize;
  }

  let legacyFontWeight: ImageCardFontWeight = defaults.fontWeight;
  if (o.fontWeight === "bold") legacyFontWeight = "bold";
  else if (o.fontWeight === "regular") legacyFontWeight = "regular";

  let legacyFontStyle: ImageCardFontStyle = defaults.fontStyle;
  if (o.fontStyle === "italic") legacyFontStyle = "italic";
  else if (o.fontStyle === "normal") legacyFontStyle = "normal";

  const titleStyle = parseFieldStyle(o.titleStyle, {
    textSize: legacyTextSize,
    fontWeight: legacyFontWeight,
    fontStyle: legacyFontStyle,
  });
  const subtitleStyle = parseFieldStyle(o.subtitleStyle, {
    textSize: titleStyle.textSize,
    fontWeight: titleStyle.fontWeight,
    fontStyle: titleStyle.fontStyle,
  });

  let backgroundImage: ImageCardBackgroundImageConfig = { ...defaults.backgroundImage };
  const biRaw = o.backgroundImage;
  if (biRaw && typeof biRaw === "object" && !Array.isArray(biRaw)) {
    const bi = biRaw as Record<string, unknown>;
    backgroundImage = {
      enabled: bi.enabled === true,
      path: typeof bi.path === "string" ? bi.path : "",
      filename: typeof bi.filename === "string" ? bi.filename : undefined,
    };
  }

  const backgroundImageDataUrl = normalizeBackgroundImageDataUrl(o.backgroundImageDataUrl);

  const titleTrimmed = typeof o.title === "string" ? o.title.trim() : "";

  return {
    title: titleTrimmed ? titleTrimmed : defaults.title,
    subtitle:
      typeof o.subtitle === "string"
        ? o.subtitle.trim() || defaults.subtitle
        : defaults.subtitle,
    description: typeof o.description === "string" ? o.description : defaults.description,
    fontFamily,
    textColor,
    titleStyle,
    subtitleStyle,
    textSize: titleStyle.textSize,
    fontWeight: titleStyle.fontWeight,
    fontStyle: titleStyle.fontStyle,
    overlayColor: typeof o.overlayColor === "string" ? o.overlayColor : defaults.overlayColor,
    overlayOpacity: clamp01(o.overlayOpacity, defaults.overlayOpacity),
    backgroundMode,
    backgroundColor:
      typeof o.backgroundColor === "string" ? o.backgroundColor : defaults.backgroundColor,
    accentColor: typeof o.accentColor === "string" ? o.accentColor : defaults.accentColor,
    backgroundImageDataUrl,
    backgroundImage,
    showAvatar: true,
    showUsername: false,
  };
}

export type { ImageCardFontStyle, ImageCardFontWeight, ImageCardTextSizePreset } from "./welcomeImageCardLayout";
