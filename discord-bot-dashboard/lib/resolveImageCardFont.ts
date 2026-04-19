import { existsSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_IMAGE_CARD_FONT,
  IMAGE_CARD_FONT_FILES,
  IMAGE_CARD_FONT_KEYS,
  type ImageCardFontKey,
} from "./welcomeCardConstants";

/** Ключи шрифтов, для которых есть локальный .ttf в каталоге */
export function listAvailableWelcomeCardFontKeys(fontDir: string): ImageCardFontKey[] {
  return IMAGE_CARD_FONT_KEYS.filter((k) => existsSync(path.join(fontDir, IMAGE_CARD_FONT_FILES[k])));
}

export type ResolveImageCardFontResult = {
  /** Ключ для canvas и превью (одинаковый) */
  resolved: ImageCardFontKey;
  /** Запрошенный шрифт отсутствует на диске */
  missingFile: boolean;
};

/**
 * Для PNG: если файл шрифта нет — fallback на inter или первый доступный.
 */
export function resolveImageCardFontForRendering(
  requested: ImageCardFontKey,
  fontDir: string
): ResolveImageCardFontResult {
  const available = listAvailableWelcomeCardFontKeys(fontDir);
  const reqPath = path.join(fontDir, IMAGE_CARD_FONT_FILES[requested]);
  if (existsSync(reqPath)) {
    if (process.env.NODE_ENV === "development") {
      console.log("[welcomeCard font]", {
        requested,
        resolved: requested,
        path: reqPath,
      });
    }
    return { resolved: requested, missingFile: false };
  }
  if (available.length === 0) {
    console.warn("[welcomeCard] нет ни одного .ttf в", fontDir, "— используется", DEFAULT_IMAGE_CARD_FONT);
    return { resolved: DEFAULT_IMAGE_CARD_FONT, missingFile: true };
  }
  const fallback = available.includes(DEFAULT_IMAGE_CARD_FONT)
    ? DEFAULT_IMAGE_CARD_FONT
    : available[0];
  console.warn(
    `[welcomeCard] файл шрифта не найден: ${requested} → ${fallback} (${reqPath})`
  );
  if (process.env.NODE_ENV === "development") {
    console.log("[welcomeCard font]", {
      requested,
      resolved: fallback,
      path: path.join(fontDir, IMAGE_CARD_FONT_FILES[fallback]),
      missingFile: true,
    });
  }
  return { resolved: fallback, missingFile: true };
}
