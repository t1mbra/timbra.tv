/**
 * Общие размеры карточки приветствия (1200×515).
 * Пресеты S/M/L задают типографику; аватар — max(пресет заголовка, пресет подзаголовка).
 */
export const IMAGE_CARD_W = 1200;
export const IMAGE_CARD_H = 515;

/** Скругление превью карточки в дашборде (px). */
export const IMAGE_CARD_PREVIEW_RADIUS_PX = 24;

/** Скругление PNG / финальной отрисовки для Discord (px). */
export const IMAGE_CARD_RADIUS_PX = 40;

/** Максимальная ширина блока текста по центру (px на холсте 1200) */
export const IMAGE_CARD_TEXT_MAX_W = 860;

export type ImageCardTextSizePreset = "s" | "m" | "l";

export type ImageCardFontWeight = "regular" | "bold";
export type ImageCardFontStyle = "normal" | "italic";

export type ImageCardLayoutMetrics = {
  avatarDiameterPx: number;
  avatarRadiusPx: number;
  titlePx: number;
  subtitlePx: number;
  titleLineHeightPx: number;
  subtitleLineHeightPx: number;
  gapAvatarToTextPx: number;
  gapTitleToSubtitlePx: number;
  titleFirstBaselineOffsetPx: number;
  subtitleFirstBaselineOffsetPx: number;
};

const PRESET_METRICS: Record<ImageCardTextSizePreset, ImageCardLayoutMetrics> = {
  s: {
    avatarDiameterPx: 190,
    avatarRadiusPx: 95,
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
    avatarRadiusPx: 107.5,
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
    avatarRadiusPx: 120,
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

export function getImageCardLayoutMetrics(preset: ImageCardTextSizePreset): ImageCardLayoutMetrics {
  return PRESET_METRICS[preset] ?? PRESET_METRICS.m;
}

/** Диаметр аватара: больший из двух пресетов (заголовок / подзаголовок). */
export function getImageCardMergedAvatarDiameterPx(
  titlePreset: ImageCardTextSizePreset,
  subtitlePreset: ImageCardTextSizePreset
): number {
  const t = getImageCardLayoutMetrics(titlePreset);
  const s = getImageCardLayoutMetrics(subtitlePreset);
  return Math.max(t.avatarDiameterPx, s.avatarDiameterPx);
}

export function isImageCardTextSizePreset(s: string): s is ImageCardTextSizePreset {
  return s === "s" || s === "m" || s === "l";
}

/**
 * Вертикально центрирует группу «аватар + заголовок + подзаголовок».
 * Типографика заголовка и подзаголовка могут отличаться (разные пресеты).
 */
export function computeImageCardAvatarTopPx(args: {
  titleLineCount: number;
  subtitleLineCount: number;
  titleM: ImageCardLayoutMetrics;
  subtitleM: ImageCardLayoutMetrics;
  avatarDiameterPx: number;
}): number {
  const { titleM, subtitleM, avatarDiameterPx: avatarH } = args;
  const t = args.titleLineCount;
  const s = args.subtitleLineCount;
  const H = IMAGE_CARD_H;
  const bottomPad = 10;
  const minTop = 12;

  const gapAvatar = Math.max(titleM.gapAvatarToTextPx, subtitleM.gapAvatarToTextPx);
  const gapTitleSub = Math.max(titleM.gapTitleToSubtitlePx, subtitleM.gapTitleToSubtitlePx);

  if (t === 0 && s === 0) {
    return Math.max(minTop, (H - avatarH) / 2);
  }

  let lastBaselineFromAvatarTop = 0;

  if (t > 0) {
    const titleFirst = avatarH + gapAvatar + titleM.titleFirstBaselineOffsetPx;
    const lastTitleBaseline = titleFirst + (t - 1) * titleM.titleLineHeightPx;
    if (s > 0) {
      const firstSubBaseline =
        titleFirst + t * titleM.titleLineHeightPx + gapTitleSub;
      lastBaselineFromAvatarTop = firstSubBaseline + (s - 1) * subtitleM.subtitleLineHeightPx;
    } else {
      lastBaselineFromAvatarTop = lastTitleBaseline;
    }
  } else {
    const firstSub = avatarH + gapAvatar + subtitleM.subtitleFirstBaselineOffsetPx;
    lastBaselineFromAvatarTop = firstSub + (s - 1) * subtitleM.subtitleLineHeightPx;
  }

  const totalH = lastBaselineFromAvatarTop + bottomPad;
  return Math.max(minTop, (H - totalH) / 2);
}

/**
 * Масштаб превью: width_preview / 1200.
 */
export function imageCardPreviewScaledMetrics(
  scale: number,
  titlePreset: ImageCardTextSizePreset,
  subtitlePreset: ImageCardTextSizePreset
) {
  const t = getImageCardLayoutMetrics(titlePreset);
  const s = getImageCardLayoutMetrics(subtitlePreset);
  const avatarD = Math.max(t.avatarDiameterPx, s.avatarDiameterPx);
  const sc = scale;
  return {
    avatarDiameterPx: avatarD * sc,
    textBandMaxWidthPx: IMAGE_CARD_TEXT_MAX_W * sc,
    gapAvatarToTextPx: Math.max(t.gapAvatarToTextPx, s.gapAvatarToTextPx) * sc,
    gapTitleToSubtitlePx: Math.max(t.gapTitleToSubtitlePx, s.gapTitleToSubtitlePx) * sc,
    titleFontPx: t.titlePx * sc,
    titleLineHeightPx: t.titleLineHeightPx * sc,
    subtitleFontPx: s.subtitlePx * sc,
    subtitleLineHeightPx: s.subtitleLineHeightPx * sc,
  };
}
